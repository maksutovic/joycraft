import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

import { resolveRetainedArtifact } from './release-preparation.mjs';

const execFileAsync = promisify(execFile);

export const MIN_FRESHNESS_MS = 5 * 60 * 1000;
export const DEFAULT_READINESS_DEADLINE_MS = 15 * 60 * 1000;
export const DEFAULT_PROCESS_TIMEOUT_MS = 2 * 60 * 1000;
export const DEFAULT_RUNTIME_LANES = Object.freeze([
  Object.freeze({ node: '22.23.1', npm: '10.9.8' }),
  Object.freeze({ node: '24.20.0', npm: '11.19.0' }),
]);
export const DEFAULT_CACHE_MODES = Object.freeze(['cold', 'warmed-full', 'warmed-compact']);

function validSha512Integrity(value) {
  if (typeof value !== 'string' || !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  const encoded = value.slice('sha512-'.length);
  const decoded = Buffer.from(encoded, 'base64');
  return decoded.length === 64 && decoded.toString('base64') === encoded;
}

function stableVersion(value) {
  return typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value);
}

function parseVersion(value) {
  if (!stableVersion(value)) throw new Error(`Expected stable semver, received ${String(value)}`);
  return value.split('.').map(Number);
}

function parseOutput(result) {
  const text = String(result?.stdout ?? '').trim();
  if (!text) return undefined;
  try { return JSON.parse(text); } catch { return text; }
}

function cacheName(mode) {
  return mode.replace(/^warmed-/, '');
}

function validDescriptor(descriptor, version) {
  return descriptor?.schemaVersion === 1
    && descriptor.releaseVersion === version
    && JSON.stringify(descriptor.manifestSchemas) === '[1]'
    && typeof descriptor.autoSafeEligible === 'boolean';
}

/** Describe every cache/runtime check required after candidate publication. */
export function createReadinessPlan({
  runtimeLanes = DEFAULT_RUNTIME_LANES,
  cacheModes = DEFAULT_CACHE_MODES,
  packageName = 'joycraft',
  version,
} = {}) {
  const lanes = runtimeLanes.map((lane) => ({ node: String(lane.node), npm: String(lane.npm) }));
  const modes = cacheModes.map(String);
  if (!lanes.length || !modes.length) throw new Error('At least one runtime lane and cache mode are required');
  if (version !== undefined && !stableVersion(version)) throw new Error(`Invalid readiness version: ${String(version)}`);
  const prime = modes.filter(mode => mode !== 'cold').flatMap(cacheMode => lanes.map(lane => ({
    id: `prime-${lane.node}-${cacheMode}`,
    phase: 'before-candidate',
    packageName,
    ...lane,
    cacheMode,
    metadataMode: cacheName(cacheMode),
  })));
  const verify = lanes.flatMap(lane => modes.map(cacheMode => ({
    id: `verify-${lane.node}-${cacheMode}`,
    phase: 'after-candidate',
    packageName,
    version,
    ...lane,
    cacheMode,
    metadataMode: cacheName(cacheMode),
  })));
  return { packageName, version, prime, verify, minFreshnessMs: MIN_FRESHNESS_MS };
}

/** Compare exact-version registry metadata with the retained artifact identity. */
export function verifyExactVersionMetadata({ metadata, packageName, version, integrity } = {}) {
  const candidate = Array.isArray(metadata) ? metadata[0] : metadata;
  const value = candidate?.versions?.[version] ?? candidate;
  const expected = { packageName, version, integrity };
  const actualName = value?.name ?? value?.package?.name;
  const actualVersion = value?.version ?? value?.package?.version;
  const actualIntegrity = value?.dist?.integrity ?? value?.integrity;
  const errors = [];
  if (!value || typeof value !== 'object') errors.push('metadata is missing');
  if (packageName && actualName !== packageName) errors.push('package name mismatch');
  if (actualVersion !== version) errors.push('exact version mismatch');
  if (!validSha512Integrity(integrity)) errors.push('expected integrity is not canonical sha512 SRI');
  if (actualIntegrity !== integrity || !validSha512Integrity(actualIntegrity)) errors.push('tarball integrity mismatch');
  return errors.length ? { ok: false, errors, expected, actual: { name: actualName, version: actualVersion, integrity: actualIntegrity } } : {
    ok: true,
    expected,
    actual: { name: actualName, version: actualVersion, integrity: actualIntegrity },
  };
}

function reportChecks(report) {
  if (Array.isArray(report?.checks)) return report.checks;
  if (report?.outcomes && typeof report.outcomes === 'object') return Object.entries(report.outcomes).map(([id, outcome]) => ({ id, ...(typeof outcome === 'string' ? { status: outcome } : outcome) }));
  return [];
}

/** Validate the immutable, independently configured required compatibility report. */
export function validateRequiredValidationReport(report, {
  releaseSha,
  version,
  integrity,
  requiredChecks = [],
} = {}) {
  if (!report || report.schemaVersion !== 1 || report.complete !== true) throw new Error('Required validation report is missing or incomplete');
  if (!/^[0-9a-f]{40}$/.test(String(releaseSha ?? '')) || report.releaseSha !== releaseSha) throw new Error('Required validation report release SHA mismatch');
  if (report.version !== version) throw new Error('Required validation report version mismatch');
  if (!validSha512Integrity(integrity) || report.integrity !== integrity) throw new Error('Required validation report tarball integrity mismatch');
  const required = [...new Set(requiredChecks.map(String).filter(Boolean))];
  if (!required.length) throw new Error('Required validation matrix is not configured');
  const checks = reportChecks(report);
  const byId = new Map();
  for (const check of checks) {
    const id = String(check?.id ?? '');
    if (id) byId.set(id, [...(byId.get(id) ?? []), check]);
  }
  const missing = required.filter(id => !byId.has(id));
  const failed = required.filter(id => byId.get(id)?.length !== 1 || !['passed', 'success'].includes(byId.get(id)?.[0]?.status));
  if (missing.length) throw new Error(`Required validation report is incomplete; missing: ${missing.join(', ')}`);
  if (failed.length) throw new Error(`Required validation report has failed checks: ${failed.join(', ')}`);
  return { ...report, requiredChecks: required, checks };
}

/** Poll readiness only after the freshness interval and until a hard deadline. */
export async function waitForRegistryReadiness({
  startedAt,
  now = () => Date.now(),
  sleep = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms)),
  check,
  minFreshnessMs = MIN_FRESHNESS_MS,
  deadlineMs = DEFAULT_READINESS_DEADLINE_MS,
  intervalMs = 30_000,
  checkTimeoutMs = DEFAULT_PROCESS_TIMEOUT_MS,
} = {}) {
  if (typeof check !== 'function') throw new Error('A readiness check function is required');
  const begin = startedAt ?? now();
  const freshnessWindow = Math.max(MIN_FRESHNESS_MS, Number(minFreshnessMs) || 0);
  const deadline = begin + deadlineMs;
  let last;
  while (now() <= deadline) {
    const current = now();
    const freshnessAt = begin + freshnessWindow;
    if (current < freshnessAt) {
      await sleep(Math.min(freshnessAt - current, Math.max(1, deadline - current)));
      continue;
    }
    const checkBudget = Math.max(1, Math.min(Number(checkTimeoutMs) || DEFAULT_PROCESS_TIMEOUT_MS, deadline - current));
    const timeout = Symbol('readiness-timeout');
    let timer;
    let checked;
    try {
      checked = await Promise.race([
        Promise.resolve().then(() => check(current)),
        new Promise(resolveTimeout => { timer = setTimeout(() => resolveTimeout(timeout), checkBudget); }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (checked === timeout) break;
    last = checked;
    if (now() > deadline) break;
    if (last === true || (last && last.ready === true)) return { ready: true, startedAt: begin, checkedAt: current, evidence: last };
    const after = now();
    if (after >= deadline) break;
    await sleep(Math.min(intervalMs, deadline - after));
  }
  return { ready: false, startedAt: begin, reason: 'Registry readiness deadline expired', checkedAt: now(), evidence: last };
}

async function defaultRun(command, args, options = {}) {
  return execFileAsync(command, args, {
    ...options,
    encoding: 'utf8',
    timeout: options.timeout ?? DEFAULT_PROCESS_TIMEOUT_MS,
    killSignal: options.killSignal ?? 'SIGTERM',
    maxBuffer: options.maxBuffer ?? 8 * 1024 * 1024,
  });
}

function npmInvocation() {
  if (process.platform !== 'win32') return { command: 'npm', prefix: [] };
  const candidates = [
    process.env.npm_execpath,
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    process.env.APPDATA ? join(process.env.APPDATA, 'npm', 'node_modules', 'npm', 'bin', 'npm-cli.js') : undefined,
  ].filter(candidate => {
    if (!candidate || basename(candidate).toLowerCase() !== 'npm-cli.js' || !existsSync(candidate)) return false;
    try { return statSync(candidate).isFile(); } catch { return false; }
  });
  if (!candidates.length) throw new Error('Unable to locate a real npm-cli.js for Windows execution');
  return { command: process.execPath, prefix: [candidates[0]] };
}

function optionsFor(cwd, cacheDir) {
  const env = { ...process.env };
  if (cacheDir) env.npm_config_cache = cacheDir;
  return { cwd: resolve(cwd), env };
}

async function assertRuntimeLane({ node, npm } = {}) {
  if (node && process.versions.node !== String(node)) throw new Error(`Consumer Node runtime ${process.versions.node} does not match required lane ${node}`);
  if (npm) {
    const invocation = npmInvocation();
    const result = await defaultRun(invocation.command, [...invocation.prefix, '--version']);
    const actual = String(result.stdout ?? '').trim();
    if (actual !== String(npm)) throw new Error(`Consumer npm runtime ${actual} does not match required lane ${npm}`);
  }
  return { node: process.versions.node, npm: npm ? String(npm) : undefined };
}

/** Adapter for all release-consumer npm calls; tests can replace only run. */
export function createNpmVerificationAdapter({ run = defaultRun } = {}) {
  const invoke = run === defaultRun ? async (command, args, options) => {
    const npm = npmInvocation();
    return run(npm.command, [...npm.prefix, ...args], options);
  } : run;
  return {
    async viewExactMetadata({ packageName, version, cacheDir, preferOnline = true, cwd = process.cwd() }) {
      const args = ['view', `${packageName}@${version}`, '--json'];
      if (preferOnline) args.push('--prefer-online');
      if (cacheDir) args.push('--cache', cacheDir);
      const result = await invoke('npm', args, optionsFor(cwd, cacheDir));
      return parseOutput(result);
    },
    async primeMetadata({ packageName, version, cacheDir, metadataMode = 'full', cwd = process.cwd() }) {
      // npm view requests the full packument. The install resolver exercises
      // the compact install metadata path used by real consumers.
      const args = metadataMode === 'compact'
        ? ['exec', '--yes', `--package=${packageName}${version ? `@${version}` : ''}`, '--prefer-online']
        : ['view', `${packageName}${version ? `@${version}` : ''}`, '--json', '--prefer-online'];
      if (cacheDir) args.push('--cache', cacheDir);
      if (metadataMode !== 'compact') return invoke('npm', args, optionsFor(cwd, cacheDir));
      args.push('--', 'node', '--version');
      const isolatedCwd = mkdtempSync(join(tmpdir(), 'joycraft-compact-consumer-'));
      writeFileSync(join(isolatedCwd, 'package.json'), `${JSON.stringify({ name: `${packageName}-cache-probe`, private: true })}\n`, 'utf8');
      try {
        return await invoke('npm', args, optionsFor(isolatedCwd, cacheDir));
      } finally {
        rmSync(isolatedCwd, { recursive: true, force: true });
      }
    },
    async install({ spec, cwd, cacheDir, preferOnline = true, attempt = 1 }) {
      const args = ['install', spec, '--ignore-scripts', '--no-audit', '--no-fund'];
      if (preferOnline) args.push('--prefer-online');
      if (cacheDir) args.push('--cache', cacheDir);
      return invoke('npm', args, { ...optionsFor(cwd, cacheDir), env: { ...optionsFor(cwd, cacheDir).env, JOYCRAFT_ATTEMPT: String(attempt) } });
    },
    async exec({ spec, command, args = [], cwd, cacheDir, preferOnline = true }) {
      const commandArgs = ['exec', '--yes', `--package=${spec}`];
      if (cacheDir) commandArgs.push('--cache', cacheDir);
      if (preferOnline) commandArgs.push('--prefer-online');
      commandArgs.push('--', command, ...args);
      return invoke('npm', commandArgs, optionsFor(cwd, cacheDir));
    },
  };
}

/** Install a retained candidate from clean and prior-version consumer projects. */
export async function verifyConsumerInstallations({
  packageName,
  version,
  tarball,
  previousTarball,
  root,
  adapter = createNpmVerificationAdapter(),
  attempts = 2,
  executable = packageName,
  initArgs = ['init', '--non-interactive'],
  updateArgs = ['update', '--non-interactive'],
} = {}) {
  if (!packageName || !stableVersion(version) || !tarball || !previousTarball) throw new Error('Consumer verification requires package, candidate, and previous-version tarballs');
  const base = resolve(root ?? process.cwd());
  const freshRoot = join(base, 'consumer-fresh');
  const updateRoot = join(base, 'consumer-update');
  const freshCache = join(base, 'npm-cache-cold');
  const warmCache = join(base, 'npm-cache-update');
  for (const path of [freshRoot, updateRoot, freshCache, warmCache]) mkdirSync(path, { recursive: true });
  for (const cwd of [freshRoot, updateRoot]) {
    writeFileSync(join(cwd, 'package.json'), `${JSON.stringify({ name: `${packageName}-consumer`, private: true })}\n`, 'utf8');
  }
  let lastError;
  for (let attempt = 1; attempt <= Math.max(1, attempts); attempt += 1) {
    try {
      await adapter.install({ spec: tarball, cwd: freshRoot, cacheDir: freshCache, preferOnline: true, attempt });
      await adapter.exec({ spec: tarball, command: executable, args: initArgs, cwd: freshRoot, cacheDir: freshCache, preferOnline: true });
      await adapter.install({ spec: previousTarball, cwd: updateRoot, cacheDir: warmCache, preferOnline: true, attempt });
      await adapter.exec({ spec: previousTarball, command: executable, args: initArgs, cwd: updateRoot, cacheDir: warmCache, preferOnline: true });
      await adapter.install({ spec: tarball, cwd: updateRoot, cacheDir: warmCache, preferOnline: true, attempt });
      await adapter.exec({ spec: tarball, command: executable, args: updateArgs, cwd: updateRoot, cacheDir: warmCache, preferOnline: true });
      return { packageName, version, freshInstall: true, previousVersionUpdate: true, attempts: attempt, caches: [freshCache, warmCache] };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Retained artifact consumer verification failed after ${Math.max(1, attempts)} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

/** Run a retained-artifact check and return its immutable evidence for promotion. */
export async function verifyRetainedArtifactConsumers({ manifestPath, expected, ...options } = {}) {
  const retained = await resolveRetainedArtifact({ manifestPath, expected });
  const result = await verifyConsumerInstallations({
    packageName: retained.packageName,
    version: retained.version,
    tarball: retained.tarball,
    ...options,
  });
  return { ...result, retained };
}

/** Install an exact registry version and compare both metadata and descriptor bytes. */
export async function verifyRegistryConsumerInstallation({
  packageName,
  version,
  integrity,
  descriptor,
  root,
  cacheDir,
  metadataMode = 'compact',
  adapter = createNpmVerificationAdapter(),
} = {}) {
  if (!packageName || !stableVersion(version) || !validSha512Integrity(integrity) || !validDescriptor(descriptor, version)) throw new Error('Registry consumer verification requires exact artifact identity and descriptor');
  const cwd = resolve(root ?? process.cwd());
  mkdirSync(cwd, { recursive: true });
  writeFileSync(join(cwd, 'package.json'), `${JSON.stringify({ name: `${packageName}-registry-consumer`, private: true })}\n`, 'utf8');
  // npm exec is the compact install metadata path. Exercise it explicitly
  // for the compact lane before the exact install so a warm cache cannot hide
  // a stale compact packument.
  if (metadataMode === 'compact' && typeof adapter.primeMetadata === 'function') {
    await adapter.primeMetadata({ packageName, version, cacheDir, metadataMode: 'compact', cwd });
  }
  await adapter.install({ spec: `${packageName}@${version}`, cwd, cacheDir, preferOnline: true, attempt: 1 });
  const metadata = await adapter.viewExactMetadata({ packageName, version, cacheDir, preferOnline: true, cwd });
  const metadataResult = verifyExactVersionMetadata({ metadata, packageName, version, integrity });
  if (!metadataResult.ok) throw new Error(`Registry exact-version metadata verification failed: ${metadataResult.errors.join('; ')}`);
  try {
    const lock = JSON.parse(readFileSync(join(cwd, 'package-lock.json'), 'utf8'));
    const lockEntry = lock?.packages?.[`node_modules/${packageName}`];
    if (lockEntry?.integrity !== integrity) throw new Error(`lockfile integrity ${String(lockEntry?.integrity)} does not match retained ${integrity}`);
  } catch (error) {
    throw new Error(`Registry installation did not bind the installed bytes to retained integrity: ${error instanceof Error ? error.message : String(error)}`);
  }
  const installedDescriptorPath = join(cwd, 'node_modules', packageName, 'dist', 'joycraft-release.json');
  let installedDescriptor;
  try { installedDescriptor = JSON.parse(readFileSync(installedDescriptorPath, 'utf8')); } catch (error) {
    throw new Error(`Registry installation is missing dist/joycraft-release.json: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (JSON.stringify(installedDescriptor) !== JSON.stringify(descriptor)) throw new Error('Registry-installed descriptor does not match retained artifact descriptor');
  return { ok: true, packageName, version, integrity, descriptor, metadata: metadataResult.actual, cacheDir: resolve(cacheDir ?? join(cwd, '.npm-cache')) };
}

export async function verifyRetainedRegistryConsumer({ manifestPath, expected, ...options } = {}) {
  const retained = await resolveRetainedArtifact({ manifestPath, expected });
  return verifyRegistryConsumerInstallation({
    packageName: retained.packageName,
    version: retained.version,
    integrity: retained.integrity,
    descriptor: retained.descriptor,
    ...options,
  });
}

/** Poll exact-version metadata through each planned cold/warm cache lane. */
export async function runRegistryReadiness({
  packageName = 'joycraft',
  version,
  integrity,
  plan = createReadinessPlan({ packageName, version }),
  adapter = createNpmVerificationAdapter(),
  cacheRoot = join(process.cwd(), 'release-caches'),
  descriptor,
  consumerRoot = join(process.cwd(), 'registry-consumers'),
  ...pollOptions
} = {}) {
  if (!stableVersion(version) || !validSha512Integrity(integrity)) throw new Error('Registry readiness requires a stable version and canonical retained integrity');
  if (!validDescriptor(descriptor, version)) throw new Error('Registry readiness requires the verified candidate descriptor');
  if (!plan?.verify?.length || !plan.verify.every(lane => typeof lane.node === 'string' && /^\d+\.\d+\.\d+$/.test(lane.node)
    && typeof lane.npm === 'string' && /^\d+\.\d+\.\d+$/.test(lane.npm))) throw new Error('Registry readiness requires a non-empty runtime/cache plan');
  const modes = new Set(plan.verify.map(lane => lane.cacheMode));
  if (!['cold', 'warmed-full', 'warmed-compact'].every(mode => modes.has(mode))) throw new Error('Registry readiness plan must include cold, warmed-full, and warmed-compact clients');
  const check = async () => {
    const checks = [];
    for (const lane of plan.verify) {
      // Warmed cache artifacts are restored under <root>/<node>/<mode>; cold
      // clients always receive a separate directory and cannot reuse either.
      const cacheDir = join(resolve(cacheRoot), lane.node, lane.cacheMode === 'warmed-full'
        ? 'warmed-full'
        : lane.cacheMode === 'warmed-compact' ? 'warmed-compact' : 'cold');
      mkdirSync(cacheDir, { recursive: true });
      try {
        const metadata = await adapter.viewExactMetadata({ packageName, version, cacheDir, preferOnline: true });
        const result = verifyExactVersionMetadata({ metadata, packageName, version, integrity });
        let consumerResult;
        if (descriptor) {
          consumerResult = await verifyRegistryConsumerInstallation({
            packageName, version, integrity, descriptor, adapter, cacheDir,
            metadataMode: lane.metadataMode,
            root: join(resolve(consumerRoot), lane.node, lane.cacheMode),
          });
        }
        checks.push({ ...lane, ok: result.ok && (consumerResult?.ok ?? true), errors: result.errors, consumer: consumerResult?.ok ?? true });
      } catch (error) {
        checks.push({ ...lane, ok: false, errors: [error instanceof Error ? error.message : String(error)] });
      }
    }
    return { ready: checks.length === plan.verify.length && checks.every(item => item.ok), checks };
  };
  return waitForRegistryReadiness({ check, ...pollOptions });
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const readOption = name => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  if (command === 'plan') {
    console.log(JSON.stringify(createReadinessPlan({ packageName: args[0] ?? 'joycraft', version: args[1] }), null, 2));
    return;
  }
  if (command === 'prime') {
    const packageName = readOption('--package') ?? 'joycraft';
    const version = readOption('--version');
    const cacheDir = resolve(readOption('--cache') ?? join(process.cwd(), 'release-cache'));
    mkdirSync(cacheDir, { recursive: true });
    const adapter = createNpmVerificationAdapter();
    await adapter.primeMetadata({ packageName, version, cacheDir, metadataMode: readOption('--metadata-mode') ?? 'full' });
    console.log(JSON.stringify({ packageName, version, cacheDir, primed: true }));
    return;
  }
  if (command === 'readiness') {
    const manifestPath = readOption('--manifest');
    if (!manifestPath) throw new Error('Registry readiness requires a retained artifact manifest');
    let retained;
    retained = await resolveRetainedArtifact({ manifestPath, expected: { version: readOption('--version'), packageName: readOption('--package') ?? 'joycraft' } });
    const runtimeNode = readOption('--node');
    const runtimeNpm = readOption('--npm');
    if (!runtimeNode || !runtimeNpm) throw new Error('Registry readiness requires the actual Node and npm lane versions');
    if (readOption('--integrity') && readOption('--integrity') !== retained.integrity) throw new Error('Readiness integrity does not match retained artifact');
    await assertRuntimeLane({ node: runtimeNode, npm: runtimeNpm });
    const result = await runRegistryReadiness({
      packageName: readOption('--package') ?? 'joycraft',
      version: retained.version,
      integrity: retained.integrity,
      descriptor: retained?.descriptor,
      consumerRoot: readOption('--consumer-root'),
      plan: createReadinessPlan({
        packageName: readOption('--package') ?? 'joycraft',
        version: retained.version,
        runtimeLanes: runtimeNode && runtimeNpm ? [{ node: runtimeNode, npm: runtimeNpm }] : undefined,
      }),
      cacheRoot: readOption('--cache-root'),
      minFreshnessMs: Number(readOption('--min-freshness-ms') ?? MIN_FRESHNESS_MS),
      deadlineMs: Number(readOption('--deadline-ms') ?? DEFAULT_READINESS_DEADLINE_MS),
    });
    console.log(JSON.stringify(result, null, 2));
    if (!result.ready) process.exitCode = 1;
    return;
  }
  if (command === 'verify-consumers') {
    const manifestPath = readOption('--manifest');
    const previousTarball = readOption('--previous-tarball');
    if (!previousTarball) throw new Error('--previous-tarball is required');
    const result = await verifyRetainedArtifactConsumers({
      manifestPath,
      expected: { releaseSha: readOption('--release-sha'), version: readOption('--version'), packageName: readOption('--package') },
      previousTarball,
      root: readOption('--root'),
    });
    console.log(JSON.stringify({ ...result, retained: { ...result.retained, tarball: undefined } }, null, 2));
    return;
  }
  if (command === 'verify-registry-consumer') {
    await assertRuntimeLane({ node: readOption('--node'), npm: readOption('--npm') });
    const result = await verifyRetainedRegistryConsumer({
      manifestPath: readOption('--manifest'),
      expected: { releaseSha: readOption('--release-sha'), version: readOption('--version'), packageName: readOption('--package') },
      root: readOption('--root'),
      cacheDir: readOption('--cache'),
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  throw new Error('Usage: release-verification.mjs <plan|prime|readiness|verify-consumers|verify-registry-consumer>');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });

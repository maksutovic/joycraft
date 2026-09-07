import { execFile } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { createNpmVerificationAdapter, createReadinessPlan, DEFAULT_READINESS_DEADLINE_MS, MIN_FRESHNESS_MS, runRegistryReadiness, validateRequiredValidationReport } from './release-verification.mjs';
import { resolveRetainedArtifact } from './release-preparation.mjs';

const execFileAsync = promisify(execFile);
const PROMOTION_TOKEN_NAME = 'JOYCRAFT_NPM_PROMOTION_TOKEN';
const PROMOTION_EXPIRY_NAME = 'JOYCRAFT_NPM_PROMOTION_TOKEN_EXPIRES_AT';

function stableVersion(value) {
  return typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value);
}

export function compareVersions(left, right) {
  if (!stableVersion(left) || !stableVersion(right)) throw new Error('Promotion versions must be stable semver');
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function parseJsonOutput(result) {
  const text = String(result?.stdout ?? '').trim();
  if (!text) return undefined;
  try { return JSON.parse(text); } catch { return text; }
}

function safeEnv(env = process.env) {
  const result = { ...env };
  // Promotion credentials are never inherited by npm reads or gh. They are
  // supplied only through a short-lived userconfig for one dist-tag call.
  delete result[PROMOTION_TOKEN_NAME];
  delete result[PROMOTION_EXPIRY_NAME];
  delete result.NPM_TOKEN;
  delete result.npm_config_userconfig;
  delete result.NPM_CONFIG_USERCONFIG;
  return result;
}

function asDate(value, label) {
  const numeric = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value));
  const numberValue = numeric ? Number(value) : NaN;
  const date = value instanceof Date
    ? new Date(value.valueOf())
    : numeric ? new Date(numberValue < 1e12 ? numberValue * 1000 : numberValue) : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error(`${label} expiry is invalid`);
  return date;
}

function validateToken(token, tokenName) {
  const value = String(token ?? '').trim();
  if (!value) throw new Error(`Missing promotion credential ${tokenName}; candidate promotion is blocked`);
  // A token containing a line break could add another npmrc setting.
  if (/\s/.test(value)) throw new Error(`${tokenName} is invalid; candidate promotion is blocked`);
  return value;
}

/** Validate the dedicated promotion secret without ever falling back to OIDC. */
export function validatePromotionCredential({
  env = process.env,
  now = () => new Date(),
  tokenName = PROMOTION_TOKEN_NAME,
  expiryName = PROMOTION_EXPIRY_NAME,
  token,
  expiresAt,
} = {}) {
  const value = validateToken(token ?? env?.[tokenName], tokenName);
  const rawExpiry = expiresAt ?? env?.[expiryName];
  if (rawExpiry !== undefined && rawExpiry !== '') {
    const expiry = asDate(rawExpiry, tokenName);
    const current = asDate(now(), 'Current time');
    if (expiry <= current) throw new Error(`${tokenName} is expired; candidate promotion is blocked`);
    return { valid: true, token: value, expiresAt: expiry.toISOString(), tokenName };
  }
  return { valid: true, token: value, tokenName };
}

function validateDescriptorIdentity(descriptor, version, label = 'candidate') {
  if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)
    || descriptor.schemaVersion !== 1
    || descriptor.releaseVersion !== version
    || JSON.stringify(descriptor.manifestSchemas) !== '[1]'
    || typeof descriptor.autoSafeEligible !== 'boolean') {
    throw new Error(`${label} release descriptor is missing, malformed, or does not match the candidate`);
  }
  return descriptor;
}

function validSha512Integrity(value) {
  if (typeof value !== 'string' || !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  const encoded = value.slice('sha512-'.length);
  const decoded = Buffer.from(encoded, 'base64');
  return decoded.length === 64 && decoded.toString('base64') === encoded;
}

function artifactIdentity(expected) {
  if (!expected || !stableVersion(expected.version)
    || !/^[0-9a-f]{40}$/.test(String(expected.releaseSha ?? ''))
    || !validSha512Integrity(expected.integrity)) {
    throw new Error('Exact candidate artifact identity is required for promotion');
  }
  // The retained-artifact resolver verifies the packed bytes and descriptor.
  // The promotion boundary still requires that verified descriptor explicitly.
  validateDescriptorIdentity(expected.descriptor, expected.version, 'Packed');
  return expected;
}

function registryDescriptor(registryReady) {
  return registryReady?.registryDescriptor
    ?? registryReady?.descriptor
    ?? registryReady?.evidence?.registryDescriptor
    ?? registryReady?.evidence?.descriptor;
}

function timestamp(value) {
  if (value instanceof Date) return value.valueOf();
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return Date.parse(String(value));
}

/** Validate all immutable evidence before any mutation is possible. */
export function validatePromotionInputs({ expected, report, registryReady, requiredChecks } = {}) {
  artifactIdentity(expected);
  validateRequiredValidationReport(report, {
    releaseSha: expected.releaseSha,
    version: expected.version,
    integrity: expected.integrity,
    requiredChecks: Array.isArray(requiredChecks) ? requiredChecks : [],
  });
  if (registryReady !== true && registryReady?.ready !== true) {
    throw new Error('Registry readiness has not succeeded; latest remains unchanged');
  }
  if (registryReady?.checkedAt !== undefined && registryReady?.startedAt !== undefined) {
    const elapsed = timestamp(registryReady.checkedAt) - timestamp(registryReady.startedAt);
    if (!Number.isFinite(elapsed) || elapsed < MIN_FRESHNESS_MS) {
      throw new Error('Registry readiness freshness interval has not elapsed; latest remains unchanged');
    }
  }
  const evidenceChecks = registryReady?.evidence?.checks;
  if (Array.isArray(evidenceChecks) && evidenceChecks.length > 0 && evidenceChecks.some(check => check?.consumer !== true)) {
    throw new Error('Registry readiness lacks verified installed descriptor evidence; latest remains unchanged');
  }
  const descriptor = registryDescriptor(registryReady);
  if (descriptor !== undefined) validateDescriptorIdentity(descriptor, expected.version, 'Registry');
  if (report.descriptor !== undefined) {
    validateDescriptorIdentity(report.descriptor, expected.version, 'Validation report');
    if (JSON.stringify(report.descriptor) !== JSON.stringify(expected.descriptor)) {
      throw new Error('Required validation descriptor does not match the packed artifact');
    }
  }
  if (descriptor !== undefined && JSON.stringify(descriptor) !== JSON.stringify(expected.descriptor)) {
    throw new Error('Registry descriptor does not match the packed artifact');
  }
  return { expected, report, registryReady, requiredChecks: [...requiredChecks] };
}

function normalizedSteps(completedSteps) {
  if (Array.isArray(completedSteps)) return new Set(completedSteps.map(String));
  if (completedSteps && Array.isArray(completedSteps.steps)) return new Set(completedSteps.steps.map(String));
  return new Set();
}

function packageNameForCommand(packageName) {
  const value = String(packageName ?? '');
  if (!value || value.startsWith('-') || /\s/.test(value)) throw new Error('Promotion package name is invalid');
  return value;
}

/** Build guarded command arrays; no command is returned for an unsafe release. */
export function createPromotionPlan({
  packageName = 'joycraft',
  expected,
  report,
  registryReady,
  latestVersion,
  credential,
  requiredChecks = [],
  completedSteps = [],
  releaseSha = expected?.releaseSha,
  cacheDir,
  releaseExists = false,
} = {}) {
  const name = packageNameForCommand(packageName);
  validatePromotionInputs({ expected, report, registryReady, requiredChecks });
  if (releaseSha !== undefined && releaseSha !== expected.releaseSha) {
    throw new Error('Promotion release SHA does not match the retained artifact');
  }
  if (!credential?.token) throw new Error('A valid scoped promotion credential is required');
  if (latestVersion !== undefined && latestVersion !== null && latestVersion !== '') {
    const comparison = compareVersions(String(latestVersion), expected.version);
    if (comparison > 0) throw new Error(`Refusing to downgrade latest ${latestVersion} to ${expected.version}`);
  }
  const completed = normalizedSteps(completedSteps);
  const sameVersion = latestVersion === expected.version;
  const commands = [];
  if (!sameVersion && !completed.has('promotion')) commands.push(['npm', 'dist-tag', 'add', `${name}@${expected.version}`, 'latest']);
  const latestArgs = ['view', name, 'dist-tags.latest', '--json', '--prefer-online'];
  if (cacheDir) latestArgs.push('--cache', cacheDir);
  commands.push(['npm', ...latestArgs]);
  commands.push(['gh', 'release', 'view', `v${expected.version}`, '--json', 'tagName,targetCommitish']);
  if (!releaseExists && !completed.has('release')) commands.push(['gh', 'release', 'create', `v${expected.version}`, '--target', releaseSha, '--generate-notes']);
  return {
    packageName: name,
    version: expected.version,
    releaseSha,
    rerunReadiness: true,
    skipPromotion: sameVersion || completed.has('promotion'),
    commands,
  };
}

async function defaultRun(command, args, options = {}) {
  return execFileAsync(command, args, { ...options, encoding: 'utf8', shell: false });
}

function createPromotionAuth(token) {
  const directory = mkdtempSync(join(tmpdir(), 'joycraft-promotion-'));
  const userConfig = join(directory, '.npmrc');
  try {
    writeFileSync(userConfig, `//registry.npmjs.org/:_authToken=${token}\n`, { encoding: 'utf8', mode: 0o600 });
    chmodSync(userConfig, 0o600);
    return { directory, userConfig };
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

function isRegularNpmCli(candidate) {
  const filename = String(candidate ?? '').replaceAll('\\', '/').split('/').pop()?.toLowerCase();
  if (filename !== 'npm-cli.js') return false;
  try { return statSync(candidate).isFile(); } catch { return false; }
}

function resolveWindowsNpmCliPath({ npmCliPath, env, execPath = process.execPath } = {}) {
  if (npmCliPath !== undefined) {
    if (isRegularNpmCli(npmCliPath)) return npmCliPath;
    throw new Error('npmCliPath must point to a regular npm-cli.js file.');
  }
  const candidates = [];
  const add = value => {
    const filename = String(value ?? '').replaceAll('\\', '/').split('/').pop()?.toLowerCase();
    if (value && filename === 'npm-cli.js') candidates.push(value);
  };
  const addPrefix = prefix => { if (prefix) add(join(prefix, 'node_modules', 'npm', 'bin', 'npm-cli.js')); };
  add(env?.npm_execpath);
  add(join(dirname(execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  addPrefix(env?.npm_config_prefix);
  addPrefix(env?.PREFIX);
  addPrefix(env?.APPDATA ? join(env.APPDATA, 'npm') : undefined);
  addPrefix(env?.ProgramFiles ? join(env.ProgramFiles, 'nodejs') : undefined);
  const pathValue = env?.Path ?? env?.PATH;
  if (pathValue) for (const entry of pathValue.split(';')) addPrefix(entry);
  const found = candidates.find(isRegularNpmCli);
  if (found) return found;
  throw new Error('Unable to locate npm-cli.js for Windows execution; provide npmCliPath or install npm alongside Node.js.');
}

function npmInvocation({ platform = process.platform, env = process.env, npmCliPath } = {}) {
  if (platform !== 'win32') return { command: 'npm', prefix: [] };
  return { command: process.execPath, prefix: [resolveWindowsNpmCliPath({ npmCliPath, env })] };
}

function safeError(error, secrets = []) {
  // Do not include child environment or command details in the surfaced error;
  // those may contain a secret in a tool's diagnostic.
  let message = error instanceof Error
    ? `${error.message}${error.stderr ? ` ${String(error.stderr).slice(0, 2000)}` : ''}`
    : String(error);
  message = message.replaceAll(PROMOTION_TOKEN_NAME, 'promotion credential');
  for (const secret of secrets) {
    if (secret) message = message.replaceAll(String(secret), '[redacted credential]');
  }
  return message;
}

/** Adapter keeps npm and gh invocations as argument arrays and supports fixture runs. */
export function createPromotionProcessAdapter({
  run = defaultRun,
  platform = process.platform,
  env = process.env,
  npmCliPath,
} = {}) {
  const invoke = async (command, args, options = {}) => {
    const requestedUserConfig = options.env?.npm_config_userconfig;
    const childEnv = safeEnv(options.env ?? env);
    if (command === 'npm' && args[0] === 'dist-tag' && requestedUserConfig) childEnv.npm_config_userconfig = requestedUserConfig;
    const childOptions = { ...options, env: childEnv, shell: false };
    if (command !== 'npm') return run(command, args, childOptions);
    const npm = npmInvocation({ platform, env: childEnv, npmCliPath });
    return run(npm.command, [...npm.prefix, ...args], childOptions);
  };
  return {
    run,
    promoteLatest(packageName, version, options = {}) {
      return invoke('npm', ['dist-tag', 'add', `${packageName}@${version}`, 'latest'], options);
    },
    async viewLatest(packageName, { cacheDir, options = {} } = {}) {
      const args = ['view', packageName, 'dist-tags.latest', '--json', '--prefer-online'];
      if (cacheDir) args.push('--cache', cacheDir);
      return parseJsonOutput(await invoke('npm', args, options));
    },
    async verifyFreshLatest({ packageName, version, integrity, descriptor, cacheDir, cwd = process.cwd(), options = {} } = {}) {
      const args = ['install', `${packageName}@latest`, '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-online'];
      if (cacheDir) args.push('--cache', cacheDir);
      await invoke('npm', args, { ...options, cwd });
      const metadataArgs = ['view', `${packageName}@${version}`, '--json', '--prefer-online'];
      if (cacheDir) metadataArgs.push('--cache', cacheDir);
      const metadata = parseJsonOutput(await invoke('npm', metadataArgs, { ...options, cwd }));
      const actual = metadata?.dist?.integrity ?? metadata?.integrity;
      if (metadata?.version !== version || actual !== integrity) return false;
      try { validateDescriptorIdentity(descriptor, version, 'Fresh client'); } catch { return false; }
      const packageDir = join(cwd, 'node_modules', ...String(packageName).split('/'));
      let packageJson;
      try { packageJson = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')); } catch { return false; }
      if (packageJson.name !== packageName || packageJson.version !== version) return false;
      try {
        const lock = JSON.parse(readFileSync(join(cwd, 'package-lock.json'), 'utf8'));
        if (lock?.packages?.[`node_modules/${packageName}`]?.integrity !== integrity) return false;
      } catch { return false; }
      if (descriptor !== undefined) {
        try {
          const installedDescriptor = JSON.parse(readFileSync(join(packageDir, 'dist', 'joycraft-release.json'), 'utf8'));
          if (JSON.stringify(installedDescriptor) !== JSON.stringify(descriptor)) return false;
        } catch { return false; }
      }
      return true;
    },
    async viewRelease(version, options = {}) {
      return parseJsonOutput(await invoke('gh', ['release', 'view', `v${version}`, '--json', 'tagName,targetCommitish'], options));
    },
    async viewTag(version, repository, options = {}) {
      if (!repository || String(repository).startsWith('-') || /\s/.test(String(repository))) throw new Error('A GitHub repository is required to verify an existing tag');
      const ref = parseJsonOutput(await invoke('gh', ['api', `repos/${repository}/git/ref/tags/v${version}`], options));
      let target = ref?.object;
      for (let depth = 0; target?.type === 'tag' && depth < 3; depth += 1) {
        if (!target.sha) throw new Error(`Annotated GitHub tag v${version} has no tag object identity`);
        const tag = parseJsonOutput(await invoke('gh', ['api', `repos/${repository}/git/tags/${target.sha}`], options));
        target = tag?.object;
      }
      if (!target?.sha || target.type !== 'commit') throw new Error(`GitHub tag v${version} does not resolve to a commit`);
      return target.sha;
    },
    createRelease(version, releaseSha, options = {}) {
      const args = ['release', 'create', `v${version}`];
      if (options.verifyTag) args.push('--verify-tag');
      else args.push('--target', releaseSha);
      args.push('--generate-notes');
      return invoke('gh', args, options);
    },
  };
}

function latestValue(value) {
  if (typeof value === 'string') return value;
  return value?.version ?? value?.['dist-tags']?.latest ?? value?.latest;
}

function isNotFound(error) {
  const message = safeError(error).toLowerCase();
  return /(?:not found|404|release does not exist|could not find release)/.test(message);
}

function releaseIdentity(value, version, releaseSha) {
  if (!value || typeof value !== 'object' || value.tagName !== `v${version}`) {
    throw new Error(`Existing GitHub release has the wrong identity for v${version}`);
  }
  const target = value.targetCommitish ?? value.target ?? value.commitish;
  if (target !== releaseSha) {
    throw new Error(`Existing GitHub release v${version} does not identify commit ${releaseSha}`);
  }
  return true;
}

async function verifyExistingRelease(adapter, version, releaseSha, repository) {
  try {
    const existing = await adapter.viewRelease(version, { env: safeEnv(process.env) });
    releaseIdentity(existing, version, releaseSha);
    return { releaseExists: true, tagExists: true };
  } catch (error) {
    if (!isNotFound(error)) throw new Error(`Unable to verify GitHub release identity: ${safeError(error)}`);
    if (repository && typeof adapter.viewTag === 'function') {
      try {
        const tag = await adapter.viewTag(version, repository, { env: safeEnv(process.env) });
        const tagSha = typeof tag === 'string' ? tag : tag?.sha ?? tag?.object?.sha;
        if (!tagSha) throw new Error(`GitHub returned no identity for tag v${version}`);
        if (tagSha !== undefined && tagSha !== releaseSha) {
          throw new Error(`Existing GitHub tag v${version} does not identify commit ${releaseSha}`);
        }
        return { releaseExists: false, tagExists: tagSha === releaseSha };
      } catch (tagError) {
        if (!isNotFound(tagError)) throw new Error(`Unable to verify GitHub tag identity: ${safeError(tagError)}`);
      }
    }
    return { releaseExists: false, tagExists: false };
  }
}

/** Promote one verified candidate and create its release only after fresh latest verification. */
export async function promoteVerifiedRelease({
  packageName = 'joycraft',
  expected,
  report,
  registryReady,
  credential,
  requiredChecks = [],
  completedSteps = [],
  adapter = createPromotionProcessAdapter(),
  repository,
  cacheDir,
  freshCacheDir,
  cwd,
  now = () => new Date(),
  readinessCheck,
} = {}) {
  const name = packageNameForCommand(packageName);
  const credentialInfo = validatePromotionCredential({
    env: process.env,
    now,
    token: credential?.token,
    expiresAt: credential?.expiresAt,
  });
  // This callback is deliberately evaluated on every invocation, including a
  // retry that marks promotion complete.
  const readiness = typeof readinessCheck === 'function' ? await readinessCheck() : registryReady;
  validatePromotionInputs({ expected, report, registryReady: readiness, requiredChecks });
  const completed = normalizedSteps(completedSteps);
  const readOptions = { env: safeEnv(process.env) };
  if (typeof adapter.viewLatest !== 'function') {
    throw new Error('A fresh registry latest reader is required; GitHub release is blocked');
  }
  const initialResult = await adapter.viewLatest(name, { cacheDir, options: readOptions });
  const initial = latestValue(initialResult);
  if (!initial) throw new Error('Unable to read current latest; candidate promotion is blocked');
  if (initial) {
    const comparison = compareVersions(String(initial), expected.version);
    if (comparison > 0) throw new Error(`Refusing to downgrade latest ${initial} to ${expected.version}`);
  }

  const mutationSkipped = completed.has('promotion') || initial === expected.version;
  if (!mutationSkipped) {
    // Revalidate just before the irreversible mutation so an expiring secret
    // cannot pass the earlier gate and be used after its expiry.
    const currentCredential = validatePromotionCredential({
      env: process.env,
      now,
      token: credentialInfo.token,
      expiresAt: credentialInfo.expiresAt,
    });
    const auth = createPromotionAuth(currentCredential.token);
    try {
      const npmEnv = { ...safeEnv(process.env), npm_config_userconfig: auth.userConfig };
      await adapter.promoteLatest(name, expected.version, { env: npmEnv, shell: false });
    } catch (error) {
      throw new Error(`Candidate latest promotion failed: ${safeError(error, [credentialInfo.token])}`);
    } finally {
      rmSync(auth.directory, { recursive: true, force: true });
    }
  }

  // A fresh read is mandatory even when promotion was completed by an earlier
  // attempt. It is the downgrade guard immediately before release creation.
  const freshResult = await adapter.viewLatest(name, { cacheDir, options: readOptions });
  const freshLatest = latestValue(freshResult);
  if (freshLatest && compareVersions(String(freshLatest), expected.version) > 0) {
    throw new Error(`Fresh latest ${freshLatest} is newer than ${expected.version}; GitHub release is blocked`);
  }
  if (freshLatest !== expected.version) {
    throw new Error(`Fresh latest verification returned ${String(freshLatest)} instead of ${expected.version}; GitHub release is blocked`);
  }

  if (typeof adapter.verifyFreshLatest !== 'function') {
    throw new Error('Fresh-client latest installation and integrity verification is required; GitHub release is blocked');
  }
  // Use a disposable project and cache by default. A release helper must not
  // install latest into the checked-out repository while it verifies it.
  const verificationRoot = cwd ? null : mkdtempSync(join(tmpdir(), 'joycraft-promotion-client-'));
  const verificationCwd = cwd ?? verificationRoot;
  const verificationCache = freshCacheDir ?? join(verificationRoot ?? resolve(cwd), 'npm-cache');
  try {
    const verified = await adapter.verifyFreshLatest({
      packageName: name,
      version: expected.version,
      integrity: expected.integrity,
      tarball: expected.tarball,
      descriptor: expected.descriptor,
      cwd: verificationCwd,
      cacheDir: verificationCache,
      options: readOptions,
    });
    if (verified !== true && verified?.ok !== true) {
      throw new Error('Fresh client did not install the exact candidate artifact; GitHub release is blocked');
    }
  } finally {
    if (verificationRoot) rmSync(verificationRoot, { recursive: true, force: true });
  }

  const releaseStatus = await verifyExistingRelease(adapter, expected.version, expected.releaseSha, repository);
  let releaseCreated = false;
  if (!releaseStatus.releaseExists && !completed.has('release')) {
    try {
      await adapter.createRelease(expected.version, expected.releaseSha, { env: safeEnv(process.env), shell: false, verifyTag: releaseStatus.tagExists });
      releaseCreated = true;
    } catch (error) {
      // A concurrent retry may have created it. Accept that only after a new
      // identity read; every other failure remains a hard stop.
      if (!isNotFound(error) && !/already exists|already_exists|422/.test(safeError(error).toLowerCase())) {
        throw new Error(`GitHub release creation failed: ${safeError(error)}`);
      }
      const recovered = await verifyExistingRelease(adapter, expected.version, expected.releaseSha, repository);
      if (!recovered.releaseExists) throw new Error(`GitHub release creation did not produce v${expected.version}`);
    }
  }
  return {
    promoted: true,
    promotionSkipped: mutationSkipped,
    version: expected.version,
    freshLatest,
    releaseCreated,
    releaseExists: releaseStatus.releaseExists || releaseCreated || completed.has('release'),
    credential: credentialInfo.tokenName,
    readinessRerun: typeof readinessCheck === 'function',
  };
}

function readOption(args, name) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'credential-check') {
    const credential = validatePromotionCredential();
    // Deliberately omit the secret itself from stdout and stderr.
    console.log(JSON.stringify({ valid: credential.valid, tokenName: credential.tokenName, expiresAt: credential.expiresAt }, null, 2));
    return;
  }
  if (command === 'promote') {
    const manifestPath = readOption(args, '--manifest');
    const packageName = readOption(args, '--package') ?? 'joycraft';
    const requiredReportPath = readOption(args, '--required-report');
    const checksPath = readOption(args, '--required-checks-file');
    if (!manifestPath || !requiredReportPath || !checksPath) {
      throw new Error('Promotion requires retained manifest, required report, and independently configured checks');
    }
    const retained = await resolveRetainedArtifact({
      manifestPath,
      expected: { releaseSha: readOption(args, '--release-sha'), version: readOption(args, '--version'), packageName },
    });
    const report = JSON.parse(readFileSync(resolve(requiredReportPath), 'utf8'));
    const configured = JSON.parse(readFileSync(resolve(checksPath), 'utf8'));
    const requiredChecks = Array.isArray(configured) ? configured : configured?.requiredChecks;
    if (!Array.isArray(requiredChecks) || requiredChecks.length === 0) throw new Error('Independently configured required checks are missing');
    const adapter = createPromotionProcessAdapter();
    const verificationAdapter = createNpmVerificationAdapter({
      run: (command, commandArgs, options = {}) => defaultRun(command, commandArgs, { ...options, env: safeEnv(options.env) }),
    });
    const nodeLane = readOption(args, '--node') ?? process.versions.node;
    const npmLane = readOption(args, '--npm');
    if (!/^\d+\.\d+\.\d+$/.test(nodeLane) || nodeLane !== process.versions.node) {
      throw new Error(`Promotion requires Node ${nodeLane}; running Node ${process.versions.node}`);
    }
    if (npmLane !== undefined) {
      const npmInvocationInfo = npmInvocation({ env: process.env });
      const npmVersionResult = await defaultRun(npmInvocationInfo.command, [...npmInvocationInfo.prefix, '--version'], { env: safeEnv(process.env) });
      const actualNpm = String(npmVersionResult.stdout ?? '').trim();
      if (actualNpm !== npmLane) throw new Error(`Promotion requires npm ${npmLane}; running npm ${actualNpm}`);
    }
    const readinessPlan = createReadinessPlan({
      packageName,
      version: retained.version,
      runtimeLanes: [{ node: nodeLane, npm: npmLane ?? 'unknown' }],
    });
    const result = await promoteVerifiedRelease({
      packageName,
      expected: retained,
      report,
      requiredChecks,
      adapter,
      repository: process.env.GITHUB_REPOSITORY,
      readinessCheck: async () => ({
        ...(await runRegistryReadiness({
          packageName,
          version: retained.version,
          integrity: retained.integrity,
          descriptor: retained.descriptor,
          adapter: verificationAdapter,
          plan: readinessPlan,
          cacheRoot: readOption(args, '--cache-root'),
          minFreshnessMs: Number(readOption(args, '--min-freshness-ms') ?? MIN_FRESHNESS_MS),
          deadlineMs: Number(readOption(args, '--deadline-ms') ?? DEFAULT_READINESS_DEADLINE_MS),
        })),
        descriptor: retained.descriptor,
      }),
    });
    console.log(JSON.stringify({ ...result, retained: { packageName: retained.packageName, version: retained.version, releaseSha: retained.releaseSha, integrity: retained.integrity } }, null, 2));
    return;
  }
  throw new Error('Usage: release-promotion.mjs <credential-check|promote>');
}

const entrypoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === entrypoint) main().catch(error => { console.error(safeError(error)); process.exitCode = 1; });

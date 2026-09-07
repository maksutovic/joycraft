import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** The npm metadata fields needed to run one exact package release. */
export interface ReleaseVersionMetadata {
  name?: unknown;
  version?: unknown;
  dist?: {
    integrity?: unknown;
    tarball?: unknown;
  };
}

/** The subset of npm's package metadata used by the exact resolver. */
export interface ReleaseMetadata {
  name?: unknown;
  'dist-tags'?: Record<string, unknown>;
  versions?: Record<string, ReleaseVersionMetadata>;
}

export interface ExactRelease {
  packageName: string;
  version: string;
  /** npm's canonical Subresource Integrity value, e.g. sha512-<base64>. */
  integrity: string;
  tarballUrl: string;
}

export interface ReleaseResolutionSuccess {
  ok: true;
  release: ExactRelease;
}

export interface ReleaseResolutionFailure {
  ok: false;
  status: 'unknown' | 'invalid';
  error: string;
}

export type ReleaseResolution = ReleaseResolutionSuccess | ReleaseResolutionFailure;

export type MetadataFetcher = (url: string, init?: RequestInit) => Promise<unknown>;

export interface ResolveExactReleaseOptions {
  packageName?: string;
  /** An exact semver, including an optional prerelease; ranges and tags are rejected. */
  version?: string;
  registry?: string;
  fetchMetadata?: MetadataFetcher;
  timeoutMs?: number;
}

export interface ReleaseProcessResult {
  status: number | null;
  signal?: NodeJS.Signals | null;
  error?: Error | string;
}

export interface ReleaseProcessAdapter {
  spawn: (
    command: string,
    args: string[],
    options: {
      cwd?: string;
      env?: NodeJS.ProcessEnv;
      shell: false;
      stdio: 'inherit';
    },
  ) => ReleaseProcessResult;
}

export interface RunExactReleaseOptions {
  /** Release facts returned by resolveExactRelease. */
  release?: ExactRelease;
  /** Explicit local tarball/path. Supplying this bypasses all registry resolution. */
  localBundle?: string;
  projectPath?: string;
  commandArgs?: readonly string[];
  processAdapter?: ReleaseProcessAdapter;
  platform?: NodeJS.Platform;
  /** Test seam and explicit installation override for Windows npm-cli.js lookup. */
  npmCliPath?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface RunExactReleaseSuccess {
  ok: true;
  status: 0;
  command: string;
  args: string[];
}

export interface RunExactReleaseFailure {
  ok: false;
  status: number | null;
  command?: string;
  args?: string[];
  error: string;
}

export type RunExactReleaseResult = RunExactReleaseSuccess | RunExactReleaseFailure;

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
const DEFAULT_TIMEOUT_MS = 3_000;

// npm accepts semver identifiers made from ASCII alphanumerics and hyphens.
// Keep the parser local so a release specifier cannot contain npm operators,
// whitespace, a shell metacharacter, or an argument separator.
const EXACT_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const PACKAGE_NAME = /^(?:@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/i;
const SHA512_INTEGRITY = /^sha512-([A-Za-z0-9+/]+={0,2})$/;

function invalid(error: string): ReleaseResolutionFailure {
  return { ok: false, status: 'invalid', error };
}

function unknown(error: string): ReleaseResolutionFailure {
  return { ok: false, status: 'unknown', error };
}

function assertPackageName(packageName: unknown): asserts packageName is string {
  if (typeof packageName !== 'string' || !PACKAGE_NAME.test(packageName)) {
    throw new Error(`Invalid npm package name '${String(packageName)}'.`);
  }
}

function assertExactVersion(version: unknown): asserts version is string {
  if (typeof version !== 'string' || !EXACT_VERSION.test(version)) {
    throw new Error(`Release version must be an exact stable or prerelease semver, received '${String(version)}'.`);
  }
}

function assertArgument(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.includes('\0')) {
    throw new Error(`${label} must contain only NUL-free strings.`);
  }
}

function assertIntegrity(integrity: unknown): asserts integrity is string {
  if (typeof integrity !== 'string') throw new Error('Release metadata is missing a sha512 integrity value.');
  const match = SHA512_INTEGRITY.exec(integrity);
  if (!match) throw new Error('Release metadata integrity must use npm sha512 SRI.');
  const encoded = match[1];
  const decoded = Buffer.from(encoded, 'base64');
  if (decoded.length !== 64 || decoded.toString('base64') !== encoded) {
    throw new Error('Release metadata integrity is not a canonical sha512 SRI value.');
  }
}

function assertTarballUrl(tarball: unknown): asserts tarball is string {
  if (typeof tarball !== 'string') throw new Error('Release metadata is missing a tarball URL.');
  let parsed: URL;
  try {
    parsed = new URL(tarball);
  } catch {
    throw new Error('Release metadata tarball URL is invalid.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Release metadata tarball URL must use http or https.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Release metadata tarball URL must not contain credentials.');
  }
}

function registryUrl(registry: string): string {
  let parsed: URL;
  try {
    parsed = new URL(registry);
  } catch {
    throw new Error(`Registry URL is invalid: '${registry}'.`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Registry URL must use http or https.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('Registry URL must not contain credentials, query parameters, or fragments.');
  }
  return parsed.toString().replace(/\/$/, '');
}

function metadataVersion(metadata: ReleaseMetadata, packageName: string, version: string): ExactRelease {
  if (metadata.name !== undefined && metadata.name !== packageName) {
    throw new Error(`Registry metadata package name '${String(metadata.name)}' does not match '${packageName}'.`);
  }
  const versions = metadata.versions;
  if (!versions || typeof versions !== 'object' || Array.isArray(versions)) {
    throw new Error(`Registry metadata has no version '${version}'.`);
  }
  const record = versions[version];
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(`Registry metadata has no version '${version}'.`);
  }
  if (record.name !== undefined && record.name !== packageName) {
    throw new Error(`Registry metadata package name '${String(record.name)}' does not match '${packageName}'.`);
  }
  if (record.version !== undefined && record.version !== version) {
    throw new Error(`Registry metadata version '${String(record.version)}' does not match '${version}'.`);
  }
  const dist = record.dist;
  if (!dist || typeof dist !== 'object' || Array.isArray(dist)) {
    throw new Error(`Registry metadata for '${packageName}@${version}' has no dist record.`);
  }
  assertIntegrity(dist.integrity);
  assertTarballUrl(dist.tarball);
  return { packageName, version, integrity: dist.integrity, tarballUrl: dist.tarball };
}

/** Validate an exact npm metadata record without performing a network request. */
export function validateExactReleaseMetadata(
  metadata: ReleaseMetadata,
  packageName: string,
  version: string,
): ExactRelease {
  assertPackageName(packageName);
  assertExactVersion(version);
  return metadataVersion(metadata, packageName, version);
}

/**
 * Resolve one exact release from one package metadata response.
 *
 * A missing version chooses only the registry's `latest` tag and immediately
 * turns that tag into an exact version. The result contains all facts needed
 * by the runner, so the update engine never needs to resolve `latest` again.
 */
export async function resolveExactRelease(options: ResolveExactReleaseOptions = {}): Promise<ReleaseResolution> {
  const packageName = options.packageName ?? 'joycraft';
  try {
    assertPackageName(packageName);
    if (options.version !== undefined) assertExactVersion(options.version);
    const registry = registryUrl(options.registry ?? DEFAULT_REGISTRY);
    const url = `${registry}/${encodeURIComponent(packageName)}`;
    const fetchMetadata = options.fetchMetadata ?? (async (requestUrl: string, init?: RequestInit): Promise<unknown> => {
      const response = await fetch(requestUrl, init);
      if (!response.ok) throw new Error(`Registry request failed with HTTP ${response.status}.`);
      return response.json();
    });
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) return invalid('Registry timeout must be a positive integer.');
    let metadata: unknown;
    try {
      metadata = await fetchMetadata(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return unknown(message);
    }
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return invalid('Registry returned invalid package metadata.');
    }
    const packageMetadata = metadata as ReleaseMetadata;
    let version = options.version;
    if (version === undefined) {
      const latest = packageMetadata['dist-tags']?.latest;
      try { assertExactVersion(latest); } catch (error) {
        return invalid(error instanceof Error ? error.message : String(error));
      }
      version = latest;
    }
    return { ok: true, release: validateExactReleaseMetadata(packageMetadata, packageName, version) };
  } catch (error) {
    // Malformed caller/configuration or registry data is invalid. Transport
    // failures are returned from the fetch boundary above as unknown. No
    // fallback or synthetic version is ever returned.
    const message = error instanceof Error ? error.message : String(error);
    return invalid(message);
  }
}

function defaultProcessAdapter(): ReleaseProcessAdapter {
  return {
    spawn: (command, args, options) => {
      const child = spawnSync(command, args, options);
      return { status: child.status, signal: child.signal, error: child.error };
    },
  };
}

function resolveWindowsNpmCliPath(explicit: string | undefined, env: NodeJS.ProcessEnv): string {
  const isRegularNpmCli = (candidate: string): boolean => {
    const filename = candidate.replaceAll('\\', '/').split('/').pop()?.toLowerCase();
    if (filename !== 'npm-cli.js') return false;
    try { return statSync(candidate).isFile(); } catch { return false; }
  };
  if (explicit !== undefined) {
    if (isRegularNpmCli(explicit)) return explicit;
    throw new Error('npmCliPath must point to a regular npm-cli.js file.');
  }
  const candidates: string[] = [];
  const add = (candidate: string | undefined): void => {
    if (!candidate || candidate.length === 0) return;
    // npm_execpath is also set by pnpm and yarn. Only npm's actual JS CLI is
    // safe to pass the npm argument vector intended by this runner.
    const filename = candidate.replaceAll('\\', '/').split('/').pop()?.toLowerCase();
    if (filename !== 'npm-cli.js') return;
    candidates.push(candidate);
  };
  const addPrefix = (prefix: string | undefined): void => {
    if (!prefix) return;
    add(join(prefix, 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  };

  add(explicit);
  add(env.npm_execpath);
  add(join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  addPrefix(env.npm_config_prefix);
  addPrefix(env.PREFIX);
  addPrefix(env.APPDATA ? join(env.APPDATA, 'npm') : undefined);
  addPrefix(env.ProgramFiles ? join(env.ProgramFiles, 'nodejs') : undefined);
  const pathValue = env.Path ?? env.PATH;
  if (pathValue) for (const pathEntry of pathValue.split(';')) addPrefix(pathEntry);

  const found = candidates.find(isRegularNpmCli);
  if (found) return found;
  throw new Error('Unable to locate npm-cli.js for Windows execution; provide npmCliPath or install npm alongside Node.js.');
}

function validateArgs(args: readonly string[], label: string): string[] {
  if (!Array.isArray(args)) throw new Error(`${label} must be an argument array.`);
  for (const value of args) assertArgument(value, label);
  return [...args];
}

function validateLocalBundle(bundle: unknown): asserts bundle is string {
  assertArgument(bundle, 'Local bundle');
  if (bundle.trim().length === 0) throw new Error('Local bundle must not be empty.');
}

function runFailure(error: unknown): RunExactReleaseFailure {
  return { ok: false, status: null, error: error instanceof Error ? error.message : String(error) };
}

/**
 * Run the exact package bundle selected by the resolver, or an explicit local
 * bundle. npm receives an argv array and shell execution is disabled.
 */
export function runExactRelease(options: RunExactReleaseOptions): RunExactReleaseResult {
  try {
    const platform = options.platform ?? process.platform;
    const env = options.env ?? process.env;
    const command = platform === 'win32' ? process.execPath : 'npm';
    if (options.release && options.localBundle) throw new Error('Specify either a verified release or a local bundle, not both.');
    if (!options.release && !options.localBundle) throw new Error('An exact release or explicit local bundle is required.');
    let packageSpec = options.localBundle;
    if (packageSpec !== undefined) {
      validateLocalBundle(packageSpec);
    } else {
      const release = options.release!;
      const validated = validateExactReleaseMetadata({
        name: release.packageName,
        versions: { [release.version]: { name: release.packageName, version: release.version, dist: { integrity: release.integrity, tarball: release.tarballUrl } } },
      }, release.packageName, release.version);
      if (validated.integrity !== release.integrity || validated.tarballUrl !== release.tarballUrl) {
        throw new Error('Release facts failed exact metadata validation.');
      }
      validateLocalBundle(`${release.packageName}@${release.version}`);
      // The npm package spec is assembled only from validated package/version
      // fields and is placed after `--`, so package names cannot become npm flags.
      packageSpec = `${release.packageName}@${release.version}`;
    }
    const commandArgs = validateArgs(options.commandArgs ?? ['update'], 'Command arguments');
    if (options.projectPath !== undefined) {
      assertArgument(options.projectPath, 'Project path');
      commandArgs.push(options.projectPath);
    }
    const npmArgs = ['exec', '--yes', '--', packageSpec, ...commandArgs];
    const args = platform === 'win32' ? [resolveWindowsNpmCliPath(options.npmCliPath, env), ...npmArgs] : npmArgs;
    const adapter = options.processAdapter ?? defaultProcessAdapter();
    const processResult = adapter.spawn(command, args, {
      ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
      ...(options.env === undefined ? {} : { env: options.env }),
      shell: false,
      stdio: 'inherit',
    });
    if (processResult.error) {
      return { ok: false, status: processResult.status, command, args, error: processResult.error instanceof Error ? processResult.error.message : String(processResult.error) };
    }
    if (processResult.status !== 0) {
      return { ok: false, status: processResult.status, command, args, error: processResult.signal ? `npm exec terminated by ${processResult.signal}.` : `npm exec exited with status ${String(processResult.status)}.` };
    }
    return { ok: true, status: 0, command, args };
  } catch (error) {
    return runFailure(error);
  }
}

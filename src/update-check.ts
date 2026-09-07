import {
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const CHECK_CACHE_PATH = 'docs/.joycraft/local/check-cache.json';
export const CHECK_SETTINGS_PATH = 'docs/.joycraft/local/settings.json';
export const CHECK_LOCK_PATH = 'docs/.joycraft/local/check.lock';
export const CHECK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const CHECK_DEFAULT_DEADLINE_MS = 3_000;
export const CHECK_MAX_BACKOFF_MS = 60 * 60 * 1000;
export const CHECK_LOCK_TTL_MS = 10_000;

export type CheckPolicy = 'notify' | 'auto-safe' | 'off';
export type CheckStatus = 'available' | 'current' | 'postponed' | 'pending-conflicts' | 'unknown';

export interface CheckMetadata {
  version: string;
  [key: string]: unknown;
}

export interface InstallationCheckState {
  schemaVersion: 1;
  fetchedAt: number;
  version: string;
  failureCount?: number;
  nextRetryAt?: number;
  lastFailureAt?: number;
  lastError?: string;
  [key: string]: unknown;
}

export interface CheckResult {
  status: CheckStatus;
  installedVersion?: string;
  availableVersion?: string;
  policy: CheckPolicy;
  display: boolean;
  explicit: boolean;
  fromCache: boolean;
  diagnostics: string[];
  conflicts: string[];
}

export interface UpdateCheckOptions {
  now?: number | (() => number);
  sessionId?: string;
  explicit?: boolean;
  deadlineMs?: number;
  fetchLatest?: (signal: AbortSignal) => Promise<unknown>;
  installedVersion?: string;
}

export interface ResolveStatusInput {
  installedVersion?: string;
  availableVersion?: string;
  policy?: CheckPolicy;
  explicit?: boolean;
  pendingConflicts?: boolean;
  postponedRelease?: string;
  acknowledgedRelease?: string;
  acknowledgedSession?: string;
  sessionId?: string;
  fromCache?: boolean;
  diagnostics?: string[];
}

export interface ResolvedStatus {
  status: CheckStatus;
  display: boolean;
  diagnostics: string[];
}

interface JsonObject { [key: string]: unknown }

const STABLE_VERSION = /^(\d+)\.(\d+)\.(\d+)$/;
const REGISTRY_URL = 'https://registry.npmjs.org/joycraft/latest';

function object(value: unknown): JsonObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : undefined;
}

function validVersion(value: unknown): value is string {
  return typeof value === 'string' && STABLE_VERSION.test(value);
}

function timestamp(options: UpdateCheckOptions): number {
  return typeof options.now === 'function' ? options.now() : options.now ?? Date.now();
}

/** Compare stable numeric versions. A null result means at least one input is prerelease/malformed. */
export function compareStableVersions(left: string, right: string): number | null {
  const a = left.match(STABLE_VERSION);
  const b = right.match(STABLE_VERSION);
  if (!a || !b) return null;
  for (let i = 1; i <= 3; i += 1) {
    const ai = BigInt(a[i]);
    const bi = BigInt(b[i]);
    if (ai !== bi) return ai > bi ? 1 : -1;
  }
  return 0;
}

function policy(value: unknown): CheckPolicy {
  return value === 'off' || value === 'auto-safe' || value === 'notify' ? value : 'notify';
}

function safeLocalPath(root: string, relative: string): string | undefined {
  let current: string;
  try {
    current = realpathSync(root);
    if (!lstatSync(current).isDirectory()) return undefined;
  } catch { return undefined; }
  const destination = join(current, relative);
  const parts = relative.split('/');
  for (const [index, segment] of parts.entries()) {
    current = join(current, segment);
    try {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink() || (index < parts.length - 1 && !stat.isDirectory())) return undefined;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') break;
      return undefined;
    }
  }
  return destination;
}

function readJson(path: string | undefined): { value?: JsonObject; present: boolean; valid: boolean } {
  if (!path) return { present: true, valid: false };
  if (!existsSync(path)) return { present: false, valid: true };
  try {
    const value = object(JSON.parse(readFileSync(path, 'utf8')));
    return value ? { value, present: true, valid: true } : { present: true, valid: false };
  } catch {
    return { present: true, valid: false };
  }
}

function writeLocalJson(root: string, relative: string, value: JsonObject, existing?: JsonObject): boolean {
  const path = safeLocalPath(root, relative);
  if (!path) return false;
  // Invalid local state is preserved byte-for-byte. Callers can still report
  // safely using defaults, while an explicit settings action can be retried
  // after the user repairs the file.
  if (existing === undefined && existsSync(path)) return false;
  const temp = `${path}.tmp-${process.pid}-${Date.now()}`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(temp, JSON.stringify({ ...(existing ?? {}), ...value }, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
    renameSync(temp, path);
    return true;
  } catch {
    try { unlinkSync(temp); } catch { /* best effort cleanup */ }
    return false;
  }
}

function readSettings(root: string): { settings?: JsonObject; valid: boolean } {
  const result = readJson(safeLocalPath(root, CHECK_SETTINGS_PATH));
  const settings = result.value;
  const validPolicy = (value: unknown): boolean => value === undefined || value === 'notify' || value === 'off' || value === 'auto-safe';
  const validSettings = !settings || (validPolicy(settings.updatePolicy) && validPolicy(settings.policy)
    && (settings.acknowledgedRelease === undefined || typeof settings.acknowledgedRelease === 'string')
    && (settings.acknowledgedSession === undefined || typeof settings.acknowledgedSession === 'string')
    && (settings.postponedRelease === undefined || typeof settings.postponedRelease === 'string'));
  return { settings, valid: result.valid && validSettings };
}

function readManifest(root: string): { version?: string; pending: boolean; conflicts: string[]; valid: boolean; diagnostics: string[] } {
  const paths = ['docs/.joycraft/manifest.json', 'docs/.joycraft/local/manifest.json'];
  const found: Array<{ path: string; data?: JsonObject; valid: boolean }> = [];
  for (const relative of paths) {
    const result = readJson(safeLocalPath(root, relative));
    if (result.present) found.push({ path: relative, data: result.value, valid: result.valid });
  }
  if (found.some((entry) => !entry.valid)) {
    return { pending: false, conflicts: [], valid: false, diagnostics: ['Joycraft installation manifest is invalid or unreadable.'] };
  }
  if (!found.length) return { pending: false, conflicts: [], valid: true, diagnostics: ['No Joycraft installation manifest was found.'] };
  const valid = found.filter((entry): entry is { path: string; data: JsonObject; valid: true } => Boolean(entry.data));
  if (valid.some(({ data }) => data.schemaVersion !== 1
    || typeof data.targetVersion !== 'string'
    || !STABLE_VERSION.test(data.targetVersion)
    || typeof data.bundleIntegrity !== 'string'
    || (data.profile !== 'shared' && data.profile !== 'private')
    || !Array.isArray(data.harnesses)
    || !object(data.files))) {
    return { pending: false, conflicts: [], valid: false, diagnostics: ['Joycraft installation manifest uses an unsupported or invalid schema.'] };
  }
  for (const { data } of valid) {
    for (const entry of Object.values(data.files as JsonObject)) {
      const file = object(entry);
      if (!file || typeof file.vendorVersion !== 'string' || !file.vendorVersion
        || typeof file.vendorHash !== 'string'
        || !['vendor', 'create-once', 'config-patch'].includes(String(file.kind))
        || (file.ownership !== 'verified' && file.ownership !== 'unknown')) {
        return { pending: false, conflicts: [], valid: false, diagnostics: ['Joycraft installation manifest contains an invalid file entry.'] };
      }
    }
  }
  if (valid.length === 2) {
    return { pending: false, conflicts: [], valid: false, diagnostics: ['Both shared and private installation manifests are present; choose one authority.'] };
  }
  const data = valid[0].data;
  const files = object(data.files);
  const conflicts: string[] = [];
  if (data.pendingConflicts !== undefined) {
    if (!Array.isArray(data.pendingConflicts) || data.pendingConflicts.some(path => typeof path !== 'string' || !path)) {
      return { pending: false, conflicts: [], valid: false, diagnostics: ['Joycraft installation pending-conflict state is invalid.'] };
    }
    conflicts.push(...new Set(data.pendingConflicts as string[]));
  } else if (files) {
    for (const [path, raw] of Object.entries(files)) {
      const entry = object(raw);
      // A lagging vendor baseline is actionable only for a vendor artifact.
      // create-once documents and config patches intentionally keep their
      // original revision while the package stamp advances.
      if (!entry || (entry.kind !== 'create-once' && (entry.ownership === 'unknown' || (entry.kind === 'vendor' && entry.vendorVersion !== data.targetVersion)))) conflicts.push(path);
    }
  }
  return { version: data.targetVersion as string, pending: conflicts.length > 0, conflicts, valid: true, diagnostics: [] };
}

function validCache(value: JsonObject | undefined): value is InstallationCheckState {
  return Boolean(value && value.schemaVersion === 1 && typeof value.fetchedAt === 'number' && validVersion(value.version));
}

function cacheResult(root: string): { cache?: InstallationCheckState; writable: boolean } {
  const result = readJson(safeLocalPath(root, CHECK_CACHE_PATH));
  // A JSON object with an unknown/future cache shape is still user state: do
  // not replace it while attempting a refresh.
  return { cache: validCache(result.value) ? result.value : undefined, writable: !result.present || validCache(result.value) };
}

function acquireLock(root: string, now: number): string | undefined {
  const path = safeLocalPath(root, CHECK_LOCK_PATH);
  if (!path) return undefined;
  try { mkdirSync(dirname(path), { recursive: true }); } catch { return undefined; }
  const receipt = JSON.stringify({ pid: process.pid, startedAt: now, token: randomUUID() }) + '\n';
  const attempt = (): string | undefined => {
    let fd: number | undefined;
    try {
      fd = openSync(path, 'wx');
      writeFileSync(fd, receipt, 'utf8');
      return receipt;
    } catch {
      if (fd !== undefined) { try { unlinkSync(path); } catch { /* retain unreadable state */ } }
      return undefined;
    } finally { if (fd !== undefined) { try { closeSync(fd); } catch { /* checking must remain non-blocking */ } } }
  };
  const acquired = attempt();
  if (acquired) return acquired;
  try {
    const raw = readFileSync(path, 'utf8');
    const lock = object(JSON.parse(raw));
    let dead = false;
    if (Number.isInteger(lock?.pid) && Number(lock?.pid) > 0) {
      try { process.kill(Number(lock?.pid), 0); }
      catch (error) { dead = (error as NodeJS.ErrnoException).code === 'ESRCH'; }
    }
    if (dead && typeof lock?.startedAt === 'number' && now - lock.startedAt > CHECK_LOCK_TTL_MS && readFileSync(path, 'utf8') === raw) {
      unlinkSync(path);
      return attempt();
    }
  } catch {
    // Preserve an unreadable lock. Another process may still own it.
  }
  return undefined;
}

function releaseLock(root: string, receipt: string): void {
  const path = safeLocalPath(root, CHECK_LOCK_PATH);
  if (!path) return;
  try { if (readFileSync(path, 'utf8') === receipt) unlinkSync(path); } catch { /* preserve another owner's lock */ }
}

async function withDeadline<T>(task: (signal: AbortSignal) => Promise<T>, deadlineMs: number): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error('Update check timed out.'));
    }, Math.max(1, Math.min(CHECK_DEFAULT_DEADLINE_MS, deadlineMs)));
  });
  try {
    return await Promise.race([task(controller.signal), deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
    controller.abort();
  }
}

async function defaultFetch(signal: AbortSignal): Promise<unknown> {
  const response = await fetch(REGISTRY_URL, { signal });
  if (!response.ok) throw new Error(`Registry returned HTTP ${response.status}.`);
  return response.json();
}

function failureCache(previous: InstallationCheckState | undefined, now: number, error: unknown): InstallationCheckState {
  const count = Math.min((previous?.failureCount ?? 0) + 1, 8);
  const delay = Math.min(1_000 * (2 ** (count - 1)), CHECK_MAX_BACKOFF_MS);
  return {
    ...(previous ?? { schemaVersion: 1, fetchedAt: 0, version: '0.0.0' }),
    failureCount: count,
    lastFailureAt: now,
    nextRetryAt: now + delay,
    lastError: error instanceof Error ? error.message : String(error),
  };
}

function successfulCache(previous: InstallationCheckState | undefined, metadata: CheckMetadata, now: number): InstallationCheckState {
  return { ...(previous ?? { schemaVersion: 1 }), schemaVersion: 1, fetchedAt: now, version: metadata.version, failureCount: 0, nextRetryAt: 0, lastError: undefined };
}

export function resolveUpdateStatus(input: ResolveStatusInput): ResolvedStatus {
  const diagnostics = [...(input.diagnostics ?? [])];
  const policyValue = policy(input.policy);
  if (!input.installedVersion || !input.availableVersion || !validVersion(input.installedVersion) || !validVersion(input.availableVersion)) {
    return { status: 'unknown', display: false, diagnostics: [...diagnostics, 'A stable installed and available version is required.'] };
  }
  const comparison = compareStableVersions(input.availableVersion, input.installedVersion);
  if (comparison === null) return { status: 'current', display: false, diagnostics: [...diagnostics, 'Prerelease or malformed release ignored for automatic selection.'] };
  if (input.pendingConflicts) return { status: 'pending-conflicts', display: false, diagnostics };
  if (comparison <= 0) return { status: 'current', display: false, diagnostics };
  const dismissed = !input.explicit && (input.postponedRelease === input.availableVersion || (input.acknowledgedRelease === input.availableVersion && input.acknowledgedSession === input.sessionId));
  if (dismissed && input.postponedRelease === input.availableVersion) return { status: 'postponed', display: false, diagnostics };
  return { status: 'available', display: (policyValue === 'notify' || input.explicit === true) && !dismissed, diagnostics };
}

export async function checkForUpdate(root: string, options: UpdateCheckOptions = {}): Promise<CheckResult> {
  const now = timestamp(options);
  const explicit = options.explicit === true;
  const sessionId = options.sessionId ?? process.env.JOYCRAFT_SESSION_ID ?? `process-${process.pid}`;
  const settingsResult = readSettings(root);
  const settings = settingsResult.settings;
  const localPolicy = policy(settings?.updatePolicy ?? settings?.policy);
  if (!settingsResult.valid) return { status: 'unknown', policy: localPolicy, display: false, explicit, fromCache: false, diagnostics: ['Joycraft local checker settings are invalid or unreadable.'], conflicts: [] };
  const manifest = readManifest(root);
  if (!manifest.valid) return { status: 'unknown', installedVersion: options.installedVersion, policy: localPolicy, display: false, explicit, fromCache: false, diagnostics: manifest.diagnostics, conflicts: manifest.conflicts };
  const installedVersion = options.installedVersion ?? manifest.version;
  if (localPolicy === 'off' && !explicit) return { status: 'unknown', installedVersion, policy: localPolicy, display: false, explicit, fromCache: false, diagnostics: [], conflicts: manifest.conflicts };
  const { cache, writable } = cacheResult(root);
  const useCache = cache && cache.version !== '0.0.0' && now >= cache.fetchedAt && now - cache.fetchedAt < CHECK_CACHE_TTL_MS;
  let currentCache = cache;
  let fromCache = Boolean(useCache);
  let diagnostics = [...manifest.diagnostics];
  if (!useCache) {
    if (cache?.nextRetryAt && now < cache.nextRetryAt) {
      return { status: 'unknown', installedVersion, policy: localPolicy, display: false, explicit, fromCache: true, diagnostics: [...diagnostics, 'Registry refresh is in bounded backoff.'], conflicts: manifest.conflicts };
    }
    const lockReceipt = acquireLock(root, now);
    if (!lockReceipt) {
      return { status: 'unknown', installedVersion, policy: localPolicy, display: false, explicit, fromCache: false, diagnostics: [...diagnostics, 'Another checker is refreshing registry metadata.'], conflicts: manifest.conflicts };
    }
    try {
      const fetched = await withDeadline(options.fetchLatest ?? defaultFetch, options.deadlineMs ?? CHECK_DEFAULT_DEADLINE_MS);
      const metadata = object(fetched);
      if (!metadata || !validVersion(metadata.version)) throw new Error('Registry metadata did not contain a stable version.');
      currentCache = successfulCache(cache, metadata as CheckMetadata, now);
      if (writable) writeLocalJson(root, CHECK_CACHE_PATH, currentCache, cache as unknown as JsonObject | undefined);
      fromCache = false;
    } catch (error) {
      if (writable) writeLocalJson(root, CHECK_CACHE_PATH, failureCache(cache, now, error), cache as unknown as JsonObject | undefined);
      return { status: 'unknown', installedVersion, policy: localPolicy, display: false, explicit, fromCache: false, diagnostics: [...diagnostics, error instanceof Error ? error.message : String(error)], conflicts: manifest.conflicts };
    } finally {
      releaseLock(root, lockReceipt);
    }
  }
  const resolved = resolveUpdateStatus({
    installedVersion,
    availableVersion: currentCache?.version,
    policy: localPolicy,
    explicit,
    pendingConflicts: manifest.pending,
    postponedRelease: typeof settings?.postponedRelease === 'string' ? settings.postponedRelease : undefined,
    acknowledgedRelease: typeof settings?.acknowledgedRelease === 'string' ? settings.acknowledgedRelease : undefined,
    acknowledgedSession: typeof settings?.acknowledgedSession === 'string' ? settings.acknowledgedSession : undefined,
    sessionId,
    diagnostics,
  });
  return { status: resolved.status, installedVersion, availableVersion: currentCache?.version, policy: localPolicy, display: resolved.display, explicit, fromCache, diagnostics: resolved.diagnostics, conflicts: manifest.conflicts };
}

export function acknowledgeUpdate(root: string, input: { release: string; session: string }): boolean {
  if (!validVersion(input.release) || !input.session) return false;
  const { settings, valid } = readSettings(root);
  if (!valid) return false;
  return writeLocalJson(root, CHECK_SETTINGS_PATH, { acknowledgedRelease: input.release, acknowledgedSession: input.session }, settings);
}

export function postponeUpdate(root: string, release: string): boolean {
  if (!validVersion(release)) return false;
  const { settings, valid } = readSettings(root);
  if (!valid) return false;
  return writeLocalJson(root, CHECK_SETTINGS_PATH, { postponedRelease: release }, settings);
}

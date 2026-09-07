import { existsSync, lstatSync, mkdirSync, openSync, closeSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync, } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
export const CHECK_CACHE_PATH = 'docs/.joycraft/local/check-cache.json';
export const CHECK_SETTINGS_PATH = 'docs/.joycraft/local/settings.json';
export const CHECK_LOCK_PATH = 'docs/.joycraft/local/check.lock';
export const CHECK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const CHECK_DEFAULT_DEADLINE_MS = 3_000;
export const CHECK_MAX_BACKOFF_MS = 60 * 60 * 1000;
export const CHECK_LOCK_TTL_MS = 10_000;
/** Resolve the stable identity used to suppress duplicate notices in one session. */
export function resolveCheckSessionId(explicit) {
    return explicit
        ?? process.env.JOYCRAFT_SESSION_ID
        ?? `parent-${process.ppid}`;
}
const STABLE_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const REGISTRY_URL = 'https://registry.npmjs.org/joycraft/latest';
function object(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}
function validVersion(value) {
    return typeof value === 'string' && STABLE_VERSION.test(value);
}
function timestamp(options) {
    return typeof options.now === 'function' ? options.now() : options.now ?? Date.now();
}
/** Compare stable numeric versions. A null result means at least one input is prerelease/malformed. */
export function compareStableVersions(left, right) {
    const a = left.match(STABLE_VERSION);
    const b = right.match(STABLE_VERSION);
    if (!a || !b)
        return null;
    for (let i = 1; i <= 3; i += 1) {
        const ai = BigInt(a[i]);
        const bi = BigInt(b[i]);
        if (ai !== bi)
            return ai > bi ? 1 : -1;
    }
    return 0;
}
function policy(value) {
    return value === 'off' || value === 'auto-safe' || value === 'notify' ? value : 'notify';
}
function safeLocalPath(root, relative) {
    let current;
    try {
        current = realpathSync(root);
        if (!lstatSync(current).isDirectory())
            return undefined;
    }
    catch {
        return undefined;
    }
    const destination = join(current, relative);
    const parts = relative.split('/');
    for (const [index, segment] of parts.entries()) {
        current = join(current, segment);
        try {
            const stat = lstatSync(current);
            if (stat.isSymbolicLink() || (index < parts.length - 1 && !stat.isDirectory()))
                return undefined;
        }
        catch (error) {
            if (error.code === 'ENOENT')
                break;
            return undefined;
        }
    }
    return destination;
}
function readJson(path) {
    if (!path)
        return { present: true, valid: false };
    if (!existsSync(path))
        return { present: false, valid: true };
    try {
        const value = object(JSON.parse(readFileSync(path, 'utf8')));
        return value ? { value, present: true, valid: true } : { present: true, valid: false };
    }
    catch {
        return { present: true, valid: false };
    }
}
function writeLocalJson(root, relative, value, existing) {
    const path = safeLocalPath(root, relative);
    if (!path)
        return false;
    // Invalid local state is preserved byte-for-byte. Callers can still report
    // safely using defaults, while an explicit settings action can be retried
    // after the user repairs the file.
    if (existing === undefined && existsSync(path))
        return false;
    const temp = `${path}.tmp-${process.pid}-${Date.now()}`;
    try {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(temp, JSON.stringify({ ...(existing ?? {}), ...value }, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
        renameSync(temp, path);
        return true;
    }
    catch {
        try {
            unlinkSync(temp);
        }
        catch { /* best effort cleanup */ }
        return false;
    }
}
function readSettings(root) {
    const result = readJson(safeLocalPath(root, CHECK_SETTINGS_PATH));
    const settings = result.value;
    const validPolicy = (value) => value === undefined || value === 'notify' || value === 'off' || value === 'auto-safe';
    const validSettings = !settings || (validPolicy(settings.updatePolicy) && validPolicy(settings.policy)
        && (settings.acknowledgedRelease === undefined || typeof settings.acknowledgedRelease === 'string')
        && (settings.acknowledgedSession === undefined || typeof settings.acknowledgedSession === 'string')
        && (settings.postponedRelease === undefined || typeof settings.postponedRelease === 'string'));
    return { settings, valid: result.valid && validSettings };
}
/** Read the same validated, project-local policy used by discovery without network work. */
export function readUpdatePolicy(root) {
    const { settings, valid } = readSettings(root);
    return valid ? policy(settings?.updatePolicy ?? settings?.policy) : 'notify';
}
/** A deliberate local preference change; shared installation state is never an authorization source. */
export function setUpdatePolicy(root, value) {
    if (!['notify', 'auto-safe', 'off'].includes(value))
        return false;
    const { settings, valid } = readSettings(root);
    return valid && writeLocalJson(root, CHECK_SETTINGS_PATH, { updatePolicy: value }, settings);
}
function readManifest(root) {
    const paths = ['docs/.joycraft/manifest.json', 'docs/.joycraft/local/manifest.json'];
    const found = [];
    for (const relative of paths) {
        const result = readJson(safeLocalPath(root, relative));
        if (result.present)
            found.push({ path: relative, data: result.value, valid: result.valid });
    }
    if (found.some((entry) => !entry.valid)) {
        return { pending: false, conflicts: [], valid: false, diagnostics: ['Joycraft installation manifest is invalid or unreadable.'] };
    }
    if (!found.length)
        return { pending: false, conflicts: [], valid: true, diagnostics: ['No Joycraft installation manifest was found.'] };
    const valid = found.filter((entry) => Boolean(entry.data));
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
        for (const entry of Object.values(data.files)) {
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
    const conflicts = [];
    if (data.pendingConflicts !== undefined) {
        if (!Array.isArray(data.pendingConflicts) || data.pendingConflicts.some(path => typeof path !== 'string' || !path)) {
            return { pending: false, conflicts: [], valid: false, diagnostics: ['Joycraft installation pending-conflict state is invalid.'] };
        }
        conflicts.push(...new Set(data.pendingConflicts));
    }
    else if (files) {
        for (const [path, raw] of Object.entries(files)) {
            const entry = object(raw);
            // A lagging vendor baseline is actionable only for a vendor artifact.
            // create-once documents and config patches intentionally keep their
            // original revision while the package stamp advances.
            if (!entry || (entry.kind !== 'create-once' && (entry.ownership === 'unknown' || (entry.kind === 'vendor' && entry.vendorVersion !== data.targetVersion))))
                conflicts.push(path);
        }
    }
    return { version: data.targetVersion, pending: conflicts.length > 0, conflicts, valid: true, diagnostics: [] };
}
function validCache(value) {
    return Boolean(value && value.schemaVersion === 1 && typeof value.fetchedAt === 'number' && validVersion(value.version));
}
function cacheResult(root) {
    const result = readJson(safeLocalPath(root, CHECK_CACHE_PATH));
    // A JSON object with an unknown/future cache shape is still user state: do
    // not replace it while attempting a refresh.
    return { cache: validCache(result.value) ? result.value : undefined, writable: !result.present || validCache(result.value) };
}
function acquireLock(root, now) {
    const path = safeLocalPath(root, CHECK_LOCK_PATH);
    if (!path)
        return undefined;
    try {
        mkdirSync(dirname(path), { recursive: true });
    }
    catch {
        return undefined;
    }
    const receipt = JSON.stringify({ pid: process.pid, startedAt: now, token: randomUUID() }) + '\n';
    const attempt = () => {
        let fd;
        try {
            fd = openSync(path, 'wx');
            writeFileSync(fd, receipt, 'utf8');
            return receipt;
        }
        catch {
            if (fd !== undefined) {
                try {
                    unlinkSync(path);
                }
                catch { /* retain unreadable state */ }
            }
            return undefined;
        }
        finally {
            if (fd !== undefined) {
                try {
                    closeSync(fd);
                }
                catch { /* checking must remain non-blocking */ }
            }
        }
    };
    const acquired = attempt();
    if (acquired)
        return acquired;
    try {
        const raw = readFileSync(path, 'utf8');
        const lock = object(JSON.parse(raw));
        let dead = false;
        if (Number.isInteger(lock?.pid) && Number(lock?.pid) > 0) {
            try {
                process.kill(Number(lock?.pid), 0);
            }
            catch (error) {
                dead = error.code === 'ESRCH';
            }
        }
        if (dead && typeof lock?.startedAt === 'number' && now - lock.startedAt > CHECK_LOCK_TTL_MS && readFileSync(path, 'utf8') === raw) {
            unlinkSync(path);
            return attempt();
        }
    }
    catch {
        // Preserve an unreadable lock. Another process may still own it.
    }
    return undefined;
}
function releaseLock(root, receipt) {
    const path = safeLocalPath(root, CHECK_LOCK_PATH);
    if (!path)
        return;
    try {
        if (readFileSync(path, 'utf8') === receipt)
            unlinkSync(path);
    }
    catch { /* preserve another owner's lock */ }
}
async function withDeadline(task, deadlineMs) {
    const controller = new AbortController();
    let timeout;
    const deadline = new Promise((_, reject) => {
        timeout = setTimeout(() => {
            controller.abort();
            reject(new Error('Update check timed out.'));
        }, Math.max(1, Math.min(CHECK_DEFAULT_DEADLINE_MS, deadlineMs)));
    });
    try {
        return await Promise.race([task(controller.signal), deadline]);
    }
    finally {
        if (timeout)
            clearTimeout(timeout);
        controller.abort();
    }
}
async function defaultFetch(signal) {
    const response = await fetch(REGISTRY_URL, { signal });
    if (!response.ok)
        throw new Error(`Registry returned HTTP ${response.status}.`);
    return response.json();
}
function failureCache(previous, now, error) {
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
function successfulCache(previous, metadata, now) {
    return { ...(previous ?? { schemaVersion: 1 }), schemaVersion: 1, fetchedAt: now, version: metadata.version, failureCount: 0, nextRetryAt: 0, lastError: undefined };
}
export function resolveUpdateStatus(input) {
    const diagnostics = [...(input.diagnostics ?? [])];
    const policyValue = policy(input.policy);
    if (!input.installedVersion || !input.availableVersion || !validVersion(input.installedVersion) || !validVersion(input.availableVersion)) {
        return { status: 'unknown', display: false, diagnostics: [...diagnostics, 'A stable installed and available version is required.'] };
    }
    const comparison = compareStableVersions(input.availableVersion, input.installedVersion);
    if (comparison === null)
        return { status: 'current', display: false, diagnostics: [...diagnostics, 'Prerelease or malformed release ignored for automatic selection.'] };
    if (input.pendingConflicts)
        return { status: 'pending-conflicts', display: false, diagnostics };
    if (comparison <= 0)
        return { status: 'current', display: false, diagnostics };
    const dismissed = !input.explicit && (input.postponedRelease === input.availableVersion || (input.acknowledgedRelease === input.availableVersion && input.acknowledgedSession === input.sessionId));
    if (dismissed && input.postponedRelease === input.availableVersion)
        return { status: 'postponed', display: false, diagnostics };
    return { status: 'available', display: (policyValue === 'notify' || input.explicit === true) && !dismissed, diagnostics, ...(policyValue === 'auto-safe' && !dismissed ? { autoSafeCandidate: true } : {}) };
}
export async function checkForUpdate(root, options = {}) {
    const now = timestamp(options);
    const explicit = options.explicit === true;
    const sessionId = resolveCheckSessionId(options.sessionId);
    const settingsResult = readSettings(root);
    const settings = settingsResult.settings;
    const localPolicy = policy(settings?.updatePolicy ?? settings?.policy);
    if (!settingsResult.valid)
        return { status: 'unknown', policy: localPolicy, display: false, explicit, fromCache: false, diagnostics: ['Joycraft local checker settings are invalid or unreadable.'], conflicts: [] };
    const manifest = readManifest(root);
    if (!manifest.valid)
        return { status: 'unknown', installedVersion: options.installedVersion, policy: localPolicy, display: false, explicit, fromCache: false, diagnostics: manifest.diagnostics, conflicts: manifest.conflicts };
    const installedVersion = options.installedVersion ?? manifest.version;
    if (localPolicy === 'off' && !explicit)
        return { status: 'unknown', installedVersion, policy: localPolicy, display: false, explicit, fromCache: false, diagnostics: [], conflicts: manifest.conflicts };
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
            if (!metadata || !validVersion(metadata.version))
                throw new Error('Registry metadata did not contain a stable version.');
            currentCache = successfulCache(cache, metadata, now);
            if (writable)
                writeLocalJson(root, CHECK_CACHE_PATH, currentCache, cache);
            fromCache = false;
        }
        catch (error) {
            if (writable)
                writeLocalJson(root, CHECK_CACHE_PATH, failureCache(cache, now, error), cache);
            return { status: 'unknown', installedVersion, policy: localPolicy, display: false, explicit, fromCache: false, diagnostics: [...diagnostics, error instanceof Error ? error.message : String(error)], conflicts: manifest.conflicts };
        }
        finally {
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
    return {
        status: resolved.status, installedVersion, availableVersion: currentCache?.version, policy: localPolicy,
        display: resolved.display, explicit, fromCache, diagnostics: resolved.diagnostics, conflicts: manifest.conflicts,
        ...(resolved.autoSafeCandidate && currentCache ? {
            automaticUpdate: {
                verificationRequired: true,
                command: ['npm', 'exec', '--yes', '--', `joycraft@${currentCache.version}`, 'update', '--auto-safe', '--non-interactive', '--json'],
            },
        } : {}),
    };
}
export function acknowledgeUpdate(root, input) {
    if (!validVersion(input.release) || !input.session)
        return false;
    const { settings, valid } = readSettings(root);
    if (!valid)
        return false;
    return writeLocalJson(root, CHECK_SETTINGS_PATH, { acknowledgedRelease: input.release, acknowledgedSession: input.session }, settings);
}
export function postponeUpdate(root, release) {
    if (!validVersion(release))
        return false;
    const { settings, valid } = readSettings(root);
    if (!valid)
        return false;
    return writeLocalJson(root, CHECK_SETTINGS_PATH, { postponedRelease: release }, settings);
}

import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname, join as __join } from 'node:path';
const __checkerFile = __fileURLToPath(import.meta.url);
const __checkerRoot = __join(__dirname(__dirname(__checkerFile)), '..');
const __checkerArgs = process.argv.slice(2);
const __sessionIndex = __checkerArgs.indexOf('--session');
const __checkerSession = resolveCheckSessionId(__sessionIndex < 0 ? undefined : __checkerArgs[__sessionIndex + 1]);
if (__checkerArgs[0] === 'check') {
  const result = await checkForUpdate(__checkerRoot, {
    explicit: __checkerArgs.includes('--explicit'), sessionId: __checkerSession,
    ...(process.env.JOYCRAFT_CHECK_FETCH === '0' ? { fetchLatest: async () => { throw new Error('Registry access disabled for this check.'); } } : {}),
  });
  if (__checkerArgs.includes('--json')) console.log(JSON.stringify(result));
  else if (result.display && result.availableVersion) {
    console.log('Joycraft ' + result.availableVersion + ' available (you have ' + (result.installedVersion ?? 'unknown') + '). Finish the active skill, then run the update and restart or reinvoke the skill.');
    acknowledgeUpdate(__checkerRoot, { release: result.availableVersion, session: __checkerSession });
  }
} else if (__checkerArgs[0] === 'acknowledge') {
  console.log(JSON.stringify({ acknowledged: acknowledgeUpdate(__checkerRoot, { release: __checkerArgs[1], session: __checkerSession }) }));
} else if (__checkerArgs[0] === 'postpone') {
  console.log(JSON.stringify({ postponed: postponeUpdate(__checkerRoot, __checkerArgs[1]) }));
} else if (__checkerArgs[0] === 'policy') {
  const updated = setUpdatePolicy(__checkerRoot, __checkerArgs[1]);
  console.log(JSON.stringify({ updated, policy: readUpdatePolicy(__checkerRoot) }));
  if (!updated) process.exitCode = 1;
}

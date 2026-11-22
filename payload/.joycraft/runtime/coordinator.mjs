import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { configFile, parseYaml, readConfig } from './config.mjs';
import { isObject, nonempty, parseJson, readLocal, relativePath, requireValue, validateQueue } from './identity.mjs';

// One session coordinates a queue at a time. The lease is a coordination record
// that every worker tree of the repository can read; it is not authentication.
export const staleMinutesDefault = 30;

/** The main working tree, which all linked worker trees share. */
export function mainTree(root) {
  let listing;
  try { listing = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch { return realpathSync(root); }
  const first = /^worktree (.+)$/m.exec(listing);
  return first && existsSync(first[1]) ? realpathSync(first[1]) : realpathSync(root);
}

const leaseRelative = feature => `.joycraft/local/coordinators/${feature}.json`;
const isSlug = feature => /^[a-z0-9][a-z0-9-]*$/.test(feature ?? '');

export function leasePath(root, feature) {
  requireValue(isSlug(feature), 'A coordinator lease needs a queue feature that is a lowercase slug');
  return path.join(mainTree(root), leaseRelative(feature));
}

function lockIsStale(lock, waitMs) {
  const pid = Number(readFileSync(lock, 'utf8'));
  if (!Number.isInteger(pid) || pid <= 0) return Date.now() - statSync(lock).mtimeMs > waitMs;
  try { process.kill(pid, 0); return false; } catch (error) { return error.code === 'ESRCH'; }
}

// Waiters that see a stale lock take turns through a guard file, so two of them
// cannot both remove it and one remove the other's new lock.
function takeOver(lock, waitMs) {
  const guard = `${lock}.takeover`;
  try { writeFileSync(guard, String(process.pid), { flag: 'wx' }); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    try { if (Date.now() - statSync(guard).mtimeMs > waitMs) rmSync(guard, { force: true }); } catch { /* another waiter removed it */ }
    return;
  }
  try { if (lockIsStale(lock, waitMs)) unlinkSync(lock); } catch { /* the holder released it */ } finally { rmSync(guard, { force: true }); }
}

/** Serialize a read-modify-write of a small local record with an exclusive lock file. */
export function withLock(file, action, { waitMs = 5000 } = {}) {
  const lock = `${file}.lock`;
  mkdirSync(path.dirname(file), { recursive: true });
  const deadline = Date.now() + waitMs;
  for (;;) {
    try { writeFileSync(lock, String(process.pid), { flag: 'wx' }); break; } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      // The lock names its holder. Take it over only when that process is gone, or,
      // for a lock with no readable holder, when it is older than the wait limit.
      let stale = false;
      try { stale = lockIsStale(lock, waitMs); } catch { continue; }
      if (stale) { takeOver(lock, waitMs); continue; }
      requireValue(Date.now() < deadline, `Another Joycraft process holds ${path.basename(lock)}; try again`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  try { return action(); } finally {
    try { if (readFileSync(lock, 'utf8') === String(process.pid)) unlinkSync(lock); } catch { /* already gone */ }
  }
}

/** No lease can exist for a feature name that is not a slug, so 1.0.0 queues keep working. */
export function readLease(root, feature) {
  if (!isSlug(feature)) return null;
  const file = leasePath(root, feature);
  if (!existsSync(file)) return null;
  const lease = parseJson(readFileSync(file), leaseRelative(feature));
  requireValue(isObject(lease) && lease.schemaVersion === 1 && nonempty(lease.sessionId), `Unsupported coordinator lease: ${leaseRelative(feature)}`);
  return lease;
}

/** Create the main checkout's .joycraft/local as a self-ignoring folder before anything is written in it. */
export function ensureLocal(root) {
  const local = path.join(mainTree(root), '.joycraft/local');
  if (!existsSync(local)) {
    mkdirSync(local, { recursive: true, mode: 0o700 });
    writeFileSync(path.join(local, '.gitignore'), '*\n', { flag: 'wx', mode: 0o600 });
  }
}

function writeLease(root, feature, lease) {
  const file = leasePath(root, feature);
  ensureLocal(root);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(lease, null, 2)}\n`);
}

export function queueFeature(root, queuePath) {
  queuePath = relativePath(queuePath);
  const queue = parseJson(readLocal(root, queuePath), queuePath);
  validateQueue(queue, { select: () => false });
  return { feature: queue.feature, queuePath };
}

const isStale = (lease, now, staleMinutes) => now - Date.parse(lease.heartbeatAt) >= staleMinutes * 60_000;
const holder = lease => `session ${lease.sessionId}${lease.host ? ` on ${lease.host}` : ''}`;

/** Claim a queue. A live lease held by another session blocks the claim unless takeOver is set. */
export function claim(options) {
  const { feature } = queueFeature(options.root ?? process.cwd(), options.queuePath);
  ensureLocal(options.root ?? process.cwd());
  return withLock(leasePath(options.root ?? process.cwd(), feature), () => claimLocked(options));
}

function claimLocked({ root = process.cwd(), queuePath, session, host, takeOver = false, staleMinutes = staleMinutesDefault, now = Date.now() }) {
  requireValue(nonempty(session), 'Claiming a queue needs the active host --session ID');
  const { feature, queuePath: queue } = queueFeature(root, queuePath);
  const current = readLease(root, feature);
  const at = new Date(now).toISOString();
  if (current && current.sessionId === session) {
    const lease = { ...current, heartbeatAt: at };
    writeLease(root, feature, lease);
    return { claimed: true, renewed: true, lease };
  }
  if (current && !takeOver) {
    const stale = isStale(current, now, staleMinutes);
    throw new Error(`Queue ${feature} is coordinated by ${holder(current)} (last heartbeat ${current.heartbeatAt}${stale ? ', stale' : ''}). Work under that session, or rerun with --take-over if it has ended.`);
  }
  const lease = {
    schemaVersion: 1, feature, queuePath: queue, sessionId: session, ...(nonempty(host) ? { host } : {}),
    root: path.relative(mainTree(root), realpathSync(root)) || '.', claimedAt: at, heartbeatAt: at,
    ...(current ? { previous: { sessionId: current.sessionId, ...(current.host ? { host: current.host } : {}), heartbeatAt: current.heartbeatAt, stale: isStale(current, now, staleMinutes), takenOverAt: at } } : {}),
  };
  writeLease(root, feature, lease);
  return { claimed: true, renewed: false, lease };
}

function requireHolder(root, queuePath, session) {
  const { feature } = queueFeature(root, queuePath);
  const lease = readLease(root, feature);
  requireValue(lease, `Queue ${feature} has no coordinator lease`);
  requireValue(lease.sessionId === session, `Queue ${feature} is coordinated by ${holder(lease)}, not session ${session}`);
  return { feature, lease };
}

export function heartbeat({ root = process.cwd(), queuePath, session, now = Date.now() }) {
  const { feature } = queueFeature(root, queuePath);
  ensureLocal(root);
  return withLock(leasePath(root, feature), () => {
    const { lease } = requireHolder(root, queuePath, session);
    const next = { ...lease, heartbeatAt: new Date(now).toISOString() };
    writeLease(root, feature, next);
    return { lease: next };
  });
}

export function release({ root = process.cwd(), queuePath, session }) {
  const { feature } = queueFeature(root, queuePath);
  ensureLocal(root);
  return withLock(leasePath(root, feature), () => {
    requireHolder(root, queuePath, session);
    rmSync(leasePath(root, feature));
    return { released: true, feature };
  });
}

export function show({ root = process.cwd(), queuePath, staleMinutes = staleMinutesDefault, now = Date.now() }) {
  const { feature } = queueFeature(root, queuePath);
  const lease = readLease(root, feature);
  return { feature, lease, stale: lease ? isStale(lease, now, staleMinutes) : null };
}

/** joycraft.yaml's `tests:` section: `{ focused?, gate?, full?, gateRuns }`.
 * Bridge until config.mjs reads `tests:` (spec 2): when readConfig has no `tests`, read the section here. */
export function testSettings(root = process.cwd()) {
  const file = path.join(root, configFile);
  const raw = existsSync(file) ? parseYaml(readFileSync(file, 'utf8'))?.tests : undefined;
  let config;
  try { config = readConfig(root); } catch (error) { if (!/unknown section tests/.test(error.message)) throw error; }
  if (isObject(config?.tests)) return config.tests;
  const tests = { gateRuns: raw?.gateRuns === 'wave' ? 'wave' : 'spec' };
  for (const key of ['focused', 'gate', 'full']) if (nonempty(raw?.[key])) tests[key] = raw[key].trim();
  return tests;
}

/** The waves of unfinished specs (dependency levels; done specs are satisfied) and the gate points:
 * one per wave when tests.gateRuns is `wave`, one per spec when it is `spec`. */
export function gatePlan({ root = process.cwd(), queuePath }) {
  queuePath = relativePath(queuePath);
  const queue = parseJson(readLocal(root, queuePath), queuePath);
  validateQueue(queue, { select: () => false });
  const open = new Map(queue.specs.filter(spec => spec.status !== 'done').map(spec => [spec.id, spec]));
  const levels = new Map();
  const level = (id, seen = new Set()) => {
    if (levels.has(id)) return levels.get(id);
    requireValue(!seen.has(id), `Spec ${id} depends on itself through ${[...seen].join(' -> ')}`);
    seen.add(id);
    const deps = (open.get(id).depends_on ?? []).filter(dep => open.has(dep));
    const value = deps.length ? 1 + Math.max(...deps.map(dep => level(dep, seen))) : 0;
    levels.set(id, value);
    return value;
  };
  const waves = [];
  for (const id of open.keys()) (waves[level(id)] ??= []).push(id);
  const { gateRuns } = testSettings(root);
  const gatePoints = gateRuns === 'wave'
    ? waves.map((specs, index) => ({ wave: index + 1, specs }))
    : waves.flatMap((specs, index) => specs.map(id => ({ wave: index + 1, specs: [id] })));
  return { feature: queue.feature, gateRuns, waves, gatePoints };
}

/** For each failing file, the specs whose verification inputs hold it, or `bisect` when none does. */
export function gateOwner({ root = process.cwd(), queuePath, files }) {
  queuePath = relativePath(queuePath);
  requireValue(Array.isArray(files) && files.length > 0, 'gate-owner needs at least one --file <path>');
  const queue = parseJson(readLocal(root, queuePath), queuePath);
  validateQueue(queue, { select: () => false });
  return { feature: queue.feature, files: files.map(file => {
    const wanted = path.posix.normalize(file).replace(/^\.\//, '');
    const specs = queue.specs.filter(spec => (spec.verification?.inputs ?? []).some(input => input?.path === wanted)).map(spec => spec.id);
    return { file: wanted, specs: specs.length ? specs : 'bisect' };
  }) };
}

export async function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === '--take-over') { flags[rest[index]] = true; continue; }
    if (rest[index] === '--file') { (flags['--file'] ??= []).push(rest[index + 1]); index += 1; continue; }
    flags[rest[index]] = rest[index + 1]; index += 1;
  }
  const root = path.resolve(flags['--root'] ?? '.');
  const staleMinutes = flags['--stale-minutes'] === undefined ? staleMinutesDefault : Number(flags['--stale-minutes']);
  requireValue(Number.isFinite(staleMinutes) && staleMinutes > 0, '--stale-minutes must be a positive number');
  const options = { root, queuePath: flags['--queue'], session: flags['--session'], staleMinutes };
  let result;
  if (command === 'claim') result = claim({ ...options, host: flags['--host'], takeOver: flags['--take-over'] === true });
  else if (command === 'heartbeat') result = heartbeat(options);
  else if (command === 'release') result = release(options);
  else if (command === 'show') result = show(options);
  else if (command === 'gate-plan') result = gatePlan(options);
  else if (command === 'gate-owner') result = gateOwner({ ...options, files: flags['--file'] });
  else throw new Error('Usage: coordinator.mjs claim --queue <queue> --session <id> [--host <host>] [--take-over] | heartbeat|release --queue <queue> --session <id> | show|gate-plan --queue <queue> | gate-owner --queue <queue> --file <path>... [--root <project>] [--stale-minutes <n>]');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Coordinator stopped: ${error.message}\n`); process.exitCode = 1; });
}

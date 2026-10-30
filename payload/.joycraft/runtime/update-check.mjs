#!/usr/bin/env node
// Daily check for a newer Joycraft. Prints nothing unless there is something to say,
// and never fails a session. The request is the package metadata only.
import { lstatSync, mkdirSync, openSync, closeSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const registry = 'https://registry.npmjs.org/joycraft/latest';
const day = 24 * 60 * 60 * 1000;
const retryAfter = 60 * 60 * 1000;
const snoozeFor = 7 * day;
const lockFor = 10_000;
const deadline = 2_000;
const stable = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const policies = ['notify', 'auto-safe', 'off'];

const readJson = path => {
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
};

/** Return the path of a file in .joycraft/local, or null when a parent is a link. */
function localPath(root, name) {
  let current = resolve(root);
  for (const part of ['.joycraft', 'local']) {
    current = join(current, part);
    try { if (!lstatSync(current).isDirectory()) return null; }
    catch (error) {
      if (error.code !== 'ENOENT') return null;
      mkdirSync(current);
    }
  }
  return join(current, name);
}

function writeLocal(root, name, value) {
  const path = localPath(root, name);
  if (!path) return false;
  const temporary = `${path}.${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, path);
  return true;
}

export function isNewer(candidate, installed) {
  const a = candidate.match(stable), b = installed.match(stable);
  if (!a || !b) return false;
  for (let i = 1; i <= 3; i += 1) if (BigInt(a[i]) !== BigInt(b[i])) return BigInt(a[i]) > BigInt(b[i]);
  return false;
}

const updateKind = (latest, installed) => latest.split('.')[0] === installed.split('.')[0] ? 'patch' : 'migration';
const oneLine = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) : '';

function holdLock(root) {
  const path = localPath(root, 'update-check.lock');
  if (!path) return null;
  try { if (Date.now() - statSync(path).mtimeMs > lockFor) unlinkSync(path); } catch { /* no lock yet */ }
  try { closeSync(openSync(path, 'wx')); return () => { try { unlinkSync(path); } catch { /* already gone */ } }; }
  catch { return null; }
}

/** One network read per day; concurrent sessions and failures fall back to the cache. */
async function latestRelease(root, { fetcher, now }) {
  const cachePath = localPath(root, 'update-check.json');
  if (!cachePath) return null;
  const cache = readJson(cachePath);
  if (typeof cache.fetchedAt === 'number' && now - cache.fetchedAt < day) return cache;
  if (typeof cache.failedAt === 'number' && now - cache.failedAt < retryAfter) return cache;
  const release = holdLock(root);
  if (!release) return cache;
  try {
    const response = await fetcher(registry, { signal: AbortSignal.timeout(deadline), headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`registry ${response.status}`);
    const metadata = await response.json();
    if (typeof metadata?.version !== 'string' || !stable.test(metadata.version)) throw new Error('not a stable release');
    const notes = metadata.joycraft?.release === metadata.version ? metadata.joycraft : {};
    const fresh = { fetchedAt: now, version: metadata.version, summary: oneLine(notes.summary), autoSafeEligible: notes.autoSafeEligible === true };
    writeLocal(root, 'update-check.json', fresh);
    return fresh;
  } catch {
    writeLocal(root, 'update-check.json', { ...cache, failedAt: now });
    return cache;
  } finally { release(); }
}

export async function check(root, { fetcher = fetch, now = Date.now() } = {}) {
  const installed = readJson(join(root, '.joycraft/installation.json')).joycraft;
  if (typeof installed !== 'string' || !stable.test(installed)) return null;
  const { update = {} } = readJson(join(root, '.joycraft/local/preferences.json'));
  const policy = policies.includes(update.policy) ? update.policy : 'notify';
  if (policy === 'off') return null;
  const cache = await latestRelease(root, { fetcher, now });
  const latest = cache?.version;
  if (typeof latest !== 'string' || !isNewer(latest, installed)) return null;
  if (update.snoozed?.version === latest && now < update.snoozed.until) return null;
  const kind = updateKind(latest, installed);
  const summary = cache.summary || 'See the changelog for what changed.';
  if (update.pin === true) return { action: 'note', installed, latest, kind, message: `Joycraft ${latest} is available. This project stays on ${installed} by choice.` };
  const action = policy === 'auto-safe' && kind === 'patch' && cache.autoSafeEligible === true ? 'apply' : 'ask';
  return { action, installed, latest, kind, summary, message: `Joycraft ${latest} is available (you have ${installed}; ${kind}). ${summary}` };
}

function savePreference(root, change) {
  const path = localPath(root, 'preferences.json');
  if (!path) throw new Error('.joycraft/local is not a plain directory');
  const preferences = readJson(path);
  return writeLocal(root, 'preferences.json', { ...preferences, update: change(preferences.update ?? {}) });
}

export const snooze = (root, version, now = Date.now()) => {
  if (!stable.test(version ?? '')) throw new Error('Snooze needs a version');
  return savePreference(root, update => ({ ...update, snoozed: { version, until: now + snoozeFor } }));
};

export const setPolicy = (root, policy) => {
  if (!policies.includes(policy)) throw new Error(`Policy must be one of: ${policies.join(', ')}`);
  return savePreference(root, update => ({ ...update, policy }));
};

export const setPin = (root, pin) => savePreference(root, update => ({ ...update, pin }));

export async function main(argv, root = process.cwd(), options) {
  const [command = 'check', value] = argv;
  if (command === 'check') {
    let result = null;
    try { result = await check(root, options); } catch { /* a version check never stops a session */ }
    if (result) console.log(JSON.stringify(result, null, 2));
    return result;
  }
  if (command === 'snooze') return snooze(root, value);
  if (command === 'policy') return setPolicy(root, value);
  if (command === 'pin') return setPin(root, true);
  if (command === 'unpin') return setPin(root, false);
  throw new Error('Use check, snooze <version>, policy notify|auto-safe|off, pin or unpin');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => { console.error(`Update check stopped: ${error.message}`); process.exitCode = 1; });
}

/**
 * A deliberately small, optional last-mile delivery guard.  It observes a
 * committed Git snapshot; it does not review code, authorize a remote, or
 * isolate other writers.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { TextDecoder } from 'node:util';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const utf8 = new TextDecoder('utf-8', { fatal: true });

function run(root, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn('git', ['-C', root, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    const out = []; const err = [];
    child.stdout.on('data', value => out.push(value)); child.stderr.on('data', value => err.push(value));
    child.on('error', reject); child.on('close', code => resolveRun({ code, stdout: Buffer.concat(out), stderr: Buffer.concat(err) }));
  });
}
async function git(root, args) {
  const result = await run(root, args);
  if (result.code !== 0) throw new Error(`git-${args[0]}-failed`);
  return result.stdout;
}
async function gitText(root, args) { return (await git(root, args)).toString('utf8').trim(); }
async function gitOk(root, args) { return (await run(root, args)).code === 0; }
function assertion(value, message) { if (!value) throw new Error(message); }
function lineJson(bytes, path) {
  let text; try { text = utf8.decode(bytes); } catch { throw new Error(`invalid-json-utf8:${path}`); }
  if (path.endsWith('.jsonl')) {
    for (const line of text.split(/\r?\n/)) if (line.trim()) try { JSON.parse(line); } catch { throw new Error(`malformed-json:${path}`); }
  } else try { JSON.parse(text); } catch { throw new Error(`malformed-json:${path}`); }
}

export async function resolveBase(root, base) {
  assertion(typeof base === 'string' && base, 'base-required');
  return gitText(root, ['rev-parse', '--verify', `${base}^{commit}`]);
}

async function mergeState(root) {
  assertion(await gitOk(root, ['diff-index', '--quiet', 'HEAD', '--']), 'tracked-or-index-not-clean');
  assertion((await git(root, ['ls-files', '-u'])).length === 0, 'unresolved-index');
  for (const name of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'REBASE_HEAD']) assertion(!(await gitOk(root, ['rev-parse', '--verify', '-q', name])), 'unfinished-git-operation');
  const gitDir = await gitText(root, ['rev-parse', '--git-dir']);
  const absoluteGitDir = isAbsolute(gitDir) ? gitDir : resolve(root, gitDir);
  try { await stat(join(absoluteGitDir, 'rebase-merge')); throw new Error('unfinished-git-operation'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { await stat(join(absoluteGitDir, 'rebase-apply')); throw new Error('unfinished-git-operation'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}

async function committedJson(root, base, head) {
  const names = (await git(root, ['diff', '--name-only', '-z', '--diff-filter=ACMRT', base, head])).toString('utf8').split('\0').filter(Boolean);
  const checked = [];
  for (const path of names.filter(name => name.endsWith('.json') || name.endsWith('.jsonl'))) {
    lineJson(await git(root, ['show', `${head}:${path}`]), path); checked.push(path);
  }
  return checked;
}

async function trackedManifest(root) {
  const paths = (await git(root, ['ls-files', '-z'])).toString('utf8').split('\0').filter(Boolean);
  const entries = [];
  for (const path of paths) entries.push([path, digest(await readFile(join(root, path)))]);
  return digest(JSON.stringify(entries));
}

async function stableState(root) {
  const head = await gitText(root, ['rev-parse', '--verify', 'HEAD^{commit}']);
  // The index file has volatile cache/extension bytes.  Its tree is the stable
  // semantic binding and changes when a path is staged or its index mode changes.
  const indexTree = await gitText(root, ['write-tree']);
  return { head, indexTree, trackedSha256: await trackedManifest(root) };
}

async function introducedConflictMarkers(root, base, head) {
  const diff = (await git(root, ['diff', '--no-color', '--unified=0', base, head])).toString('utf8');
  return diff.split('\n').some(line => /^\+(?:<{7,}|={7,}|>{7,}|\|{7,})(?:\s|$)/.test(line));
}

/** Check the committed range only. Returns paths and immutable SHA evidence, never file contents. */
export async function checkDelivery({ root = process.cwd(), base } = {}) {
  root = resolve(root); const baseSha = await resolveBase(root, base); const head = await gitText(root, ['rev-parse', '--verify', 'HEAD^{commit}']);
  assertion(await gitOk(root, ['merge-base', '--is-ancestor', baseSha, head]), 'base-not-ancestor-of-head');
  await mergeState(root);
  assertion(!(await introducedConflictMarkers(root, baseSha, head)), 'introduced-conflict-markers');
  const jsonPaths = await committedJson(root, baseSha, head);
  return { ok: true, root, base: baseSha, head, jsonPaths, conflictCheck: 'no-introduced-markers' };
}

function streamReceipt(stream) {
  const hash = createHash('sha256'); let byteCount = 0;
  stream.on('data', value => { byteCount += value.length; hash.update(value); });
  stream.resume();
  return () => ({ byteCount, sha256: hash.digest('hex') });
}
async function invoke(argv, root) {
  assertion(Array.isArray(argv) && argv.length && argv.every(value => typeof value === 'string' && value), 'verifier-required');
  return new Promise((resolveRun, reject) => {
    const child = spawn(argv[0], argv.slice(1), { cwd: root, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    // Drain without retaining potentially private verifier output. Close fires
    // after the pipe closes, so the receipts include all observed bytes.
    const stdout = streamReceipt(child.stdout); const stderr = streamReceipt(child.stderr);
    child.on('error', reject); child.on('close', exitCode => resolveRun({ exitCode, stdout: stdout(), stderr: stderr() }));
  });
}
async function acquireLock(root, remote, branch) {
  const common = await gitText(root, ['rev-parse', '--git-common-dir']); const directory = isAbsolute(common) ? common : resolve(root, common);
  const lock = join(directory, 'joycraft-delivery-locks', digest(`${remote}\0${branch}`));
  await mkdir(dirname(lock), { recursive: true, mode: 0o700 });
  try { await mkdir(lock, { recursive: false, mode: 0o700 }); } catch (error) { if (error.code === 'EEXIST') throw new Error('delivery-lock-exists-manual-diagnosis-required'); throw error; }
  return lock;
}
function validTarget(remote, branch) { return typeof remote === 'string' && remote && !remote.startsWith('-') && typeof branch === 'string' && branch && !branch.startsWith('-') && !/[\s~^:?*\\[\x00]/.test(branch); }

export async function deliver({ root = process.cwd(), base, remote, branch, verifier } = {}) {
  root = resolve(root); assertion(validTarget(remote, branch), 'explicit-remote-and-branch-required');
  const lock = await acquireLock(root, remote, branch);
  try {
    const before = await stableState(root); const checked = await checkDelivery({ root, base });
    assertion(checked.head === before.head, 'head-changed-before-verifier');
    const verifierReceipt = await invoke(verifier, root); assertion(verifierReceipt.exitCode === 0, `verifier-exit-${verifierReceipt.exitCode}`);
    const after = await stableState(root); assertion(JSON.stringify(before) === JSON.stringify(after), 'source-changed-during-verifier');
    await mergeState(root);
    const pushed = await run(root, ['push', remote, `${before.head}:refs/heads/${branch}`]);
    assertion(pushed.code === 0, 'push-failed');
    return { ok: true, ...checked, pushedSha: before.head, remote, branch, verifier: verifierReceipt };
  } finally { await rm(lock, { recursive: true, force: false }); }
}

function usage() { throw new Error('Usage: delivery.mjs check --root <repo> --base <revision> | delivery.mjs push --root <repo> --base <revision> --remote <name> --branch <branch> -- <verifier> [args...]'); }
async function cli(argv) {
  const separator = argv.indexOf('--'); const own = separator < 0 ? argv : argv.slice(0, separator); const verifier = separator < 0 ? [] : argv.slice(separator + 1);
  const command = own.shift(); const flags = {};
  for (let index = 0; index < own.length; index += 2) { const key = own[index]; const value = own[index + 1]; if (!['--root', '--base', '--remote', '--branch'].includes(key) || flags[key] !== undefined || value === undefined) usage(); flags[key] = value; }
  if (!flags['--root'] || !flags['--base']) usage();
  if (command === 'check' && separator < 0) return checkDelivery({ root: flags['--root'], base: flags['--base'] });
  if (command === 'push' && flags['--remote'] && flags['--branch'] && verifier.length) return deliver({ root: flags['--root'], base: flags['--base'], remote: flags['--remote'], branch: flags['--branch'], verifier });
  usage();
}
if (import.meta.url === new URL(process.argv[1], 'file:').href) cli(process.argv.slice(2)).then(result => process.stdout.write(`${JSON.stringify(result)}\n`)).catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });

import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, closeSync, createReadStream, existsSync, readFileSync, fstatSync, fsyncSync, mkdirSync, openSync, readSync, realpathSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const kinds = new Set(['runtime', 'visual', 'structural']);
const methods = new Set(['test', 'command', 'browser', 'manual', 'source']);
const results = new Set(['PASS', 'FAIL', 'UNVERIFIED']);
const text = value => typeof value === 'string' && value.trim().length > 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const texts = value => Array.isArray(value) && value.every(text);
// An argv as `run` emits it: a nonempty string array whose first word is not blank. Later words may be empty.
const commandArgv = value => Array.isArray(value) && value.length > 0
  && value.every(word => typeof word === 'string') && text(value[0]);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
const relativePath = value => text(value) && !/[\\\0]/.test(value)
  && !value.startsWith('/') && !/^[a-z]:/i.test(value)
  && value.split('/').every(part => part !== '' && part !== '.' && part !== '..');

/** Check declared evidence sufficiency, not observational truth or file contents.
 * Identity, receipt bytes, independent review and status writes belong to completion.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateEvidence(report, criteria) {
  const errors = [];
  const requirements = new Map();
  const covered = new Map();
  const fail = message => errors.push(message);

  if (!Array.isArray(criteria) || criteria.length === 0) {
    fail('criteria must be a nonempty array');
  } else {
    criteria.forEach((criterion, index) => {
      const label = `criteria[${index}]`;
      if (!record(criterion) || !text(criterion.id)) {
        fail(`${label} needs an id`);
        return;
      }
      if (requirements.has(criterion.id)) fail(`${label} duplicates criterion ${criterion.id}`);
      if (!record(criterion.requirement) || !relativePath(criterion.requirement.path)
        || !text(criterion.requirement.anchor)) fail(`${label} needs a project-relative requirement path and anchor`);
      if (!Array.isArray(criterion.requiredKinds) || criterion.requiredKinds.length === 0
        || criterion.requiredKinds.some(kind => !kinds.has(kind))
        || new Set(criterion.requiredKinds).size !== criterion.requiredKinds.length) {
        fail(`${label} needs distinct supported requiredKinds`);
        return;
      }
      requirements.set(criterion.id, criterion.requiredKinds);
      covered.set(criterion.id, new Set());
    });
  }

  if (!record(report) || report.schemaVersion !== 1) {
    fail('report must use schemaVersion 1');
    return { ok: false, errors };
  }
  if (!record(report.subject) || !hash(report.subject.identity)) {
    fail('report.subject.identity must be a SHA-256 identity');
  }
  if (!Array.isArray(report.flows)) {
    fail('report.flows must be an array');
    return { ok: false, errors };
  }

  const flowIds = new Set();
  report.flows.forEach((flow, index) => {
    const label = `flows[${index}]`;
    if (!record(flow)) { fail(`${label} must be an object`); return; }
    if (!text(flow.id)) fail(`${label} needs an id`);
    else if (flowIds.has(flow.id)) fail(`${label} duplicates flow ${flow.id}`);
    else flowIds.add(flow.id);
    if (!hash(flow.subjectIdentity) || flow.subjectIdentity !== report.subject?.identity) {
      fail(`${label} does not reference the report subject identity`);
    }
    if (!text(flow.representativeInput)) fail(`${label} needs representative input or initial state`);
    if (!text(flow.expected)) fail(`${label} needs expected behavior`);
    if (!texts(flow.limits)) fail(`${label}.limits must be an array of nonempty strings`);
    const references = Array.isArray(flow.criteria) ? flow.criteria : [];
    if (!texts(flow.criteria) || references.length === 0 || new Set(references).size !== references.length) {
      fail(`${label} needs distinct criterion references`);
    }
    for (const id of references) {
      if (!requirements.has(id)) fail(`${label} references undeclared criterion ${String(id)}`);
    }
    if (!Array.isArray(flow.observations) || flow.observations.length === 0) {
      fail(`${label} needs observations`);
      return;
    }

    flow.observations.forEach((observation, observationIndex) => {
      const at = `${label}.observations[${observationIndex}]`;
      const before = errors.length;
      if (!record(observation)) { fail(`${at} must be an object`); return; }
      if (!kinds.has(observation.kind)) fail(`${at} has an unsupported evidence kind`);
      if (!methods.has(observation.method)) fail(`${at} has an unsupported method`);
      if (!results.has(observation.result)) fail(`${at} has an unsupported result`);
      else if (observation.result !== 'PASS') fail(`${at} remains ${observation.result}`);
      if (observation.cause !== undefined && observation.cause !== 'tool-break') fail(`${at} has an unsupported cause`);
      else if (observation.cause === 'tool-break' && observation.result !== 'UNVERIFIED') {
        fail(`${at}: cause 'tool-break' marks only an UNVERIFIED check, not ${String(observation.result)}`);
      }
      if (!text(observation.actual)) fail(`${at} needs an actual observation`);
      if (observation.method === 'source' && observation.kind !== 'structural') {
        fail(`${at}: a source scan supports structural claims only`);
      }
      if (!Array.isArray(observation.receipts) || observation.receipts.length === 0) {
        fail(`${at} needs supporting receipt references: add "receipts": [{ "path": "<project-relative receipt path>", "sha256": "<its SHA-256>" }] for the receipt that evidence.mjs run --receipt wrote for this check`);
      } else {
        observation.receipts.forEach((receipt, receiptIndex) => {
          if (!record(receipt) || !relativePath(receipt.path) || !hash(receipt.sha256)) {
            fail(`${at}.receipts[${receiptIndex}] needs a project-relative path and SHA-256`);
          }
        });
      }
      if (observation.method === 'test' || observation.method === 'command'
        || observation.command !== undefined) {
        const command = observation.command;
        if (!record(command) || !commandArgv(command.argv)) {
          fail(`${at} needs the executed command argv`);
        }
        if (!record(command) || !Number.isInteger(command.exitCode) || command.exitCode !== 0) {
          fail(`${at} needs actual successful command exitCode 0; unavailable or nonzero is insufficient`);
        }
      }
      if (observation.kind === 'visual') {
        const visual = observation.visual;
        if (!record(visual) || !text(visual.route) || !text(visual.state)) {
          fail(`${at} needs the rendered route and state`);
        }
        if (!record(visual?.viewport) || !Number.isInteger(visual.viewport.width)
          || !Number.isInteger(visual.viewport.height) || visual.viewport.width <= 0 || visual.viewport.height <= 0) {
          fail(`${at} needs a positive viewport width and height`);
        }
        if (visual?.inspected !== true) fail(`${at}: a saved but uninspected render is UNVERIFIED`);
        if (!texts(visual?.interactions)) fail(`${at} needs an array of observed interaction outcomes`);
      }
      if (errors.length === before) {
        for (const id of references) covered.get(id)?.add(observation.kind);
      }
    });
  });

  for (const [id, requiredKinds] of requirements) {
    for (const kind of requiredKinds) {
      if (!covered.get(id).has(kind)) fail(`criterion ${id} lacks PASS ${kind} evidence`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export const defaultTimeoutMs = 300000;
const graceMs = 2000;
const usage = 'Usage: evidence.mjs run --receipt <path>.log [--timeout-ms <n>] [--patch <fault>.diff] -- <command> [args...]';

const refusal = message => Object.assign(new Error(message), { exitCode: 2 });
const refuse = (condition, message) => { if (!condition) throw refusal(message); };

export function gitIgnored(root, relative) {
  try {
    execFileSync('git', ['check-ignore', '-q', '--', relative], { cwd: root, stdio: 'ignore' });
    return true;
  } catch { return false; } // 1: not ignored; anything else: git cannot say, so not ignored.
}

/** The HEAD commit (null outside Git or before the first commit) and whether the tree has changes (null when Git cannot say). */
export function revision(root) {
  const read = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  let commit;
  try { commit = read(['rev-parse', '--verify', '-q', 'HEAD^{commit}']).trim(); } catch { return { commit: null, dirty: false }; }
  let dirty = null;
  try { dirty = read(['status', '--porcelain']).trim() !== ''; } catch { /* git cannot say: null, never a claimed clean tree */ }
  return { commit: /^[0-9a-f]{40}$/.test(commit) ? commit : null, dirty };
}

/** Signal the process group led by pid; false once the group is gone. */
function signalGroup(pid, signal) {
  try { process.kill(-pid, signal); return true; } catch (error) {
    if (error.code === 'ESRCH' || error.code === 'EPERM') return false;
    throw error;
  }
}

/** SIGTERM the group, then SIGKILL whatever is left after the grace period. */
async function endGroup(pid) {
  if (!signalGroup(pid, 'SIGTERM')) return;
  for (const deadline = Date.now() + graceMs; Date.now() < deadline;) {
    await new Promise(resolve => setTimeout(resolve, 50));
    if (!signalGroup(pid, 0)) return;
  }
  signalGroup(pid, 'SIGKILL');
}

/** A new receipt path inside the project that git ignores or that sits in a
 * feature folder under the configured features home. Refuses with exit 2. */
async function receiptFile(root, receipt) {
  const { localPath, relativePath } = await import('./identity.mjs');
  let relative, file;
  try { relative = relativePath(receipt); file = localPath(root, relative, true); }
  catch (error) { throw refusal(`Receipt must be a new project-relative path inside the project: ${error.message}`); }
  refuse(!/\.jsonl?$/i.test(relative), `A raw receipt is not JSON; use a .log path: ${relative}`);
  refuse(!existsSync(file), `Receipt already exists: ${relative}; use a fresh receipt path`);
  const { workPaths } = await import('./config.mjs');
  let features;
  try { features = workPaths(root).features.split('/'); } catch (error) { throw refusal(error.message); }
  const parts = relative.split('/');
  const featureFolder = parts.length > features.length + 1 && features.every((part, index) => parts[index] === part)
    && existsSync(path.join(root, ...parts.slice(0, features.length + 1)));
  refuse(featureFolder || gitIgnored(root, relative),
    `Receipt must be git-ignored or inside a feature folder under ${features.join('/')}/: ${relative}`);
  mkdirSync(path.dirname(file), { recursive: true });
  const inside = path.relative(realpathSync(root), realpathSync(path.dirname(file)));
  refuse(inside === '' || (inside !== '..' && !inside.startsWith(`..${path.sep}`) && !path.isAbsolute(inside)), `Receipt must stay inside the project: ${relative}`);
  return { relative, file };
}

const footerTag = 'joycraft-evidence: ';
const tailLines = 40;

/** The 1-minute load average, or null where the platform has none (Windows reports 0). */
const loadNow = () => (process.platform === 'win32' ? null : os.loadavg()[0]);

/** The last whole lines of a file (up to 256 KiB), as text. When the window starts inside a
 * line, that partial line is dropped, so the text starts at a line start and splits no UTF-8 character. */
function readEnd(file, max = 262144) {
  const fd = openSync(file, 'r');
  try {
    const size = fstatSync(fd).size; const length = Math.min(size, max);
    const buffer = Buffer.alloc(length + 1);
    const start = size - length;
    // One byte more, when there is one, says whether the window starts at a line start.
    const read = readSync(fd, buffer, 0, start > 0 ? length + 1 : length, start > 0 ? start - 1 : 0);
    let bytes = buffer.subarray(0, read);
    if (start > 0) {
      const newline = bytes.indexOf(0x0a);
      bytes = newline < 0 ? Buffer.alloc(0) : bytes.subarray(newline + 1);
    }
    return bytes.toString('utf8');
  } finally { closeSync(fd); }
}

/** Whether a file is empty or ends with a newline. */
function endsAtLineEnd(file) {
  const fd = openSync(file, 'r');
  try {
    const size = fstatSync(fd).size;
    if (size === 0) return true;
    const byte = Buffer.alloc(1);
    readSync(fd, byte, 0, 1, size - 1);
    return byte[0] === 0x0a;
  } finally { closeSync(fd); }
}

/** The file's last line (without its newline), however long, read back in 64 KiB steps. */
function lastLine(file, step = 65536) {
  const fd = openSync(file, 'r');
  try {
    let end = fstatSync(fd).size;
    const one = Buffer.alloc(1);
    if (end > 0) { readSync(fd, one, 0, 1, end - 1); if (one[0] === 0x0a) end -= 1; }
    const chunks = [];
    for (let position = end; position > 0;) {
      const length = Math.min(step, position);
      const chunk = Buffer.alloc(length);
      readSync(fd, chunk, 0, length, position - length);
      position -= length;
      const newline = chunk.lastIndexOf(0x0a);
      if (newline >= 0) { chunks.unshift(chunk.subarray(newline + 1)); break; }
      chunks.unshift(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally { closeSync(fd); }
}

/** The parsed `joycraft-evidence:` footer on a receipt's last line, or null when it has none. */
export function readFooter(file) {
  const last = lastLine(file);
  if (!last.startsWith(footerTag)) return null;
  try { const value = JSON.parse(last.slice(footerTag.length)); return record(value) ? value : null; } catch { return null; }
}

const sha256File = file => (existsSync(file) ? createHash('sha256').update(readFileSync(file)).digest('hex') : null);

/** Check a saved fault before anything runs: a clean tree, a patch that applies, paths inside the project.
 * Returns the patch facts and the hash of every file it touches. Refuses with exit 2. */
function preparePatch(root, patch) {
  refuse(relativePath(patch) && existsSync(path.join(root, patch)), `--patch needs an existing project-relative patch file: ${patch}`);
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  let status;
  try { status = git(['status', '--porcelain']); } catch { throw refusal('--patch needs a Git working tree'); }
  refuse(status.trim() === '', `--patch refuses a dirty tree; commit or remove these changes first:\n${status.trimEnd()}`);
  // A project in a repository subfolder: Git paths are from the repository top, and
  // git apply run here skips paths outside the subfolder without a word, so list them from the top.
  let prefix, top;
  try { prefix = git(['rev-parse', '--show-prefix']).trim(); top = git(['rev-parse', '--show-toplevel']).trim(); }
  catch { throw refusal('--patch needs a Git working tree'); }
  let touched;
  try {
    touched = execFileSync('git', ['apply', '--numstat', '-z', '--', path.resolve(root, patch)], { cwd: top, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      .split('\0').map(entry => entry.replace(/^[-\d]+\t[-\d]+\t/, '')).filter(Boolean);
    git(['apply', '--check', '--', patch]);
  } catch (error) { throw refusal(`The patch does not apply: ${patch}: ${String(error.stderr || error.message).trim()}`); }
  const project = touched.map(file => {
    refuse(file.startsWith(prefix), `The patch touches a path outside the project (${prefix.replace(/\/$/, '') || '.'}): ${file}`);
    const inside = file.slice(prefix.length);
    refuse(relativePath(inside) && inside.split('/')[0] !== '.git', `The patch touches a path outside the project: ${file}`);
    return inside;
  });
  return { path: patch, prefix, sha256: sha256File(path.join(root, patch)), hashes: new Map(project.map(file => [file, sha256File(path.join(root, file))])), tree: treeState(root) };
}

/** What a run could change besides the patched files: the status, HEAD (its commit and branch) and the stash. */
function treeState(root) {
  const read = args => { try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; } };
  return {
    status: (read(['status', '--porcelain', '--untracked-files=all', '-z']) ?? '').split('\0').filter(Boolean),
    head: read(['rev-parse', '--verify', '-q', 'HEAD'])?.trim() ?? null,
    // The branch HEAD names (empty when detached): a checkout -b at the same commit changes only this.
    branch: read(['symbolic-ref', '-q', 'HEAD'])?.trim() ?? '',
    stash: read(['rev-parse', '--verify', '-q', 'refs/stash'])?.trim() ?? null,
  };
}

/** Reverse an applied fault. Restored only when every touched file has its hash from before and
 * the status (the new receipt left out), HEAD's commit and branch and refs/stash are as they were. */
function restorePatch(root, fault, receipt) {
  try { execFileSync('git', ['apply', '-R', '--', fault.path], { cwd: root, stdio: 'ignore' }); } catch { /* the hashes decide */ }
  if (![...fault.hashes].every(([file, before]) => sha256File(path.join(root, file)) === before)) return false;
  const now = treeState(root);
  const own = receipt === undefined ? null : `${fault.prefix}${receipt}`;
  const status = now.status.filter(entry => entry !== `?? ${own}`);
  return now.head === fault.tree.head && now.branch === fault.tree.branch && now.stash === fault.tree.stash && JSON.stringify(status) === JSON.stringify(fault.tree.status);
}

export const envMapPath = '.joycraft/local/evidence-env.json';

/** The machine-local environment map (string names to string values), or null when there is none. Refuses with exit 2. */
function readEnvMap(root) {
  const file = path.join(root, envMapPath);
  if (!existsSync(file)) return null;
  let tracked = false;
  try { execFileSync('git', ['ls-files', '--error-unmatch', '--', envMapPath], { cwd: root, stdio: 'ignore' }); tracked = true; } catch { /* untracked or no Git */ }
  refuse(!tracked, `${envMapPath} is tracked by Git; it must stay machine-local`);
  let inGit = false;
  try { inGit = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() === 'true'; } catch { /* no Git */ }
  refuse(!inGit || gitIgnored(root, envMapPath), `${envMapPath} must be git-ignored, so it stays machine-local; add .joycraft/local/ to .gitignore`);
  let map;
  try { map = JSON.parse(readFileSync(file, 'utf8')); } catch (error) { throw refusal(`${envMapPath} is not valid JSON: ${error.message}`); }
  refuse(record(map) && Object.values(map).every(value => typeof value === 'string'), `${envMapPath} must be a JSON object of string names to string values`);
  for (const [name, value] of Object.entries(map)) {
    refuse(name !== '', `${envMapPath} has an empty name`);
    refuse(!name.includes('='), `${envMapPath} has a name with "=": ${name}`);
    refuse(!name.includes('\0') && !value.includes('\0'), `${envMapPath} has a NUL character in the name or value of ${JSON.stringify(name)}`);
  }
  // CI and JOYCRAFT_EVIDENCE are Joycraft's, in any letter case (Windows names ignore case).
  return Object.fromEntries(Object.entries(map).filter(([name]) => !['CI', 'JOYCRAFT_EVIDENCE'].includes(name.toUpperCase())));
}

/**
 * Run the project's own command once, without a shell, with CI=1 and a time
 * limit. The child's stdout and stderr both go straight to one new receipt
 * file, in the order the child wrote them, as `cmd > receipt 2>&1` would.
 * The child also sees JOYCRAFT_EVIDENCE=1. After it exits, one footer line
 * `joycraft-evidence: <JSON>` (run facts, argv, exitCode, revision, dirty)
 * is appended, and the hash covers it.
 * Returns the observation's `command` and `receipts`, plus `timedOut`,
 * `timeoutMs`, the `revision` it ran on, the run `facts`, the failing `tail`
 * (last 40 output lines) when the exit code is not 0, and the ending
 * `signal` when there was one. Time and load are facts, never a gate.
 * With `patch`, a saved fault is applied to the working tree only (never the
 * index) on a clean tree, then reversed after the run, and every touched file
 * is compared by SHA-256 with its hash from before: `patch.restored`.
 * The machine-local map in .joycraft/local/evidence-env.json is passed to the
 * child (CI and JOYCRAFT_EVIDENCE win); the applied names are listed in `env`.
 * A timeout ends the child's process group (POSIX) or the child (Windows)
 * and gives exitCode null.
 * Every refusal happens before the child starts and carries exitCode 2.
 */
export async function runEvidence({ root = process.cwd(), receipt, timeoutMs = defaultTimeoutMs, argv, patch }) {
  refuse(commandArgv(argv), `A command is needed after --. ${usage}`);
  refuse(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 2 ** 31 - 1, `--timeout-ms must be a whole number of milliseconds from 1 to ${2 ** 31 - 1}`);
  const envMap = readEnvMap(root);
  const applied = envMap && Object.keys(envMap);
  const fault = patch === undefined ? null : preparePatch(root, patch);
  const { relative, file } = await receiptFile(root, receipt);
  const commit = revision(root);
  let fd;
  try { fd = openSync(file, 'wx', 0o644); }
  catch (error) { throw refusal(error.code === 'EEXIST' ? `Receipt already exists: ${relative}; use a fresh receipt path` : `Cannot create receipt ${relative}: ${error.message}`); }
  const posix = process.platform !== 'win32';
  const cores = os.availableParallelism();
  const loadStart = loadNow();
  const started = Date.now();
  // The child runs in its own group, so pass on a stop that reaches only this process. The
  // handlers are in place before the patch is applied: a stop before the child exists still restores it.
  let child = null;
  const stop = signal => {
    if (child?.pid) { if (posix) signalGroup(child.pid, 'SIGKILL'); else child.kill('SIGKILL'); }
    if (fault) restorePatch(root, fault, relative);
    process.exit(128 + (os.constants.signals[signal] ?? 1));
  };
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  for (const signal of signals) process.on(signal, stop);
  try {
    return await runChild();
  } finally { for (const each of signals) process.off(each, stop); }

  async function runChild() {
    if (fault) {
      try { execFileSync('git', ['apply', '--', fault.path], { cwd: root, stdio: 'ignore' }); } catch {
        closeSync(fd); unlinkSync(file);
        throw refusal(`The patch did not apply: ${fault.path}${restorePatch(root, fault, relative) ? '' : '; the tree was NOT restored'}`);
      }
    }
    try {
      child = spawn(argv[0], argv.slice(1), { cwd: root, env: { ...process.env, ...envMap, CI: '1', JOYCRAFT_EVIDENCE: '1' }, stdio: ['ignore', fd, fd], detached: posix, windowsHide: true });
      await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    } catch (error) {
      closeSync(fd);
      unlinkSync(file);
      if (fault && !restorePatch(root, fault, relative)) throw refusal(`Could not start ${argv[0]}: ${error.message}; the patch was NOT restored: ${fault.path}`);
      throw refusal(`Could not start ${argv[0]}: ${error.message}`);
    }
    let timedOut = false;
    const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
    const timer = setTimeout(() => { timedOut = true; if (posix) endGroup(child.pid); else child.kill('SIGKILL'); }, timeoutMs);
    const { code, signal } = await exited;
    clearTimeout(timer);
    // Leftover processes in the group would keep writing to the receipt after it is hashed.
    if (posix) await endGroup(child.pid);
    try { fsyncSync(fd); } finally { closeSync(fd); }
    const patchFacts = fault && { path: fault.path, sha256: fault.sha256, patched: true, restored: restorePatch(root, fault, relative) };
    const exitCode = timedOut ? null : code;
    const wallMs = Date.now() - started;
    const loadEnd = loadNow();
    const facts = loadStart === null
      ? { wallMs, load: null, cores, loaded: null }
      : { wallMs, load: [loadStart, loadEnd], cores, loaded: loadStart > cores };
    const output = readEnd(file);
    const tail = exitCode === 0 ? undefined : output.replace(/\n$/, '').split('\n').slice(-tailLines).join('\n');
    const footer = { ...facts, argv: [...argv], exitCode, timedOut, revision: commit.commit, dirty: commit.dirty, ...(applied ? { env: applied } : {}), ...(patchFacts ? { patch: patchFacts } : {}) };
    appendFileSync(file, `${endsAtLineEnd(file) ? '' : '\n'}${footerTag}${JSON.stringify(footer)}\n`);
    const digest = createHash('sha256');
    for await (const chunk of createReadStream(file)) digest.update(chunk);
    return {
      command: { argv: [...argv], exitCode },
      receipts: [{ path: relative, sha256: digest.digest('hex') }],
      timedOut, timeoutMs, ...(signal ? { signal } : {}), revision: commit, facts,
      ...(tail === undefined ? {} : { tail }), ...(applied ? { env: applied } : {}), ...(patchFacts ? { patch: patchFacts } : {}),
    };
  }
}

export async function main(args = process.argv.slice(2)) {
  const [command, ...rest] = args;
  refuse(command === 'run', usage);
  const end = rest.indexOf('--');
  refuse(end !== -1, `A command is needed after --. ${usage}`);
  const flags = {};
  for (let index = 0; index < end; index += 2) {
    const key = rest[index]; const value = rest[index + 1];
    refuse(['--receipt', '--timeout-ms', '--patch'].includes(key) && index + 1 < end && typeof value === 'string' && value !== '' && flags[key] === undefined, `Invalid or duplicate argument: ${key}. ${usage}`);
    flags[key] = value;
  }
  refuse(flags['--receipt'] !== undefined, `--receipt is required. ${usage}`);
  refuse(flags['--timeout-ms'] === undefined || /^[1-9]\d*$/.test(flags['--timeout-ms']), '--timeout-ms must be a whole number of milliseconds');
  const result = await runEvidence({ receipt: flags['--receipt'], argv: rest.slice(end + 1), patch: flags['--patch'],
    timeoutMs: flags['--timeout-ms'] === undefined ? defaultTimeoutMs : Number(flags['--timeout-ms']) });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  // The receipt is written either way; a failed, killed or timed-out command exits 1. Exit 2 is only for a refusal.
  if (result.command.exitCode !== 0 || result.patch?.restored === false) process.exitCode = 1;
  return result;
}

// Node runs the main module from its real path; resolve symlinks before comparing.
const invoked = (() => { try { return realpathSync(process.argv[1]); } catch { return null; } })();
if (invoked && import.meta.url === pathToFileURL(invoked).href) {
  main().catch(error => { process.stderr.write(`Evidence run stopped: ${error.message}\n`); process.exitCode = error.exitCode ?? 1; });
}

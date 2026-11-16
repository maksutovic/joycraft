import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, createReadStream, existsSync, fsyncSync, mkdirSync, openSync, realpathSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const kinds = new Set(['runtime', 'visual', 'structural']);
const methods = new Set(['test', 'command', 'browser', 'manual', 'source']);
const results = new Set(['PASS', 'FAIL', 'UNVERIFIED']);
const text = value => typeof value === 'string' && value.trim().length > 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const texts = value => Array.isArray(value) && value.every(text);
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
        fail(`${at} needs supporting receipt references`);
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
        if (!record(command) || !texts(command.argv) || command.argv.length === 0) {
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
const usage = 'Usage: evidence.mjs run --receipt <path> [--timeout-ms <n>] -- <command> [args...]';

const refusal = message => Object.assign(new Error(message), { exitCode: 2 });
const refuse = (condition, message) => { if (!condition) throw refusal(message); };

function gitIgnored(root, relative) {
  try {
    execFileSync('git', ['check-ignore', '-q', '--', relative], { cwd: root, stdio: 'ignore' });
    return true;
  } catch { return false; } // 1: not ignored; anything else: git cannot say, so not ignored.
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

/**
 * Run the project's own command once, without a shell, with CI=1 and a time
 * limit. The child's stdout and stderr both go straight to one new receipt
 * file, in the order the child wrote them, as `cmd > receipt 2>&1` would.
 * Returns the observation's `command` and `receipts`, plus `timedOut`,
 * `timeoutMs` and the ending `signal` when there was one. A timeout ends the
 * child's process group (POSIX) or the child (Windows) and gives exitCode null.
 * Every refusal happens before the child starts and carries exitCode 2.
 */
export async function runEvidence({ root = process.cwd(), receipt, timeoutMs = defaultTimeoutMs, argv }) {
  refuse(Array.isArray(argv) && argv.length > 0 && argv.every(value => typeof value === 'string') && argv[0] !== '', `A command is needed after --. ${usage}`);
  refuse(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 2 ** 31 - 1, `--timeout-ms must be a whole number of milliseconds from 1 to ${2 ** 31 - 1}`);
  const { relative, file } = await receiptFile(root, receipt);
  let fd;
  try { fd = openSync(file, 'wx', 0o644); }
  catch (error) { throw refusal(error.code === 'EEXIST' ? `Receipt already exists: ${relative}; use a fresh receipt path` : `Cannot create receipt ${relative}: ${error.message}`); }
  const posix = process.platform !== 'win32';
  let child;
  try {
    child = spawn(argv[0], argv.slice(1), { cwd: root, env: { ...process.env, CI: '1' }, stdio: ['ignore', fd, fd], detached: posix, windowsHide: true });
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
  } catch (error) {
    closeSync(fd);
    unlinkSync(file);
    throw refusal(`Could not start ${argv[0]}: ${error.message}`);
  }
  // The child runs in its own group, so pass on a stop that reaches only this process.
  const stop = signal => { if (posix) signalGroup(child.pid, 'SIGKILL'); else child.kill('SIGKILL'); process.exit(128 + (os.constants.signals[signal] ?? 1)); };
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  for (const signal of signals) process.on(signal, stop);
  let timedOut = false;
  const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
  const timer = setTimeout(() => { timedOut = true; if (posix) endGroup(child.pid); else child.kill('SIGKILL'); }, timeoutMs);
  const { code, signal } = await exited;
  clearTimeout(timer);
  // Leftover processes in the group would keep writing to the receipt after it is hashed.
  if (posix) await endGroup(child.pid);
  for (const each of signals) process.off(each, stop);
  try { fsyncSync(fd); } finally { closeSync(fd); }
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return {
    command: { argv: [...argv], exitCode: timedOut ? null : code },
    receipts: [{ path: relative, sha256: digest.digest('hex') }],
    timedOut, timeoutMs, ...(signal ? { signal } : {}),
  };
}

export async function main(args = process.argv.slice(2)) {
  const [command, ...rest] = args;
  refuse(command === 'run', usage);
  const end = rest.indexOf('--');
  refuse(end !== -1, `A command is needed after --. ${usage}`);
  const flags = {};
  for (let index = 0; index < end; index += 2) {
    const key = rest[index]; const value = rest[index + 1];
    refuse(['--receipt', '--timeout-ms'].includes(key) && index + 1 < end && typeof value === 'string' && value !== '' && flags[key] === undefined, `Invalid or duplicate argument: ${key}. ${usage}`);
    flags[key] = value;
  }
  refuse(flags['--receipt'] !== undefined, `--receipt is required. ${usage}`);
  refuse(flags['--timeout-ms'] === undefined || /^[1-9]\d*$/.test(flags['--timeout-ms']), '--timeout-ms must be a whole number of milliseconds');
  const result = await runEvidence({ receipt: flags['--receipt'], argv: rest.slice(end + 1),
    timeoutMs: flags['--timeout-ms'] === undefined ? defaultTimeoutMs : Number(flags['--timeout-ms']) });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

// Node runs the main module from its real path; resolve symlinks before comparing.
const invoked = (() => { try { return realpathSync(process.argv[1]); } catch { return null; } })();
if (invoked && import.meta.url === pathToFileURL(invoked).href) {
  main().catch(error => { process.stderr.write(`Evidence run stopped: ${error.message}\n`); process.exitCode = error.exitCode ?? 1; });
}

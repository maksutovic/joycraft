import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertReviewAllowed, visibleReports } from './completion.mjs';
import { readConfig } from './config.mjs';
import { readLease } from './coordinator.mjs';
import { prepareDispatch } from './dispatch-preflight.mjs';
import { testChanges } from './test-changes.mjs';
import { traceSpec } from './trace.mjs';
import { canonical, isObject, localPath, readLocal, readQueue, relativePath, requireValue, sha256, snapshot, validateNativeActor } from './identity.mjs';

export const reviewLimit = 3;

/** A review round is one distinct set of reviewed inputs: each bound input's
 * path and normalized sha256. HEAD is left out (implementationRevision, and so
 * subject.identity), so a commit that changes no input keeps the round. Status
 * is already outside the normalized queue and spec hashes. Returns null for a
 * report with no bound inputs. */
export function reviewRoundKey(subject) {
  const inputs = subject?.inputs;
  if (!Array.isArray(inputs) || inputs.length === 0
    || !inputs.every(input => isObject(input) && typeof input.path === 'string' && typeof input.sha256 === 'string')) return null;
  const bound = inputs.map(input => ({ path: input.path, sha256: input.sha256 }))
    .sort((left, right) => left.path.localeCompare(right.path, 'en'));
  return `inputs:${sha256(canonical(bound))}`;
}

/** Earlier reviews of one spec, keyed by reviewRoundKey: repeat reviews of one
 * set of inputs are one round. A report with no bound inputs is its own round,
 * keyed by its path. The spec's own accepted PASS report is not a round. Reports
 * are read from the worker root and the coordinator root, where visibleReports
 * looks for them. */
function earlierReviews({ roots, queuePath, spec }) {
  const rounds = new Map();
  for (const root of roots) {
    for (const { path: file, report } of visibleReports({ root, queuePath, specId: spec.id })) {
      const accepted = spec.acceptedReport;
      if (report.verdict === 'PASS' && accepted?.path === file && sha256(readLocal(root, file)) === accepted.sha256) continue;
      const shown = root === roots[0] ? file : path.join(root, file);
      const key = reviewRoundKey(report.subject) ?? `path:${file}`;
      rounds.set(key, [...(rounds.get(key) ?? []), shown]);
    }
  }
  return rounds;
}

/** One word as a POSIX shell reads it: bare when it holds only safe
 * characters, otherwise single-quoted with each embedded quote as '\''. */
export function shellQuote(word) {
  const text = String(word);
  return /^[A-Za-z0-9_./:=@%+,-]+$/.test(text) ? text : `'${text.replace(/'/g, "'\\''")}'`;
}

/** The words of a command template, split as a shell would: whitespace
 * separates words, single quotes keep everything literal, double quotes keep
 * whitespace and honor a backslash before " or \. */
export function templateWords(template) {
  const words = [];
  let word = null;
  for (let index = 0; index < template.length; index += 1) {
    const char = template[index];
    if (/\s/.test(char)) { if (word !== null) { words.push(word); word = null; } continue; }
    word ??= '';
    if (char === "'") {
      const end = template.indexOf("'", index + 1);
      requireValue(end !== -1, `tests.focused has an unclosed single quote: ${template}`);
      word += template.slice(index + 1, end); index = end;
    } else if (char === '"') {
      let end = index + 1;
      for (; end < template.length && template[end] !== '"'; end += 1) {
        if (template[end] === '\\' && (template[end + 1] === '"' || template[end + 1] === '\\')) end += 1;
        word += template[end];
      }
      requireValue(end < template.length, `tests.focused has an unclosed double quote: ${template}`);
      index = end;
    } else if (char === '\\' && index + 1 < template.length) { word += template[index + 1]; index += 1; }
    else word += char;
  }
  if (word !== null) words.push(word);
  return words;
}

/** The focused test command for a spec: `tests.focused` with `{files}` replaced
 * by the spec's present `check` inputs in queue order, or the files appended
 * when it has no `{files}`. A `{files}` inside a larger word stays in place:
 * the text before it joins the first file and the text after it the last, as
 * an unquoted shell expansion would. Null, with a note, when either is missing. */
export function focusedCommand({ root, spec, config }) {
  const template = config?.tests?.focused;
  const files = spec.verification.inputs.filter(input => input.kind === 'check' && input.state !== 'absent')
    .map(input => relativePath(input.path)).filter(file => existsSync(path.join(root, file)));
  if (!template || files.length === 0) {
    const missing = [!template && 'tests.focused is not recorded in joycraft.yaml', files.length === 0 && 'the spec has no present check input'].filter(Boolean);
    return { focused: null, note: `No focused command: ${missing.join(' and ')}.` };
  }
  const words = templateWords(template);
  const expand = word => {
    const at = word.indexOf('{files}');
    if (at === -1) return [word];
    const expanded = [...files];
    expanded[0] = word.slice(0, at) + expanded[0];
    expanded[expanded.length - 1] += word.slice(at + '{files}'.length);
    return expanded.flatMap((each, index) => (index === expanded.length - 1 ? expand(each) : [each]));
  };
  const argv = words.some(word => word.includes('{files}')) ? words.flatMap(expand) : [...words, ...files];
  return { focused: { command: argv.map(shellQuote).join(' '), argv } };
}

let receiptCounter = 0;

// Each step a worker runs, as one plain command with literal, shell-quoted
// paths, so a worktree-isolated host never refuses a compound form (&&, ;, |,
// $(, heredoc, source or cd) and a path with a space survives the paste.
// Reviewer receipts go to <feature>/reviews/receipts/ beside the review
// evidence; implementer receipts go to <feature>/receipts/.
function workerCommands({ root, queuePath, spec, role, reportPath, featureFolder, focused }) {
  const stamp = `${new Date().toISOString().replace(/[-:.]/g, '')}-${process.pid}-${receiptCounter += 1}`;
  const receiptFolder = role === 'reviewer' ? path.posix.join(featureFolder, 'reviews', 'receipts') : path.posix.join(featureFolder, 'receipts');
  const receipt = path.posix.join(receiptFolder, `spec-${spec.id}-${role}-focused-${stamp}.log`);
  const line = words => words.map(shellQuote).join(' ');
  const steps = {};
  if (focused) steps.evidence = `${line(['node', '.joycraft/runtime/evidence.mjs', 'run', '--receipt', receipt, '--'])} ${focused.command}`;
  if (role === 'implementer') steps.submit = line(['node', '.joycraft/runtime/completion.mjs', 'submit', '--queue', queuePath, '--spec', spec.id]);
  else {
    steps.checkReport = line(['node', '.joycraft/runtime/dispatch-preflight.mjs', 'check-report', '--worker-root', root, '--queue', queuePath, '--spec', spec.id, '--report', reportPath]);
    steps.finalizeReview = line(['node', '.joycraft/runtime/completion.mjs', 'finalize-review', '--queue', queuePath, '--spec', spec.id, '--report', reportPath]);
  }
  return steps;
}

class ReviewLimitError extends Error {
  constructor(message) { super(message); this.exitCode = 2; }
}

// The native hook runtime is optional; without it, startup takes the manual path.
async function hookRuntime() {
  try { return { ...await import('./hooks/context.mjs'), ...await import('./hooks/cli.mjs') }; }
  catch (error) { if (error?.code === 'ERR_MODULE_NOT_FOUND') return null; throw error; }
}

/** Start in the actual worker after the host has supplied its identity.
 * Adapters supply native event fields; CLI users relay observed host identity.
 * Neither interface authenticates a human or invents missing prompt history. */
export async function startDispatch(options, nativeEvent) {
  const root = realpathSync(options.workerRoot);
  requireValue(nativeEvent && typeof nativeEvent.cwd === 'string' && path.isAbsolute(nativeEvent.cwd)
    && realpathSync(nativeEvent.cwd) === root, 'Task startup needs the actual native worker cwd');
  validateNativeActor({ host: options.nativeHost ?? 'claude', sessionId: nativeEvent.session_id,
    ...(nativeEvent.agent_id === undefined ? {} : { agentId: nativeEvent.agent_id }) }, 'Current native worker');
  const outPath = relativePath(options.outPath);
  const output = localPath(root, outPath, true);
  requireValue(!existsSync(output), `Packet output already exists: ${outPath}; use a fresh packet path`);
  // Startup owns the packet directory: it creates a missing one under .joycraft/local/ and checks it is
  // git-ignored, so the worker never chains its own mkdir or git check with startup (a worktree-isolated
  // host refuses git inside a compound command).
  const parentPath = path.posix.dirname(outPath);
  if (!existsSync(path.dirname(output))) {
    requireValue(parentPath === '.joycraft/local' || parentPath.startsWith('.joycraft/local/'),
      `Packet output parent does not exist: ${parentPath}; use a .joycraft/local/ path, which startup creates`);
    mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 });
    // Self-ignoring, like the hook state directory, so a project without a root ignore rule still passes.
    writeFileSync(path.join(path.dirname(output), '.gitignore'), '*\n', { flag: 'wx', mode: 0o600 });
  }
  const parent = realpathSync(path.dirname(output));
  const rel = path.relative(root, parent);
  requireValue(rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel), 'Packet output parent must stay inside the worker root');
  requireValue(gitIgnored(root, outPath), `Packet output must be git-ignored so it never becomes a scope path: ${outPath}; use .joycraft/local/packets/`);
  const { queue, queuePath, spec, specPath } = readQueue({ root, queuePath: options.queuePath, specId: options.specId });
  requireValue(options.role === 'implementer' || options.role === 'reviewer', 'Task startup role must be implementer or reviewer');
  requireValue(options.changesBase === undefined || options.role === 'reviewer', '--changes-base is for reviewer startup');
  // A claimed queue takes work only from its coordinator, so a second session's
  // instructions cannot reach this worker. An unclaimed queue keeps 1.0.0 behavior.
  const lease = readLease(root, queue.feature);
  requireValue(!lease || options.coordinatorSession === lease.sessionId,
    lease && `Queue ${queue.feature} is coordinated by session ${lease.sessionId}${lease.host ? ` on ${lease.host}` : ''}; pass --coordinator-session ${lease.sessionId} only when that session dispatched this task`);
  const coordinator = lease ? { sessionId: lease.sessionId, ...(lease.host ? { host: lease.host } : {}) } : null;
  // A spec gets at most three reviews. A done spec keeps its earlier behavior, and
  // a no-review waiver keeps its own refusal, so both are checked first.
  let rounds;
  if (options.role === 'reviewer' && spec.status !== 'done') {
    const roots = [root];
    if (options.coordinatorRoot !== undefined && existsSync(options.coordinatorRoot)) {
      const coordinatorRoot = realpathSync(options.coordinatorRoot);
      if (coordinatorRoot !== root) roots.push(coordinatorRoot);
    }
    for (const each of roots) assertReviewAllowed({ root: each, queuePath });
    rounds = earlierReviews({ roots, queuePath, spec });
    if (rounds.size > reviewLimit || (rounds.size === reviewLimit && !rounds.has(reviewRoundKey(snapshot({ root, queuePath, specId: spec.id }))))) {
      throw new ReviewLimitError(`Review limit reached: ${queue.feature} spec ${spec.id} (${specPath}) has had ${rounds.size} reviews of different reviewed inputs (${[...rounds.values()].flat().join(', ')}); the limit is ${reviewLimit}. Do not start another review. Record the open findings under "## Decision needed" in ${specPath}, leave the spec in-review, and continue with independent ready work.`);
    }
  }
  // Change scope is opt-in per spec: startup never writes it, and a reviewer
  // without one reviews against the verification inputs alone.
  const packet = prepareDispatch({ ...options, outPath: output });
  const review = rounds === undefined ? {}
    : { reviewRound: rounds.size + (rounds.has(reviewRoundKey(packet.subject)) ? 0 : 1), reviewLimit };
  const runtime = await hookRuntime();
  const hookConfig = runtime ? await runtime.readConfig(root) : { enabled: false };
  const hooks = hookConfig.enabled
    ? { enabled: true, ...await runtime.bindPreparedSource({ event: nativeEvent, packetPath: outPath }) }
    : { enabled: false, eligible: false, reason: runtime ? 'hooks-disabled' : 'hooks-not-installed' };
  // The reviewer sees which criteria have a tagged test. It reports; it never blocks startup.
  let trace;
  if (options.role === 'reviewer') {
    try { const { criteria, untraced, unknownTags, missingFiles, note } = traceSpec({ root, queuePath: options.queuePath, specId: options.specId }); trace = { criteria, untraced, unknownTags, missingFiles, ...(note ? { note } : {}) }; }
    catch (error) { trace = { error: error.message }; }
  }
  // The coordinator passes the spec's captured base; startup never guesses one.
  let changes;
  if (options.changesBase !== undefined) {
    try { changes = testChanges({ root, queuePath, specId: spec.id, base: options.changesBase }); }
    catch (error) { changes = { error: error.message }; }
  }
  let config = null;
  try { config = readConfig(root); } catch { /* A broken joycraft.yaml is reported by config.mjs. */ }
  const { focused, note } = focusedCommand({ root, spec, config });
  const commands = { focused, ...(note ? { note } : {}),
    ...workerCommands({ root, queuePath, spec, role: options.role, reportPath: packet.outputContract.reportPath,
      featureFolder: path.posix.dirname(path.posix.dirname(queuePath)), focused }) };
  return { schemaVersion: 1, packetPath: outPath, packet, hooks, coordinator, ...review, ...(trace ? { trace } : {}), ...(changes ? { testChanges: changes } : {}), commands,
    ready: !hookConfig.enabled || hooks.eligible === true };
}

function gitIgnored(root, relative) {
  try {
    execFileSync('git', ['check-ignore', '-q', '--', relative], { cwd: root, stdio: 'ignore' });
    return true;
  } catch (error) {
    if (error.status === 1) return false;
    throw new Error(`Could not check whether ${relative} is git-ignored`);
  }
}

export async function main(argv = process.argv.slice(2)) {
  const flags = {};
  const allowed = new Set(['--worker-root', '--expected-manifest', '--queue', '--spec', '--role', '--implementer-session',
    '--implementer-host', '--implementer-agent', '--out', '--brief', '--capabilities', '--coordinator', '--parallel',
    '--access', '--base-revision', '--native-session', '--native-agent', '--native-host', '--coordinator-session', '--changes-base']);
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]; const value = argv[index + 1];
    requireValue(allowed.has(key) && typeof value === 'string' && value && !value.startsWith('--') && flags[key] === undefined,
      `Invalid startup argument: ${key}; use named flags with literal values`);
    flags[key] = value;
  }
  for (const key of ['--worker-root', '--expected-manifest', '--queue', '--spec', '--role', '--implementer-session', '--out', '--capabilities', '--native-session']) {
    requireValue(flags[key], `Task startup requires ${key}; native identities must come from the active host`);
  }
  requireValue(/^(?:0|[1-9]\d*)$/.test(flags['--spec']), 'Spec ID must be a nonnegative integer');
  requireValue(flags['--parallel'] === undefined || ['true', 'false'].includes(flags['--parallel']), '--parallel must be true or false');
  requireValue(!flags['--implementer-agent'] || flags['--implementer-host'], 'A native implementer agent ID needs its host');
  const result = await startDispatch({ workerRoot: flags['--worker-root'], expectedManifestPath: flags['--expected-manifest'],
    queuePath: flags['--queue'], specId: Number(flags['--spec']), role: flags['--role'], implementerSessionId: flags['--implementer-session'],
    implementerActor: flags['--implementer-host'] ? { host: flags['--implementer-host'], sessionId: flags['--implementer-session'],
      ...(flags['--implementer-agent'] ? { agentId: flags['--implementer-agent'] } : {}) } : undefined,
    outPath: flags['--out'], briefPath: flags['--brief'], availableCapabilities: flags['--capabilities'].split(',').filter(Boolean),
    coordinatorRoot: flags['--coordinator'], parallel: flags['--parallel'] === undefined ? undefined : flags['--parallel'] === 'true',
    access: flags['--access'], baseRevision: flags['--base-revision'], nativeHost: flags['--native-host'],
    coordinatorSession: flags['--coordinator-session'], changesBase: flags['--changes-base'],
  }, { cwd: flags['--worker-root'], session_id: flags['--native-session'], ...(flags['--native-agent'] ? { agent_id: flags['--native-agent'] } : {}) });
  const { packet, ...status } = result;
  process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
  if (!result.ready) process.exitCode = 2;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Task startup stopped: ${error.message}\n`); process.exitCode = error instanceof ReviewLimitError ? 2 : 1; });
}

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertReviewAllowed, visibleReports } from './completion.mjs';
import { readConfig } from './config.mjs';
import { changedSinceBase, mainTree, readLease, shellQuote } from './coordinator.mjs';
import { gitState, noGitCommit } from './kickoff.mjs';
import { prepareDispatch } from './dispatch-preflight.mjs';
import { testChanges } from './test-changes.mjs';
import { traceSpec } from './trace.mjs';
import { readLedger } from './worktrees.mjs';
import { canonical, isObject, localPath, parseJson, readLocal, readQueue, relativePath, requireValue, sha256, snapshot, validateNativeActor } from './identity.mjs';

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
  // A reopened spec starts a fresh count: reviews from before its last reopen are history.
  const reopenedAt = Date.parse(spec.reopened?.at(-1)?.at ?? '');
  for (const root of roots) {
    for (const { path: file, report } of visibleReports({ root, queuePath, specId: spec.id })) {
      if (Number.isFinite(reopenedAt) && !(Date.parse(report.createdAt) > reopenedAt)) continue;
      const accepted = spec.acceptedReport;
      if (report.verdict === 'PASS' && accepted?.path === file && sha256(readLocal(root, file)) === accepted.sha256) continue;
      const shown = root === roots[0] ? file : path.join(root, file);
      const key = reviewRoundKey(report.subject) ?? `path:${file}`;
      rounds.set(key, [...(rounds.get(key) ?? []), shown]);
    }
  }
  return rounds;
}

export { shellQuote };

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
 * an unquoted shell expansion would. A template with shell syntax outside
 * quotes runs as `sh -c`, so the evidence step runs all of it. Null, with a
 * note, when either is missing or the template has an unclosed quote. */
export function focusedCommand({ root, spec, config }) {
  const template = config?.tests?.focused;
  const files = spec.verification.inputs.filter(input => input.kind === 'check' && input.state !== 'absent')
    .map(input => relativePath(input.path)).filter(file => existsSync(path.join(root, file)));
  if (!template || files.length === 0) {
    const missing = [!template && 'tests.focused is not recorded in joycraft.yaml', files.length === 0 && 'the spec has no present check input'].filter(Boolean);
    return { focused: null, note: `No focused command: ${missing.join(' and ')}.` };
  }
  let argv;
  try { argv = templateArgv(template, files); }
  catch (error) {
    if (/unclosed (single|double) quote/.test(error?.message ?? '')) return { focused: null, note: `No focused command: ${error.message}.` };
    throw error;
  }
  return { focused: { command: argv.map(shellQuote).join(' '), argv } };
}

/** True when a template holds shell syntax outside quotes: &&, ||, ;, |, <, >,
 * $( or a backtick. Quoted text is skipped as templateWords reads it. */
export function hasShellSyntax(template) {
  for (let index = 0; index < template.length; index += 1) {
    const char = template[index];
    if (char === '\\') { index += 1; continue; }
    if (char === "'") { const end = template.indexOf("'", index + 1); if (end === -1) return false; index = end; continue; }
    if (char === '"') {
      let end = index + 1;
      for (; end < template.length && template[end] !== '"'; end += 1) if (template[end] === '\\') end += 1;
      index = end; continue;
    }
    if (';|<>`&'.includes(char) && (char !== '&' || template[index + 1] === '&')) return true;
    if (char === '$' && template[index + 1] === '(') return true;
  }
  return false;
}

/** The argv of a `tests.focused` template for these files: shell words, with
 * `{files}` expanded in place, or the files appended when it has no `{files}`.
 * Only the template's own text is expanded, never a file path, so a path that
 * holds `{files}` stays literal. A template with shell syntax gives
 * `sh -c <template with each file shell-quoted>`. */
export function templateArgv(template, files) {
  const words = templateWords(template);
  if (hasShellSyntax(template)) {
    const quoted = files.map(shellQuote).join(' ');
    return ['sh', '-c', template.includes('{files}') ? template.split('{files}').join(quoted) : `${template} ${quoted}`];
  }
  const expand = word => {
    const parts = word.split('{files}');
    const out = [];
    let current = parts[0];
    for (const part of parts.slice(1)) {
      if (files.length === 1) { current += files[0] + part; continue; }
      out.push(current + files[0], ...files.slice(1, -1));
      current = files[files.length - 1] + part;
    }
    return [...out, current];
  };
  return words.some(word => word.includes('{files}')) ? words.flatMap(expand) : [...words, ...files];
}

let receiptCounter = 0;

// Each step a worker runs, as one plain command with literal, shell-quoted
// paths, so a worktree-isolated host never refuses a compound form (&&, ;, |,
// $(, heredoc, source or cd) and a path with a space survives the paste.
// Reviewer receipts go to <feature>/reviews/receipts/ beside the review
// evidence; implementer receipts go to <feature>/receipts/.
function workerCommands({ root, queuePath, spec, role, reportPath, featureFolder, focused, agentAtFinish = false }) {
  const stamp = `${new Date().toISOString().replace(/[-:.]/g, '')}-${process.pid}-${receiptCounter += 1}`;
  const receiptFolder = role === 'reviewer' ? path.posix.join(featureFolder, 'reviews', 'receipts') : path.posix.join(featureFolder, 'receipts');
  const receipt = path.posix.join(receiptFolder, `spec-${spec.id}-${role}-focused-${stamp}.log`);
  const line = words => words.map(shellQuote).join(' ');
  const steps = {};
  if (focused) steps.evidence = `${line(['node', '.joycraft/runtime/evidence.mjs', 'run', '--receipt', receipt, '--'])} ${focused.command}`;
  if (role === 'implementer') steps.submit = line(['node', '.joycraft/runtime/completion.mjs', 'submit', '--queue', queuePath, '--spec', spec.id]);
  else {
    steps.checkReport = line(['node', '.joycraft/runtime/dispatch-preflight.mjs', 'check-report', '--worker-root', root, '--queue', queuePath, '--spec', spec.id, '--report', reportPath, ...(agentAtFinish ? ['--agent-at-finish', 'true'] : [])]);
    // A same-session child cannot see its own agent ID, so the coordinator binds the ID from the launch result.
    if (agentAtFinish) steps.finish = `Do not run finalize-review. Return the report path: for a PASS the coordinator runs ${line(['node', '.joycraft/runtime/completion.mjs', 'finalize-review', '--queue', queuePath, '--spec', spec.id, '--report', reportPath])} --reviewer-agent <agent ID from the launch result>. For FAIL or UNVERIFIED it runs ${line(['node', '.joycraft/runtime/completion.mjs', 'bind-reviewer', '--queue', queuePath, '--spec', spec.id, '--report', reportPath])} --reviewer-agent <that ID> before any owner decision.`;
    else steps.finalizeReview = line(['node', '.joycraft/runtime/completion.mjs', 'finalize-review', '--queue', queuePath, '--spec', spec.id, '--report', reportPath]);
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
  const packet = prepareDispatch({ ...options, ...parallelWorkspace({ root, spec, options, lease }), outPath: output });
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
    try { const { criteria, untraced, unknownTags, archivedTags, missingFiles, note } = traceSpec({ root, queuePath: options.queuePath, specId: options.specId }); trace = { criteria, untraced, unknownTags, archivedTags, missingFiles, ...(note ? { note } : {}) }; }
    catch (error) { trace = { error: error.message }; }
  }
  // The coordinator passes the spec's captured base; startup never guesses one.
  let changes;
  if (options.changesBase !== undefined) {
    try { changes = testChanges({ root, queuePath, specId: spec.id, base: options.changesBase }); }
    catch (error) { changes = { error: error.message }; }
  }
  // A wrong base never stops startup, but the reviewer must not read an empty list as "no test changes".
  const warnings = changes?.error
    ? [`No changed-test list: ${changes.error}. Startup did not compare test files; ask the coordinator for the spec's captured base before judging test changes.`]
    : [];
  let config = null;
  try { config = readConfig(root); } catch { /* A broken joycraft.yaml is reported by config.mjs. */ }
  const { focused, note } = focusedCommand({ root, spec, config });
  const commands = { focused, ...(note ? { note } : {}),
    ...workerCommands({ root, queuePath, spec, role: options.role, reportPath: packet.outputContract.reportPath,
      featureFolder: path.posix.dirname(path.posix.dirname(queuePath)), focused,
      agentAtFinish: nativeEvent.agent_id === undefined && nativeEvent.session_id === options.implementerSessionId }) };
  // A reviewer's subject is the diff since the base the claim recorded. The declared
  // inputs stay the scope check: a changed file outside them is a note, not a refusal.
  let scope;
  const changed = options.role === 'reviewer' ? changedSinceBase(root, queue.feature) : null;
  if (changed) {
    const inputsOf = item => new Set((item.verification?.inputs ?? []).map(input => relativePath(input.path)));
    const declared = inputsOf(spec);
    // A file another spec of this queue declares is that spec's work in the same wave, not this spec's scope.
    const others = new Set(queue.specs.filter(item => item.id !== spec.id).flatMap(item => [...inputsOf(item)]));
    const siblings = changed.filter(file => !declared.has(file) && others.has(file));
    const outside = changed.filter(file => !declared.has(file) && !others.has(file));
    scope = { diff: ['git', 'diff', lease.baseRevision].join(' '), changed, ...(siblings.length ? { siblings } : {}),
      ...(outside.length ? { outside, note: 'No spec of this queue declares these changed files: file each `outside` path as a `note` finding; it is not a refusal. Do not file `siblings`.' } : {}) };
  }
  const next = options.role === 'implementer' ? commands.submit : commands.checkReport;
  return { schemaVersion: 1, packetPath: outPath, packet, hooks, coordinator, ...review, ...(warnings.length ? { warnings } : {}), ...(trace ? { trace } : {}), ...(changes ? { testChanges: changes } : {}), ...(scope ? { scope } : {}), commands,
    ready: !hookConfig.enabled || hooks.eligible === true, next };
}

export const workspaceFlags = coordinatorRoot => ['--coordinator', coordinatorRoot, '--parallel', 'true', '--access', 'mutating'];

/** An error for a parallel implementer startup without its workspace: main
 * prints the same startup again with the flags added. */
export class MissingWorkspaceError extends Error {
  constructor(message) { super(message); this.missingWorkspace = true; }
}

/** The workspace of a parallel implementer startup that passed no workspace
 * flags: the coordinator root comes from this tree's worktrees.mjs record, else
 * from the queue's coordinator lease. Explicit flags are used as given. */
export function parallelWorkspace({ root, spec, options, lease }) {
  if (options.role !== 'implementer' || spec.execution?.parallel !== true
    || [options.coordinatorRoot, options.parallel, options.access].some(value => value !== undefined)) return {};
  const main = mainTree(root);
  let recorded;
  try { recorded = readLedger(main).trees.find(tree => path.resolve(main, tree.path) === root)?.coordinatorRoot; } catch { /* An unreadable ledger falls back to the lease. */ }
  const relative = recorded ?? lease?.root;
  if (typeof relative !== 'string') {
    throw new MissingWorkspaceError(`Spec ${spec.id} runs in parallel, so startup needs the coordinator's workspace, and neither a worktrees.mjs record for this tree nor a coordinator lease names it. Create worker trees with worktrees.mjs create, or claim the queue with coordinator.mjs claim, or add ${workspaceFlags('<coordinator-root>').join(' ')}`);
  }
  return { coordinatorRoot: path.resolve(main, relative), parallel: true, access: 'mutating' };
}

function gitIgnored(root, relative) {
  try {
    execFileSync('git', ['check-ignore', '-q', '--', relative], { cwd: root, stdio: 'ignore' });
    return true;
  } catch (error) {
    if (error.status === 1) return false;
    if (!gitState(root).commit) throw new Error(noGitCommit('start'));
    throw new Error(`Could not check whether ${relative} is git-ignored`);
  }
}

export const usage = `Usage: node .joycraft/runtime/dispatch-start.mjs \\
  --queue <queue-path> --spec <id> --role implementer|reviewer \\
  [--coordinator-session <coordinator-session-id>] \\
  [--worker-root <absolute-worker-root>] [--expected-manifest <absolute-pinned-manifest>] \\
  [--native-session <your-host-session-id>] [--native-agent <your-host-agent-id>] [--native-host <host>] \\
  [--implementer-session <implementer-session-id>] [--implementer-host <host> --implementer-agent <id>] \\
  [--capabilities filesystem:read,filesystem:write-report[,agent:separate-context]] \\
  [--out .joycraft/local/packets/<packet.json>] \\
  [--coordinator <root> --parallel true|false --access mutating|read-only] [--base-revision <sha>] \\
  [--brief <path>] [--changes-base <sha>] [--json]
Pass --coordinator-session on a claimed queue. The output is the short form; --json prints all of it. A flag you pass wins over its default:
  --worker-root: this folder.
  --expected-manifest: .joycraft/installation.json in the coordinator's tree (this tree's worktrees.mjs record, else the lease), else this folder.
  --native-session: the coordinator lease's session (a child of that session).
  --implementer-session: the native session for an implementer, the lease session for a reviewer.
  --out: a fresh packet under .joycraft/local/packets/.
  --capabilities: filesystem:read,filesystem:write-report, and a reviewer adds agent:separate-context.
    That default is a claim, not an observation: pass --capabilities when the host shows less.
Use host-issued identities only. .joycraft/references/dispatch.md explains each flag.
`;

const requiredFlags = ['--worker-root', '--expected-manifest', '--queue', '--spec', '--role', '--implementer-session', '--out', '--capabilities', '--native-session'];

/** The coordinator lease of the queue at queuePath in root, or null when the
 * queue cannot be read or has no lease. */
function queueLease(root, queuePath) {
  try { return readLease(root, parseJson(readLocal(root, relativePath(queuePath)), queuePath).feature); }
  catch { return null; }
}

/** The coordinator's tree for a worker at root: this tree's worktrees.mjs
 * record, else the queue lease's root, else root itself. The main checkout
 * may be another branch with no install, so it is never the default. */
function coordinatorTree(root, lease) {
  const main = mainTree(root);
  let recorded;
  try { recorded = readLedger(main).trees.find(tree => path.resolve(main, tree.path) === root)?.coordinatorRoot; } catch { /* An unreadable ledger falls back to the lease. */ }
  const relative = recorded ?? lease?.root;
  return typeof relative === 'string' ? path.resolve(main, relative) : root;
}

/** Startup flags with each absent default filled: the worker root from cwd,
 * the expected manifest from the coordinator tree's .joycraft/installation.json,
 * the native and implementer sessions from the coordinator lease, a fresh
 * packet path and the role's capabilities. `--coordinator-session` has no
 * default. Returns the filled flags and every required flag still missing. */
export function startupDefaults(given, cwd = process.cwd()) {
  const flags = { ...given };
  flags['--worker-root'] ??= realpathSync(cwd);
  const root = flags['--worker-root'];
  const lease = flags['--queue'] ? queueLease(root, flags['--queue']) : null;
  flags['--expected-manifest'] ??= path.join(coordinatorTree(root, lease), '.joycraft', 'installation.json');
  if (lease) flags['--native-session'] ??= lease.sessionId;
  if (flags['--role'] === 'implementer') flags['--implementer-session'] ??= flags['--native-session'];
  else if (lease) flags['--implementer-session'] ??= lease.sessionId;
  if (flags['--spec'] && flags['--role']) {
    flags['--out'] ??= `.joycraft/local/packets/spec-${flags['--spec']}-${flags['--role']}-${new Date().toISOString().replace(/[-:.]/g, '')}-${process.pid}.json`;
  }
  if (flags['--role'] === 'implementer' || flags['--role'] === 'reviewer') {
    flags['--capabilities'] ??= ['filesystem:read', 'filesystem:write-report', ...(flags['--role'] === 'reviewer' ? ['agent:separate-context'] : [])].join(',');
  }
  return { flags, missing: requiredFlags.filter(key => !flags[key]) };
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && ['--help', '-h'].includes(argv[0])) { process.stdout.write(usage); return null; }
  const json = argv.includes('--json');
  argv = argv.filter(arg => arg !== '--json');
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
  const { flags: filled, missing } = startupDefaults(flags);
  requireValue(missing.length === 0, `Task startup requires ${missing.join(', ')}; native identities must come from the active host (--help lists each flag and its default)`);
  Object.assign(flags, filled);
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
  const { packet, schemaVersion, hooks, ...short } = result;
  process.stdout.write(`${JSON.stringify(json ? { schemaVersion, hooks, ...short } : { ...short, ...(result.ready ? {} : { hooks }) }, null, 2)}\n`);
  if (!result.ready) process.exitCode = 2;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    // A missing parallel workspace prints the exact startup to run instead.
    const rerun = error.missingWorkspace
      ? `\nRun this startup with the flags added, from the worker root, with the coordinator's root in place of <coordinator-root>:\n${['node', '.joycraft/runtime/dispatch-start.mjs', ...process.argv.slice(2), ...workspaceFlags('<coordinator-root>')].map(shellQuote).join(' ')}`
      : '';
    process.stderr.write(`Task startup stopped: ${error.message}${rerun}\n`); process.exitCode = error instanceof ReviewLimitError ? 2 : 1;
  });
}

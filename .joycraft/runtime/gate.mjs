import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isObject, localPath, parseJson, readLocal } from './identity.mjs';
import { accepted, projectStatus } from './status.mjs';

// The gate answers one question for a hook, CI or a person: does every done
// spec carry an acceptance, and do queue and spec frontmatter agree? A held
// in-review spec is never a failure. Queues written before schemaVersion 1 are
// skipped, so an old project does not block.

function legacySchema(queue) {
  if (!isObject(queue)) return false;
  const version = queue.schemaVersion;
  if (version === undefined || version === null) return true;
  if (typeof version === 'number') return version < 1;
  return typeof version === 'string' && version.trim() !== '' && Number(version) < 1;
}

// A file that does not parse has one next step: repair it and tell the user.
const repair = (file, problem) => `Joycraft gate: ${file} does not parse: ${String(problem).replace(/\.$/, '')}. Repair ${file} and tell the user.`;

// Each drift kind in status.mjs has its own next step. status.mjs --fix repairs
// only an accepted spec without a pending journal; a pending journal needs
// completion.mjs recover and stops there; any other drift is set by hand to the queue's status,
// which is the status authority. An unaccepted done goes back to in-review first.
const setByHand = "set the spec frontmatter to the queue's status by hand and tell the user.";
function driftStep(item, { queuePath, pendingJournal }) {
  if (pendingJournal) return `A completion journal is pending. Run node .joycraft/runtime/completion.mjs recover --queue ${queuePath}. If recovery reports a conflict or an invalid journal, stop and tell the user; do not edit a status.`;
  if (item.fixable) return 'The queue records an accepted completion. Run node .joycraft/runtime/status.mjs --fix';
  if (item.queue === 'done') return `The queue's done has no acceptance. First set the queue back to in-review, as the done line for this spec says. Then ${setByHand}`;
  return setByHand[0].toUpperCase() + setByHand.slice(1);
}

function readRaw(root, queuePath) {
  try { return parseJson(readLocal(root, queuePath), queuePath); } catch { return undefined; }
}

/** Gate findings for a project: unaccepted done specs, drift, and current-schema queues that do not parse. */
export function checkGates(root = process.cwd()) {
  const status = projectStatus({ root });
  const failures = [];
  const skipped = [];
  for (const problem of status.problems) {
    if (problem.queuePath !== undefined) {
      const raw = readRaw(root, problem.queuePath);
      if (legacySchema(raw)) {
        skipped.push({ queuePath: problem.queuePath, schemaVersion: raw.schemaVersion ?? null,
          message: `Joycraft gate: skipped ${problem.queuePath}; ${raw.schemaVersion == null ? 'it has no schemaVersion' : `its schemaVersion ${JSON.stringify(raw.schemaVersion)} predates 1`}.` });
        continue;
      }
      failures.push({ kind: 'queue', queuePath: problem.queuePath, message: repair(problem.queuePath, problem.problem) });
    } else if (problem.specPath === undefined && problem.path !== undefined) {
      // A feature file such as follow-ups.json, keyed by its path.
      failures.push({ kind: 'file', file: problem.path, message: repair(problem.path, problem.problem) });
    } else {
      failures.push({ kind: 'spec', file: problem.specPath, message: repair(problem.specPath, problem.problem) });
    }
  }
  for (const feature of status.features) {
    const queue = parseJson(readLocal(root, feature.queuePath), feature.queuePath);
    for (const spec of queue.specs) {
      if (spec.status !== 'done' || accepted(spec)) continue;
      const file = path.posix.join(path.posix.dirname(feature.queuePath), spec.file);
      failures.push({ kind: 'unaccepted-done', feature: feature.feature, specId: spec.id, file, queuePath: feature.queuePath,
        message: `Joycraft gate: ${feature.feature} spec ${spec.id} (${file}) is done with no accepted report, owner acceptance or waiver. `
          + 'Set it back to in-review in the queue and spec. Do not ask the user: it restores the true status. '
          + 'With no current PASS report, get an independent review, then complete it with '
          + `node .joycraft/runtime/completion.mjs finalize-review --queue ${feature.queuePath} --spec ${spec.id} --report <file>` });
    }
  }
  for (const item of status.legacyDecisions) {
    failures.push({ kind: 'legacy-decision', feature: item.feature, specId: item.specId, file: item.file,
      message: `Joycraft gate: ${item.feature} spec ${item.specId} (${item.file}) was accepted as done before the gates, but its decision file ${item.path} is missing or changed. Restore it from git; if you cannot, stop and tell the user.` });
  }
  const owner = new Map(status.features.flatMap(feature => feature.specs.map(row => [row.file, feature])));
  for (const item of status.drift) {
    const step = driftStep(item, owner.get(item.file));
    failures.push({ kind: 'drift', feature: item.feature, specId: item.specId, file: item.file,
      message: `Joycraft gate: ${item.feature} spec ${item.specId} (${item.file}) drifted: queue says ${item.queue}, spec frontmatter says ${item.frontmatter}. ${step}` });
  }
  return { failures, skipped };
}

// The Claude Code Stop hook. `.claude/settings.json` is the user's file: the
// hook subcommand edits its text in place, so every byte it does not own keeps
// its value. Joycraft's hook is the one whose command is exactly hookCommand.
// Claude Code sends the agent back only when a Stop hook exits 2, with the
// reason on stderr; `check` does that. The exit code is the same when the
// event says stop_hook_active; only one line is added to the reason.
export const settingsFile = '.claude/settings.json';
export const hookCommand = 'node "$CLAUDE_PROJECT_DIR"/.joycraft/runtime/gate.mjs check --root "$CLAUDE_PROJECT_DIR"';
const hookGroup = { hooks: [{ type: 'command', command: hookCommand }] };
// What `--on` changed, so `--off` restores the earlier bytes when nobody edited the file since.
const stateFile = '.joycraft/local/gate-hook.json';

function claudeHost(root) {
  try {
    const manifest = JSON.parse(readFileSync(path.join(root, '.joycraft/installation.json'), 'utf8'));
    return (Array.isArray(manifest?.hosts) ? manifest.hosts : [manifest?.harness]).includes('claude');
  } catch { return false; }
}

// Offsets of every value in valid JSON text: objects and arrays keep their
// entries ({ key, start, end, value }) so one entry can be cut or added.
function locate(text) {
  let index = 0;
  const space = () => { while (index < text.length && /\s/.test(text[index])) index += 1; };
  const string = () => {
    const start = index;
    for (index += 1; text[index] !== '"'; index += text[index] === '\\' ? 2 : 1);
    index += 1;
    return JSON.parse(text.slice(start, index));
  };
  const value = () => {
    space();
    const start = index;
    const open = text[index];
    if (open === '{' || open === '[') {
      const entries = [];
      index += 1;
      space();
      while (text[index] !== (open === '{' ? '}' : ']')) {
        space();
        const entryStart = index;
        let key;
        if (open === '{') { key = string(); space(); index += 1; }
        const item = value();
        entries.push({ key, start: entryStart, end: item.end, value: item });
        space();
        if (text[index] === ',') index += 1;
        space();
      }
      index += 1;
      return { type: open === '{' ? 'object' : 'array', start, end: index, entries };
    }
    if (open === '"') { string(); return { type: 'string', start, end: index }; }
    while (index < text.length && !/[\s,\]}]/.test(text[index])) index += 1;
    return { type: 'literal', start, end: index };
  };
  return value();
}

const member = (node, key) => node.entries.findLast(entry => entry.key === key);
const isOurs = (text, entry) => {
  const hook = JSON.parse(text.slice(entry.value.start, entry.value.end));
  return isObject(hook) && hook.type === 'command' && hook.command === hookCommand;
};

/** Insert one entry at the end of a container, indented like the file. */
function insert(text, container, value, key) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const unit = /\n([ \t]+)\S/.exec(text)?.[1] ?? '  ';
  const lineStart = text.lastIndexOf('\n', container.start) + 1;
  const outer = /^[ \t]*/.exec(text.slice(lineStart))[0];
  const inner = outer + unit;
  const entry = `${key === undefined ? '' : `${JSON.stringify(key)}: `}${JSON.stringify(value, null, unit).split('\n').join(eol + inner)}`;
  const last = container.entries.at(-1);
  if (last) return text.slice(0, last.end) + `,${eol}${inner}${entry}` + text.slice(last.end);
  const at = container.start + 1;
  const closing = text.slice(at, container.end - 1).includes('\n') ? '' : eol + outer;
  return text.slice(0, at) + eol + inner + entry + closing + text.slice(at);
}

/** Cut one entry and its separator out of a container. */
function cut(text, container, index) {
  const { entries } = container;
  if (index > 0) return text.slice(0, entries[index - 1].end) + text.slice(entries[index].end);
  if (entries.length > 1) return text.slice(0, entries[0].start) + text.slice(entries[1].start);
  return text.slice(0, container.start + 1) + text.slice(container.end - 1);
}

function readSettings(root) {
  const file = localPath(root, settingsFile, true);
  const before = existsSync(file) ? readFileSync(file, 'utf8') : null;
  const text = before ?? '{}\n';
  let data;
  try { data = JSON.parse(text.replace(/^﻿/, '')); } catch (error) { throw new Error(`${settingsFile} is not valid JSON (${error.message}); nothing was written`); }
  if (!isObject(data)) throw new Error(`${settingsFile} is not a JSON object; nothing was written`);
  return { file, before, text, data };
}

const hookOn = data => isObject(data.hooks) && Array.isArray(data.hooks.Stop)
  && data.hooks.Stop.some(group => Array.isArray(group?.hooks) && group.hooks.some(hook => hook?.type === 'command' && hook.command === hookCommand));

/** The settings text with Joycraft's Stop hook added; change is 'none' when it is already there. */
export function planHook(root = process.cwd()) {
  const { file, before, text, data } = readSettings(root);
  if (hookOn(data)) return { file, before, after: before, change: 'none' };
  const tree = locate(text);
  const hooks = member(tree, 'hooks');
  let after;
  if (!hooks) after = insert(text, tree, { Stop: [hookGroup] }, 'hooks');
  else if (hooks.value.type !== 'object') throw new Error(`"hooks" in ${settingsFile} is not an object; nothing was written`);
  else {
    const stop = member(hooks.value, 'Stop');
    if (!stop) after = insert(text, hooks.value, [hookGroup], 'Stop');
    else if (stop.value.type !== 'array') throw new Error(`"hooks.Stop" in ${settingsFile} is not an array; nothing was written`);
    else after = insert(text, stop.value, hookGroup);
  }
  return { file, before, after, change: 'add' };
}

/** The settings text with every Joycraft Stop hook removed, and the containers it leaves empty, which `removed` names. */
function withoutHook(text) {
  const removed = new Set();
  for (;;) {
    const tree = locate(text);
    const hooks = member(tree, 'hooks');
    const stop = hooks?.value.type === 'object' ? member(hooks.value, 'Stop') : undefined;
    if (stop?.value.type !== 'array') return { text, removed: [...removed] };
    const groups = stop.value.entries;
    const groupIndex = groups.findIndex(group => group.value.type === 'object' && member(group.value, 'hooks')?.value.type === 'array'
      && member(group.value, 'hooks').value.entries.some(entry => isOurs(text, entry)));
    if (groupIndex === -1) return { text, removed: [...removed] };
    const list = member(groups[groupIndex].value, 'hooks').value;
    const ours = list.entries.findIndex(entry => isOurs(text, entry));
    if (list.entries.length > 1) text = cut(text, list, ours);
    else if (groups.length > 1) text = cut(text, stop.value, groupIndex);
    else if (hooks.value.entries.length > 1) { text = cut(text, hooks.value, hooks.value.entries.indexOf(stop)); removed.add('the "hooks.Stop" list'); }
    else { text = cut(text, tree, tree.entries.indexOf(hooks)); removed.add('the "hooks.Stop" list').add('the "hooks" object'); }
  }
}

function writeState(root, value) {
  const local = path.join(root, '.joycraft/local');
  mkdirSync(local, { recursive: true });
  if (!existsSync(path.join(local, '.gitignore'))) writeFileSync(path.join(local, '.gitignore'), '*\n');
  writeFileSync(localPath(root, stateFile, true), `${JSON.stringify(value, null, 2)}\n`);
}

function readState(root) {
  try { return JSON.parse(readFileSync(localPath(root, stateFile), 'utf8')); } catch { return null; }
}

// A hook added over an open problem would refuse every stop until the problem is cleared.
const clearFirst = 'Joycraft gate: nothing was written. Clear each problem above, then turn the gates on again.';
// Turning the gates on is the one time the user is present for an unaccepted done spec.
const askOnce = ' The user is here, so for the done specs with no acceptance ask one question instead: accept them as they are, or send them back for review.';

/** `hook --plan|--on|--off`: show, add or remove Joycraft's Stop hook in `.claude/settings.json`. */
export function hook(root, action) {
  if (action !== 'off' && !claudeHost(root)) {
    return { change: 'none', claude: false,
      message: 'The gate hook is for Claude Code only for now. Nothing was written. On this host, session end runs the same check.' };
  }
  if (action === 'off') {
    const { file, before, data } = readSettings(root);
    const state = readState(root);
    if (before === null || !hookOn(data)) {
      if (state) rmSync(localPath(root, stateFile));
      return { file: settingsFile, change: 'none', message: `Joycraft's Stop hook is not in ${settingsFile}. Nothing was changed.` };
    }
    if (state?.after === before) {
      rmSync(localPath(root, stateFile));
      if (state.before === null) {
        rmSync(file);
        return { file: settingsFile, change: 'removed', message: `Removed ${settingsFile}: hook --on created it, and it held only Joycraft's Stop hook.` };
      }
      writeFileSync(file, state.before);
      return { file: settingsFile, change: 'removed', message: `Removed Joycraft's Stop hook from ${settingsFile}. Every other line is as it was.` };
    }
    // No usable record: say what was cut, and claim nothing about the bytes before --on.
    const { text: after, removed } = withoutHook(before);
    writeFileSync(file, after);
    if (state) rmSync(localPath(root, stateFile));
    const empty = removed.length ? ` Without the hook, ${removed.join(' and ')} ${removed.length > 1 ? 'were' : 'was'} empty, so the command removed ${removed.length > 1 ? 'them' : 'it'} too.` : '';
    return { file: settingsFile, change: 'removed', message: `Removed Joycraft's Stop hook from ${settingsFile}.${empty} No other setting was removed.` };
  }
  const plan = planHook(root);
  if (plan.change === 'none') return { file: settingsFile, change: 'none', message: `Joycraft's Stop hook is already in ${settingsFile}. Nothing was changed.` };
  const failures = checkGates(root).failures;
  const problems = failures.map(item => item.message);
  const ask = failures.some(item => item.kind === 'unaccepted-done') ? askOnce : '';
  if (action === 'plan') {
    return { file: settingsFile, change: 'add', command: hookCommand, ...(problems.length ? { problems } : {}), before: plan.before, after: plan.after,
      message: problems.length
        ? `Plan only; nothing was written. hook --on refuses until the gate check finds none. Clear each problem you can by its next step, tell the user what you changed, then plan again.${ask}`
        : `Plan only; nothing was written. Show this change to the user and run gate.mjs hook --on on their yes.` };
  }
  if (problems.length) return { file: settingsFile, change: 'none', problems, message: clearFirst + ask };
  mkdirSync(path.dirname(plan.file), { recursive: true });
  writeFileSync(localPath(root, settingsFile, true), plan.after);
  writeState(root, { file: settingsFile, before: plan.before, after: plan.after });
  return { file: settingsFile, change: 'added',
    message: `Added Joycraft's Stop hook to ${settingsFile}. Claude Code now runs the gate check each time it ends a reply. To turn it off, the user says "Turn off Joycraft's gates".` };
}

export function main(argv = process.argv.slice(2)) {
  const usage = 'Usage: gate.mjs check [--root <project>] [--verbose] | gate.mjs hook --plan|--on|--off [--root <project>]';
  if (argv[0] === 'hook') {
    const actions = { '--plan': 'plan', '--on': 'on', '--off': 'off' };
    let action;
    let root;
    for (let index = 1; index < argv.length; index += 1) {
      if (actions[argv[index]] && action === undefined) { action = actions[argv[index]]; continue; }
      if (argv[index] === '--root' && root === undefined && typeof argv[index + 1] === 'string' && !argv[index + 1].startsWith('--')) {
        root = argv[index + 1]; index += 1; continue;
      }
      throw new Error(usage);
    }
    if (action === undefined) throw new Error(usage);
    const result = hook(path.resolve(root ?? '.'), action);
    // --on over open problems: the same exit 2 and stderr lines as the check, then what to do.
    if (action === 'on' && result.problems) {
      process.stderr.write(`${[...result.problems, result.message].join('\n')}\n`);
      process.exitCode = 2;
      return result;
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = 0;
    return result;
  }
  if (argv[0] !== 'check') throw new Error(usage);
  const flags = {};
  for (let index = 1; index < argv.length; index += 1) {
    if (argv[index] === '--verbose' && !flags.verbose) { flags.verbose = true; continue; }
    if (argv[index] === '--root' && flags.root === undefined && typeof argv[index + 1] === 'string' && !argv[index + 1].startsWith('--')) {
      flags.root = argv[index + 1]; index += 1; continue;
    }
    throw new Error(usage);
  }
  const result = checkGates(path.resolve(flags.root ?? '.'));
  const lines = [...(flags.verbose ? result.skipped.map(item => item.message) : []), ...result.failures.map(item => item.message)];
  process.exitCode = result.failures.length ? 2 : 0;
  // Every stop is checked, also a repeated one; a repeated one only gets one more line.
  const write = () => { if (lines.length) process.stderr.write(`${lines.join('\n')}\n`); return result; };
  if (!result.failures.length) return write();
  return stopEvent().then(event => {
    if (event?.stop_hook_active === true) lines.push(blockedAgain);
    return write();
  });
}

const blockedAgain = 'Joycraft gate: this stop was blocked before for the same reason. Do the step now; do not ask the user again.';

/** The Stop event Claude Code writes on stdin, or null: no event within a short wait, a terminal, or not JSON. */
function stopEvent(waitMs = 1000) {
  if (process.stdin.isTTY) return Promise.resolve(null);
  return new Promise(resolve => {
    let text = '';
    const done = value => { clearTimeout(timer); process.stdin.removeAllListeners(); process.stdin.destroy(); resolve(value); };
    const timer = setTimeout(() => done(null), waitMs);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { text += chunk; });
    process.stdin.on('end', () => { try { done(JSON.parse(text)); } catch { done(null); } });
    process.stdin.on('error', () => done(null));
  });
}

// Node runs the main module from its real path; a hook may name it through a symlinked project path.
const invoked = (() => { try { return realpathSync(process.argv[1]); } catch { return null; } })();
if (invoked && import.meta.url === pathToFileURL(invoked).href) {
  const prefix = process.argv[2] === 'hook' ? 'Gate hook stopped' : 'Gate check stopped';
  const stopped = error => { process.stderr.write(`${prefix}: ${error.message}\n`); process.exitCode = 1; };
  try { Promise.resolve(main()).catch(stopped); } catch (error) { stopped(error); }
}

#!/usr/bin/env node
// Trial breakdown (sl1-04, sl2-05): the one analyzer for ride-trial traces. Not
// shipped: package `files` is `dist` and `payload`.
//
// It reads `<trace>/<run>/events.jsonl` and `<trace>/<run>/transcripts/`, and the
// run's project folder (the `cwd` of the turn logs, else `<trace>/../arms/<run>`).
// For each run and phase (setup, build, s2) it prints:
// - active minutes and net minutes (external waits over 10 s removed), model and
//   tool minutes, and tool wait by class (WAIT_CLASSES);
// - cost from usage at the price row of each call's model, with the residual
//   against the cost that the harness recorded;
// - main and subagent calls, tokens and output (thinking and visible), de-duplicated
//   by message id;
// - main calls split into product and procedure by PROCEDURE_PATTERNS;
// - output by part (brief, look dispatch, close docs, retries, update, final
//   message) and by class of the file written (art, tests, logic, docs);
// - the time buckets of the time lane, from the one BUCKETS table;
// - each subagent: type, model, seconds, calls, cost;
// - milestones on the active clock: first code start and write, first render,
//   look start and end, first and last commit;
// - counts: runtime calls, refusals, commits, amends, close calls, refused closes,
//   archive retries, final-reply words, the update notice;
// - the path said before the first code write, the brief (closed, lines checked,
//   checks by kind, a tone line, a missing-input line, a test that stubs a
//   source) from the close.mjs line and the disk, and each look (renders, their
//   pixel height, the reply word for word);
// - the budget line for build and session 2.
//
// Usage:
//   node scripts/trial/breakdown.mjs [--trace <dir>] [--json] [run ...]
// With no run names, it reads every run folder that has events.jsonl and
// transcripts/. The default trace folder is ~/Developer/ride-trial/v2/trace.
import { existsSync, openSync, readSync, closeSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { doneWhenLines } from '../../payload/.joycraft/runtime/close.mjs';

export const USAGE = 'Usage: node scripts/trial/breakdown.mjs [--trace <dir>] [--json] [run ...]';

/** Dollars per token for each model family. Input that is not cached is rare; it uses the base rate. */
export const PRICES = {
  opus: { output: 20e-6, cacheRead: 0.2e-6, cacheWrite5m: 5e-6, cacheWrite1h: 8e-6, input: 4e-6 },
  haiku: { output: 0.5e-6, cacheRead: 0.01e-6, cacheWrite5m: 0.125e-6, cacheWrite1h: 0.2e-6, input: 0.1e-6 },
};

/** The price row for a model id. Opus is the default. */
export function priceRow(model) {
  return /haiku/i.test(model ?? '') ? PRICES.haiku : PRICES.opus;
}

/** The budget for procedure on the main thread, for build and session 2. Output is reported with no cap. */
export const BUDGET = { calls: 6 };

/** A tool wait over this many seconds of external HTTP is not counted in net minutes. */
export const EXTERNAL_WAIT_SECONDS = 10;

/**
 * The one table that splits main-thread work. A tool use is procedure when its
 * descriptor (tool name, then its command with heredoc bodies removed, or its
 * file path, pattern, skill or agent type) matches a row. All other tool use is
 * product: work that a harness with no Joycraft also does.
 */
export const PROCEDURE_PATTERNS = [
  ['skill', /^Skill\b/],
  ['subagent', /^(Agent|Task)\b/],
  ['joycraft files', /\.joycraft\//],
  ['skills and agents', /\.(claude|agents|codex|pi|omp|opencode|github)\/(skills|agents)\//],
  ['joycraft config', /joycraft\.ya?ml/],
  ['brief, specs, archive', /docs\/(features|archive)\//],
  ['context pages', /docs\/context\//],
];

/**
 * The time buckets of the time lane. A main call goes to the first row that
 * matches its tool descriptors, one per line. A call with text only is the final reply.
 */
export const BUCKETS = [
  ['look', /^(?:Agent|Task) joycraft-look\b/m],
  ['subagent', /^(?:Agent|Task|Workflow)\b/m],
  ['update', /update-check|references\/update\.md/],
  ['close', /\bgit\s+(?:-[cC]\s+\S+\s+)*(?:commit|mv)\b|docs\/archive\/|\bclose\.mjs\b/],
  ['brief', /^(?:Write|Edit|MultiEdit) \S*features\/[^\s/]+\/brief\.md$|\bcat\b[^\n]*>\s*\S*features\/[^\s/]+\/brief\.md/m],
  ['docs', /^(?:Write|Edit|MultiEdit) \S*(?:docs\/\S*|AGENTS\.md|CLAUDE\.md|joycraft\.ya?ml|\.md)$|(?:\bcat\b[^\n]*>|\btee\s)\s*\S*(?:docs\/|AGENTS\.md|CLAUDE\.md|\.md\b)/m],
  ['code', /^(?:Write|Edit|MultiEdit) \S+\.(?:tsx?|jsx?|mjs|cjs|css|scss|html|json|py|go|rs|svg)$|\bcat\b[^\n]*>{1,2}\s*\S+\.(?:tsx?|jsx?|mjs|cjs|css|json|svg)\b|\bsed -i\b|\bpython3?\s+(?:-I\s+)?-/m],
  ['render', /^Read \S+\.(?:png|jpe?g|webp|gif)$|--screenshot|\bheadless\b|\bplaywright\b/im],
  ['research', /^(?:WebSearch|WebFetch)\b|\bcurl\b[^\n]*https?:\/\/(?!localhost|127\.0\.0\.1)/m],
  ['install', /\b(?:npm|pnpm|yarn|bun)\s+(?:install|i|ci|add)\b|\bcreate-next-app\b|\bnpx\s+(?:-y\s+)?create-/],
  ['verify', /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|build|typecheck|lint)\b|\bvitest\b|\btsc\b|\bnext\s+(?:build|start|dev)\b|\blocalhost\b|\blsof\b|\bkill\b/],
  ['read and other', /[\s\S]/],
];
const FINAL_BUCKET = 'final reply';

/** Tool wait classes. A call's tool wait goes to the class of its slowest tool use; no match is "other". */
export const WAIT_CLASSES = [
  ['look', /^(?:Agent|Task) joycraft-look\b/],
  ['external HTTP', /^(?:WebFetch|WebSearch)\b|\b(?:curl|wget)\b[^\n]*https?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/],
  ['install', /\b(?:npm|pnpm|yarn|bun)\s+(?:install|i|ci|add)\b|\bcreate-next-app\b|\bnpx\s+(?:-y\s+)?create-|\bpip3?\s+install\b/],
  ['build and test', /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|build|typecheck|lint)\b|\bnpx\s+(?:vitest|jest|tsc|eslint|playwright|next\s+build)\b|\bvitest\b|\bjest\b|\btsc\b|\bnext\s+build\b/],
];

/** Classes of a written file, first match wins. Other files (config, data) are "other". */
export const FILE_CLASSES = [
  ['tests', /(?:[._-](?:test|spec)\.\w+$)|(?:^|\/)__tests__\/|(?:^|\/)tests?\//],
  ['docs', /\.mdx?$|(?:^|\/)docs\/|(?:^|\/)(?:AGENTS|CLAUDE)\.md$|joycraft\.ya?ml$/],
  ['art', /\.(?:svg|png|jpe?g|gif|webp)$|(?:^|\/)[^/]*(?:illustrat|artwork|sprite|drawing|scene|icon|\bart\b)[^/]*$/i],
  ['logic', /\.(?:tsx?|jsx?|mjs|cjs|css|scss|html|vue|svelte|py|go|rs|rb|java|kt|swift)$/i],
];

const OUTPUT_PARTS = ['brief', 'look dispatch', 'close docs', 'retries', 'update', 'final message', 'other'];

const IMAGE = /\.(png|jpe?g|webp|gif)$/i;
const SOURCE = /\.(tsx?|jsx?|mjs|cjs|css|scss|html|vue|svelte|py|go|rs|rb|java|kt|swift)$/i;
const RUNTIME_DIR = /\.joycraft\/runtime/;
const RUNTIME_VAR = /\b([A-Za-z_]\w*)=["']?[^\s;&|"']*\.joycraft\/runtime(?:["'\s;&|]|$)/g;
/** A runtime refusal. A usage message (a `--help` call or a bad flag) is not one. */
const REFUSAL = /(?:^|\n)[A-Z][A-Za-z ]{0,40} stopped: (?!Usage\b)/;
const ARG = String.raw`(?:"[^"]*"|'[^']*'|[^\s"';&|])+`;
/** `git commit`, also with `-C <dir>`, `-c key=value` or other options before it. */
export const GIT_COMMIT = new RegExp(String.raw`\bgit\s+(?:(?:-[cC]\s+${ARG}|--?[\w-]+(?:=${ARG})?)\s+)*commit\b`);
const COMMIT_FAILED = /(?:^|\n)\s*(?:fatal|error): |nothing to commit|no changes added to commit/;
const STEP_FAILED = /(?:^|\n)[^\n:]*: [^\n]*(?:No such file or directory|command not found|Permission denied)|(?:^|\n)\s*(?:fatal|error)[: ]|(?:^|\n)npm ERR!|\b\d+ failed\b/;
const HASH_LINE = /(?:^|\n)\s*(?:\[[^\]\n]*\s([0-9a-f]{7,40})\]|([0-9a-f]{7,40})\s)/;
const CLOSE_CALL = /(?:^|[\s/])close\.mjs\b/;
const CLOSE_LINE = /(?:^|\n)Path: small job\. (\d+) of (\d+) lines checked[^\n]*?(?:Commit ([0-9a-f]{7,40})\.|No Git: not committed\.)[^\n]*?Brief: (\S+?)\/brief\.md/;
const ARCHIVE_MOVE = /\b(?:git\s+mv|mv)\b[^\n;&|]*docs\/archive/;
const UPDATE_CHECK = /update-check\.mjs\s+check\b/;
const UPDATE_NOTICE = /"action":\s*"(?:ask|note|apply)"|Joycraft \S+ is available/;
const PATH_LINE = /Path:\s*[`*]*\s*(small job|feature)\b/i;
const NOT_INDEPENDENT = /look was not independent/i;
const BRIEF_FILE = /\/([^/\s]+)\/brief\.md$/;
/** A Done-when line that says how the result must feel. */
export const TONE_LINE = /\b(?:feel|feels|tone|fun|silly|playful|tongue|cheek|cheeky|joke|jokey|humou?r|funny|whims\w*|cheerful|friendly|calm|delight\w*)\b/i;
/** A Done-when line about an input that is missing or fails. */
export const MISSING_INPUT_LINE = /\b(?:missing|fails?|failed|unavailable|not available|denied|offline|unreachable|errors?|no (?:data|location|network|response)|empty|times? out)\b/i;
/** A test that stubs an outside source. */
export const STUBS_SOURCE = /\bvi\.(?:fn|mock|spyOn|stubGlobal)\b|\bjest\.(?:fn|mock|spyOn)\b|\bmock(?:Resolved|Rejected|Implementation|ReturnValue)\w*\(|\bnock\(|\bmsw\b|\b(?:globalThis|global|window)\.fetch\s*=|\bfetch\s*=\s*(?:async|\()|\bstubGlobal\b/;

const round = (value, places = 2) => Number(value.toFixed(places));
const minutes = ms => ms / 60000;

/** A Bash command without the bodies of its heredocs, so the body text does not classify the call. */
export function stripHeredocs(command) {
  return command.replace(/(<<-?\s*(['"]?)([A-Za-z_]\w*)\2)([^\n]*)\n[\s\S]*?\n[ \t]*\3[ \t]*(?=\n|$)/g, '$1$4');
}

/** The text a tool use is classified by. */
export function toolDescriptor(name, input = {}) {
  if (typeof input.command === 'string') return `${name} ${stripHeredocs(input.command)}`;
  const target = input.file_path ?? input.notebook_path ?? input.skill ?? input.subagent_type
    ?? [input.pattern, input.path].filter(Boolean).join(' ');
  return `${name} ${target || input.url || input.query || input.description || ''}`.trim();
}

/** The PROCEDURE_PATTERNS label that matches, or null for product. */
export function procedureLabel(name, input) {
  const descriptor = toolDescriptor(name, input);
  for (const [label, pattern] of PROCEDURE_PATTERNS) if (pattern.test(descriptor)) return label;
  return null;
}

/** A main call is procedure when its first tool use is procedure. A call with text only is product. */
export function callKind(call) {
  if (!call.tools.length) return 'product';
  return procedureLabel(call.tools[0].name, call.tools[0].input) ? 'procedure' : 'product';
}

/** The first label of a table whose pattern matches the text, or the fallback. */
function firstLabel(table, text, fallback) {
  for (const [label, pattern] of table) if (pattern.test(text)) return label;
  return fallback;
}

/** The BUCKETS label of a main call. */
export function bucketOf(call) {
  if (!call.tools.length) return FINAL_BUCKET;
  return firstLabel(BUCKETS, call.tools.map(tool => toolDescriptor(tool.name, tool.input)).join('\n'), 'read and other');
}

/** The WAIT_CLASSES label of one tool use. */
export function waitClass(name, input) {
  return firstLabel(WAIT_CLASSES, toolDescriptor(name, input), 'other');
}

/** The FILE_CLASSES label of a written file. */
export function fileClass(file) {
  return firstLabel(FILE_CLASSES, file, 'other');
}

function usageTokens(usage = {}) {
  const split = usage.cache_creation;
  return {
    output: usage.output_tokens ?? 0,
    thinking: usage.output_tokens_details?.thinking_tokens ?? 0,
    input: usage.input_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    cacheWrite5m: split ? split.ephemeral_5m_input_tokens ?? 0 : 0,
    cacheWrite1h: split ? split.ephemeral_1h_input_tokens ?? 0 : usage.cache_creation_input_tokens ?? 0,
  };
}

/** Cost of one call from its usage, at the price row of its model (Opus when no model is given). */
export function usageCost(usage = {}, model) {
  const price = priceRow(model);
  const tokens = usageTokens(usage);
  return tokens.output * price.output + tokens.cacheRead * price.cacheRead
    + tokens.cacheWrite5m * price.cacheWrite5m + tokens.cacheWrite1h * price.cacheWrite1h
    + tokens.input * price.input;
}

function readJsonl(file) {
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap(line => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

function resultText(content) {
  if (typeof content === 'string') return content;
  return (content ?? []).map(part => part.text ?? '').join('');
}

/** The turns of a run, each with its phase, from events.jsonl. */
export function readTurns(runDir) {
  const events = readJsonl(path.join(runDir, 'events.jsonl'));
  const turns = [];
  let setupDone = null;
  let current = null;
  for (const event of events) {
    if (event.event === 'setup-done') setupDone = Date.parse(event.at);
    if (event.event === 'turn-start') {
      current = { turn: event.turn, session: event.session, start: Date.parse(event.at) };
    }
    if (event.event === 'turn-end' && current) {
      turns.push({ ...current, end: Date.parse(event.endedAt ?? event.at), activeMs: event.activeMs ?? 0, cost: event.cost ?? 0 });
      current = null;
    }
  }
  for (const turn of turns) {
    turn.phase = turn.session === 2 ? 's2' : setupDone && turn.start >= setupDone - 1000 ? 'build' : 'setup';
  }
  // The harness records cost per session as a running total.
  let previous = 0;
  let session = null;
  for (const turn of turns) {
    if (turn.session !== session) { previous = 0; session = turn.session; }
    turn.recordedCost = turn.cost - previous;
    previous = turn.cost;
  }
  return turns;
}

function transcriptFiles(runDir) {
  const dir = path.join(runDir, 'transcripts');
  const files = [];
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir).sort()) {
    if (name.endsWith('.jsonl')) files.push({ file: path.join(dir, name), agent: 'main', meta: {} });
    const subDir = path.join(dir, name, 'subagents');
    if (!existsSync(subDir)) continue;
    for (const sub of readdirSync(subDir).sort()) {
      if (!sub.endsWith('.jsonl')) continue;
      let meta = {};
      try { meta = JSON.parse(readFileSync(path.join(subDir, sub.replace(/\.jsonl$/, '.meta.json')), 'utf8')); } catch { /* no meta */ }
      files.push({ file: path.join(subDir, sub), agent: sub.replace(/\.jsonl$/, ''), meta });
    }
  }
  return files;
}

/**
 * Idle time on the main thread: from a reply that ends the model's run
 * (`stop_reason: end_turn`) to the next user or assistant record. The harness
 * does not count it as active time, for example while a background agent works.
 */
export function readIdleGaps(runDir) {
  const gaps = [];
  for (const source of transcriptFiles(runDir).filter(entry => entry.agent === 'main')) {
    let idleFrom = null;
    for (const record of readJsonl(source.file)) {
      if (record.type !== 'user' && record.type !== 'assistant') continue;
      const ts = record.timestamp ? Date.parse(record.timestamp) : null;
      if (ts == null) continue;
      if (idleFrom != null && ts > idleFrom) { gaps.push([idleFrom, ts]); idleFrom = null; }
      if (record.type === 'assistant' && record.message?.stop_reason === 'end_turn') idleFrom = ts;
    }
  }
  return gaps;
}

/** Every model call of a run, de-duplicated by message id, with its tool uses and results. */
export function readCalls(runDir, turns) {
  const calls = [];
  for (const source of transcriptFiles(runDir)) {
    const byId = new Map();
    const results = new Map();
    let previousTs = null;
    for (const record of readJsonl(source.file)) {
      const ts = record.timestamp ? Date.parse(record.timestamp) : null;
      if (record.type === 'user' && Array.isArray(record.message?.content)) {
        for (const part of record.message.content) {
          if (part.type === 'tool_result') {
            results.set(part.tool_use_id, { ts, text: resultText(part.content), isError: Boolean(part.is_error) });
          }
        }
      }
      if (record.type === 'assistant' && record.message?.id) {
        const id = record.message.id;
        let call = byId.get(id);
        if (!call) {
          call = { id, agent: source.agent, meta: source.meta, model: record.message.model, ts0: ts, ts1: ts, previousTs, tools: [], text: '', lastText: null, usage: null };
          byId.set(id, call);
          calls.push(call);
        }
        call.ts1 = ts;
        const usage = record.message.usage;
        if (usage && (!call.usage || (usage.output_tokens ?? 0) >= (call.usage.output_tokens ?? 0))) call.usage = usage;
        for (const block of record.message.content ?? []) {
          if (block.type === 'tool_use') call.tools.push({ id: block.id, name: block.name, input: block.input ?? {} });
          if (block.type === 'text') { call.text += block.text; call.lastText = block.text; }
        }
      }
      if (ts && (record.type === 'user' || record.type === 'assistant')) previousTs = ts;
    }
    for (const call of byId.values()) for (const tool of call.tools) tool.result = results.get(tool.id);
  }
  for (const call of calls) {
    const tokens = usageTokens(call.usage ?? {});
    Object.assign(call, tokens);
    call.context = tokens.cacheRead + tokens.cacheWrite5m + tokens.cacheWrite1h + tokens.input;
    call.cost = usageCost(call.usage ?? {}, call.model ?? call.meta?.model);
    call.endTs = Math.max(call.ts1 ?? 0, ...call.tools.map(tool => tool.result?.ts ?? 0));
    const turn = turns.find(t => call.ts0 >= t.start - 2000 && call.ts0 <= t.end + 2000)
      ?? [...turns].reverse().find(t => call.ts0 >= t.start);
    call.turn = turn?.turn ?? null;
    call.phase = turn?.phase ?? 'unknown';
  }
  calls.sort((a, b) => a.ts0 - b.ts0);
  return calls;
}

/** Milliseconds from `from` to `to`, less the idle gaps between them. */
function activeBetween(from, to, gaps) {
  let ms = Math.max(0, to - from);
  for (const [g0, g1] of gaps) ms -= Math.max(0, Math.min(to, g1) - Math.max(from, g0));
  return Math.max(0, ms);
}

/**
 * Minutes from the start of the phase to a time stamp, on the active clock:
 * inside the phase's turns, less the idle gaps. Active minutes count the same
 * time, so a milestone is never later than the phase.
 */
function phaseMinute(turns, phase, ts, gaps = []) {
  if (ts == null) return null;
  let ms = 0;
  for (const turn of turns.filter(t => t.phase === phase)) {
    if (ts > turn.end + 2000) { ms += activeBetween(turn.start, turn.end, gaps); continue; }
    return round(minutes(ms + activeBetween(turn.start, Math.max(turn.start, ts), gaps)));
  }
  return round(minutes(ms));
}

/** The files a tool use writes: Write and Edit targets, and `cat > file` or `tee file` in a Bash command. */
export function writtenFiles(tool) {
  const file = tool.input?.file_path ?? tool.input?.notebook_path;
  if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool.name) && typeof file === 'string') return [file];
  if (tool.name !== 'Bash' || typeof tool.input?.command !== 'string') return [];
  const command = stripHeredocs(tool.input.command);
  const files = [];
  for (const match of command.matchAll(/\bcat\b[^\n;&|>]*>{1,2}\s*([^\s;&|<>]+\.\w+)/g)) files.push(match[1]);
  for (const match of command.matchAll(/\btee\s+(?:-a\s+)?([^\s;&|<>]+\.\w+)/g)) files.push(match[1]);
  return files.map(name => name.replace(/^['"]/, ''));
}

function isCodeWrite(tool) {
  return writtenFiles(tool).some(file => SOURCE.test(file) && !/(^|\/)\.tmp\//.test(file) && !procedureLabel('Write', { file_path: file }));
}

/** Runtime script calls in one Bash command: `.joycraft/runtime/...x.mjs`, or `$VAR/...x.mjs` where VAR is set to the runtime folder. */
export function runtimeCallCount(command) {
  if (!RUNTIME_DIR.test(command)) return 0;
  const vars = [...command.matchAll(RUNTIME_VAR)].map(match => match[1]);
  const roots = ['\\.joycraft\\/runtime', ...vars.map(name => `\\$\\{?${name}(?!\\w)\\}?`)];
  const pattern = new RegExp(`(?:${roots.join('|')})(?:\\/[\\w.-]+)*\\/[\\w-]+\\.mjs`, 'g');
  return (command.match(pattern) ?? []).length;
}

/**
 * The commit a Bash command made, from its command and result: null when it has
 * no `git commit`; else the kind (commit or amend), whether it took effect, and
 * the hash when the result shows one. A failed commit, or a commit after `&&`
 * behind a step that failed, did not take effect.
 */
export function commitOutcome(command, result) {
  const text = stripHeredocs(command ?? '');
  const match = GIT_COMMIT.exec(text);
  if (!match) return null;
  const kind = /^[^\n;&|]*--amend\b/.test(text.slice(match.index)) ? 'amend' : 'commit';
  const out = result?.text ?? '';
  const found = HASH_LINE.exec(out);
  const hash = found ? found[1] ?? found[2] : null;
  const chained = /&&\s*$/.test(text.slice(0, match.index));
  let ok = Boolean(result) && !result.isError && !COMMIT_FAILED.test(out);
  if (ok && !hash && chained && STEP_FAILED.test(out)) ok = false;
  return { kind, ok, hash: ok ? hash : null };
}

/** The close.mjs line in a result: lines checked, the commit and the archived brief folder. */
export function closeLine(text) {
  const match = CLOSE_LINE.exec(text ?? '');
  if (!match) return null;
  return { checked: Number(match[1]), lines: Number(match[2]), commit: match[3] ?? null, target: match[4] };
}

/**
 * The subagent's own report inside an Agent tool result. The host wraps it: an
 * optional `<tools-used-before-summary>` line, a `[Subagent hand-back]` frame
 * that ends with `The report follows:`, the report indented two spaces, then an
 * `agentId:` line and a `<usage>` block. Text without the frame comes back trimmed.
 */
export function handBackReport(text) {
  const marker = 'The report follows:';
  const at = text.indexOf(marker);
  if (at < 0) return text.trim();
  let body = text.slice(at + marker.length).replace(/^[^\n]*\n/, '');
  const end = body.search(/^agentId: /m);
  if (end >= 0) body = body.slice(0, end);
  return body.split('\n').map(line => line.replace(/^ {2}/, '')).join('\n').trim();
}

/** OK when the look's report starts with OK; otherwise it quoted statements. */
export function lookOutcome(text) {
  const body = handBackReport(text).replace(/^[*_`"'\s]+/, '');
  return /^OK\b/.test(body) ? 'OK' : 'quotes';
}

/** The pixel height of a PNG file, or null. */
export function pngHeight(file) {
  try {
    const fd = openSync(file, 'r');
    const head = Buffer.alloc(24);
    const read = readSync(fd, head, 0, 24, 0);
    closeSync(fd);
    if (read < 24 || head.toString('latin1', 1, 4) !== 'PNG') return null;
    return head.readUInt32BE(20);
  } catch { return null; }
}

/** The subagent calls that a tool use started, joined by the meta file's toolUseId. */
function subagentCallsFor(calls, toolUseId) {
  return calls.filter(call => call.agent !== 'main' && call.meta?.toolUseId === toolUseId);
}

function resolveIn(project, file) {
  if (path.isAbsolute(file)) return file;
  return project ? path.resolve(project, file) : null;
}

/** The look's result, end time, renders and reply: from its own transcript, else the hand-back report. */
function lookFinding(calls, tool, project) {
  const own = subagentCallsFor(calls, tool.id);
  let paths = own.flatMap(call => call.tools).filter(t => t.name === 'Read' && IMAGE.test(t.input.file_path ?? '')).map(t => t.input.file_path);
  if (!paths.length) paths = String(tool.input.prompt ?? '').match(/[^\s`'"()<>,]+\.(?:png|jpe?g|webp|gif)\b/gi) ?? [];
  const renders = [...new Set(paths)].map(file => {
    const local = resolveIn(project, file);
    return { path: file, height: local ? pngHeight(local) : null };
  });
  const report = [...own].reverse().find(call => call.lastText)?.lastText;
  if (report != null) return { result: lookOutcome(report), end: Math.max(...own.map(call => call.endTs)), renders, reply: handBackReport(report) };
  const text = tool.result?.text;
  if (text == null || /^Async agent launched/.test(text.trim())) return { result: 'no result', end: null, renders, reply: null };
  return { result: lookOutcome(text), end: tool.result.ts, renders, reply: handBackReport(text) };
}

function sum(list, key) {
  return list.reduce((total, item) => total + (typeof key === 'function' ? key(item) : item[key]), 0);
}

function totals(calls) {
  const output = sum(calls, 'output');
  const thinking = sum(calls, 'thinking');
  return {
    calls: calls.length,
    tokens: sum(calls, 'context') + output,
    context: sum(calls, 'context'),
    output,
    thinking,
    visible: output - thinking,
    cost: round(sum(calls, 'cost'), 4),
  };
}

function subagentRows(calls) {
  const groups = new Map();
  for (const call of calls) if (call.agent !== 'main') {
    if (!groups.has(call.agent)) groups.set(call.agent, []);
    groups.get(call.agent).push(call);
  }
  return [...groups.entries()].map(([agent, group]) => {
    const first = group[0];
    const last = group[group.length - 1];
    return {
      agent,
      type: first.meta?.agentType ?? 'unknown',
      model: first.model ?? first.meta?.model ?? 'unknown',
      seconds: round((last.endTs - (first.previousTs ?? first.ts0)) / 1000, 0),
      calls: group.length,
      output: sum(group, 'output'),
      cost: round(sum(group, 'cost'), 4),
    };
  });
}

/** The project folder of a run: the `cwd` in its turn logs, else `<trace>/../arms/<run>`. */
export function projectDir(runDir) {
  let names = [];
  try { names = readdirSync(runDir).filter(name => /^turn-\d+\.jsonl$/.test(name)).sort((a, b) => parseInt(a.slice(5), 10) - parseInt(b.slice(5), 10)); } catch { /* no folder */ }
  for (const name of names) {
    for (const line of readFileSync(path.join(runDir, name), 'utf8').split('\n')) {
      if (!line.includes('"init"')) continue;
      try {
        const record = JSON.parse(line);
        if (record.subtype === 'init' && typeof record.cwd === 'string' && existsSync(record.cwd)) return record.cwd;
      } catch { /* not JSON */ }
    }
  }
  const sibling = path.resolve(runDir, '..', '..', 'arms', path.basename(runDir));
  return existsSync(sibling) ? sibling : null;
}

/** The brief of a phase, read from the disk: where it is now, its Done-when checks, and its test files. */
export function briefFromDisk(project, briefFile) {
  const slug = BRIEF_FILE.exec(briefFile)?.[1];
  const absolute = resolveIn(project, briefFile);
  if (!slug || !absolute) return null;
  // The path may name the open brief or the archived one: the other home is its sibling.
  const home = path.dirname(path.dirname(absolute));
  const inArchive = path.basename(home) === 'archive';
  const features = inArchive ? path.join(path.dirname(home), 'features') : home;
  const archived = path.join(inArchive ? home : path.join(path.dirname(home), 'archive'), slug, 'brief.md');
  const open = path.join(features, slug, 'brief.md');
  const where = existsSync(archived) ? archived : existsSync(open) ? open : null;
  const closed = existsSync(archived) && !existsSync(open);
  if (!where) return { slug, closed, found: false };
  const lines = doneWhenLines(readFileSync(where, 'utf8'));
  const tests = [...new Set(lines.flatMap(line => line.tests))];
  const stubbing = tests.filter(file => {
    const local = resolveIn(project, file);
    try { return STUBS_SOURCE.test(readFileSync(local, 'utf8')); } catch { return false; }
  });
  return {
    slug,
    closed,
    found: true,
    lines: lines.length,
    checked: lines.filter(line => line.mark === 'checked').length,
    test: lines.filter(line => /\btest:/i.test(line.text)).length,
    seen: lines.filter(line => /\bseen:/i.test(line.text)).length,
    notChecked: lines.filter(line => line.mark === 'not checked').length,
    unmarked: lines.filter(line => line.mark === 'unmarked').length,
    toneLine: lines.some(line => TONE_LINE.test(line.text)),
    missingInputLine: lines.some(line => MISSING_INPUT_LINE.test(line.text)),
    testFiles: tests,
    testStubsSource: stubbing.length > 0,
  };
}

const words = text => (text ?? '').split(/\s+/).filter(Boolean).length;

/** The breakdown of one phase. */
export function phaseBreakdown(turns, calls, phase, options = {}) {
  // `calls` holds every phase: a subagent call is joined to its Agent tool use by id.
  const { gaps = [], project = null } = options;
  const phaseTurns = turns.filter(t => t.phase === phase);
  const phaseCalls = calls.filter(c => c.phase === phase);
  const main = phaseCalls.filter(c => c.agent === 'main');
  const sub = phaseCalls.filter(c => c.agent !== 'main');
  for (const call of main) call.kind = callKind(call);
  const procedure = main.filter(c => c.kind === 'procedure');
  const product = main.filter(c => c.kind === 'product');
  const minute = ts => phaseMinute(turns, phase, ts, gaps);

  const mainTools = main.flatMap(call => call.tools.map(tool => ({ call, tool })));
  const allTools = phaseCalls.flatMap(call => call.tools.map(tool => ({ call, tool })));
  const firstCode = mainTools.find(({ tool }) => isCodeWrite(tool));
  const firstRender = mainTools.find(({ tool }) => tool.name === 'Read' && IMAGE.test(tool.input.file_path ?? ''));
  const looks = mainTools.filter(({ tool }) => ['Agent', 'Task'].includes(tool.name) && tool.input.subagent_type === 'joycraft-look');
  const lookIds = new Set(looks.map(({ tool }) => tool.id));

  // Commits, close calls, archive attempts and the update notice, in call order.
  const commitRows = [];
  const closeRows = [];
  let archiveAttempts = 0;
  let refusedBefore = false;
  let closing = false;
  let updateNotice = false;
  const parts = Object.fromEntries(OUTPUT_PARTS.map(part => [part, 0]));
  const fileClasses = { art: 0, tests: 0, logic: 0, docs: 0, other: 0 };
  const lastInTurn = new Map();
  for (const call of main) lastInTurn.set(call.turn, call);
  for (const call of main) {
    let retry = false;
    let closeWork = false;
    let update = false;
    let briefWrite = false;
    for (const tool of call.tools) {
      const command = tool.name === 'Bash' ? tool.input.command ?? '' : '';
      const stripped = stripHeredocs(command);
      if (command && UPDATE_CHECK.test(stripped) && UPDATE_NOTICE.test(tool.result?.text ?? '')) updateNotice = true;
      if (/update-check|references\/update\.md/.test(toolDescriptor(tool.name, tool.input))) update = true;
      const outcome = command ? commitOutcome(command, tool.result) : null;
      if (outcome) {
        commitRows.push({ call, ...outcome });
        if (outcome.kind === 'amend') retry = true;
        closeWork = true;
      }
      const isClose = command && CLOSE_CALL.test(stripped);
      const writesArchive = writtenFiles(tool).some(file => /docs\/archive\//.test(file));
      if (isClose || (command && ARCHIVE_MOVE.test(stripped)) || writesArchive) {
        if (archiveAttempts > 0 || refusedBefore) retry = true;
        archiveAttempts += 1;
        closeWork = true;
      }
      if (isClose) {
        const text = tool.result?.text ?? '';
        const line = closeLine(text);
        const refused = !line && (/Close stopped:/.test(text) || Boolean(tool.result?.isError));
        closeRows.push({ call, line, refused });
        if (refused) refusedBefore = true;
        if (line?.commit) commitRows.push({ call, kind: 'commit', ok: true, hash: line.commit });
      }
      if (lookIds.has(tool.id)) closing = true;
      if (writtenFiles(tool).some(file => BRIEF_FILE.test(file) && /features\//.test(file))) briefWrite = true;
      if (closing && (procedureLabel(tool.name, tool.input) || /docs\/|AGENTS\.md|CLAUDE\.md|joycraft\.ya?ml/.test(command)
        || writtenFiles(tool).some(file => fileClass(file) === 'docs'))) closeWork = true;
    }
    if (closeWork) closing = true;
    let part = 'other';
    if (update) part = 'update';
    else if (call.tools.some(tool => lookIds.has(tool.id))) part = 'look dispatch';
    else if (retry) part = 'retries';
    else if (briefWrite && !closing) part = 'brief';
    else if (closing && closeWork) part = 'close docs';
    else if (!call.tools.length && lastInTurn.get(call.turn) === call) part = 'final message';
    call.part = part;
    parts[part] += call.output;
    const written = call.tools.flatMap(tool => writtenFiles(tool));
    if (written.length) for (const file of written) fileClasses[fileClass(file)] += call.output / written.length;
  }

  // Time: model and tool minutes per main call, tool wait by class, buckets.
  const waits = { look: 0, 'external HTTP': 0, install: 0, 'build and test': 0, other: 0 };
  let externalLong = 0;
  let modelMs = 0;
  let toolMs = 0;
  const buckets = {};
  for (const call of main) {
    const start = call.previousTs ?? call.ts0;
    const model = activeBetween(start, call.ts1, gaps);
    const tool = call.tools.length ? activeBetween(call.ts1, call.endTs, gaps) : 0;
    modelMs += model;
    toolMs += tool;
    if (call.tools.length) {
      const slowest = [...call.tools].sort((a, b) => (b.result?.ts ?? 0) - (a.result?.ts ?? 0))[0];
      const kind = waitClass(slowest.name, slowest.input);
      waits[kind] += tool;
      if (kind === 'external HTTP' && tool > EXTERNAL_WAIT_SECONDS * 1000) externalLong += tool;
    }
    const bucket = bucketOf(call);
    buckets[bucket] ??= { calls: 0, modelMinutes: 0, toolMinutes: 0, output: 0 };
    buckets[bucket].calls += 1;
    buckets[bucket].modelMinutes += minutes(model);
    buckets[bucket].toolMinutes += minutes(tool);
    buckets[bucket].output += call.output;
  }
  for (const row of Object.values(buckets)) { row.modelMinutes = round(row.modelMinutes); row.toolMinutes = round(row.toolMinutes); }

  // The path said before the first code write, and the final reply of the phase's first turn.
  const beforeCode = firstCode ? main.filter(call => call.ts0 <= firstCode.call.ts0) : main;
  const path_ = beforeCode.map(call => PATH_LINE.exec(call.text)?.[1]?.toLowerCase()).find(Boolean) ?? null;
  const firstTurn = phaseTurns[0]?.turn;
  const firstTurnCalls = main.filter(call => call.turn === firstTurn);
  const finalCall = firstTurnCalls.at(-1);
  const finalReply = finalCall && !finalCall.tools.length ? finalCall.text : null;

  // The brief: the close.mjs line first, then the disk.
  const closed = closeRows.find(row => row.line)?.line ?? null;
  const briefWrites = mainTools.flatMap(({ tool }) => writtenFiles(tool)).filter(file => BRIEF_FILE.test(file) && /features\//.test(file));
  const briefPath = closed ? `${closed.target}/brief.md` : briefWrites.at(-1) ?? null;
  const disk = briefPath && project ? briefFromDisk(project, briefPath) : null;
  let briefClosed = null;
  if (closed) briefClosed = true;
  else if (disk) briefClosed = disk.closed;
  let linesChecked = null;
  if (closed) linesChecked = `${closed.checked} of ${closed.lines}`;
  else if (disk?.found) linesChecked = `${disk.checked} of ${disk.lines}`;

  const texts = main.map(call => call.text).filter(Boolean);
  const lookFindings = looks.map(({ tool }) => lookFinding(calls, tool, project));
  let look = lookFindings.length ? lookFindings.map(finding => finding.result).join(' then ') : null;
  if (!look && texts.some(text => NOT_INDEPENDENT.test(text))) look = 'not independent';

  const okCommits = commitRows.filter(row => row.ok && row.kind === 'commit');
  const okAmends = commitRows.filter(row => row.ok && row.kind === 'amend');
  const mainCommitCalls = commitRows.filter(row => row.ok && row.call.agent === 'main').map(row => row.call);
  const refusedCloses = closeRows.filter(row => row.refused).length;
  const archiveRetries = Math.max(0, archiveAttempts - 1);

  const recorded = sum(phaseTurns, 'recordedCost');
  const cost = sum(phaseCalls, 'cost');
  const activeMinutes = round(minutes(sum(phaseTurns, 'activeMs')));
  return {
    activeMinutes,
    netMinutes: round(Math.max(0, activeMinutes - minutes(externalLong))),
    modelMinutes: round(minutes(modelMs)),
    toolMinutes: round(minutes(toolMs)),
    waitMinutes: Object.fromEntries(Object.entries(waits).map(([kind, ms]) => [kind, round(minutes(ms))])),
    cost: round(cost, 4),
    recordedCost: round(recorded, 4),
    residual: round(cost - recorded, 4),
    residualPercent: recorded ? round(((cost - recorded) / recorded) * 100, 1) : null,
    main: totals(main),
    subagents: totals(sub),
    product: totals(product),
    procedure: totals(procedure),
    procedureByLabel: Object.fromEntries(PROCEDURE_PATTERNS.map(([label]) => [label, procedure.filter(call => call.tools.some(tool => procedureLabel(tool.name, tool.input) === label)).length])),
    outputByPart: Object.fromEntries(Object.entries(parts).map(([part, output]) => [part, round(output, 0)])),
    outputByFileClass: Object.fromEntries(Object.entries(fileClasses).map(([kind, output]) => [kind, round(output, 0)])),
    buckets,
    subagentRuns: subagentRows(phaseCalls),
    milestones: {
      firstCodeStart: minute(firstCode ? firstCode.call.previousTs ?? firstCode.call.ts0 : null),
      firstCodeWrite: minute(firstCode?.call.ts1),
      firstRenderOpened: minute(firstRender?.call.ts1),
      lookStart: minute(looks[0]?.call.ts1),
      lookEnd: minute(lookFindings.at(-1)?.end ?? null),
      firstCommit: minute(mainCommitCalls[0]?.ts1),
      closeCommit: minute(mainCommitCalls.at(-1)?.ts1),
    },
    counts: {
      runtimeCalls: allTools.reduce((total, { tool }) => (
        total + (tool.name === 'Bash' ? runtimeCallCount(stripHeredocs(tool.input.command ?? '')) : 0)
      ), 0),
      refusals: allTools.filter(({ tool }) => REFUSAL.test(tool.result?.text ?? '')).length,
      commits: okCommits.length,
      amends: okAmends.length,
      closeCalls: closeRows.length,
      refusedCloses,
      archiveRetries,
      finalReplyWords: finalReply == null ? null : words(finalReply),
      userMessages: phaseTurns.length,
    },
    commitHashes: okCommits.map(row => row.hash).filter(Boolean),
    updateNotice,
    path: path_,
    briefClosed,
    linesChecked,
    brief: disk,
    look,
    looks: lookFindings.map(({ result, renders, reply }) => ({ result, renders, reply })),
    budget: phase === 'build' || phase === 's2'
      ? budgetVerdict({ calls: procedure.length, output: sum(procedure, 'output'), retries: archiveRetries, refusedCloses })
      : null,
  };
}

/** The budget line: at most BUDGET.calls procedure calls, and no retry or refused close. Output is reported, not capped. */
export function budgetVerdict({ calls, output = 0, retries = 0, refusedCloses = 0 }) {
  const pass = calls <= BUDGET.calls && retries === 0 && refusedCloses === 0;
  return { calls, output, retries, refusedCloses, pass, verdict: pass ? 'PASS' : 'FAIL' };
}

/** The breakdown of one run folder. */
export function breakdownRun(runDir) {
  const turns = readTurns(runDir);
  const calls = readCalls(runDir, turns);
  const options = { gaps: readIdleGaps(runDir), project: projectDir(runDir) };
  const phases = {};
  for (const phase of ['setup', 'build', 's2']) {
    if (turns.some(t => t.phase === phase)) phases[phase] = phaseBreakdown(turns, calls, phase, options);
  }
  const warnings = [];
  if (turns.some(t => t.session === 1) && !turns.some(t => t.phase === 'build')) {
    warnings.push('no setup-done event: all of session 1 counts as setup, so there is no build phase and no budget line');
  }
  const firstPhase = Object.keys(phases).find(phase => phases[phase].counts.commits > 0) ?? null;
  const firstCommit = firstPhase ? { phase: firstPhase, minute: phases[firstPhase].milestones.firstCommit } : null;
  const buildCode = phases.build?.milestones.firstCodeStart;
  const firstCommitAtSetup = firstCommit != null && (firstCommit.phase === 'setup'
    || (firstCommit.phase === 'build' && (buildCode == null || firstCommit.minute <= buildCode)));
  const run = path.basename(runDir);
  return { run, arm: run.replace(/-r\d+$/, ''), project: options.project, phases, firstCommit, firstCommitAtSetup, warnings };
}

/** Means per arm and phase of the main numbers. */
export function armMeans(runs) {
  const groups = new Map();
  for (const run of runs) for (const [phase, b] of Object.entries(run.phases)) {
    const key = `${run.arm}|${phase}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  }
  const mean = (list, pick) => list.reduce((total, item) => total + pick(item), 0) / list.length;
  return [...groups.entries()].map(([key, list]) => {
    const [arm, phase] = key.split('|');
    return {
      arm, phase, runs: list.length,
      activeMinutes: round(mean(list, b => b.activeMinutes)),
      netMinutes: round(mean(list, b => b.netMinutes)),
      modelMinutes: round(mean(list, b => b.modelMinutes)),
      toolMinutes: round(mean(list, b => b.toolMinutes)),
      cost: round(mean(list, b => b.cost), 4),
      recordedCost: round(mean(list, b => b.recordedCost), 4),
      mainCalls: round(mean(list, b => b.main.calls), 1),
      mainOutput: round(mean(list, b => b.main.output), 0),
      mainThinking: round(mean(list, b => b.main.thinking), 0),
      subagentCalls: round(mean(list, b => b.subagents.calls), 1),
      subagentCost: round(mean(list, b => b.subagents.cost), 4),
      procedureCalls: round(mean(list, b => b.procedure.calls), 1),
      procedureOutput: round(mean(list, b => b.procedure.output), 0),
      tokens: round(mean(list, b => b.main.tokens + b.subagents.tokens), 0),
    };
  });
}

/** Run folders under a trace folder that have events and transcripts. */
export function listRuns(traceDir) {
  return readdirSync(traceDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => existsSync(path.join(traceDir, name, 'events.jsonl')) && existsSync(path.join(traceDir, name, 'transcripts')))
    .sort();
}

const money = value => `$${value.toFixed(2)}`;
const kilo = value => `${(value / 1000).toFixed(1)}K`;
const mega = value => `${(value / 1e6).toFixed(2)}M`;
const show = value => (value == null ? '-' : String(value));
const yesNo = value => (value == null ? '-' : value ? 'yes' : 'no');
const pairs = (object, format = value => value) => Object.entries(object).map(([key, value]) => `${key} ${format(value)}`).join(', ');

/** The plain-text report. */
export function formatReport(runs) {
  const lines = [];
  for (const run of runs) {
    lines.push(`# ${run.run}`);
    for (const warning of run.warnings ?? []) lines.push(`WARNING: ${warning}`);
    lines.push(`- first commit: ${run.firstCommit ? `${run.firstCommit.phase} at ${show(run.firstCommit.minute)} min` : 'none'}; at setup or build start: ${yesNo(run.firstCommitAtSetup)}`);
    for (const [phase, b] of Object.entries(run.phases)) {
      lines.push(`## ${phase}: ${b.activeMinutes} min (net ${b.netMinutes}), ${money(b.cost)} (recorded ${money(b.recordedCost)}, residual ${b.residualPercent ?? '-'}%)`);
      lines.push(`- time: model ${b.modelMinutes} min, tool ${b.toolMinutes} min; tool wait: ${pairs(b.waitMinutes)}`);
      lines.push(`- main: ${b.main.calls} calls, ${mega(b.main.tokens)} tokens, ${kilo(b.main.output)} output (${kilo(b.main.thinking)} thinking, ${kilo(b.main.visible)} visible), ${money(b.main.cost)}`);
      lines.push(`- product: ${b.product.calls} calls, ${kilo(b.product.output)} output; procedure: ${b.procedure.calls} calls, ${kilo(b.procedure.output)} output, ${money(b.procedure.cost)}`);
      lines.push(`- output by part: ${pairs(b.outputByPart, kilo)}`);
      lines.push(`- output by file class: ${pairs(b.outputByFileClass, kilo)}`);
      lines.push(`- buckets: ${Object.entries(b.buckets).map(([name, row]) => `${name} ${row.calls} calls ${round(row.modelMinutes + row.toolMinutes)} min ${kilo(row.output)}`).join('; ')}`);
      lines.push(`- subagents: ${b.subagents.calls} calls, ${mega(b.subagents.tokens)} tokens, ${kilo(b.subagents.output)} output, ${money(b.subagents.cost)}`);
      for (const s of b.subagentRuns) {
        lines.push(`  - ${s.type} (${s.model}): ${s.seconds} s, ${s.calls} calls, ${money(s.cost)}`);
      }
      const m = b.milestones;
      lines.push(`- milestones (active min): first code start ${show(m.firstCodeStart)}, write ${show(m.firstCodeWrite)}, first render ${show(m.firstRenderOpened)}, look ${show(m.lookStart)} to ${show(m.lookEnd)}, first commit ${show(m.firstCommit)}, close commit ${show(m.closeCommit)}`);
      const c = b.counts;
      lines.push(`- counts: ${c.runtimeCalls} runtime calls, ${c.refusals} refusals, ${c.commits} commits${b.commitHashes.length ? ` (${b.commitHashes.join(', ')})` : ''}, ${c.amends} amends, ${c.closeCalls} close calls, ${c.refusedCloses} refused closes, ${c.archiveRetries} archive retries, ${c.userMessages} user messages`);
      lines.push(`- final reply: ${show(c.finalReplyWords)} words; update notice: ${yesNo(b.updateNotice)}`);
      lines.push(`- path: ${show(b.path)}; brief closed: ${yesNo(b.briefClosed)}; look: ${show(b.look)}; lines checked: ${show(b.linesChecked)}`);
      if (b.brief?.found) {
        const r = b.brief;
        lines.push(`- brief ${r.slug}: ${r.lines} lines (${r.test} test, ${r.seen} seen, ${r.notChecked} not checked, ${r.unmarked} unmarked); tone line ${yesNo(r.toneLine)}; missing-input line ${yesNo(r.missingInputLine)}; a test stubs a source ${yesNo(r.testStubsSource)}`);
      }
      for (const [index, l] of b.looks.entries()) {
        lines.push(`- look ${index + 1}: ${l.result}; ${l.renders.length} renders (${l.renders.map(r => `${path.basename(r.path)} ${show(r.height)} px`).join(', ')})`);
        if (l.reply != null) lines.push(...l.reply.split('\n').map(line => `  > ${line}`));
      }
      if (b.budget) lines.push(`- budget: ${b.budget.verdict} (${b.budget.calls} of ${BUDGET.calls} procedure calls, ${b.budget.retries} retries, ${b.budget.refusedCloses} refused closes; ${kilo(b.budget.output)} procedure output)`);
    }
    lines.push('');
  }
  lines.push('# Means per arm');
  for (const row of armMeans(runs)) {
    lines.push(`- ${row.arm} ${row.phase} (n=${row.runs}): ${row.activeMinutes} min (net ${row.netMinutes}; model ${row.modelMinutes}, tool ${row.toolMinutes}), ${money(row.cost)} (recorded ${money(row.recordedCost)}), main ${row.mainCalls} calls, ${kilo(row.mainOutput)} output (${kilo(row.mainThinking)} thinking), subagents ${row.subagentCalls} calls ${money(row.subagentCost)}, procedure ${row.procedureCalls} calls ${kilo(row.procedureOutput)}, ${mega(row.tokens)} tokens`);
  }
  return lines.join('\n');
}

/** The command-line options. `--help` sets `help`; an unknown flag throws with the usage line. */
export function parseArgs(argv) {
  const options = { trace: path.join(homedir(), 'Developer/ride-trial/v2/trace'), json: false, help: false, runs: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--trace') {
      if (argv[i + 1] === undefined) throw new Error(`--trace needs a folder.\n${USAGE}`);
      options.trace = path.resolve(argv[++i]);
    } else if (arg === '--json') options.json = true;
    else if (arg.startsWith('-')) throw new Error(`Unknown option ${arg}.\n${USAGE}`);
    else options.runs.push(arg);
  }
  return options;
}

export function main(argv = process.argv.slice(2)) {
  let options;
  try { options = parseArgs(argv); } catch (error) { process.stderr.write(`${error.message}\n`); return 2; }
  if (options.help) { process.stdout.write(`${USAGE}\n`); return 0; }
  if (!existsSync(options.trace)) { process.stderr.write(`No trace folder at ${options.trace}.\n${USAGE}\n`); return 2; }
  const names = options.runs.length ? options.runs : listRuns(options.trace);
  const runs = names.map(name => breakdownRun(path.join(options.trace, name)));
  process.stdout.write(options.json ? `${JSON.stringify({ runs, means: armMeans(runs) }, null, 2)}\n` : `${formatReport(runs)}\n`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}

#!/usr/bin/env node
// Trial breakdown (sl1-04): the one analyzer for ride-trial traces. Not shipped:
// package `files` is `dist` and `payload`.
//
// It reads `<trace>/<run>/events.jsonl` and `<trace>/<run>/transcripts/` and
// prints, for each run and phase (setup, build, s2):
// - active minutes, and cost from usage at PRICES, with the residual against
//   the cost that the harness recorded;
// - main and subagent calls, tokens and output, de-duplicated by message id;
// - main calls split into product and procedure by PROCEDURE_PATTERNS;
// - each subagent: type, model, seconds, calls, cost;
// - milestones (wall minutes inside the phase's turns, from the phase start):
//   first code write, first render opened, look start and end, close commit;
// - counts: runtime calls, `stopped:` refusals, commits, user messages;
// - the path announced, whether the brief was closed, and the look result
//   (from the look's own transcript, joined by toolUseId, else from the
//   hand-back report with the host frame removed);
// - the budget verdict for a build: non-product main calls <= 6 and
//   non-product output <= 6K tokens.
//
// Usage:
//   node scripts/trial/breakdown.mjs [--trace <dir>] [--json] [run ...]
// With no run names, it reads every run folder that has events.jsonl and
// transcripts/. The default trace folder is ~/Developer/ride-trial/v2/trace.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Dollars per token. Input that is not cached is rare; it uses the base rate. */
export const PRICES = {
  output: 20e-6,
  cacheRead: 0.2e-6,
  cacheWrite5m: 5e-6,
  cacheWrite1h: 8e-6,
  input: 4e-6,
};

/** The build budget for procedure on the main thread. */
export const BUDGET = { calls: 6, outputTokens: 6000 };

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

const IMAGE = /\.(png|jpe?g|webp|gif)$/i;
const SOURCE = /\.(tsx?|jsx?|mjs|cjs|css|scss|html|vue|svelte|py|go|rs|rb|java|kt|swift)$/i;
const RUNTIME_DIR = /\.joycraft\/runtime/;
const RUNTIME_VAR = /\b([A-Za-z_]\w*)=["']?[^\s;&|"']*\.joycraft\/runtime(?:["'\s;&|]|$)/g;
const REFUSAL = /(?:^|\n)[A-Z][A-Za-z ]{0,40} stopped: /;
const GIT_COMMIT = /\bgit\s+(?:-C\s+\S+\s+)?commit\b/;
const PATH_LINE = /Path:\s*[`*]*\s*(small job|feature)\b/i;
const CHECKED_LINE = /(\d+) of (\d+) lines checked/i;
const NOT_INDEPENDENT = /look was not independent/i;

const round = (value, places = 2) => Number(value.toFixed(places));

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

/** A main call is procedure when every tool use in it is procedure. A call with text only is product. */
export function callKind(call) {
  if (!call.tools.length) return 'product';
  return call.tools.every(tool => procedureLabel(tool.name, tool.input)) ? 'procedure' : 'product';
}

/** Cost of one call from its usage, at PRICES. */
export function usageCost(usage = {}) {
  const tokens = usageTokens(usage);
  return tokens.output * PRICES.output + tokens.cacheRead * PRICES.cacheRead
    + tokens.cacheWrite5m * PRICES.cacheWrite5m + tokens.cacheWrite1h * PRICES.cacheWrite1h
    + tokens.input * PRICES.input;
}

function usageTokens(usage = {}) {
  const split = usage.cache_creation;
  return {
    output: usage.output_tokens ?? 0,
    input: usage.input_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    cacheWrite5m: split ? split.ephemeral_5m_input_tokens ?? 0 : 0,
    cacheWrite1h: split ? split.ephemeral_1h_input_tokens ?? 0 : usage.cache_creation_input_tokens ?? 0,
  };
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
    call.cost = usageCost(call.usage ?? {});
    call.endTs = Math.max(call.ts1 ?? 0, ...call.tools.map(tool => tool.result?.ts ?? 0));
    const turn = turns.find(t => call.ts0 >= t.start - 2000 && call.ts0 <= t.end + 2000)
      ?? [...turns].reverse().find(t => call.ts0 >= t.start);
    call.turn = turn?.turn ?? null;
    call.phase = turn?.phase ?? 'unknown';
  }
  calls.sort((a, b) => a.ts0 - b.ts0);
  return calls;
}

/**
 * Wall minutes inside the phase's turns, from the start of the phase to a time
 * stamp. Gaps between turns do not count. One clock throughout: a milestone can
 * be later than the phase's active minutes, because active time excludes waits.
 */
function phaseMinute(turns, phase, ts) {
  if (ts == null) return null;
  let minutes = 0;
  for (const turn of turns.filter(t => t.phase === phase)) {
    if (ts > turn.end + 2000) { minutes += (turn.end - turn.start) / 60000; continue; }
    return round(minutes + Math.max(0, ts - turn.start) / 60000);
  }
  return round(minutes);
}

function writtenSourceFile(tool) {
  const file = tool.input.file_path;
  if (['Write', 'Edit', 'MultiEdit'].includes(tool.name) && typeof file === 'string') return file;
  if (tool.name === 'Bash' && typeof tool.input.command === 'string') {
    const match = /(?:cat|tee)\s+(?:-a\s+)?>{0,2}\s*([^\s;&|<>]+\.\w+)/.exec(stripHeredocs(tool.input.command).replace(/\btee\s+/, 'tee >'));
    return match?.[1] ?? null;
  }
  return null;
}

function isCodeWrite(tool) {
  const file = writtenSourceFile(tool);
  return Boolean(file && SOURCE.test(file) && !/(^|\/)\.tmp\//.test(file) && !procedureLabel('Write', { file_path: file }));
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

/** The subagent calls that a tool use started, joined by the meta file's toolUseId. */
function subagentCallsFor(calls, toolUseId) {
  return calls.filter(call => call.agent !== 'main' && call.meta?.toolUseId === toolUseId);
}

/** The look's result and end time: its own last text block, else the hand-back report. */
function lookFinding(calls, tool) {
  const own = subagentCallsFor(calls, tool.id);
  const report = [...own].reverse().find(call => call.lastText)?.lastText;
  if (report != null) return { result: lookOutcome(report), end: Math.max(...own.map(call => call.endTs)) };
  const text = tool.result?.text;
  if (text == null || /^Async agent launched/.test(text.trim())) return { result: 'no result', end: null };
  return { result: lookOutcome(text), end: tool.result.ts };
}

function closesBrief(tool) {
  const text = tool.result?.text ?? '';
  if (tool.result?.isError) return false;
  if (/"status":\s*"archived"|\barchived docs\/archive\//.test(text)) return true;
  if (['Write', 'Edit'].includes(tool.name) && /docs\/archive\//.test(tool.input.file_path ?? '')) return true;
  if (tool.name === 'Bash' && typeof tool.input.command === 'string') {
    return /\b(?:git\s+mv|mv)\b[^\n;&|]*docs\/archive/.test(stripHeredocs(tool.input.command));
  }
  return false;
}

function sum(calls, key) {
  return calls.reduce((total, call) => total + call[key], 0);
}

function totals(calls) {
  return {
    calls: calls.length,
    tokens: sum(calls, 'context') + sum(calls, 'output'),
    context: sum(calls, 'context'),
    output: sum(calls, 'output'),
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

/** The breakdown of one phase. */
export function phaseBreakdown(turns, calls, phase) {
  // `calls` holds every phase: a subagent call is joined to its Agent tool use by id.
  const phaseTurns = turns.filter(t => t.phase === phase);
  const phaseCalls = calls.filter(c => c.phase === phase);
  const main = phaseCalls.filter(c => c.agent === 'main');
  const sub = phaseCalls.filter(c => c.agent !== 'main');
  for (const call of main) call.kind = callKind(call);
  const procedure = main.filter(c => c.kind === 'procedure');
  const product = main.filter(c => c.kind === 'product');
  const minute = ts => phaseMinute(turns, phase, ts);

  const mainTools = main.flatMap(call => call.tools.map(tool => ({ call, tool })));
  const allTools = phaseCalls.flatMap(call => call.tools.map(tool => ({ call, tool })));
  const firstCode = mainTools.find(({ tool }) => isCodeWrite(tool));
  const firstRender = mainTools.find(({ tool }) => tool.name === 'Read' && IMAGE.test(tool.input.file_path ?? ''));
  const looks = mainTools.filter(({ tool }) => ['Agent', 'Task'].includes(tool.name) && tool.input.subagent_type === 'joycraft-look');
  const commits = allTools.filter(({ tool }) => tool.name === 'Bash' && GIT_COMMIT.test(stripHeredocs(tool.input.command ?? '')) && !tool.result?.isError);
  const mainCommits = commits.filter(({ call }) => call.agent === 'main');
  const texts = main.map(call => call.text).filter(Boolean);

  const lookFindings = looks.map(({ tool }) => lookFinding(calls, tool));
  let look = lookFindings.length ? lookFindings.map(finding => finding.result).join(' then ') : null;
  if (!look && texts.some(text => NOT_INDEPENDENT.test(text))) look = 'not independent';
  const checked = [...texts].reverse().map(text => CHECKED_LINE.exec(text)).find(Boolean);

  const recorded = sum(phaseTurns, 'recordedCost');
  const cost = sum(phaseCalls, 'cost');
  const nonProduct = { calls: procedure.length, output: sum(procedure, 'output') };
  return {
    activeMinutes: round(sum(phaseTurns, 'activeMs') / 60000),
    cost: round(cost, 4),
    recordedCost: round(recorded, 4),
    residual: round(cost - recorded, 4),
    residualPercent: recorded ? round(((cost - recorded) / recorded) * 100, 1) : null,
    main: totals(main),
    subagents: totals(sub),
    product: totals(product),
    procedure: totals(procedure),
    procedureByLabel: Object.fromEntries(PROCEDURE_PATTERNS.map(([label]) => [label, procedure.filter(call => call.tools.some(tool => procedureLabel(tool.name, tool.input) === label)).length])),
    subagentRuns: subagentRows(phaseCalls),
    milestones: {
      firstCodeWrite: minute(firstCode?.call.ts1),
      firstRenderOpened: minute(firstRender?.call.ts1),
      lookStart: minute(looks[0]?.call.ts1),
      lookEnd: minute(lookFindings.at(-1)?.end ?? null),
      closeCommit: minute(mainCommits.at(-1)?.call.ts1),
    },
    counts: {
      runtimeCalls: allTools.reduce((total, { tool }) => (
        total + (tool.name === 'Bash' ? runtimeCallCount(stripHeredocs(tool.input.command ?? '')) : 0)
      ), 0),
      refusals: allTools.filter(({ tool }) => REFUSAL.test(tool.result?.text ?? '')).length,
      commits: commits.length,
      userMessages: phaseTurns.length,
    },
    path: texts.map(text => PATH_LINE.exec(text)?.[1]?.toLowerCase()).find(Boolean) ?? null,
    briefClosed: mainTools.some(({ tool }) => closesBrief(tool)),
    look,
    linesChecked: checked ? `${checked[1]} of ${checked[2]}` : null,
    budget: phase === 'build' ? budgetVerdict(nonProduct) : null,
  };
}

/** The build budget: non-product main calls and their output. */
export function budgetVerdict({ calls, output }) {
  const pass = calls <= BUDGET.calls && output <= BUDGET.outputTokens;
  return { calls, output, pass, verdict: pass ? 'PASS' : 'FAIL' };
}

/** The breakdown of one run folder. */
export function breakdownRun(runDir) {
  const turns = readTurns(runDir);
  const calls = readCalls(runDir, turns);
  const phases = {};
  for (const phase of ['setup', 'build', 's2']) {
    if (turns.some(t => t.phase === phase)) phases[phase] = phaseBreakdown(turns, calls, phase);
  }
  const warnings = [];
  if (turns.some(t => t.session === 1) && !turns.some(t => t.phase === 'build')) {
    warnings.push('no setup-done event: all of session 1 counts as setup, so there is no build phase and no budget line');
  }
  const run = path.basename(runDir);
  return { run, arm: run.replace(/-r\d+$/, ''), phases, warnings };
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
      cost: round(mean(list, b => b.cost), 4),
      recordedCost: round(mean(list, b => b.recordedCost), 4),
      mainCalls: round(mean(list, b => b.main.calls), 1),
      mainOutput: round(mean(list, b => b.main.output), 0),
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

/** The plain-text report. */
export function formatReport(runs) {
  const lines = [];
  for (const run of runs) {
    lines.push(`# ${run.run}`);
    for (const warning of run.warnings ?? []) lines.push(`WARNING: ${warning}`);
    for (const [phase, b] of Object.entries(run.phases)) {
      lines.push(`## ${phase}: ${b.activeMinutes} min, ${money(b.cost)} (recorded ${money(b.recordedCost)}, residual ${b.residualPercent ?? '-'}%)`);
      lines.push(`- main: ${b.main.calls} calls, ${mega(b.main.tokens)} tokens, ${kilo(b.main.output)} output, ${money(b.main.cost)}`);
      lines.push(`- product: ${b.product.calls} calls, ${kilo(b.product.output)} output; procedure: ${b.procedure.calls} calls, ${kilo(b.procedure.output)} output, ${money(b.procedure.cost)}`);
      lines.push(`- subagents: ${b.subagents.calls} calls, ${mega(b.subagents.tokens)} tokens, ${kilo(b.subagents.output)} output, ${money(b.subagents.cost)}`);
      for (const s of b.subagentRuns) {
        lines.push(`  - ${s.type} (${s.model}): ${s.seconds} s, ${s.calls} calls, ${money(s.cost)}`);
      }
      const m = b.milestones;
      lines.push(`- milestones (wall min in turns): first code write ${show(m.firstCodeWrite)}, first render ${show(m.firstRenderOpened)}, look ${show(m.lookStart)} to ${show(m.lookEnd)}, close commit ${show(m.closeCommit)}`);
      const c = b.counts;
      lines.push(`- counts: ${c.runtimeCalls} runtime calls, ${c.refusals} refusals, ${c.commits} commits, ${c.userMessages} user messages`);
      lines.push(`- path: ${show(b.path)}; brief closed: ${b.briefClosed ? 'yes' : 'no'}; look: ${show(b.look)}; lines checked: ${show(b.linesChecked)}`);
      if (b.budget) lines.push(`- budget: ${b.budget.verdict} (${b.budget.calls} of ${BUDGET.calls} non-product calls, ${kilo(b.budget.output)} of ${kilo(BUDGET.outputTokens)} output)`);
    }
    lines.push('');
  }
  lines.push('# Means per arm');
  for (const row of armMeans(runs)) {
    lines.push(`- ${row.arm} ${row.phase} (n=${row.runs}): ${row.activeMinutes} min, ${money(row.cost)} (recorded ${money(row.recordedCost)}), main ${row.mainCalls} calls, ${kilo(row.mainOutput)} output, subagents ${row.subagentCalls} calls ${money(row.subagentCost)}, procedure ${row.procedureCalls} calls ${kilo(row.procedureOutput)}, ${mega(row.tokens)} tokens`);
  }
  return lines.join('\n');
}

function parseArgs(argv) {
  const options = { trace: path.join(homedir(), 'Developer/ride-trial/v2/trace'), json: false, runs: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--trace') options.trace = path.resolve(argv[++i]);
    else if (argv[i] === '--json') options.json = true;
    else options.runs.push(argv[i]);
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  const names = options.runs.length ? options.runs : listRuns(options.trace);
  const runs = names.map(name => breakdownRun(path.join(options.trace, name)));
  process.stdout.write(options.json ? `${JSON.stringify({ runs, means: armMeans(runs) }, null, 2)}\n` : `${formatReport(runs)}\n`);
}

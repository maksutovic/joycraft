import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  armMeans,
  breakdownRun,
  budgetVerdict,
  callKind,
  handBackReport,
  lookOutcome,
  PROCEDURE_PATTERNS,
  procedureLabel,
  runtimeCallCount,
  stripHeredocs,
  usageCost,
} from '../scripts/trial/breakdown.mjs';

// sl1-04: one analyzer for trial traces. A small fixture trace pins each number
// it prints. When the v2 trial traces are on this machine, the last block checks
// that the analyzer reproduces the recorded v2 numbers.

const T0 = Date.parse('2026-11-23T00:00:00.000Z');
const B = T0 + 70_000; // build turn start
const at = (ms: number) => new Date(ms).toISOString();
const lines = (records: object[]) => records.map(record => JSON.stringify(record)).join('\n') + '\n';
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };

// Each main call: 10,000 cache reads and 1,000 1-hour writes ($0.01), plus output.
const mainUsage = (output: number) => ({
  input_tokens: 0,
  output_tokens: output,
  cache_read_input_tokens: 10_000,
  cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 1_000 },
});
// Each subagent call: 2,000 writes with no 5m/1h split (priced as 1-hour) plus 50 output: $0.017.
const subUsage = { input_tokens: 0, output_tokens: 50, cache_creation_input_tokens: 2_000 };

let n = 0;
function call(ts: number, output: number, content: object[], usage: object = mainUsage(output), id = `msg_${++n}`, model = 'claude-opus-5-5') {
  return { type: 'assistant', timestamp: at(ts), message: { id, model, role: 'assistant', content, usage } };
}
const toolUse = (id: string, name: string, input: object) => ({ type: 'tool_use', id, name, input });
const result = (ts: number, id: string, text: string, isError = false) => ({
  type: 'user', timestamp: at(ts), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: text, is_error: isError }] },
});
const userText = (ts: number, text: string) => ({ type: 'user', timestamp: at(ts), message: { role: 'user', content: text } });
// The host never returns a bare report: it wraps it in this frame, indents it two
// spaces, and adds the agent id and usage. Some results start with a tools line.
const handBack = (report: string, toolsLine = false) => [
  ...(toolsLine ? ['  <tools-used-before-summary>Read</tools-used-before-summary>', '  '] : []),
  '[Subagent hand-back] The text below is the final report of a subagent this session delegated to. The report follows:',
  ...report.split('\n').map(line => `  ${line}`),
  "agentId: alook (use SendMessage with to: 'alook', summary: '<5-10 word recap>' to continue this agent)",
  '<usage>subagent_tokens: 1200\ntool_uses: 1\nduration_ms: 24000</usage>',
].join('\n');
const ASYNC_NOTE = 'Async agent launched successfully.\nagentId: alook (internal ID)\nThe agent is working in the background.';
const TWO_QUOTES = '"Ride today: YES" disagrees with "Wind 40 km/h: stay home".';

function writeFixture(root: string) {
  const run = join(root, 'demo-r1');
  put(join(run, 'events.jsonl'), lines([
    { at: at(T0), event: 'turn-start', turn: 1, session: 1 },
    { at: at(T0 + 60_000), event: 'turn-end', turn: 1, session: 1, endedAt: at(T0 + 60_000), activeMs: 60_000, cost: 0.012 },
    { at: at(T0 + 61_000), event: 'setup-done' },
    { at: at(B), event: 'turn-start', turn: 2, session: 1 },
    { at: at(B + 600_000), event: 'turn-end', turn: 2, session: 1, endedAt: at(B + 600_000), activeMs: 600_000, cost: 0.212 },
    { at: at(T0 + 700_000), event: 'session-2-start' },
    { at: at(T0 + 700_000), event: 'turn-start', turn: 3, session: 2 },
    { at: at(T0 + 760_000), event: 'turn-end', turn: 3, session: 2, endedAt: at(T0 + 760_000), activeMs: 60_000, cost: 0.012 },
  ]));
  const s1 = join(run, 'transcripts', 'S1.jsonl');
  put(s1, lines([
    userText(T0 + 1_000, 'Set up Joycraft.'),
    call(T0 + 5_000, 100, [toolUse('t0', 'Bash', { command: 'node .joycraft/runtime/kickoff.mjs detect' })]),
    result(T0 + 6_000, 't0', '{"git": false}'),
    userText(B + 1_000, 'Build the app.'),
    // One message streamed as two records: the analyzer counts one call.
    call(B + 5_000, 10, [{ type: 'text', text: 'Path: small job. I write the brief first.' }], mainUsage(10), 'msg_brief'),
    call(B + 6_000, 500, [toolUse('t1', 'Write', { file_path: '/p/docs/features/ride/brief.md', content: '...' })], mainUsage(500), 'msg_brief'),
    result(B + 7_000, 't1', 'File created'),
    call(B + 30_000, 2_000, [toolUse('t2', 'Write', { file_path: '/p/src/app/page.tsx', content: '...' })]),
    result(B + 31_000, 't2', 'File created'),
    // The heredoc body names the brief, but the command writes product code.
    call(B + 60_000, 1_000, [toolUse('t3', 'Bash', { command: "cat > src/lib/verdict.ts <<'EOF'\n// Thresholds: docs/features/ride/brief.md\nEOF" })]),
    result(B + 61_000, 't3', ''),
    call(B + 120_000, 100, [toolUse('t4', 'Read', { file_path: '/p/.tmp/shots/default.png' })]),
    result(B + 121_000, 't4', '[image]'),
    call(B + 180_000, 200, [toolUse('t5', 'Agent', { subagent_type: 'joycraft-look', description: 'Look', prompt: '...' })]),
    result(B + 210_000, 't5', handBack('OK')),
    call(B + 240_000, 100, [toolUse('t6', 'Bash', { command: 'node .joycraft/runtime/status.mjs --bad' })]),
    result(B + 241_000, 't6', 'Status stopped: Usage: status.mjs [--root <project>]', true),
    call(B + 300_000, 200, [toolUse('t7', 'Bash', { command: "git mv docs/features/ride docs/archive/ride && git commit -q -m 'feat: ride'" })]),
    result(B + 302_000, 't7', '[main 1a2b3c] feat: ride'),
    call(B + 330_000, 300, [{ type: 'text', text: 'Path: small job. 3 of 3 lines checked. Look: OK. No code review ran.' }]),
  ]));
  const subDir = join(run, 'transcripts', 'S1', 'subagents');
  put(join(subDir, 'agent-alook.meta.json'), JSON.stringify({ agentType: 'joycraft-look', model: 'claude-haiku-4-5', toolUseId: 't5' }));
  put(join(subDir, 'agent-alook.jsonl'), lines([
    userText(B + 181_000, 'The user asked: ... Render: .tmp/shots/default.png'),
    call(B + 190_000, 50, [toolUse('s1', 'Read', { file_path: '/p/.tmp/shots/default.png' })], subUsage, 'msg_s1', 'claude-haiku-4-5'),
    result(B + 192_000, 's1', '[image]'),
    call(B + 205_000, 50, [{ type: 'text', text: 'OK' }], subUsage, 'msg_s2', 'claude-haiku-4-5'),
  ]));
  put(join(run, 'transcripts', 'S2.jsonl'), lines([
    userText(T0 + 701_000, 'Add a feature.'),
    call(T0 + 710_000, 100, [toolUse('u1', 'Bash', { command: 'npm test' })]),
    result(T0 + 712_000, 'u1', 'Tests 3 passed'),
  ]));
  return run;
}

let root: string;
let report: ReturnType<typeof breakdownRun>;
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'joycraft-breakdown-'));
  report = breakdownRun(writeFixture(root));
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('the procedure table', () => {
  it('[AC:sl1-04] is one exported table of labels and patterns', () => {
    expect(PROCEDURE_PATTERNS.length).toBeGreaterThan(0);
    for (const [label, pattern] of PROCEDURE_PATTERNS) {
      expect(typeof label).toBe('string');
      expect(pattern).toBeInstanceOf(RegExp);
    }
  });

  it.each([
    ['Skill', { skill: 'joycraft-entry' }, 'skill'],
    ['Agent', { subagent_type: 'joycraft-reviewer' }, 'subagent'],
    ['Bash', { command: 'node .joycraft/runtime/status.mjs' }, 'joycraft files'],
    ['Read', { file_path: '/p/.claude/skills/joycraft-entry/SKILL.md' }, 'skills and agents'],
    ['Write', { file_path: '/p/docs/features/x/brief.md' }, 'brief, specs, archive'],
    ['Edit', { file_path: '/p/docs/context/project.md' }, 'context pages'],
    ['Bash', { command: 'cat joycraft.yaml' }, 'joycraft config'],
  ])('[AC:sl1-04] %s %j is procedure (%s)', (name, input, label) => {
    expect(procedureLabel(name, input)).toBe(label);
  });

  it.each([
    ['Write', { file_path: '/p/src/app/page.tsx' }],
    ['Bash', { command: 'npm test && git add -A && git commit -m x' }],
    ['Read', { file_path: '/p/.tmp/shots/a.png' }],
    ['Bash', { command: "cat > src/a.ts <<'EOF'\nsee docs/features/x/brief.md\nEOF\nnpm test" }],
  ])('[AC:sl1-04] %s %j is product', (name, input) => {
    expect(procedureLabel(name, input)).toBeNull();
  });

  it('[AC:sl1-04] strips heredoc bodies and keeps the rest of the command', () => {
    expect(stripHeredocs("cat > a.ts <<'EOF' && echo\nbody docs/features\nEOF\nnpm test")).toBe("cat > a.ts <<'EOF' && echo\nnpm test");
  });

  it('[AC:sl1-04] a call is procedure only when all its tool uses are; text alone is product', () => {
    const proc = { name: 'Bash', input: { command: 'node .joycraft/runtime/gate.mjs check' } };
    const prod = { name: 'Bash', input: { command: 'npm test' } };
    expect(callKind({ tools: [proc] })).toBe('procedure');
    expect(callKind({ tools: [proc, prod] })).toBe('product');
    expect(callKind({ tools: [] })).toBe('product');
  });
});

describe('the fixture trace', () => {
  it('[AC:sl1-04] prices usage at $20/M output, $0.20/M read, $5/M and $8/M write', () => {
    expect(usageCost({ output_tokens: 1e6 })).toBeCloseTo(20);
    expect(usageCost({ cache_read_input_tokens: 1e6 })).toBeCloseTo(0.2);
    expect(usageCost({ cache_creation: { ephemeral_5m_input_tokens: 1e6, ephemeral_1h_input_tokens: 0 } })).toBeCloseTo(5);
    expect(usageCost({ cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 1e6 } })).toBeCloseTo(8);
  });

  it('[AC:sl1-04] gives active minutes, cost and the residual against the recorded cost per phase', () => {
    expect(Object.keys(report.phases)).toEqual(['setup', 'build', 's2']);
    const build = report.phases.build;
    expect(build.activeMinutes).toBe(10);
    // Main: 8 calls at $0.01 plus 4,400 output at $20/M; subagent: 2 calls at $0.017.
    expect(build.cost).toBeCloseTo(0.08 + 0.088 + 0.034, 4);
    expect(build.recordedCost).toBeCloseTo(0.2, 4);
    expect(build.residual).toBeCloseTo(0.002, 4);
    expect(build.residualPercent).toBe(1);
    expect(report.phases.setup.cost).toBeCloseTo(0.012, 4);
    expect(report.phases.s2.recordedCost).toBeCloseTo(0.012, 4);
  });

  it('[AC:sl1-04] counts main and subagent calls once per message id', () => {
    const build = report.phases.build;
    expect(build.main.calls).toBe(8);
    expect(build.main.output).toBe(4_400);
    expect(build.main.tokens).toBe(8 * 11_000 + 4_400);
    expect(build.subagents.calls).toBe(2);
    expect(build.subagents.output).toBe(100);
  });

  it('[AC:sl1-04] splits main calls into product and procedure', () => {
    const build = report.phases.build;
    expect(build.procedure.calls).toBe(4);
    expect(build.procedure.output).toBe(1_000);
    expect(build.product.calls).toBe(4);
    expect(build.procedureByLabel).toMatchObject({ subagent: 1, 'joycraft files': 1, 'brief, specs, archive': 2 });
  });

  it('[AC:sl1-04] lists each subagent with type, model, seconds, calls and cost', () => {
    expect(report.phases.build.subagentRuns).toEqual([
      { agent: 'agent-alook', type: 'joycraft-look', model: 'claude-haiku-4-5', seconds: 24, calls: 2, output: 100, cost: 0.034 },
    ]);
  });

  it('[AC:sl1-04] gives the milestones in wall minutes inside turns from the phase start', () => {
    expect(report.phases.build.milestones).toEqual({
      firstCodeWrite: 0.5,
      firstRenderOpened: 2,
      lookStart: 3,
      lookEnd: 3.42,
      closeCommit: 5,
    });
  });

  it('[AC:sl1-04] counts runtime calls, refusals, commits and user messages', () => {
    expect(report.phases.build.counts).toEqual({ runtimeCalls: 1, refusals: 1, commits: 1, userMessages: 1 });
    expect(report.phases.setup.counts.runtimeCalls).toBe(1);
  });

  it('[AC:sl1-04] reads the path, the brief close, the look result and the checked lines', () => {
    const build = report.phases.build;
    expect(build.path).toBe('small job');
    expect(build.briefClosed).toBe(true);
    expect(build.look).toBe('OK');
    expect(build.linesChecked).toBe('3 of 3');
    expect(report.phases.s2.path).toBeNull();
    expect(report.phases.s2.briefClosed).toBe(false);
  });

  it('[AC:sl1-04] gives the budget verdict for a build only', () => {
    expect(report.phases.build.budget).toEqual({ calls: 4, output: 1_000, pass: true, verdict: 'PASS' });
    expect(report.phases.setup.budget).toBeNull();
    expect(budgetVerdict({ calls: 7, output: 100 }).verdict).toBe('FAIL');
    expect(budgetVerdict({ calls: 6, output: 6_001 }).verdict).toBe('FAIL');
    expect(budgetVerdict({ calls: 6, output: 6_000 }).verdict).toBe('PASS');
  });
});

/** A one-call build with a look: the Agent tool result, and optionally the look's own transcript. */
function writeLookRun(root: string, name: string, toolResult: string, own?: { text: string; toolUseId: string }) {
  const run = join(root, name);
  put(join(run, 'events.jsonl'), lines([
    { at: at(T0), event: 'setup-done' },
    { at: at(T0 + 1_000), event: 'turn-start', turn: 1, session: 1 },
    { at: at(T0 + 121_000), event: 'turn-end', turn: 1, session: 1, endedAt: at(T0 + 121_000), activeMs: 120_000, cost: 0 },
  ]));
  put(join(run, 'transcripts', 'S1.jsonl'), lines([
    userText(T0 + 2_000, 'Build the app.'),
    call(T0 + 31_000, 100, [toolUse('look1', 'Agent', { subagent_type: 'joycraft-look', description: 'Look', prompt: '...' })]),
    result(T0 + 33_000, 'look1', toolResult),
  ]));
  if (own) {
    const subDir = join(run, 'transcripts', 'S1', 'subagents');
    put(join(subDir, 'agent-alook.meta.json'), JSON.stringify({ agentType: 'joycraft-look', toolUseId: own.toolUseId }));
    put(join(subDir, 'agent-alook.jsonl'), lines([
      userText(T0 + 32_000, 'The user asked: ...'),
      call(T0 + 61_000, 50, [{ type: 'text', text: own.text }], subUsage, `msg_${++n}`, 'claude-haiku-4-5'),
    ]));
  }
  return breakdownRun(run).phases.build;
}

describe('the look result', () => {
  it('[AC:sl1-04] removes the host frame from a hand-back report', () => {
    expect(handBackReport(handBack('OK'))).toBe('OK');
    expect(handBackReport(handBack(`${TWO_QUOTES}\nNote: the icon is small.`, true))).toBe(`${TWO_QUOTES}\nNote: the icon is small.`);
    expect(lookOutcome(handBack('OK', true))).toBe('OK');
    expect(lookOutcome(handBack('**OK.** Nothing disagrees.'))).toBe('OK');
    expect(lookOutcome(handBack(TWO_QUOTES))).toBe('quotes');
  });

  it('[AC:sl1-04] reads OK and quotes from the framed tool result when no look transcript matches', () => {
    expect(writeLookRun(root, 'frame-ok-r1', handBack('OK')).look).toBe('OK');
    expect(writeLookRun(root, 'frame-quotes-r1', handBack(TWO_QUOTES, true)).look).toBe('quotes');
  });

  it("[AC:sl1-04] reads the look's own last text block, joined by toolUseId, and ends the look there", () => {
    const joined = writeLookRun(root, 'joined-r1', ASYNC_NOTE, { text: TWO_QUOTES, toolUseId: 'look1' });
    expect(joined.look).toBe('quotes');
    expect(joined.milestones.lookEnd).toBe(1);
    expect(writeLookRun(root, 'unjoined-r1', ASYNC_NOTE, { text: 'OK', toolUseId: 'other' }).look).toBe('no result');
  });
});

describe('the run checks', () => {
  it('[AC:sl1-04] counts runtime calls in sub-folders and through a variable set to the runtime folder', () => {
    expect(runtimeCallCount('node .joycraft/runtime/artifacts/cli.mjs build')).toBe(1);
    expect(runtimeCallCount('R=.joycraft/runtime; node $R/status.mjs && node ${R}/gate.mjs')).toBe(2);
    expect(runtimeCallCount('node .joycraft/runtime/x.mjs && node $HOME/tool.mjs')).toBe(1);
    expect(runtimeCallCount('node $R/status.mjs')).toBe(0);
  });

  it('[AC:sl1-04] warns when a run has no setup-done event', () => {
    const run = join(root, 'nosetup-r1');
    put(join(run, 'events.jsonl'), lines([
      { at: at(T0), event: 'turn-start', turn: 1, session: 1 },
      { at: at(T0 + 60_000), event: 'turn-end', turn: 1, session: 1, endedAt: at(T0 + 60_000), activeMs: 60_000, cost: 0 },
    ]));
    put(join(run, 'transcripts', 'S1.jsonl'), lines([userText(T0 + 1_000, 'Build the app.')]));
    const nosetup = breakdownRun(run);
    expect(Object.keys(nosetup.phases)).toEqual(['setup']);
    expect(nosetup.warnings[0]).toMatch(/no setup-done event/);
    expect(report.warnings).toEqual([]);
  });
});

// The v2 trial traces live outside the repo. CI does not have them, so this block skips there.
const v2 = process.env.JOYCRAFT_TRIAL_TRACE ?? join(homedir(), 'Developer/ride-trial/v2/trace');
const haveV2 = ['joycraft-r1', 'joycraft-r2', 'joycraft-r3', 'pocock-r1', 'pocock-r2', 'pocock-r3']
  .every(run => existsSync(join(v2, run, 'events.jsonl')));

describe.skipIf(!haveV2)('the v2 trial traces', () => {
  const build = (arm: string) => {
    const runs = [1, 2, 3].map(i => breakdownRun(join(v2, `${arm}-r${i}`)));
    return armMeans(runs).find(row => row.arm === arm && row.phase === 'build')!;
  };

  it('[AC:sl1-04] reproduces the Joycraft build: $5.66 within 1%, 56.7 main and 76 reviewer calls within 1', () => {
    const joycraft = build('joycraft');
    expect(Math.abs(joycraft.cost - 5.66) / 5.66).toBeLessThanOrEqual(0.01);
    expect(Math.abs(joycraft.mainCalls - 56.7)).toBeLessThanOrEqual(1);
    expect(Math.abs(joycraft.subagentCalls - 76)).toBeLessThanOrEqual(1);
  });

  it('[AC:sl1-04] reproduces the Pocock build: 30.3 calls and $1.66', () => {
    const pocock = build('pocock');
    expect(Math.abs(pocock.mainCalls - 30.3)).toBeLessThanOrEqual(1);
    expect(Math.abs(pocock.cost - 1.66) / 1.66).toBeLessThanOrEqual(0.01);
  });
});

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  armMeans,
  breakdownRun,
  bucketOf,
  BUCKETS,
  budgetVerdict,
  callKind,
  closeLine,
  commitOutcome,
  fileClass,
  handBackReport,
  lookOutcome,
  parseArgs,
  priceRow,
  PRICES,
  PROCEDURE_PATTERNS,
  procedureLabel,
  runtimeCallCount,
  stripHeredocs,
  usageCost,
  waitClass,
  writtenFiles,
} from '../scripts/trial/breakdown.mjs';

// sl1-04, sl2-05: one analyzer for trial traces. Small fixture traces pin each
// number it prints. When the trial traces are on this machine, the last blocks
// check that the analyzer reproduces the recorded v2 numbers and the i1 facts.

const T0 = Date.parse('2026-11-23T00:00:00.000Z');
const B = T0 + 70_000; // build turn start
const at = (ms: number) => new Date(ms).toISOString();
const lines = (records: object[]) => records.map(record => JSON.stringify(record)).join('\n') + '\n';
const put = (file: string, body: string | Buffer) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };

// Each main call: 10,000 cache reads and 1,000 1-hour writes ($0.01), plus output.
const mainUsage = (output: number, thinking = 0) => ({
  input_tokens: 0,
  output_tokens: output,
  output_tokens_details: { thinking_tokens: thinking },
  cache_read_input_tokens: 10_000,
  cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 1_000 },
});
// Each look call (Haiku): 2,000 writes with no 5m/1h split (priced as 1-hour) plus 50 output: $0.000425.
const subUsage = { input_tokens: 0, output_tokens: 50, cache_creation_input_tokens: 2_000 };
const HAIKU_CALL = 2_000 * 0.2e-6 + 50 * 0.5e-6;

let n = 0;
function call(ts: number, output: number, content: object[], usage: object = mainUsage(output), id = `msg_${++n}`, model = 'claude-opus-5-5', stop: string | null = null) {
  return { type: 'assistant', timestamp: at(ts), message: { id, model, role: 'assistant', content, usage, stop_reason: stop } };
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

/** The first 24 bytes of a PNG: signature, IHDR length and type, width, height. */
function pngHead(width: number, height: number) {
  const head = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(head, 0);
  head.writeUInt32BE(13, 8);
  head.write('IHDR', 12, 'latin1');
  head.writeUInt32BE(width, 16);
  head.writeUInt32BE(height, 20);
  return head;
}

const BUILD_BRIEF = [
  '# Ride', '', '## Done when', '',
  '1. Tide and weather disagree → the headline says NOPE, and every card agrees. — test: tests/verdict.test.ts',
  '2. It feels silly and fun: a cyclist under water. — seen: .tmp/shots/default.png',
  '3. The tide source fails → the page says so and claims no YES. — not checked: no switch fakes an outage',
  '', 'Look: OK', '',
].join('\n');
const S2_BRIEF = ['## Done when', '', '1. The list shows one call per day. — test: tests/more.test.ts', '2. Each day gives a reason.', ''].join('\n');
const CLOSE_OUT = 'Path: small job. 2 of 3 lines checked (not checked: 3). Look: OK. No code review ran. Commit 1a2b3c4. Brief: docs/archive/ride/brief.md.';

function writeProject(root: string) {
  const project = join(root, 'project-demo');
  put(join(project, 'docs/archive/ride/brief.md'), BUILD_BRIEF);
  put(join(project, 'docs/features/more/brief.md'), S2_BRIEF);
  put(join(project, 'tests/verdict.test.ts'), "vi.stubGlobal('fetch', async () => new Response('{}'));\n");
  put(join(project, '.tmp/shots/default.png'), pngHead(390, 900));
  return project;
}

function writeFixture(root: string) {
  const project = writeProject(root);
  const run = join(root, 'demo-r1');
  put(join(run, 'events.jsonl'), lines([
    { at: at(T0), event: 'turn-start', turn: 1, session: 1 },
    { at: at(T0 + 60_000), event: 'turn-end', turn: 1, session: 1, endedAt: at(T0 + 60_000), activeMs: 60_000, cost: 0.012 },
    { at: at(T0 + 61_000), event: 'setup-done' },
    { at: at(B), event: 'turn-start', turn: 2, session: 1 },
    { at: at(B + 600_000), event: 'turn-end', turn: 2, session: 1, endedAt: at(B + 600_000), activeMs: 600_000, cost: 0.179 },
    { at: at(T0 + 700_000), event: 'session-2-start' },
    { at: at(T0 + 700_000), event: 'turn-start', turn: 3, session: 2 },
    { at: at(T0 + 760_000), event: 'turn-end', turn: 3, session: 2, endedAt: at(T0 + 760_000), activeMs: 60_000, cost: 0.06 },
  ]));
  // The harness turn log names the project folder.
  put(join(run, 'turn-1.jsonl'), lines([{ type: 'system', subtype: 'init', cwd: project }]));
  const s1 = join(run, 'transcripts', 'S1.jsonl');
  put(s1, lines([
    userText(T0 + 1_000, 'Set up Joycraft.'),
    call(T0 + 5_000, 100, [toolUse('t0', 'Bash', { command: 'node .joycraft/runtime/kickoff.mjs detect --help' })]),
    result(T0 + 6_000, 't0', 'Kickoff stopped: Usage: kickoff.mjs detect|start --root <project>', true),
    userText(B + 1_000, 'Build the app.'),
    // One message streamed as two records: the analyzer counts one call.
    call(B + 5_000, 10, [{ type: 'text', text: 'Path: small job. I write the brief first.' }], mainUsage(10), 'msg_brief'),
    call(B + 6_000, 500, [toolUse('t1', 'Write', { file_path: join(project, 'docs/features/ride/brief.md'), content: '...' })], mainUsage(500, 200), 'msg_brief'),
    result(B + 7_000, 't1', 'File created'),
    call(B + 30_000, 2_000, [toolUse('t2', 'Write', { file_path: join(project, 'src/components/Illustrations.tsx'), content: '...' })]),
    result(B + 31_000, 't2', 'File created'),
    // The heredoc body names the brief, but the command writes product code.
    call(B + 60_000, 1_000, [toolUse('t3', 'Bash', { command: "cat > src/lib/verdict.ts <<'EOF'\n// Thresholds: docs/features/ride/brief.md\nEOF" })]),
    result(B + 61_000, 't3', ''),
    call(B + 120_000, 100, [toolUse('t4', 'Read', { file_path: join(project, '.tmp/shots/default.png') })]),
    result(B + 121_000, 't4', '[image]'),
    call(B + 180_000, 200, [toolUse('t5', 'Agent', { subagent_type: 'joycraft-look', description: 'Look', prompt: '...' })]),
    result(B + 210_000, 't5', handBack('OK')),
    call(B + 240_000, 100, [toolUse('t6', 'Bash', { command: 'node .joycraft/runtime/status.mjs' })]),
    result(B + 241_000, 't6', 'Status stopped: no open queue.', true),
    call(B + 300_000, 200, [toolUse('t7', 'Bash', { command: "git add -A && node .joycraft/runtime/close.mjs ride -m 'feat: ride'" })]),
    result(B + 302_000, 't7', CLOSE_OUT),
    call(B + 330_000, 300, [{ type: 'text', text: `How to run: npm run dev. ${CLOSE_OUT}` }]),
  ]));
  const subDir = join(run, 'transcripts', 'S1', 'subagents');
  put(join(subDir, 'agent-alook.meta.json'), JSON.stringify({ agentType: 'joycraft-look', model: 'claude-haiku-5-5', toolUseId: 't5' }));
  put(join(subDir, 'agent-alook.jsonl'), lines([
    userText(B + 181_000, 'The user asked: ... Render: .tmp/shots/default.png'),
    call(B + 190_000, 50, [toolUse('s1', 'Read', { file_path: join(project, '.tmp/shots/default.png') })], subUsage, 'msg_s1', 'claude-haiku-5-5'),
    result(B + 192_000, 's1', '[image]'),
    call(B + 205_000, 50, [{ type: 'text', text: 'OK' }], subUsage, 'msg_s2', 'claude-haiku-5-5'),
  ]));
  put(join(run, 'transcripts', 'S2.jsonl'), lines([
    userText(T0 + 701_000, 'Add a feature.'),
    // A read with `cat` is not a code write.
    call(T0 + 705_000, 100, [toolUse('u0', 'Bash', { command: 'cat src/lib/verdict.ts' })]),
    result(T0 + 706_000, 'u0', 'export const x = 1;'),
    call(T0 + 710_000, 100, [toolUse('u1', 'Write', { file_path: 'docs/features/more/brief.md', content: '...' })]),
    result(T0 + 711_000, 'u1', 'File created'),
    call(T0 + 720_000, 100, [toolUse('u2', 'Write', { file_path: join(project, 'src/lib/more.ts'), content: '...' })]),
    result(T0 + 721_000, 'u2', 'File created'),
    call(T0 + 730_000, 100, [toolUse('u3', 'Bash', { command: 'npm test' })]),
    result(T0 + 733_000, 'u3', 'Tests 3 passed'),
    // The path comes after the first code write, so it does not count.
    call(T0 + 740_000, 100, [{ type: 'text', text: 'Path: small job. Done.' }]),
  ]));
  return run;
}

let root: string;
let fixture: ReturnType<typeof breakdownRun>;
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'joycraft-breakdown-'));
  fixture = breakdownRun(writeFixture(root));
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

  it('[AC:sl2-05] a call is procedure only when its first tool use is; text alone is product', () => {
    const proc = { name: 'Bash', input: { command: 'node .joycraft/runtime/gate.mjs check' } };
    const prod = { name: 'Bash', input: { command: 'npm test' } };
    expect(callKind({ tools: [proc] })).toBe('procedure');
    expect(callKind({ tools: [proc, prod] })).toBe('procedure');
    expect(callKind({ tools: [prod, proc] })).toBe('product');
    expect(callKind({ tools: [] })).toBe('product');
  });
});

describe('the defects fixed in sl2-05', () => {
  it('[AC:sl2-05] counts `git -c k=v commit` as a commit, and an amend apart', () => {
    const configured = 'git -c user.name="$(git config user.name || echo dev)" commit -q -F - <<\'EOF\'\nmsg\nEOF';
    expect(commitOutcome(configured, { text: '53b788f Add the app\n0', isError: false })).toEqual({ kind: 'commit', ok: true, hash: '53b788f' });
    expect(commitOutcome('git -c user.useConfigOnly=false commit -q -m x && git log --oneline | head -3', { text: '31689e6 Add Joycraft', isError: false }))
      .toEqual({ kind: 'commit', ok: true, hash: '31689e6' });
    expect(commitOutcome('git add -A && git commit -q --amend --no-edit', { text: ' 9 files changed', isError: false }))
      .toEqual({ kind: 'amend', ok: true, hash: null });
    expect(commitOutcome('git log --oneline -1', { text: 'abc1234 x', isError: false })).toBeNull();
  });

  it('[AC:sl2-05] a failed commit or a commit behind a failed `&&` step is not a commit', () => {
    const chain = "sed -i '' 's#a#b#' docs/archive/x/brief.md && git commit -qa --amend --no-edit && git log --oneline -1";
    expect(commitOutcome(chain, { text: 'sed: docs/archive/x/brief.md: No such file or directory\nnothing on 3142', isError: false }).ok).toBe(false);
    expect(commitOutcome('git commit -m x', { text: 'nothing to commit, working tree clean', isError: false }).ok).toBe(false);
    expect(commitOutcome('git commit -m x', { text: 'fatal: no identity', isError: true }).ok).toBe(false);
    expect(commitOutcome('git commit -m x', undefined).ok).toBe(false);
  });

  it('[AC:sl2-05] a `cat` with no `>` is a read, not a written file', () => {
    expect(writtenFiles({ name: 'Bash', input: { command: 'cat src/lib/verdict.ts lib/a.ts; wc -l x.css' } })).toEqual([]);
    expect(writtenFiles({ name: 'Bash', input: { command: "cat > src/a.ts <<'EOF'\nx\nEOF" } })).toEqual(['src/a.ts']);
    expect(writtenFiles({ name: 'Bash', input: { command: "cat <<'EOF' > \"src/b.tsx\"\nx\nEOF" } })).toEqual(['src/b.tsx']);
    expect(writtenFiles({ name: 'Bash', input: { command: 'echo x | tee -a notes.md' } })).toEqual(['notes.md']);
    expect(writtenFiles({ name: 'Write', input: { file_path: '/p/a.ts' } })).toEqual(['/p/a.ts']);
  });

  it('[AC:sl2-05] prices Haiku calls at the Haiku row, chosen by model', () => {
    expect(priceRow('claude-haiku-5-5')).toBe(PRICES.haiku);
    expect(priceRow('claude-opus-5-5')).toBe(PRICES.opus);
    expect(priceRow(undefined)).toBe(PRICES.opus);
    expect(usageCost({ output_tokens: 1e6 }, 'claude-haiku-5-5')).toBeCloseTo(0.5);
    expect(usageCost({ input_tokens: 1e6 }, 'claude-haiku-5-5')).toBeCloseTo(0.1);
    expect(usageCost(subUsage, 'claude-haiku-5-5')).toBeCloseTo(HAIKU_CALL, 8);
  });

  it('[AC:sl2-05] a usage message is not a refusal; a runtime refusal is', () => {
    expect(fixture.phases.setup.counts.refusals).toBe(0);
    expect(fixture.phases.build.counts.refusals).toBe(1);
  });

  it('[AC:sl2-05] reads lines checked and the brief close from the close.mjs line, else from the disk', () => {
    expect(closeLine(CLOSE_OUT)).toEqual({ checked: 2, lines: 3, commit: '1a2b3c4', target: 'docs/archive/ride' });
    expect(closeLine('Path: small job. 3 of 3 lines checked. Look: OK. No code review ran. No Git: not committed. Brief: docs/archive/a/brief.md.'))
      .toEqual({ checked: 3, lines: 3, commit: null, target: 'docs/archive/a' });
    expect(closeLine('Close stopped: nothing was moved or committed.')).toBeNull();
    const build = fixture.phases.build;
    expect(build.briefClosed).toBe(true);
    expect(build.linesChecked).toBe('2 of 3');
    // Session 2 wrote a brief and never closed it: the disk says so.
    expect(fixture.phases.s2.briefClosed).toBe(false);
    expect(fixture.phases.s2.linesChecked).toBe('1 of 2');
    // Setup wrote no brief: unknown, not "no".
    expect(fixture.phases.setup.briefClosed).toBeNull();
  });

  it('[AC:sl2-05] reads the path from text before the first code write', () => {
    expect(fixture.phases.build.path).toBe('small job');
    expect(fixture.phases.s2.path).toBeNull();
  });

  it('[AC:sl2-05] `--help` prints the usage line and exits 0', () => {
    expect(parseArgs(['--help']).help).toBe(true);
    expect(() => parseArgs(['--nope'])).toThrow(/Unknown option --nope/);
    const out = execFileSync(process.execPath, [join(__dirname, '../scripts/trial/breakdown.mjs'), '--help'], { encoding: 'utf8' });
    expect(out).toMatch(/^Usage: node scripts\/trial\/breakdown\.mjs/);
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
    expect(Object.keys(fixture.phases)).toEqual(['setup', 'build', 's2']);
    const build = fixture.phases.build;
    expect(build.activeMinutes).toBe(10);
    // Main: 8 calls at $0.01 plus 4,400 output at $20/M; look: 2 Haiku calls.
    expect(build.cost).toBeCloseTo(0.08 + 0.088 + 2 * HAIKU_CALL, 3);
    expect(build.recordedCost).toBeCloseTo(0.167, 4);
    expect(build.residual).toBeCloseTo(0.0019, 4);
    expect(build.residualPercent).toBe(1.1);
    expect(fixture.phases.setup.cost).toBeCloseTo(0.012, 4);
    expect(fixture.phases.s2.recordedCost).toBeCloseTo(0.06, 4);
    expect(fixture.phases.s2.residualPercent).toBe(0);
  });

  it('[AC:sl1-04] counts main and subagent calls once per message id', () => {
    const build = fixture.phases.build;
    expect(build.main.calls).toBe(8);
    expect(build.main.output).toBe(4_400);
    expect(build.main.tokens).toBe(8 * 11_000 + 4_400);
    expect(build.subagents.calls).toBe(2);
    expect(build.subagents.output).toBe(100);
  });

  it('[AC:sl2-05] splits output tokens into thinking and visible', () => {
    expect(fixture.phases.build.main).toMatchObject({ output: 4_400, thinking: 200, visible: 4_200 });
  });

  it('[AC:sl1-04] splits main calls into product and procedure', () => {
    const build = fixture.phases.build;
    expect(build.procedure.calls).toBe(4);
    expect(build.procedure.output).toBe(1_000);
    expect(build.product.calls).toBe(4);
    expect(build.procedureByLabel).toMatchObject({ subagent: 1, 'joycraft files': 2, 'brief, specs, archive': 1 });
  });

  it('[AC:sl2-05] gives output by part and by class of the file written', () => {
    const build = fixture.phases.build;
    expect(build.outputByPart).toEqual({
      brief: 500, 'look dispatch': 200, 'close docs': 300, retries: 0, update: 0, 'final message': 300, other: 3_100,
    });
    expect(build.outputByFileClass).toEqual({ art: 2_000, tests: 0, logic: 1_000, docs: 500, other: 0 });
    expect(fileClass('lib/verdict.test.ts')).toBe('tests');
    expect(fileClass('docs/context/project.md')).toBe('docs');
    expect(fileClass('components/Illustrations.tsx')).toBe('art');
    expect(fileClass('lib/verdict.ts')).toBe('logic');
    expect(fileClass('package.json')).toBe('other');
  });

  it('[AC:sl2-05] gives the time buckets from the one exported table', () => {
    for (const [label, pattern] of BUCKETS) {
      expect(typeof label).toBe('string');
      expect(pattern).toBeInstanceOf(RegExp);
    }
    const buckets = fixture.phases.build.buckets;
    expect(Object.keys(buckets).sort()).toEqual(['brief', 'close', 'code', 'final reply', 'look', 'read and other', 'render'].sort());
    expect(buckets.code).toMatchObject({ calls: 2, output: 3_000 });
    expect(buckets.look).toMatchObject({ calls: 1, output: 200 });
    expect(bucketOf({ tools: [{ name: 'Bash', input: { command: 'node .joycraft/runtime/update-check.mjs check' } }] })).toBe('update');
  });

  it('[AC:sl1-04] lists each subagent with type, model, seconds, calls and cost', () => {
    expect(fixture.phases.build.subagentRuns).toEqual([
      { agent: 'agent-alook', type: 'joycraft-look', model: 'claude-haiku-5-5', seconds: 24, calls: 2, output: 100, cost: Number((2 * HAIKU_CALL).toFixed(4)) },
    ]);
  });

  it('[AC:sl2-05] gives the milestones on the active clock, with the first code start', () => {
    expect(fixture.phases.build.milestones).toEqual({
      firstCodeStart: 0.12,
      firstCodeWrite: 0.5,
      firstRenderOpened: 2,
      lookStart: 3,
      lookEnd: 3.42,
      firstCommit: 5,
      closeCommit: 5,
    });
    expect(fixture.phases.s2.milestones.firstCodeWrite).toBe(0.33);
    expect(fixture.phases.s2.milestones.firstCodeStart).toBe(0.18);
  });

  it('[AC:sl2-05] counts runtime calls, refusals, commits, close calls, retries, reply words and user messages', () => {
    expect(fixture.phases.build.counts).toEqual({
      runtimeCalls: 2, refusals: 1, commits: 1, amends: 0, closeCalls: 1, refusedCloses: 0, archiveRetries: 0, finalReplyWords: 27, userMessages: 1,
    });
    expect(fixture.phases.build.commitHashes).toEqual(['1a2b3c4']);
    expect(fixture.phases.setup.counts.runtimeCalls).toBe(1);
    expect(fixture.phases.build.updateNotice).toBe(false);
    expect(fixture.firstCommit).toEqual({ phase: 'build', minute: 5 });
    expect(fixture.firstCommitAtSetup).toBe(false);
  });

  it('[AC:sl2-05] reads each brief from the disk: checks by kind, tone, missing input, a stubbed source', () => {
    expect(fixture.phases.build.brief).toEqual({
      slug: 'ride', closed: true, found: true, lines: 3, checked: 2, test: 1, seen: 1, notChecked: 1, unmarked: 0,
      toneLine: true, missingInputLine: true, testFiles: ['tests/verdict.test.ts'], testStubsSource: true,
    });
    expect(fixture.phases.s2.brief).toMatchObject({
      slug: 'more', closed: false, lines: 2, unmarked: 1, toneLine: false, missingInputLine: false, testStubsSource: false,
    });
  });

  it('[AC:sl2-05] gives each look: renders, their pixel height and the reply word for word', () => {
    expect(fixture.phases.build.look).toBe('OK');
    expect(fixture.phases.build.looks).toEqual([
      { result: 'OK', renders: [{ path: join(fixture.project!, '.tmp/shots/default.png'), height: 900 }], reply: 'OK' },
    ]);
  });

  it('[AC:sl2-05] gives the budget line for build and session 2: 6 procedure calls, no retry, no refused close', () => {
    expect(fixture.phases.build.budget).toEqual({ calls: 4, output: 1_000, retries: 0, refusedCloses: 0, pass: true, verdict: 'PASS' });
    expect(fixture.phases.s2.budget).toMatchObject({ calls: 1, verdict: 'PASS' });
    expect(fixture.phases.setup.budget).toBeNull();
    expect(budgetVerdict({ calls: 7 }).verdict).toBe('FAIL');
    expect(budgetVerdict({ calls: 6, output: 60_000 }).verdict).toBe('PASS');
    expect(budgetVerdict({ calls: 2, retries: 1 }).verdict).toBe('FAIL');
    expect(budgetVerdict({ calls: 2, refusedCloses: 1 }).verdict).toBe('FAIL');
  });
});

/** A build with an idle gap and four kinds of tool wait. */
function writeTimeRun(rootDir: string) {
  const run = join(rootDir, 'time-r1');
  put(join(run, 'events.jsonl'), lines([
    { at: at(T0), event: 'setup-done' },
    { at: at(T0 + 1_000), event: 'turn-start', turn: 1, session: 1 },
    { at: at(T0 + 481_000), event: 'turn-end', turn: 1, session: 1, endedAt: at(T0 + 481_000), activeMs: 180_000, cost: 0 },
  ]));
  put(join(run, 'transcripts', 'S1.jsonl'), lines([
    userText(T0 + 2_000, 'Build the app.'),
    call(T0 + 10_000, 100, [toolUse('c1', 'Bash', { command: 'curl -s https://api.weather.gov/points/1,2' })]),
    result(T0 + 40_000, 'c1', '{}'),
    call(T0 + 45_000, 100, [toolUse('c2', 'Bash', { command: 'npm install' })]),
    result(T0 + 65_000, 'c2', 'added 1 package'),
    call(T0 + 70_000, 100, [toolUse('c3', 'Bash', { command: 'curl -s https://api.tides.gov/x' })]),
    result(T0 + 75_000, 'c3', '{}'),
    // The model ends its run and waits 5 minutes for a background helper.
    call(T0 + 80_000, 100, [{ type: 'text', text: 'Waiting for the helper.' }], mainUsage(100), `msg_${++n}`, 'claude-opus-5-5', 'end_turn'),
    { type: 'queue-operation', timestamp: at(T0 + 379_000) },
    userText(T0 + 380_000, '<task-notification>done</task-notification>'),
    call(T0 + 390_000, 100, [toolUse('c5', 'Read', { file_path: '/p/.tmp/a.png' })]),
    result(T0 + 391_000, 'c5', '[image]'),
    call(T0 + 400_000, 100, [toolUse('c6', 'Bash', { command: 'npm test' })]),
    result(T0 + 412_000, 'c6', 'Tests 3 passed'),
    call(T0 + 420_000, 100, [{ type: 'text', text: 'Done.' }]),
  ]));
  return breakdownRun(run).phases.build;
}

describe('the time lane', () => {
  let time: ReturnType<typeof writeTimeRun>;
  beforeAll(() => { time = writeTimeRun(root); });

  it('[AC:sl2-05] puts milestones on the same clock as active minutes: idle time does not count', () => {
    expect(time.activeMinutes).toBe(3);
    expect(time.milestones.firstRenderOpened).toBe(1.48);
    expect(time.milestones.firstRenderOpened).toBeLessThanOrEqual(time.activeMinutes);
  });

  it('[AC:sl2-05] gives model and tool minutes and tool wait by class', () => {
    expect(time.modelMinutes).toBe(0.83);
    expect(time.toolMinutes).toBe(1.13);
    expect(time.waitMinutes).toEqual({ look: 0, 'external HTTP': 0.58, install: 0.33, 'build and test': 0.2, other: 0.02 });
    expect(waitClass('Agent', { subagent_type: 'joycraft-look' })).toBe('look');
    expect(waitClass('Bash', { command: 'curl -s http://localhost:3141/' })).toBe('other');
    expect(waitClass('WebFetch', { url: 'https://example.com' })).toBe('external HTTP');
  });

  it('[AC:sl2-05] gives net minutes with external waits over 10 s removed', () => {
    // The 30 s fetch is removed; the 5 s fetch stays.
    expect(time.netMinutes).toBe(2.5);
  });
});

/** A one-call build with a look: the Agent tool result, and optionally the look's own transcript. */
function writeLookRun(rootDir: string, name: string, toolResult: string, own?: { text: string; toolUseId: string }) {
  const run = join(rootDir, name);
  put(join(run, 'events.jsonl'), lines([
    { at: at(T0), event: 'setup-done' },
    { at: at(T0 + 1_000), event: 'turn-start', turn: 1, session: 1 },
    { at: at(T0 + 121_000), event: 'turn-end', turn: 1, session: 1, endedAt: at(T0 + 121_000), activeMs: 120_000, cost: 0 },
  ]));
  put(join(run, 'transcripts', 'S1.jsonl'), lines([
    userText(T0 + 2_000, 'Build the app.'),
    call(T0 + 31_000, 100, [toolUse('look1', 'Agent', { subagent_type: 'joycraft-look', description: 'Look', prompt: 'Renders: .tmp/a.png and .tmp/b.png' })]),
    result(T0 + 33_000, 'look1', toolResult),
  ]));
  if (own) {
    const subDir = join(run, 'transcripts', 'S1', 'subagents');
    put(join(subDir, 'agent-alook.meta.json'), JSON.stringify({ agentType: 'joycraft-look', toolUseId: own.toolUseId }));
    put(join(subDir, 'agent-alook.jsonl'), lines([
      userText(T0 + 32_000, 'The user asked: ...'),
      call(T0 + 61_000, 50, [{ type: 'text', text: own.text }], subUsage, `msg_${++n}`, 'claude-haiku-5-5'),
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
    const quotes = writeLookRun(root, 'frame-quotes-r1', handBack(TWO_QUOTES, true));
    expect(quotes.look).toBe('quotes');
    // With no look transcript, the renders come from the prompt.
    expect(quotes.looks[0]).toEqual({ result: 'quotes', renders: [{ path: '.tmp/a.png', height: null }, { path: '.tmp/b.png', height: null }], reply: TWO_QUOTES });
  });

  it("[AC:sl1-04] reads the look's own last text block, joined by toolUseId, and ends the look there", () => {
    const joined = writeLookRun(root, 'joined-r1', ASYNC_NOTE, { text: TWO_QUOTES, toolUseId: 'look1' });
    expect(joined.look).toBe('quotes');
    expect(joined.looks[0].reply).toBe(TWO_QUOTES);
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
    expect(fixture.warnings).toEqual([]);
  });
});

// The trial traces live outside the repo. CI does not have them, so these blocks skip there.
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

  it('[AC:sl2-05] keeps each milestone inside its phase on the active clock (pstack-r2 build)', () => {
    const run = join(v2, 'pstack-r2');
    if (!existsSync(join(run, 'events.jsonl'))) return;
    const phase = breakdownRun(run).phases.build;
    for (const value of Object.values(phase.milestones)) if (value != null) expect(value).toBeLessThanOrEqual(phase.activeMinutes);
  });
});

const i1 = process.env.JOYCRAFT_I1_TRACE ?? join(homedir(), 'Developer/ride-trial/loop/trace');
const haveI1 = ['jc-i1-r1', 'jc-i1-r2', 'jc-i1-r3'].every(run => existsSync(join(i1, run, 'events.jsonl')));

describe.skipIf(!haveI1)('the i1 trial traces', () => {
  const runs = haveI1 ? ['jc-i1-r1', 'jc-i1-r2', 'jc-i1-r3'].map(run => breakdownRun(join(i1, run))) : [];
  const [r1, r2, r3] = runs;

  it('[AC:sl2-05] r2 and r3 build show 1 commit each (31689e6, 53b788f)', () => {
    expect(r2.phases.build.counts.commits).toBe(1);
    expect(r2.phases.build.commitHashes).toEqual(['31689e6']);
    expect(r3.phases.build.counts.commits).toBe(1);
    expect(r3.phases.build.commitHashes).toEqual(['53b788f']);
  });

  it('[AC:sl2-05] r2 session 2 shows 1 commit and 1 amend', () => {
    expect(r2.phases.s2.counts.commits).toBe(1);
    expect(r2.phases.s2.counts.amends).toBe(1);
  });

  it('[AC:sl2-05] r1 build shows "brief closed: no"', () => {
    expect(r1.phases.build.briefClosed).toBe(false);
  });

  it('[AC:sl2-05] the cost residual is within ±2% in every phase', () => {
    for (const run of runs) for (const phase of Object.values(run.phases)) {
      expect(Math.abs(phase.residualPercent ?? 0)).toBeLessThanOrEqual(2);
    }
  });
});

import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { REVIEWER_FILES, textSha256 } from '../scripts/trial/reviewer-bench.mjs';

// Spec: .joycraft/local/loop/iter4/spec-reviewer.md, sl3-07 Change 7 (the standing benchmark).
const root = join(__dirname, '..');
const script = join(root, 'scripts', 'trial', 'reviewer-bench.mjs');
const subjects = join(root, 'tests', 'fixtures', 'reviewer-bench');
const recordFile = join(root, 'scripts', 'trial', 'reviewer-bench.json');

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const tempDir = () => { const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-reviewer-bench-'))); dirs.push(dir); return dir; };

const review = (findings: object[]) => JSON.stringify({ verdict: findings.length ? 'FAIL' : 'PASS', criteria: [], findings });
const blocking = (at: string) => ({ class: 'blocking', origin: 'probe', at, text: `defect at ${at}` });

/** Canned replies by `<subject>.<role>`, as the stub binary returns them. */
const CANNED: Record<string, string> = {
  'replay-1.review': `Checked it.\n${review([blocking('src/a.mjs:10')])}`,
  'replay-1.score': JSON.stringify({ findings: [{ id: 'd1-trusted-path', score: 'caught', matchedBy: 'src/a.mjs:10', why: 'same' }] }),
  'replay-2.review': review([{ class: 'follow-up', origin: 'probe', at: 'docs/b.md:3', text: 'doc may be off' }]),
  'replay-2.score': JSON.stringify({ findings: [{ id: 'd2-false-doc', score: 'partly', matchedBy: 'docs/b.md:3', why: 'follow-up only' }] }),
  'replay-2.level': JSON.stringify({ levels: [{ id: 'd2-false-doc', level: 'static-check', why: 'a grep' }] }),
  'control-3.review': review([blocking('src/c.mjs:1'), blocking('src/c.mjs:2')]),
  'control-3.repro': JSON.stringify({ findings: [{ at: 'src/c.mjs:1', reproduced: true }, { at: 'src/c.mjs:2', reproduced: false }] }),
  'r6-demo-r1.review': review([blocking('src/api.ts:4')]),
  'r6-demo-r1.score': JSON.stringify({ findings: [{ id: 'S1', score: 'caught' }] }),
  'vacuous-demo-vacuous.review': review([blocking('src/share.test.ts:9')]),
  'vacuous-demo-vacuous.score': JSON.stringify({ findings: [{ id: 'V1', score: 'caught' }] }),
};

/** A stub `claude` that answers from CANNED and logs each call. */
function stub(dir: string) {
  const file = join(dir, 'claude-stub.mjs');
  writeFileSync(file, `#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
const key = process.env.JOYCRAFT_BENCH_SUBJECT + '.' + process.env.JOYCRAFT_BENCH_ROLE;
const canned = JSON.parse(readFileSync(process.env.STUB_CANNED, 'utf8'));
appendFileSync(process.env.STUB_LOG, JSON.stringify({ key, cwd: process.cwd(), readme: existsSync('README.md'), pstack: existsSync('.claude/skills/poteto-mode/SKILL.md'), args: process.argv.slice(2) }) + '\\n');
if (key === process.env.STUB_FAIL) process.exit(1);
const result = { type: 'result', result: canned[key] ?? '', total_cost_usd: Number(process.env.STUB_COST || 0.1) };
const events = JSON.parse(process.env.STUB_EVENTS || '[]');
const reply = () => process.stdout.write(process.argv.includes('stream-json') ? [...events, result].map(event => JSON.stringify(event)).join('\\n') + '\\n' : JSON.stringify(result));
setTimeout(reply, Number(process.env.STUB_SLEEP_MS || 0));
`);
  chmodSync(file, 0o755);
  writeFileSync(join(dir, 'canned.json'), JSON.stringify(CANNED));
  return file;
}

function bench(args: string[], { from = subjects, fail = '', cost = '0.1', sleepMs = '0', events = [] as object[] } = {}) {
  const dir = tempDir();
  const out = join(dir, 'out');
  const env = { ...process.env, JOYCRAFT_BENCH_CLAUDE: stub(dir), STUB_CANNED: join(dir, 'canned.json'), STUB_LOG: join(dir, 'calls.log'), STUB_FAIL: fail, STUB_COST: cost, STUB_SLEEP_MS: sleepMs, STUB_EVENTS: JSON.stringify(events) };
  const run = spawnSync(process.execPath, [script, '--subjects', from, '--out', out, '--no-checkout', '--jobs', '2', ...args], { cwd: root, encoding: 'utf8', env });
  const calls = existsSync(env.STUB_LOG) ? readFileSync(env.STUB_LOG, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : [];
  return { run, out, calls, dir };
}

function fromSummary(summary: object) {
  const dir = tempDir();
  const file = join(dir, 'results.json');
  writeFileSync(file, JSON.stringify({ summary: { incomplete: false, ...summary } }));
  return spawnSync(process.execPath, [script, '--from', file], { cwd: root, encoding: 'utf8' });
}
const AT_BAR = { replay: { caught: 12, of: 18 }, r6: { found: 5, of: 8 }, controlsFalse: 1, vacuousFound: true };

describe('reviewer benchmark (sl3-07)', () => {
  it('[AC:sl3-07-bench-args] without --subjects it exits 2 with its usage line; --help exits 0; the source holds no home path', () => {
    const bare = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
    expect(bare.status).toBe(2);
    expect(bare.stderr).toContain('usage: node scripts/trial/reviewer-bench.mjs --subjects <dir>');
    const help = spawnSync(process.execPath, [script, '--help'], { cwd: root, encoding: 'utf8' });
    expect(help.status).toBe(0);
    expect(help.stdout).toContain('usage: node scripts/trial/reviewer-bench.mjs --subjects <dir>');
    const source = readFileSync(script, 'utf8');
    for (const home of ['/Users/', '~/', 'homedir']) expect(source).not.toContain(home);
  });

  it('[AC:sl3-07-bench-score] partly counts as missed, a control finding is false only when its reproduction fails, and the four rule lines print', () => {
    const { run, out } = bench([]);
    const results = JSON.parse(readFileSync(join(out, 'results.json'), 'utf8'));
    expect(results.summary.replay).toEqual({ caught: 1, of: 2 });
    expect(results.records.find((record: { id: string }) => record.id === 'replay-2').caught).toBe(false);
    expect(results.summary.controlsFalse).toBe(1);
    expect(results.summary.r6).toEqual({ found: 1, of: 1 });
    expect(results.summary.vacuousFound).toBe(true);
    expect(results.summary.missLevels).toEqual({ 'static-check': 1 });
    for (const rule of ['1. Replay: at least 12 of 18 caught (caught 1 of 2): holds: no', '2. R6: at least 5 of 8 found (found 1 of 1): holds: no',
      '3. Controls: at most 1 false blocking finding (false 1): holds: yes', '4. Vacuous test found as a blocking finding (found): holds: yes']) {
      expect(run.stdout).toContain(rule);
    }
    expect(run.stdout.trim().split('\n')).toContain('FAIL');
    expect(run.status).toBe(1);
  });

  it('[AC:sl3-07-bench-bar] counts at the bar PASS with exit 0; one below any rule FAILs with exit 1; a cap stop is incomplete with exit 3', () => {
    const pass = fromSummary(AT_BAR);
    expect(pass.stdout.trim().split('\n').at(-1)).toBe('PASS');
    expect(pass.status).toBe(0);
    for (const below of [{ replay: { caught: 11, of: 18 } }, { r6: { found: 4, of: 8 } }, { controlsFalse: 2 }, { vacuousFound: false }]) {
      const fail = fromSummary({ ...AT_BAR, ...below });
      expect(fail.stdout.trim().split('\n').at(-1), JSON.stringify(below)).toBe('FAIL');
      expect(fail.status).toBe(1);
    }
    const capped = bench(['--budget-usd', '1']);
    expect(capped.calls).toEqual([]);
    expect(capped.run.stdout.trim().split('\n')).toContain('incomplete');
    expect(capped.run.status).toBe(3);
  });

  it('[AC:sl3-07-bench-today] <out>/today holds byte copies of the four reviewer files, and a saved prompt points at them', () => {
    const { out, calls } = bench(['--only', 'replay']);
    for (const [name, file] of REVIEWER_FILES) expect(readFileSync(join(out, 'today', name)).equals(readFileSync(join(root, file)))).toBe(true);
    const prompt = readFileSync(join(out, 'prompts', 'replay-1.review.md'), 'utf8');
    expect(prompt).toContain(`\`${join(out, 'today', 'SKILL.md')}\``);
    expect(prompt).toContain(`\`${join(out, 'today', 'testing-review.md')}\``);
    expect(prompt).not.toContain('/checks/control/today/');
    const reviewCall = calls.find(call => call.key === 'replay-1.review');
    expect(reviewCall.args).toContain('--append-system-prompt');
    expect(reviewCall.args[reviewCall.args.indexOf('--append-system-prompt') + 1]).toContain('You are an independent reviewer in a fresh context.');
  });

  it('[AC:sl3-07-bench-score] each R6 and vacuous review runs in a copy of its subject', () => {
    const { run, calls } = bench(['--only', 'r6,vacuous']);
    for (const key of ['r6-demo-r1.review', 'vacuous-demo-vacuous.review']) {
      const call = calls.find(item => item.key === key);
      expect(call, key).toBeDefined();
      expect(call.readme, key).toBe(true);
    }
    expect(run.stdout).not.toContain('not run');
  });

  it('[AC:sl3-07-bench-score] a subject that cannot be copied, or a review that exits non-zero with no output, makes the run incomplete', () => {
    const broken = join(tempDir(), 'subjects');
    cpSync(subjects, broken, { recursive: true });
    const unreadable = join(broken, 'r6', 'subjects', 'demo-r1', 'secret.txt');
    writeFileSync(unreadable, 'x');
    chmodSync(unreadable, 0o000);
    const copyFails = bench(['--only', 'r6'], { from: broken });
    chmodSync(unreadable, 0o644);
    expect(copyFails.calls.map(call => call.key)).not.toContain('r6-demo-r1.review');
    expect(copyFails.run.stdout).toContain('| r6-demo-r1 | not run (setup) |');
    expect(copyFails.run.stdout.trim().split('\n')).toContain('incomplete');
    expect(copyFails.run.status).toBe(3);

    const reviewFails = bench(['--only', 'vacuous'], { fail: 'vacuous-demo-vacuous.review' });
    expect(reviewFails.calls.map(call => call.key)).toEqual(['vacuous-demo-vacuous.review']);
    expect(reviewFails.run.stdout).toContain('| vacuous-demo-vacuous | not run (review failed) |');
    expect(reviewFails.run.status).toBe(3);
  });

  it('[AC:sl3-07-bench-bar] the cap reserves each call\'s budget when it starts, so calls in flight cannot overrun it', () => {
    // Cap 3.2 and a $3 review budget: the second review must wait for the first. Once the first has cost 0.5,
    // a second review no longer fits, so it never starts. Counting only finished calls would start both at once.
    const { run, calls } = bench(['--only', 'r6,vacuous', '--budget-usd', '3.2'], { cost: '0.5', sleepMs: '300' });
    expect(calls.filter(call => call.key.endsWith('.review'))).toHaveLength(1);
    expect(run.stdout).toContain('not run (cap)');
    expect(run.status).toBe(3);
    // With room for both, both run.
    const roomy = bench(['--only', 'r6,vacuous', '--budget-usd', '10'], { cost: '0.5' });
    expect(roomy.calls.filter(call => call.key.endsWith('.review'))).toHaveLength(2);
  });

  it('[AC:sl3-07-bench-score] a failed scorer call makes the subject incomplete, not missed', () => {
    const { run, out } = bench(['--only', 'vacuous'], { fail: 'vacuous-demo-vacuous.score' });
    const record = JSON.parse(readFileSync(join(out, 'results.json'), 'utf8')).records[0];
    expect(record).toMatchObject({ incomplete: true, why: 'score failed' });
    expect(record.caught).toBeUndefined();
    expect(run.stdout).toContain('| vacuous-demo-vacuous | not run (score failed) |');
    expect(run.status).toBe(3);
  });

  it('[AC:sl3-07-bench-current] --record refuses to overwrite the record from an incomplete run', () => {
    const before = existsSync(recordFile) ? readFileSync(recordFile, 'utf8') : null;
    try {
      const { run } = bench(['--only', 'vacuous', '--record']);
      expect(run.stdout).toContain('not recorded: the run is incomplete');
      expect(existsSync(recordFile) ? readFileSync(recordFile, 'utf8') : null).toBe(before);
      expect(run.status).toBe(3);
    } finally {
      if (before !== null) writeFileSync(recordFile, before);
    }
  });

  it('--reviewer vanilla runs the built-in /code-review with no Joycraft text, and its important findings block', () => {
    const tool = (name: string, input: object, id = 't1') => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } });
    const events = [tool('ReportFindings', { findings: [{ file: 'src/share.test.ts', line: 9, summary: 'the test asserts nothing', severity: 'important' }, { file: 'a.md', summary: 'typo', severity: 'nit' }] })];
    const { run, out, calls } = bench(['--only', 'vacuous', '--reviewer', 'vanilla'], { events });
    const call = calls.find(item => item.key === 'vacuous-demo-vacuous.review');
    expect(call.args).not.toContain('--append-system-prompt');
    expect(call.args).toContain('stream-json');
    expect(call.args[call.args.indexOf('-p') + 1].startsWith('/code-review\n')).toBe(true);
    expect(call.args.join(' ')).not.toContain('today');
    const record = JSON.parse(readFileSync(join(out, 'results.json'), 'utf8')).records[0];
    expect(record).toMatchObject({ blocking: 1, caught: true, trace: { reportFindings: 2 } });
    const scorePrompt = readFileSync(join(out, 'prompts', 'vacuous-demo-vacuous.score.md'), 'utf8');
    expect(scorePrompt).toContain('- [blocking] src/share.test.ts:9: the test asserts nothing');
    expect(run.stdout).toContain('Vacuous test found as a blocking finding (found)');
  });

  it('--reviewer pstack installs its .claude/ in the subject, starts with /poteto-mode, and logs the skill read and dropped runners', () => {
    const pstack = join(tempDir(), '.claude');
    mkdirSync(join(pstack, 'skills', 'poteto-mode'), { recursive: true });
    writeFileSync(join(pstack, 'skills', 'poteto-mode', 'SKILL.md'), '# Poteto mode\n');
    const events = [
      { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'r1', name: 'Read', input: { file_path: '/x/.claude/skills/poteto-mode/SKILL.md' } }] } },
      { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'a1', name: 'Agent', input: { subagent_type: 'general-purpose', model: 'gemini-4-neon-xhigh' } }, { type: 'tool_use', id: 'a2', name: 'Agent', input: { subagent_type: 'general-purpose', model: 'opus', effort: 'high' } }] } },
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'a1', is_error: true, content: 'model not found' }] } },
    ];
    expect(bench(['--only', 'vacuous', '--reviewer', 'pstack']).run.status).toBe(2);
    const { out, calls } = bench(['--only', 'vacuous', '--reviewer', 'pstack', '--pstack-from', pstack], { events });
    const call = calls.find(item => item.key === 'vacuous-demo-vacuous.review');
    expect(call.pstack).toBe(true);
    expect(call.args[call.args.indexOf('-p') + 1].startsWith('/poteto-mode ')).toBe(true);
    const record = JSON.parse(readFileSync(join(out, 'results.json'), 'utf8')).records[0];
    expect(record.trace).toMatchObject({ skillRead: true, agents: [{ model: 'gemini-4-neon-xhigh' }, { model: 'opus', effort: 'high' }], dropped: [{ model: 'gemini-4-neon-xhigh' }] });
    expect(record.caught).toBe(true);
  });

  // The Commands row is part of [AC:sl3-07-bench-current]; it holds before any run is recorded.
  it('AGENTS.md holds the reviewer benchmark row in ## Commands', () => {
    const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
    const commands = agents.slice(agents.indexOf('## Commands'), agents.indexOf('## Execution Profile'));
    expect(commands).toContain('| Reviewer benchmark | `node scripts/trial/reviewer-bench.mjs --subjects <subjects folder> --record` | Run when the reviewer agent, the verify skill or testing-review.md changes. The subjects are outside the repo. |');
  });

  // Red until a real run is recorded and passes (it needs the subjects folder and about $30):
  // node scripts/trial/reviewer-bench.mjs --subjects <subjects folder> --record
  it('[AC:sl3-07-bench-current] the recorded run passes the bar and reviewed the reviewer text in this tree', () => {
    expect(existsSync(recordFile), 'no recorded run: scripts/trial/reviewer-bench.json').toBe(true);
    const record = JSON.parse(readFileSync(recordFile, 'utf8'));
    expect(record.verdict).toBe('PASS');
    expect(record.replay.caught).toBeGreaterThanOrEqual(12);
    expect(record.r6.found).toBeGreaterThanOrEqual(5);
    expect(record.controlsFalse).toBeLessThanOrEqual(1);
    expect(record.vacuousFound).toBe(true);
    expect(record.textSha256).toBe(textSha256(root));
    expect(JSON.stringify(record)).not.toMatch(/\/Users\/|~\//);
  });
});

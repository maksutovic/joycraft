import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// 1.10.2 spec 5: after each review wave the implementer acts on the wave's follow-ups.
const payload = join(__dirname, '..', 'payload');
const runtime = join(payload, '.joycraft', 'runtime');
const IMPLEMENT = join(payload, '.agents', 'skills', 'joycraft-implement', 'SKILL.md');
const flat = () => readFileSync(IMPLEMENT, 'utf8').replace(/\s+/g, ' ');

const home = realpathSync(mkdtempSync(join(tmpdir(), 'jc-triage-home-')));
const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(home, 'none') };
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = (bytes: string) => createHash('sha256').update(bytes).digest('hex');
const folder = 'docs/features/x';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const reportPath = `${folder}/specs/review-1.report.json`;
const receiptPath = `${folder}/receipts/spec-1.log`;
const spec1 = `${folder}/specs/01-a.md`;
const node = (root: string, script: string, ...args: string[]) => spawnSync(process.execPath, [join(runtime, script), ...args], { cwd: root, env, encoding: 'utf8' });

const dirs: string[] = [home];
afterEach(() => { for (const dir of dirs.splice(1)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

/** Feature `x`: spec 1 done, accepted by a PASS report with follow-up f1. Committed, lease claimed. */
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-triage-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.name', 't');
  git(root, 'config', 'user.email', 't@example.com');
  put(join(root, '.gitignore'), '.joycraft/local/\n');
  put(join(root, 'AGENTS.md'), '# Demo\n');
  put(join(root, folder, 'brief.md'), '---\nfeature: x\ndecisions: []\n---\n# Brief\n\n## Goal\n\nText.\n');
  put(join(root, spec1), '---\nid: 1\nstatus: in-review\n---\n# A\n\n## acceptance\n\n- It works. Check: the test passes.\n');
  put(join(root, 'tests/a.test.ts'), 'test\n');
  put(join(root, receiptPath), 'ok\n');
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'x', specs: [{ id: 1, file: '01-a.md', depends_on: [], status: 'in-review', mode: 'checkpoint',
    verification: { inputs: [{ path: `${folder}/brief.md`, kind: 'requirement' }, { path: spec1, kind: 'requirement' }, { path: 'tests/a.test.ts', kind: 'check' }],
      criteria: [{ id: 'spec-1-1', requirement: { path: spec1, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }] }, null, 2));
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'init');
  expect(node(root, 'completion.mjs', 'snapshot', '--queue', queuePath, '--spec', '1', '--out', '.joycraft/local/subject.json').status).toBe(0);
  const subject = JSON.parse(readFileSync(join(root, '.joycraft/local/subject.json'), 'utf8'));
  const report = { schemaVersion: 1, subject, implementerSessionId: 'impl-1', reviewer: { sessionId: 'review-1', independent: true, scopeReviewed: true },
    verdict: 'PASS', unresolved: [], createdAt: new Date().toISOString(),
    flows: [{ id: 'flow-1', subjectIdentity: subject.identity, representativeInput: 'the fixture', expected: 'the test passes', limits: ['fixture only'], criteria: ['spec-1-1'],
      observations: [{ kind: 'runtime', method: 'test', result: 'PASS', actual: 'it passed', receipts: [{ path: receiptPath, sha256: hash('ok\n') }], command: { argv: ['pnpm', 'test', 'tests/a.test.ts'], exitCode: 0 } }] }],
    findings: [{ id: 'f1', class: 'follow-up', origin: 'new', summary: 'The error text names no file.' }] };
  put(join(root, reportPath), JSON.stringify(report, null, 2));
  const final = node(root, 'completion.mjs', 'finalize-review', '--queue', queuePath, '--spec', '1', '--report', reportPath);
  expect(final.status, final.stderr).toBe(0);
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'review');
  const claim = node(root, 'coordinator.mjs', 'claim', '--queue', queuePath, '--session', 's1');
  expect(claim.status, claim.stderr).toBe(0);
  return root;
}

/** Append fix spec 2 (depends on done spec 1) to the running queue, as the triage step does. */
function appendFixSpec(root: string) {
  const spec2 = `${folder}/specs/02-fix.md`;
  put(join(root, spec2), '---\nid: 2\nstatus: todo\n---\n# Fix: the error text names its file\n\n## acceptance\n\n- The error names the file. Check: `tests/a.test.ts`.\n');
  const queue = JSON.parse(readFileSync(join(root, queuePath), 'utf8'));
  queue.specs.push({ id: 2, file: '02-fix.md', depends_on: [1], status: 'todo', mode: 'checkpoint', execution: { parallel: false },
    verification: { inputs: [{ path: spec2, kind: 'requirement' }, { path: 'tests/a.test.ts', kind: 'check' }],
      criteria: [{ id: 'spec-2-1', requirement: { path: spec2, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } });
  put(join(root, queuePath), `${JSON.stringify(queue, null, 2)}\n`);
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'docs: add fix spec 2');
}

const status = async (root: string) => (await import(join(runtime, 'status.mjs'))).projectStatus({ root });

describe('follow-up triage', () => {
  it('[AC:spec-5-1] the implement skill acts on each wave\'s follow-ups with three outcomes, within its word caps', () => {
    const text = flat();
    const start = text.indexOf('After each review wave');
    expect(start).toBeGreaterThan(-1);
    const step = text.slice(start, text.indexOf('After review and completion, continue with the next ready authorized spec.'));
    expect(step.length).toBeGreaterThan(0);
    expect(step).toContain('in `checkpoint`, after each accepted spec');
    expect(step).toContain('before the next wave');
    expect(step).toContain('`follow-up` finding of the accepted reports');
    expect(step).toContain('`node .joycraft/runtime/follow-ups.mjs --queue <queue> --spec <id> --finding <id>`');
    // (a) inside the brief's intent: a fix spec in the same queue, no question.
    expect(step).toMatch(/A defect or gap inside the brief's intent: append a fix spec to this queue, with no question to the user, then `--fixed <new spec>`\./);
    // (b) scope change or no safe default: an open brief decision.
    expect(step).toMatch(/One that changes scope or has no safe default: add an open brief decision, then `--decided <id>`\./);
    // (c) not a defect: dismissed with a reason.
    expect(step).toMatch(/One that is not a defect: `--dismissed <reason>`\./);
    // The skill's own cap (tests/text-wave-gate.test.ts) still holds.
    expect(readFileSync(IMPLEMENT, 'utf8').split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(1309);
  });

  // 1.10.2 spec 8: the word-cap trim of spec 5 lost two rules (review-5 f1, f2); they are back.
  it('[AC:spec-8-1] isolated mode does all of checkpoint and also gives each implementation spec a fresh agent context', () => {
    const text = flat();
    const start = text.indexOf('In `isolated`,');
    expect(start).toBeGreaterThan(-1);
    const sentence = text.slice(start, text.indexOf('A worktree is operational isolation', start));
    expect(sentence).toMatch(/^In `isolated`, do all of `checkpoint` and also give each implementation spec a fresh agent context/);
    // Checkpoint, which isolated includes, commits, integrates and reviews each spec, then triages its follow-ups.
    expect(text).toContain('In `checkpoint`, commit each finished spec, integrate it, rerun its focused tests after any integration edit, and review the integrated bytes before continuing.');
    expect(text).toContain('(in `checkpoint`, after each accepted spec)');
  });

  it('[AC:spec-8-2] owner acceptance is explicit and its instruction and limits go in the decision record, within the cap', () => {
    const text = flat();
    const start = text.indexOf('An owner can explicitly accept the current findings and their stated limits through `accept-owner`');
    expect(start).toBeGreaterThan(-1);
    const paragraph = text.slice(start, text.indexOf('never as PASS or verified.', start));
    expect(paragraph).toContain('persist the owner\'s actual instruction and nonempty limits in the decision record');
    expect(paragraph).toContain('is not acceptance');
    expect(paragraph).toMatch(/If the owner already explicitly accepted, do not reconfirm\./);
    expect(readFileSync(IMPLEMENT, 'utf8').split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(1309);
  });

  it('[AC:spec-5-2] a fix spec appended after spec 1 is done leaves its accepted report valid and passes queue-check', async () => {
    const root = fixture();
    const before = await status(root);
    expect(before.drift).toEqual([]);
    expect(before.unreadReports).toEqual([]);
    expect(before.questions.map((item: { id: string }) => item.id)).toEqual(['f1']);

    appendFixSpec(root);
    const after = await status(root);
    expect(after.drift).toEqual([]);
    expect(after.unreadReports).toEqual([]);
    expect(after.problems).toEqual(before.problems);
    const queue = JSON.parse(readFileSync(join(root, queuePath), 'utf8'));
    expect(queue.specs[0]).toMatchObject({ id: 1, status: 'done' });

    const check = node(root, 'queue-check.mjs', '--queue', queuePath);
    expect(check.status, check.stdout + check.stderr).toBe(0);
    expect(check.stderr).toBe('');
    const { checkQueue } = await import(join(runtime, 'queue-check.mjs'));
    expect(checkQueue({ root, queuePath })).toMatchObject({ skipped: false, gaps: [] });

    // The triage record names the new spec; f1 stays a question until spec 2 is done.
    const fixed = node(root, 'follow-ups.mjs', '--queue', queuePath, '--spec', '1', '--finding', 'f1', '--fixed', '2');
    expect(fixed.status, fixed.stderr).toBe(0);
    const recorded = await status(root);
    expect(recorded.drift).toEqual([]);
    expect(recorded.unreadReports).toEqual([]);
    expect(recorded.questions.map((item: { id: string }) => item.id)).toEqual(['f1']);
  });
});

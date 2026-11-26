import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// 1.10.2 spec 3: a handled follow-up, recorded in follow-ups.json, is no longer a question.
const payload = join(__dirname, '..', 'payload');
const runtime = join(payload, '.joycraft', 'runtime');
const home = realpathSync(mkdtempSync(join(tmpdir(), 'jc-follow-ups-home-')));
const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(home, 'none') };
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const folder = 'docs/features/x';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const reportPath = `${folder}/specs/review-1.report.json`;
const ledgerPath = `${folder}/follow-ups.json`;
const receiptPath = `${folder}/receipts/spec-1.log`;
const context = 'docs/context/decision-log.md';

const dirs: string[] = [home];
afterEach(() => { for (const dir of dirs.splice(1)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

const decisions = [
  { id: 'd-answered', status: 'clarified', question: 'Which?', answer: 'a' },
  { id: 'd-open', status: 'open', question: 'Which?' },
  { id: 'd-assigned', status: 'assigned', question: 'Which?', answer: 'pending owner' },
];
const followUp = (id: string, summary: string) => ({ id, class: 'follow-up', origin: 'new', summary });

/** Feature `x`: spec 1 accepted by a PASS report with follow-ups f1 and f2; spec 2 legacy-done
 * (or in-review); the brief holds an answered, an open and an assigned decision. Committed, lease claimed. */
function fixture({ spec2Done = true } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-follow-ups-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.name', 't');
  git(root, 'config', 'user.email', 't@example.com');
  put(join(root, '.gitignore'), '.joycraft/local/\n');
  put(join(root, 'AGENTS.md'), '# Demo\n\nSee [decisions](docs/context/decision-log.md).\n');
  put(join(root, context), '# Decisions\n');
  put(join(root, folder, 'brief.md'), `---\nfeature: x\ndecisions: ${JSON.stringify(decisions, null, 2)}\n---\n# Brief\n\n## Goal\n\nText.\n`);
  const spec1 = `${folder}/specs/01-a.md`;
  put(join(root, spec1), '---\nid: 1\nstatus: in-review\n---\n# A\n\n## acceptance\n\n- It works. Check: the test passes.\n');
  put(join(root, `${folder}/specs/02-b.md`), `---\nid: 2\nstatus: ${spec2Done ? 'done' : 'in-review'}\n---\n# B\n`);
  const legacy = JSON.stringify({ schemaVersion: 1, kind: 'legacy', queuePath, statement: 'Accept it as it is.', statedAt: '2026-11-21T00:00:00Z', specs: [2], reason: 'Done before the gates.' });
  put(join(root, `${folder}/specs/legacy.json`), legacy);
  put(join(root, 'tests/a.test.ts'), 'test\n');
  put(join(root, receiptPath), 'ok\n');
  const spec2 = { id: 2, file: '02-b.md', depends_on: [], mode: 'checkpoint', verification: { inputs: [] },
    ...(spec2Done ? { status: 'done', ownerAcceptance: { path: `${folder}/specs/legacy.json`, sha256: hash(legacy), legacy: true } } : { status: 'in-review' }) };
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'x', specs: [{ id: 1, file: '01-a.md', depends_on: [], status: 'in-review', mode: 'checkpoint',
    verification: { inputs: [{ path: `${folder}/brief.md`, kind: 'requirement' }, { path: spec1, kind: 'requirement' }, { path: 'tests/a.test.ts', kind: 'check' }],
      criteria: [{ id: 'spec-1-1', requirement: { path: spec1, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }, spec2] }, null, 2));
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'init');
  execFileSync(process.execPath, [join(runtime, 'completion.mjs'), 'snapshot', '--queue', queuePath, '--spec', '1', '--out', '.joycraft/local/subject.json'], { cwd: root, env, stdio: 'ignore' });
  const subject = JSON.parse(readFileSync(join(root, '.joycraft/local/subject.json'), 'utf8'));
  const report = { schemaVersion: 1, subject, implementerSessionId: 'impl-1', reviewer: { sessionId: 'review-1', independent: true, scopeReviewed: true },
    verdict: 'PASS', unresolved: [], createdAt: new Date().toISOString(),
    flows: [{ id: 'flow-1', subjectIdentity: subject.identity, representativeInput: 'the fixture', expected: 'the test passes', limits: ['fixture only'], criteria: ['spec-1-1'],
      observations: [{ kind: 'runtime', method: 'test', result: 'PASS', actual: 'it passed', receipts: [{ path: receiptPath, sha256: hash('ok\n') }], command: { argv: ['pnpm', 'test', 'tests/a.test.ts'], exitCode: 0 } }] }],
    findings: [followUp('f1', 'The empty list case is not decided.'), followUp('f2', 'The error text names no file.'), { id: 'n1', class: 'note', origin: 'new', summary: 'Class 1 test change.' }] };
  put(join(root, reportPath), JSON.stringify(report, null, 2));
  const final = spawnSync(process.execPath, [join(runtime, 'completion.mjs'), 'finalize-review', '--queue', queuePath, '--spec', '1', '--report', reportPath], { cwd: root, env, encoding: 'utf8' });
  expect(final.status, final.stderr).toBe(0);
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'review');
  const claim = spawnSync(process.execPath, [join(runtime, 'coordinator.mjs'), 'claim', '--queue', queuePath, '--session', 's1'], { cwd: root, env, encoding: 'utf8' });
  expect(claim.status, claim.stderr).toBe(0);
  return root;
}

const record = (root: string, ...args: string[]) => spawnSync(process.execPath, [join(runtime, 'follow-ups.mjs'), '--queue', queuePath, ...args], { cwd: root, env, encoding: 'utf8' });
const ledger = (root: string) => JSON.parse(readFileSync(join(root, ledgerPath), 'utf8'));
const writeLedger = (root: string, entries: unknown[]) => put(join(root, ledgerPath), JSON.stringify({ schemaVersion: 1, entries }, null, 2));
const questionIds = async (root: string) => {
  const { projectStatus } = await import(join(runtime, 'status.mjs'));
  const status = projectStatus({ root });
  return { ids: status.questions.map((item: { id: string }) => item.id), problems: status.problems };
};
const runClose = (root: string) => spawnSync(process.execPath, [join(runtime, 'close.mjs'), '--feature', 'x', '--session', 's1', '--context', context, '--root', root], { cwd: root, env, encoding: 'utf8' });
const commit = (root: string) => { git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'docs: record follow-ups'); };

describe('follow-ups ledger', () => {
  it('[AC:spec-3-1] follow-ups.mjs records fixed, decided and dismissed entries and refuses what the accepted report or queue lacks', () => {
    const root = fixture();
    expect(record(root, '--spec', '1', '--finding', 'f1', '--fixed', '2').status).toBe(0);
    expect(record(root, '--spec', '1', '--finding', 'f2', '--decided', 'd-answered').status).toBe(0);
    let entries = ledger(root).entries;
    expect(ledger(root).schemaVersion).toBe(1);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ spec: 1, finding: 'f1', outcome: 'fixed' });
    expect(String(entries[0].by)).toBe('2');
    expect(entries[1]).toMatchObject({ spec: 1, finding: 'f2', outcome: 'decided', by: 'd-answered' });
    // A second answer for the same finding replaces the first.
    const dismissed = record(root, '--spec', '1', '--finding', 'f1', '--dismissed', 'Not a defect: the list is never empty.');
    expect(dismissed.status, dismissed.stderr).toBe(0);
    entries = ledger(root).entries;
    expect(entries).toHaveLength(2);
    expect(entries.find((entry: { finding: string }) => entry.finding === 'f1')).toMatchObject({ spec: 1, outcome: 'dismissed', reason: 'Not a defect: the list is never empty.' });

    const before = readFileSync(join(root, ledgerPath), 'utf8');
    const refusals: [string[], RegExp][] = [
      [['--spec', '9', '--finding', 'f1', '--dismissed', 'x'], /spec 9/i],
      [['--spec', '2', '--finding', 'f1', '--dismissed', 'x'], /accepted report/i],
      [['--spec', '1', '--finding', 'f9', '--dismissed', 'x'], /f9/],
      [['--spec', '1', '--finding', 'f1', '--fixed', '9'], /9/],
      [['--spec', '1', '--finding', 'f1', '--decided', 'd-missing'], /d-missing/],
      [['--spec', '1', '--finding', 'f1', '--dismissed', '  '], /reason/i],
      [['--spec', '1', '--finding', 'f1'], /--fixed|--decided|--dismissed/],
      [['--spec', '1', '--finding', 'f1', '--fixed', '2', '--dismissed', 'x'], /one of/i],
    ];
    for (const [args, message] of refusals) {
      const refused = record(root, ...args);
      expect(refused.status, args.join(' ')).toBe(2);
      expect(refused.stderr, args.join(' ')).toMatch(message);
    }
    expect(readFileSync(join(root, ledgerPath), 'utf8')).toBe(before);
  });

  it('[AC:spec-3-2] fixed by a done spec: no question; the other follow-up still is one', async () => {
    const root = fixture();
    expect((await questionIds(root)).ids).toEqual(['f1', 'f2']);
    writeLedger(root, [{ spec: 1, finding: 'f1', outcome: 'fixed', by: '2' }]);
    expect((await questionIds(root)).ids).toEqual(['f2']);
  });

  it('[AC:spec-3-2] fixed by a spec that is not done: still a question', async () => {
    const root = fixture({ spec2Done: false });
    writeLedger(root, [{ spec: 1, finding: 'f1', outcome: 'fixed', by: '2' }]);
    expect((await questionIds(root)).ids).toEqual(['f1', 'f2']);
  });

  it('[AC:spec-3-2] decided by an answered decision: no question; by an open or assigned one: still a question', async () => {
    const root = fixture();
    writeLedger(root, [{ spec: 1, finding: 'f1', outcome: 'decided', by: 'd-answered' }, { spec: 1, finding: 'f2', outcome: 'decided', by: 'd-open' }]);
    expect((await questionIds(root)).ids).toEqual(['f2']);
    writeLedger(root, [{ spec: 1, finding: 'f1', outcome: 'decided', by: 'd-assigned' }]);
    expect((await questionIds(root)).ids).toEqual(['f1', 'f2']);
  });

  it('[AC:spec-3-2] dismissed with a reason: no question; with an empty reason: still a question', async () => {
    const root = fixture();
    writeLedger(root, [{ spec: 1, finding: 'f1', outcome: 'dismissed', reason: 'Not a defect.' }, { spec: 1, finding: 'f2', outcome: 'dismissed', reason: '' }]);
    expect((await questionIds(root)).ids).toEqual(['f2']);
  });

  it('[AC:spec-3-2] a malformed follow-ups.json is a problem naming the file, and every follow-up stays a question', async () => {
    const root = fixture();
    put(join(root, ledgerPath), '{ "schemaVersion": 1, "entries": [');
    const broken = await questionIds(root);
    expect(broken.ids).toEqual(['f1', 'f2']);
    expect(JSON.stringify(broken.problems)).toContain(ledgerPath);
    writeLedger(root, [{ spec: 1, finding: 'f1', outcome: 'won' }]);
    const wrong = await questionIds(root);
    expect(wrong.ids).toEqual(['f1', 'f2']);
    expect(JSON.stringify(wrong.problems)).toContain(ledgerPath);
  });

  it('[AC:spec-3-3] close refuses on exactly the unhandled follow-up, naming follow-ups.mjs, then archives with follow-ups.json once both are handled', () => {
    const root = fixture();
    expect(record(root, '--spec', '1', '--finding', 'f1', '--fixed', '2').status).toBe(0);
    commit(root);
    const refused = runClose(root);
    expect(refused.status).toBe(2);
    const lines = refused.stderr.split('\n').filter(line => line.includes('Status question'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('follow-up f2');
    expect(lines[0]).toContain('node .joycraft/runtime/follow-ups.mjs');
    expect(lines[0]).toContain('--finding f2');
    expect(existsSync(join(root, folder))).toBe(true);

    expect(record(root, '--spec', '1', '--finding', 'f2', '--decided', 'd-answered').status).toBe(0);
    commit(root);
    const ledgerBytes = readFileSync(join(root, ledgerPath));
    const closed = runClose(root);
    expect(closed.status, closed.stderr).toBe(0);
    expect(existsSync(join(root, folder))).toBe(false);
    expect(readFileSync(join(root, 'docs/archive/x/feature/follow-ups.json')).equals(ledgerBytes)).toBe(true);
  });

  it('[AC:spec-3-4] a feature whose report holds old follow-ups closes once each is dismissed, with no report bytes changed', () => {
    const root = fixture();
    const reportBytes = readFileSync(join(root, reportPath));
    expect(runClose(root).status).toBe(2);
    for (const finding of ['f1', 'f2']) {
      const dismissed = record(root, '--spec', '1', '--finding', finding, '--dismissed', 'Bookkeeping from 1.10.0, not a defect.');
      expect(dismissed.status, dismissed.stderr).toBe(0);
    }
    expect(readFileSync(join(root, reportPath)).equals(reportBytes)).toBe(true);
    commit(root);
    const closed = runClose(root);
    expect(closed.status, closed.stderr).toBe(0);
    expect(readFileSync(join(root, 'docs/archive/x/feature/specs/review-1.report.json')).equals(reportBytes)).toBe(true);
  });

  it('[AC:spec-3-5] session end asks only the questions status lists and records each answer with follow-ups.mjs', () => {
    const skill = readFileSync(join(payload, '.agents/skills/joycraft-session-end/SKILL.md'), 'utf8').replace(/\s+/g, ' ');
    expect(skill).toMatch(/Ask the user only the status `questions` entries/);
    expect(skill).toContain('node .joycraft/runtime/follow-ups.mjs');
    expect(skill).toMatch(/decision in the brief[^.]*`--decided/);
    expect(skill).toMatch(/new spec[^.]*`--fixed[^.]*done/);
    expect(skill).toMatch(/"no"[^.]*`--dismissed[^.]*user's words/);
  });
});

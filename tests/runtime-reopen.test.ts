import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyInstall, planInstall } from '../src/install-v1.js';

// Spec: docs/archive/2026-11-22-fixes-1-9-4/feature/specs/01-reopen.md
const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const folder = 'docs/features/2026-11-22-r';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const completion = (root: string, ...args: string[]) => spawnSync(process.execPath, [join(runtime, 'completion.mjs'), ...args], { cwd: root, encoding: 'utf8' });
const queue = (root: string) => JSON.parse(readFileSync(join(root, queuePath), 'utf8'));

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

/** Spec 1 in review with tests/a.test.ts as its check input; spec 2 todo with tests/b.test.ts. */
function fixture({ install = false } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-reopen-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  if (install) applyInstall(planInstall(root, ['claude']));
  put(join(root, '.gitignore'), '.joycraft/local/\n');
  put(join(root, folder, 'brief.md'), '# Brief\n\n## Goal\n\nText.\n');
  const specs = [1, 2].map(id => {
    const spec = `${folder}/specs/0${id}-s.md`;
    const status = id === 1 ? 'in-review' : 'todo';
    put(join(root, spec), `---\nid: ${id}\nstatus: ${status}\n---\n# S${id}\n\n## acceptance\n\n- It works. Check: the test passes.\n`);
    put(join(root, `tests/${id === 1 ? 'a' : 'b'}.test.ts`), 'test\n');
    return { id, file: `0${id}-s.md`, depends_on: [], status, mode: 'checkpoint',
      verification: { inputs: [{ path: `${folder}/brief.md`, kind: 'requirement' }, { path: spec, kind: 'requirement' }, { path: `tests/${id === 1 ? 'a' : 'b'}.test.ts`, kind: 'check' }],
        criteria: [{ id: `spec-${id}-1`, requirement: { path: spec, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } };
  });
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'r', specs }, null, 2));
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'init');
  return root;
}

/** A PASS report for spec 1's current subject, written at `reportPath`. */
function passReport(root: string, reportPath: string, createdAt = new Date().toISOString()) {
  const out = `.joycraft/local/subject-${Math.random().toString(36).slice(2)}.json`;
  execFileSync(process.execPath, [join(runtime, 'completion.mjs'), 'snapshot', '--queue', queuePath, '--spec', '1', '--out', out], { cwd: root, stdio: 'ignore' });
  const subject = JSON.parse(readFileSync(join(root, out), 'utf8'));
  put(join(root, '.joycraft/local/receipt.log'), 'ok\n');
  put(join(root, reportPath), JSON.stringify({ schemaVersion: 1, subject, implementerSessionId: 'impl-1', reviewer: { sessionId: 'review-1', independent: true, scopeReviewed: true },
    verdict: 'PASS', unresolved: [], createdAt,
    flows: [{ id: 'flow-1', subjectIdentity: subject.identity, representativeInput: 'the fixture', expected: 'the test passes', limits: ['fixture only'], criteria: ['spec-1-1'],
      observations: [{ kind: 'runtime', method: 'test', result: 'PASS', actual: 'it passed', receipts: [{ path: '.joycraft/local/receipt.log', sha256: hash('ok\n') }], command: { argv: ['pnpm', 'test', 'tests/a.test.ts'], exitCode: 0 } }] }] }, null, 2));
}

/** Spec 1 accepted on review-1.report.json, then its check input edited and committed. */
function acceptedThenChanged(options = {}) {
  const root = fixture(options);
  passReport(root, `${folder}/specs/review-1.report.json`, '2026-11-22T10:00:00.000Z');
  const final = completion(root, 'finalize-review', '--queue', queuePath, '--spec', '1', '--report', `${folder}/specs/review-1.report.json`);
  expect(final.status, final.stderr).toBe(0);
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'accept spec 1');
  put(join(root, 'tests/a.test.ts'), 'test, changed by a later spec\n');
  git(root, 'commit', '-q', '-am', 'later spec edits spec 1 test');
  return root;
}

describe('reopen a done spec (1.9.4)', () => {
  it('[AC:spec-1-1] reopen moves a done spec with a changed accepted input back to in-review and keeps the old report on record', () => {
    const root = acceptedThenChanged();
    const before = queue(root).specs[0].acceptedReport;
    const result = completion(root, 'reopen', '--queue', queuePath, '--spec', '1', '--reason', 'spec 3 fixed the ratchet in tests/a.test.ts');
    expect(result.status, result.stderr).toBe(0);
    const spec = queue(root).specs[0];
    expect(spec.status).toBe('in-review');
    expect(spec.acceptedReport).toBeUndefined();
    expect(spec.reopened).toHaveLength(1);
    expect(spec.reopened[0]).toMatchObject({ reason: 'spec 3 fixed the ratchet in tests/a.test.ts', report: before, changed: ['tests/a.test.ts'] });
    expect(readFileSync(join(root, `${folder}/specs/01-s.md`), 'utf8')).toContain('status: in-review');
    // A fresh PASS report on the new bytes is then accepted as usual.
    git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'reopen spec 1');
    passReport(root, `${folder}/specs/review-1-r2.report.json`);
    const final = completion(root, 'finalize-review', '--queue', queuePath, '--spec', '1', '--report', `${folder}/specs/review-1-r2.report.json`);
    expect(final.status, final.stderr).toBe(0);
    expect(queue(root).specs[0]).toMatchObject({ status: 'done', acceptedReport: { path: `${folder}/specs/review-1-r2.report.json` }, reopened: [{ report: before }] });
  });

  it('[AC:spec-1-2] reopen refuses a spec that is not done, one with no changed input, and one without --reason', () => {
    const fresh = fixture();
    const notDone = completion(fresh, 'reopen', '--queue', queuePath, '--spec', '1', '--reason', 'x');
    expect(notDone.status).toBe(2);
    expect(notDone.stderr).toContain('Spec 1 is in-review; reopen moves only a done spec back to in-review');
    const root = fixture();
    passReport(root, `${folder}/specs/review-1.report.json`);
    expect(completion(root, 'finalize-review', '--queue', queuePath, '--spec', '1', '--report', `${folder}/specs/review-1.report.json`).status).toBe(0);
    const unchanged = completion(root, 'reopen', '--queue', queuePath, '--spec', '1', '--reason', 'x');
    expect(unchanged.status).toBe(2);
    expect(unchanged.stderr).toContain('No code, check or fixture input of spec 1 changed since its acceptance');
    const noReason = completion(root, 'reopen', '--queue', queuePath, '--spec', '1');
    expect(noReason.status).toBe(1);
    expect(noReason.stderr).toContain('Missing or unexpected arguments for reopen');
    expect(queue(root).specs[0].status).toBe('done');
  });

  it('[AC:spec-1-3] submitting another spec warns that a done spec\'s accepted input changed, with the reopen command', () => {
    const root = acceptedThenChanged();
    const submit = completion(root, 'submit', '--queue', queuePath, '--spec', '2');
    expect(submit.status, submit.stderr).toBe(0);
    expect(JSON.parse(submit.stdout).acceptedInputsChanged).toEqual([{ specId: 1, paths: ['tests/a.test.ts'], next: `node .joycraft/runtime/completion.mjs reopen --queue ${queuePath} --spec 1 --reason <why it changed>` }]);
    expect(submit.stderr).toContain("Warning: done spec 1's accepted input changed: tests/a.test.ts");
    // No warning when nothing changed.
    const clean = fixture();
    passReport(clean, `${folder}/specs/review-1.report.json`);
    expect(completion(clean, 'finalize-review', '--queue', queuePath, '--spec', '1', '--report', `${folder}/specs/review-1.report.json`).status).toBe(0);
    // The short form leaves out an empty list; --json prints it.
    const quiet = completion(clean, 'submit', '--queue', queuePath, '--spec', '2', '--json');
    expect(JSON.parse(quiet.stdout).acceptedInputsChanged).toEqual([]);
    expect(quiet.stderr).not.toContain('accepted input changed');
  });

  it('[AC:spec-1-4] after a reopen, reviewer startup counts rounds afresh and gives the next review its own report path', () => {
    const root = acceptedThenChanged({ install: true });
    const pinned = realpathSync(mkdtempSync(join(tmpdir(), 'jc-reopen-pin-')));
    dirs.push(pinned);
    copyFileSync(join(root, '.joycraft/installation.json'), join(pinned, 'installation.json'));
    // Two earlier FAIL rounds on other inputs, before the reopen.
    for (const round of [2, 3]) {
      put(join(root, `${folder}/specs/review-1-old${round}.report.json`), JSON.stringify({ schemaVersion: 1, verdict: 'FAIL', createdAt: '2026-11-22T09:00:00.000Z',
        subject: { queuePath, specId: 1, inputs: [{ path: `x${round}`, sha256: 'a'.repeat(64) }] } }));
    }
    expect(completion(root, 'reopen', '--queue', queuePath, '--spec', '1', '--reason', 'changed').status).toBe(0);
    git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'reopen');
    const start = spawnSync(process.execPath, [join(root, '.joycraft/runtime/dispatch-start.mjs'), '--worker-root', root, '--expected-manifest', join(pinned, 'installation.json'),
      '--queue', queuePath, '--spec', '1', '--role', 'reviewer', '--implementer-session', 'impl-1', '--out', '.joycraft/local/packets/r.json',
      '--capabilities', 'filesystem:read,filesystem:write-report,agent:separate-context', '--native-session', 'review-2'], { cwd: root, encoding: 'utf8' });
    expect(start.status, start.stderr).toBe(0);
    const output = JSON.parse(start.stdout);
    expect(output.reviewRound).toBe(1);
    expect(output.commands.checkReport).toContain(`--report ${folder}/specs/review-1-r2.report.json`);
    expect(existsSync(join(root, `${folder}/specs/review-1.report.json`))).toBe(true);
  }, 60000);

  // Spec: docs/archive/2026-11-22-fixes-1-9-4/feature/specs/05-missing-report.md
  it('[AC:spec-5-1] reopen and submit say when a done spec\'s accepted report is missing or unreadable', () => {
    const root = acceptedThenChanged();
    const report = `${folder}/specs/review-1.report.json`;
    rmSync(join(root, report));
    const missing = completion(root, 'reopen', '--queue', queuePath, '--spec', '1', '--reason', 'x');
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain(`Accepted report ${report} of spec 1 is missing or unreadable`);
    expect(missing.stderr).toContain(`restore it from Git (git checkout HEAD -- ${report})`);
    expect(missing.stderr).not.toContain('No code, check or fixture input');
    const submit = completion(root, 'submit', '--queue', queuePath, '--spec', '2');
    expect(submit.status, submit.stderr).toBe(0);
    expect(JSON.parse(submit.stdout).acceptedInputsChanged).toEqual([{ specId: 1, paths: [], reportMissing: report, next: `git checkout HEAD -- ${report}` }]);
    expect(submit.stderr).toContain(`Warning: done spec 1's accepted report ${report} is missing or unreadable`);
    // Not valid JSON counts the same as missing.
    put(join(root, report), '{ not json');
    const unreadable = completion(root, 'reopen', '--queue', queuePath, '--spec', '1', '--reason', 'x');
    expect(unreadable.status).toBe(2);
    expect(unreadable.stderr).toContain(`Accepted report ${report} of spec 1 is missing or unreadable`);
    expect(queue(root).specs[0].status).toBe('done');
  });

  it('[AC:spec-5-2] reviewer startup in a worker tree skips a report path that exists only in the coordinator tree', () => {
    const root = acceptedThenChanged({ install: true });
    const pinned = realpathSync(mkdtempSync(join(tmpdir(), 'jc-reopen-pin-')));
    dirs.push(pinned);
    copyFileSync(join(root, '.joycraft/installation.json'), join(pinned, 'installation.json'));
    expect(completion(root, 'reopen', '--queue', queuePath, '--spec', '1', '--reason', 'changed').status).toBe(0);
    git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'reopen');
    // The worker tree is cut before the first report reached the coordinator tree's Git history.
    const report = `${folder}/specs/review-1.report.json`;
    git(root, 'rm', '-q', '--cached', report); git(root, 'commit', '-q', '-m', 'report kept on disk only');
    const worker = join(pinned, 'worker');
    git(root, 'worktree', 'add', '-q', '-b', 'worker', worker);
    dirs.push(worker);
    expect(existsSync(join(worker, report))).toBe(false);
    expect(existsSync(join(root, report))).toBe(true);
    const start = spawnSync(process.execPath, [join(worker, '.joycraft/runtime/dispatch-start.mjs'), '--worker-root', worker, '--expected-manifest', join(pinned, 'installation.json'),
      '--coordinator', root, '--parallel', 'true', '--access', 'mutating',
      '--queue', queuePath, '--spec', '1', '--role', 'reviewer', '--implementer-session', 'impl-1', '--out', '.joycraft/local/packets/r.json',
      '--capabilities', 'filesystem:read,filesystem:write-report,agent:separate-context', '--native-session', 'review-2'], { cwd: worker, encoding: 'utf8' });
    expect(start.status, start.stderr).toBe(0);
    expect(JSON.parse(start.stdout).commands.checkReport).toContain(`--report ${folder}/specs/review-1-r2.report.json`);
  }, 60000);
});

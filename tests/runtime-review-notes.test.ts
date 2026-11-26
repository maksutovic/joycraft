import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// 1.10.2 spec 1: a reviewer files what needs no work as a `note`, and status never asks about it.
const payload = join(__dirname, '..', 'payload');
const runtime = join(payload, '.joycraft', 'runtime');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const folder = 'docs/features/2026-11-26-f';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const reportPath = `${folder}/specs/review-1.report.json`;

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/** A git project with one in-review spec and a PASS report carrying `findings` (left out when undefined). */
function fixture(findings?: unknown[]) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-review-notes-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  put(join(root, '.gitignore'), '.joycraft/local/\n');
  put(join(root, folder, 'brief.md'), '# Brief\n\n## Goal\n\nText.\n');
  const spec = `${folder}/specs/01-a.md`;
  put(join(root, spec), '---\nid: 1\nstatus: in-review\n---\n# A\n\n## acceptance\n\n- It works. Check: the test passes.\n');
  put(join(root, 'tests/a.test.ts'), 'test\n');
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'f', specs: [{ id: 1, file: '01-a.md', depends_on: [], status: 'in-review', mode: 'checkpoint',
    verification: { inputs: [{ path: `${folder}/brief.md`, kind: 'requirement' }, { path: spec, kind: 'requirement' }, { path: 'tests/a.test.ts', kind: 'check' }],
      criteria: [{ id: 'spec-1-1', requirement: { path: spec, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }] }, null, 2));
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'init');
  execFileSync(process.execPath, [join(runtime, 'completion.mjs'), 'snapshot', '--queue', queuePath, '--spec', '1', '--out', '.joycraft/local/subject.json'], { cwd: root, stdio: 'ignore' });
  const subject = JSON.parse(readFileSync(join(root, '.joycraft/local/subject.json'), 'utf8'));
  put(join(root, '.joycraft/local/receipt.log'), 'ok\n');
  const report = { schemaVersion: 1, subject, implementerSessionId: 'impl-1', reviewer: { sessionId: 'review-1', independent: true, scopeReviewed: true },
    verdict: 'PASS', unresolved: [], createdAt: new Date().toISOString(),
    flows: [{ id: 'flow-1', subjectIdentity: subject.identity, representativeInput: 'the fixture', expected: 'the test passes', limits: ['fixture only'], criteria: ['spec-1-1'],
      observations: [{ kind: 'runtime', method: 'test', result: 'PASS', actual: 'it passed', receipts: [{ path: '.joycraft/local/receipt.log', sha256: hash('ok\n') }], command: { argv: ['pnpm', 'test', 'tests/a.test.ts'], exitCode: 0 } }] }],
    ...(findings === undefined ? {} : { findings }) };
  put(join(root, reportPath), JSON.stringify(report, null, 2));
  return root;
}

const checkReport = (root: string) => spawnSync(process.execPath, [join(runtime, 'dispatch-preflight.mjs'), 'check-report', '--worker-root', root, '--queue', queuePath, '--spec', '1', '--report', reportPath], { cwd: root, encoding: 'utf8' });
const finalize = (root: string) => spawnSync(process.execPath, [join(runtime, 'completion.mjs'), 'finalize-review', '--queue', queuePath, '--spec', '1', '--report', reportPath], { cwd: root, encoding: 'utf8' });

const note = { id: 'n1', class: 'note', origin: 'new', summary: 'Test change is class 1; no assertion weakened.' };
const followUp = { id: 'f1', class: 'follow-up', origin: 'new', summary: 'The empty list case is not decided.' };

describe('note findings', () => {
  it('[AC:spec-1-1] a note with no criterion or at passes check-report and finalize-review; an unknown class names note', () => {
    const root = fixture([note]);
    const checked = checkReport(root);
    expect(checked.status, checked.stderr).toBe(0);
    const final = finalize(root);
    expect(final.status, final.stderr).toBe(0);
    expect(JSON.parse(final.stdout)).toMatchObject({ status: 'done' });

    const unknown = checkReport(fixture([{ ...note, class: 'remark' }]));
    expect(unknown.status).toBe(2);
    expect(unknown.stderr).toContain('findings[0].class');
    expect(unknown.stderr).toMatch(/blocking, decision-needed, follow-up, note/);
  });

  it('[AC:spec-1-2] status lists a question for the follow-up of an accepted report, none for its note', async () => {
    const root = fixture([note, followUp]);
    const final = finalize(root);
    expect(final.status, final.stderr).toBe(0);
    const { projectStatus } = await import(join(runtime, 'status.mjs'));
    const { questions } = projectStatus({ root });
    expect(questions.map((item: { id: string }) => item.id)).toEqual(['f1']);
    expect(questions.some((item: { class: string }) => item.class === 'note')).toBe(false);
  });

  it('[AC:spec-1-3] a report with only the three old classes, and one with no findings, validate as before', () => {
    const old = fixture([
      { id: 'b1', class: 'blocking', origin: 'new', at: 'src/a.ts:1', summary: 'Fails.' },
      { id: 'd1', class: 'decision-needed', origin: 'unknown', criterion: 'spec-1-1', summary: 'Two readings.' },
      followUp,
    ]);
    // Well formed, so it is held for its findings, not refused as malformed.
    for (const held of [checkReport(old), finalize(old)]) {
      expect(held.status).toBe(2);
      expect(held.stderr).toContain('blocking finding b1');
      expect(held.stderr).toContain('decision-needed finding d1');
      expect(held.stderr).not.toContain('correct the report');
    }
    const onlyFollowUp = fixture([followUp]);
    expect(checkReport(onlyFollowUp).status).toBe(0);
    expect(finalize(onlyFollowUp).status).toBe(0);

    const none = fixture();
    expect(checkReport(none).status).toBe(0);
    const done = finalize(none);
    expect(done.status, done.stderr).toBe(0);
  });

  it('[AC:spec-1-4] the verify skill sends each no-work kind to a note, and types.d.ts lists note', () => {
    const skill = readFileSync(join(payload, '.agents/skills/joycraft-verify/SKILL.md'), 'utf8').replace(/\s+/g, ' ');
    const deferred = skill.match(/Items under a spec's "Deferred until deploy" section[^.]*\.[^.]*\./)?.[0] ?? '';
    expect(deferred).toContain('`note`');
    expect(deferred).not.toContain('`follow-up`');
    const rule = skill.slice(skill.indexOf('Findings rule:'));
    const noteRule = rule.match(/[^.]*`note`[^.]*\./g)?.join(' ') ?? '';
    expect(noteRule).toMatch(/check that passed/);
    expect(noteRule).toMatch(/another spec/);
    expect(noteRule).toMatch(/archived feature/);
    expect(noteRule).toMatch(/Deferred until deploy/);
    expect(noteRule).toMatch(/flaky retry/);
    expect(noteRule).toMatch(/log noise/);
    expect(noteRule).toMatch(/not a `follow-up`/);

    const types = readFileSync(join(payload, '.joycraft/contracts/types.d.ts'), 'utf8');
    expect(types).toMatch(/class: 'blocking' \| 'decision-needed' \| 'follow-up' \| 'note';/);
    expect(types).toMatch(/\/\*\*[^\n]*note[^\n]*\*\/\n(?:.*\n)*?\s*class:/);
  });
});

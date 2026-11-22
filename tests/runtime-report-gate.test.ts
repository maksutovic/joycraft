import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const folder = 'docs/features/2026-11-21-f';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const reportPath = `${folder}/specs/review-1.report.json`;

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/** A git project with one in-review spec and a PASS report whose one observation ran `argv`. */
function fixture({ gate, argv }: { gate?: string; argv: string[] }) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-report-gate-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  if (gate) put(join(root, 'joycraft.yaml'), `tests:\n  gate: ${JSON.stringify(gate)}\n`);
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
      observations: [{ kind: 'runtime', method: 'test', result: 'PASS', actual: 'it passed', receipts: [{ path: '.joycraft/local/receipt.log', sha256: hash('ok\n') }], command: { argv, exitCode: 0 } }] }] };
  put(join(root, reportPath), JSON.stringify(report, null, 2));
  return root;
}

const checkReport = (root: string) => spawnSync(process.execPath, [join(runtime, 'dispatch-preflight.mjs'), 'check-report', '--worker-root', root, '--queue', queuePath, '--spec', '1', '--report', reportPath], { cwd: root, encoding: 'utf8' });
const finalize = (root: string) => spawnSync(process.execPath, [join(runtime, 'completion.mjs'), 'finalize-review', '--queue', queuePath, '--spec', '1', '--report', reportPath], { cwd: root, encoding: 'utf8' });

describe('check-report refuses a report that ran the gate', () => {
  it('[AC:spec-6-1] a report whose observation ran the recorded gate is refused, also in a shell form', () => {
    const root = fixture({ gate: 'pnpm verify', argv: ['pnpm', 'verify'] });
    const result = checkReport(root);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('flows[0].observations[0]');
    expect(result.stderr).toContain('`pnpm verify`');
    const final = finalize(root);
    expect(final.status).toBe(2);
    expect(final.stderr).toContain('ran the recorded tests.gate command');
    const shell = checkReport(fixture({ gate: 'pnpm test && pnpm typecheck', argv: ['bash', '-c', 'pnpm test  &&  pnpm typecheck'] }));
    expect(shell.status).toBe(2);
    expect(shell.stderr).toContain('tests.gate');
  });

  it('[AC:spec-6-2] a report that ran only focused commands passes, and a project with no gate is not checked', () => {
    const focused = checkReport(fixture({ gate: 'pnpm verify', argv: ['pnpm', 'test', 'tests/a.test.ts'] }));
    expect(focused.status, focused.stderr).toBe(0);
    const noGate = checkReport(fixture({ argv: ['pnpm', 'verify'] }));
    expect(noGate.status, noGate.stderr).toBe(0);
  });
});

describe('report gate wrappers and a broken joycraft.yaml (spec 27)', () => {
  it('[AC:spec-27-3] each shell or env wrapper of the gate is refused; more arguments pass; a broken joycraft.yaml refuses', () => {
    const wrapped = [
      ['bash', '-lc', 'pnpm verify'],
      ['sh', '-c', 'pnpm verify', 'sh'],
      ['zsh', '-c', 'pnpm verify'],
      ['dash', '-c', 'pnpm verify'],
      ['/usr/bin/env', 'bash', '-c', 'pnpm verify'],
      ['env', 'CI=1', 'pnpm', 'verify'],
    ];
    for (const argv of wrapped) {
      const result = checkReport(fixture({ gate: 'pnpm verify', argv }));
      expect(result.status, JSON.stringify(argv)).toBe(2);
      expect(result.stderr).toContain('tests.gate');
    }
    const more = checkReport(fixture({ gate: 'pnpm verify', argv: ['pnpm', 'verify', 'tests/x'] }));
    expect(more.status, more.stderr).toBe(0);

    const root = fixture({ gate: 'pnpm verify', argv: ['pnpm', 'test', 'tests/a.test.ts'] });
    put(join(root, 'joycraft.yaml'), 'tests: [\n');
    for (const result of [checkReport(root), finalize(root)]) {
      expect(result.status, result.stderr).toBe(2);
      expect(result.stderr).toContain('joycraft.yaml does not parse');
    }
  });
});

// Spec 6 reviewer probe: check-report against gate-run bypass forms.
// Usage: node spec-06-probe.mjs <project-root>   (uses <project-root>/payload/.joycraft/runtime)
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const runtime = join(process.argv[2], 'payload', '.joycraft', 'runtime');
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file, body) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const folder = 'docs/features/2026-11-21-f';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const reportPath = `${folder}/specs/review-1.report.json`;
const dirs = [];

function fixture({ yaml, argv, verdict = 'PASS' }) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-s6-probe-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  if (yaml != null) put(join(root, 'joycraft.yaml'), yaml);
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
  const pass = verdict === 'PASS';
  const report = { schemaVersion: 1, subject, implementerSessionId: 'impl-1', reviewer: { sessionId: 'review-1', independent: true, scopeReviewed: true },
    verdict, unresolved: pass ? [] : ['gate red'], createdAt: new Date().toISOString(),
    flows: [{ id: 'flow-1', subjectIdentity: subject.identity, representativeInput: 'the fixture', expected: 'the test passes', limits: ['fixture only'], criteria: ['spec-1-1'],
      observations: [{ kind: 'runtime', method: 'test', result: pass ? 'PASS' : 'FAIL', actual: 'ran', receipts: [{ path: '.joycraft/local/receipt.log', sha256: hash('ok\n') }], command: { argv, exitCode: pass ? 0 : 1 } }] }] };
  put(join(root, reportPath), JSON.stringify(report, null, 2));
  return root;
}
const checkReport = root => spawnSync(process.execPath, [join(runtime, 'dispatch-preflight.mjs'), 'check-report', '--worker-root', root, '--queue', queuePath, '--spec', '1', '--report', reportPath], { cwd: root, encoding: 'utf8' });

const G = 'tests:\n  gate: "pnpm verify"\n';
const G2 = 'tests:\n  gate: "pnpm test && pnpm typecheck"\n';
const cases = [
  ['exact gate', G, ['pnpm', 'verify'], 'refuse'],
  ['gate as one argv string', G, ['pnpm verify'], 'refuse'],
  ['gate with extra whitespace in argv', G, ['pnpm', ' verify '], 'refuse'],
  ['sh -c', G, ['sh', '-c', 'pnpm verify'], 'refuse'],
  ['bash -c', G, ['bash', '-c', 'pnpm verify'], 'refuse'],
  ['/bin/sh -c (absolute path)', G, ['/bin/sh', '-c', 'pnpm verify'], 'refuse'],
  ['bash -c two-part gate, extra spaces', G2, ['bash', '-c', 'pnpm test  &&  pnpm typecheck'], 'refuse'],
  ['two-part gate split across argv', G2, ['pnpm', 'test', '&&', 'pnpm', 'typecheck'], 'refuse'],
  ['tests.full only', 'tests:\n  full: "pnpm verify"\n', ['pnpm', 'verify'], 'refuse'],
  ['bash -lc', G, ['bash', '-lc', 'pnpm verify'], 'probe'],
  ['sh -c with $0 arg (argv length 4)', G, ['sh', '-c', 'pnpm verify', 'sh'], 'probe'],
  ['zsh -c', G, ['zsh', '-c', 'pnpm verify'], 'probe'],
  ['sh -c quoted inner', G, ['sh', '-c', '"pnpm verify"'], 'probe'],
  ['env prefix', G, ['env', 'CI=1', 'pnpm', 'verify'], 'probe'],
  ['env var inside sh -c', G, ['sh', '-c', 'CI=1 pnpm verify'], 'probe'],
  ['/usr/bin/env bash -c', G, ['/usr/bin/env', 'bash', '-c', 'pnpm verify'], 'probe'],
  ['npx form of gate (gate: vitest run)', 'tests:\n  gate: "vitest run"\n', ['npx', 'vitest', 'run'], 'probe'],
  ['pnpm exec form (gate: vitest run)', 'tests:\n  gate: "vitest run"\n', ['pnpm', 'exec', 'vitest', 'run'], 'probe'],
  ['pnpm run verify', G, ['pnpm', 'run', 'verify'], 'probe'],
  ['gate plus trailing args', G, ['pnpm', 'verify', '--reporter=dot'], 'probe'],
  ['first half of two-part gate (pnpm test)', G2, ['pnpm', 'test'], 'probe'],
  ['focused command', G, ['pnpm', 'test', 'tests/a.test.ts'], 'pass'],
  ['no joycraft.yaml', null, ['pnpm', 'verify'], 'pass'],
  ['joycraft.yaml with focused only', 'tests:\n  focused: "pnpm test"\n', ['pnpm', 'verify'], 'pass'],
  ['joycraft.yaml without tests section', 'paths:\n  features: docs/features\n', ['pnpm', 'verify'], 'pass'],
  ['FAIL report that ran the gate', G, ['pnpm', 'verify'], 'probe', 'FAIL'],
  ['broken joycraft.yaml', 'tests: [\n', ['pnpm', 'verify'], 'probe'],
];
let bad = 0;
for (const [name, yaml, argv, want, verdict] of cases) {
  const r = checkReport(fixture({ yaml, argv, verdict }));
  const got = r.status === 0 ? 'pass' : `exit ${r.status}`;
  const ok = want === 'probe' || (want === 'pass' ? r.status === 0 : r.status === 2);
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'MISS'} [${want}] ${name} argv=${JSON.stringify(argv)} -> ${got}${r.status ? ` :: ${r.stderr.trim().split('\n').pop().slice(0, 220)}` : ''}`);
}
for (const d of dirs) rmSync(d, { recursive: true, force: true });
console.log(`expected-outcome mismatches: ${bad}`);
process.exitCode = bad ? 1 : 0;

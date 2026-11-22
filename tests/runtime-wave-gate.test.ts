import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const node = (cwd: string, script: string, args: string[]) => spawnSync(process.execPath, [join(runtime, script), ...args], { cwd, encoding: 'utf8' });

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function temp(prefix: string) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  dirs.push(dir);
  return dir;
}

/** A repo whose joycraft.yaml records `node gate.mjs` as the gate, with a bare remote. */
function deliveryFixture(yaml = 'tests:\n  gate: node gate.mjs\n') {
  const base = temp('jc-wave-gate-');
  const remote = join(base, 'remote.git');
  const root = join(base, 'work');
  git(base, 'init', '-q', '--bare', remote);
  mkdirSync(root);
  git(root, 'init', '-q', '-b', 'main');
  put(join(root, '.gitignore'), 'receipts/\n');
  put(join(root, 'joycraft.yaml'), yaml);
  put(join(root, 'gate.mjs'), "console.log('gate ok');\n");
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'one');
  const first = git(root, 'rev-parse', 'HEAD');
  put(join(root, 'b.txt'), 'b\n');
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'two');
  git(root, 'remote', 'add', 'origin', remote);
  return { root, remote, first, head: git(root, 'rev-parse', 'HEAD') };
}
const footer = (root: string, name: string, value: Record<string, unknown>) =>
  put(join(root, 'receipts', name), `output\njoycraft-evidence: ${JSON.stringify({ wallMs: 5, load: [1, 1], cores: 8, loaded: false, timedOut: false, ...value })}\n`);
const push = (root: string, first: string, extra: string[]) => node(root, 'delivery.mjs', ['push', '--root', root, '--base', first, '--remote', 'origin', '--branch', 'feature', ...extra]);
const remoteRef = (remote: string) => spawnSync('git', ['rev-parse', '--verify', '-q', 'refs/heads/feature'], { cwd: remote, encoding: 'utf8' }).stdout.trim();

describe('delivery needs a green gate receipt', () => {
  it('[AC:spec-7-1] refuses a missing, non-gate, red or stale receipt with its own code and pushes nothing', () => {
    const { root, remote, first, head } = deliveryFixture();
    footer(root, 'other.log', { argv: ['node', 'other.mjs'], exitCode: 0, revision: head, dirty: false });
    footer(root, 'red.log', { argv: ['node', 'gate.mjs'], exitCode: 1, revision: head, dirty: false });
    footer(root, 'stale.log', { argv: ['node', 'gate.mjs'], exitCode: 0, revision: first, dirty: false });
    footer(root, 'dirty.log', { argv: ['node', 'gate.mjs'], exitCode: 0, revision: head, dirty: true });
    put(join(root, 'receipts/plain.log'), 'no footer\n');
    const cases: Array<[string[], string]> = [
      [[], 'gate-receipt-required'],
      [['--', process.execPath, '-e', '0'], 'gate-receipt-required'],
      [['--gate-receipt', 'receipts/other.log'], 'gate-receipt-not-gate'],
      [['--gate-receipt', 'receipts/plain.log'], 'gate-receipt-not-gate'],
      [['--gate-receipt', 'receipts/red.log'], 'gate-receipt-red'],
      [['--gate-receipt', 'receipts/stale.log'], 'gate-receipt-stale'],
      [['--gate-receipt', 'receipts/dirty.log'], 'gate-receipt-stale'],
    ];
    for (const [extra, code] of cases) {
      const result = push(root, first, extra);
      expect(result.status, code).toBe(1);
      expect(result.stderr.trim()).toBe(code);
      expect(remoteRef(remote)).toBe('');
    }
  }, 30000);

  it('[AC:spec-7-2] a green gate receipt on HEAD pushes without a second verifier', () => {
    const { root, remote, first, head } = deliveryFixture();
    // Written as evidence.mjs writes its footer; also accepted: a shell given the gate after -c.
    footer(root, 'gate.log', { argv: ['sh', '-c', 'node  gate.mjs'], exitCode: 0, revision: head, dirty: false });
    const result = push(root, first, ['--gate-receipt', 'receipts/gate.log']);
    expect(result.status, result.stderr).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(out.gateReceipt.revision).toBe(head);
    expect(out).not.toHaveProperty('verifier');
    expect(remoteRef(remote)).toBe(head);
  });

  it('[AC:spec-7-2] a project with no tests.gate keeps the -- <verifier> push', () => {
    const { root, remote, first, head } = deliveryFixture('paths:\n  features: docs/features\n');
    const result = push(root, first, ['--', process.execPath, '-e', '0']);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).verifier.exitCode).toBe(0);
    expect(remoteRef(remote)).toBe(head);
  });
});

const queuePath = 'docs/features/demo/specs/.joycraft-spec-queue.json';
/** Specs 1 and 2 start at once; spec 3 waits on spec 1, so the queue has two waves. */
function queueFixture(gateRuns?: string) {
  const root = temp('jc-gate-plan-');
  git(root, 'init', '-q');
  if (gateRuns) put(join(root, 'joycraft.yaml'), `tests:\n  gate: pnpm verify\n  gateRuns: ${gateRuns}\n`);
  const spec = (id: number, depends: number[], check: string) => ({ id, file: `0${id}-s.md`, depends_on: depends, status: 'todo', mode: 'batch', verification: {
    inputs: [{ path: `docs/features/demo/specs/0${id}-s.md`, kind: 'requirement' }, { path: `src/${id}.ts`, kind: 'code' }, { path: check, kind: 'check' }],
    criteria: [{ id: 'a', requirement: { path: `docs/features/demo/specs/0${id}-s.md`, anchor: 'a' }, requiredKinds: ['runtime'] }] } });
  for (const id of [1, 2, 3]) put(join(root, `docs/features/demo/specs/0${id}-s.md`), `---\nid: ${id}\nstatus: todo\n---\n# S\n`);
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'demo', specs: [spec(1, [], 'tests/a.test.ts'), spec(2, [], 'tests/b.test.ts'), spec(3, [1], 'tests/c.test.ts')] }));
  return root;
}
const coordinator = (root: string, args: string[]) => {
  const result = node(root, 'coordinator.mjs', args);
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
};

describe('coordinator gate-plan and gate-owner', () => {
  it('[AC:spec-7-3] a two-wave queue has 2 gate points per wave and 3 per spec', () => {
    const wave = coordinator(queueFixture('wave'), ['gate-plan', '--queue', queuePath]);
    expect(wave.waves).toEqual([[1, 2], [3]]);
    expect(wave.gateRuns).toBe('wave');
    expect(wave.gatePoints).toHaveLength(2);
    const perSpec = coordinator(queueFixture('spec'), ['gate-plan', '--queue', queuePath]);
    expect(perSpec.gatePoints).toHaveLength(3);
    expect(coordinator(queueFixture(), ['gate-plan', '--queue', queuePath]).gateRuns).toBe('spec');
  });

  it('[AC:spec-7-4] a failing file maps to the spec whose inputs hold it, else bisect', () => {
    const root = queueFixture('wave');
    const result = coordinator(root, ['gate-owner', '--queue', queuePath, '--file', 'tests/c.test.ts', '--file', './tests/z.test.ts']);
    expect(result.files).toEqual([{ file: 'tests/c.test.ts', specs: [3] }, { file: 'tests/z.test.ts', specs: 'bisect' }]);
  });
});

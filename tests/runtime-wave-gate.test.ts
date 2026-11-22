import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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

describe('gate receipt review-7 fixes', () => {
  const evidence = (root: string, receipt: string, argv: string[]) => node(root, 'evidence.mjs', ['run', '--receipt', receipt, '--', ...argv]);

  it('[review-7-1] refuses a green receipt of a non-shell program given -c "<gate>"', () => {
    const { root, remote, first } = deliveryFixture();
    expect(evidence(root, 'receipts/echo.log', ['/bin/echo', '-c', 'node gate.mjs']).status).toBe(0);
    const result = push(root, first, ['--gate-receipt', 'receipts/echo.log']);
    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe('gate-receipt-not-gate');
    expect(remoteRef(remote)).toBe('');
  }, 30000);

  it('[review-7-1] still accepts a real shell receipt of sh -c "<gate>"', () => {
    const { root, remote, first, head } = deliveryFixture();
    expect(evidence(root, 'receipts/sh.log', ['/bin/sh', '-c', 'node gate.mjs']).status).toBe(0);
    const result = push(root, first, ['--gate-receipt', 'receipts/sh.log']);
    expect(result.status, result.stderr).toBe(0);
    expect(remoteRef(remote)).toBe(head);
  }, 30000);

  it('[review-7-3] reads the footer with evidence.mjs readFooter: only the last line, only an object', () => {
    const { root, remote, first, head } = deliveryFixture();
    put(join(root, 'receipts/array.log'), `out\njoycraft-evidence: ${JSON.stringify([{ argv: ['node', 'gate.mjs'], exitCode: 0, revision: head, dirty: false }])}\n`);
    put(join(root, 'receipts/after.log'), `joycraft-evidence: ${JSON.stringify({ argv: ['node', 'gate.mjs'], exitCode: 0, revision: head, dirty: false })}\nmore output\n`);
    for (const name of ['array.log', 'after.log']) {
      const result = push(root, first, ['--gate-receipt', `receipts/${name}`]);
      expect(result.status, name).toBe(1);
      expect(result.stderr.trim()).toBe('gate-receipt-not-gate');
    }
    expect(remoteRef(remote)).toBe('');
  }, 30000);

  it('[review-7-4] refuses a gate receipt outside the project root', () => {
    const { root, remote, first, head } = deliveryFixture();
    const outside = join(dirname(root), 'outside.log');
    put(outside, `out\njoycraft-evidence: ${JSON.stringify({ argv: ['node', 'gate.mjs'], exitCode: 0, revision: head, dirty: false })}\n`);
    for (const receipt of [outside, '../outside.log']) {
      const result = push(root, first, ['--gate-receipt', receipt]);
      expect(result.status, receipt).toBe(1);
      expect(result.stderr.trim()).toBe('gate-receipt-outside-project');
    }
    expect(remoteRef(remote)).toBe('');
  }, 30000);

  const andGate = 'tests:\n  gate: "node gate.mjs && node gate2.mjs"\n';
  const gate2 = (root: string, code: number) => { put(join(root, 'gate2.mjs'), `process.exit(${code});\n`); git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'gate2'); return git(root, 'rev-parse', 'HEAD'); };

  it('[review-7-r2-1] a gate with shell syntax needs the shell form: split words are refused, a red sh -c run is refused', () => {
    const { root, remote, first } = deliveryFixture(andGate);
    gate2(root, 1);
    // Without a shell, && and gate2.mjs are only arguments to node gate.mjs, so this run is green.
    expect(evidence(root, 'receipts/words.log', ['node', 'gate.mjs', '&&', 'node', 'gate2.mjs']).status).toBe(0);
    const words = push(root, first, ['--gate-receipt', 'receipts/words.log']);
    expect(words.status).toBe(1);
    expect(words.stderr.trim()).toBe('gate-receipt-not-gate');
    expect(remoteRef(remote)).toBe('');
    expect(evidence(root, 'receipts/sh.log', ['sh', '-c', 'node gate.mjs && node gate2.mjs']).status).toBe(1);
    const red = push(root, first, ['--gate-receipt', 'receipts/sh.log']);
    expect(red.status).toBe(1);
    expect(red.stderr.trim()).toBe('gate-receipt-red');
    expect(remoteRef(remote)).toBe('');
  }, 30000);

  it('[review-7-r2-1] the same gate pushes through sh -c when every command is green', () => {
    const { root, remote, first } = deliveryFixture(andGate);
    const head = gate2(root, 0);
    expect(evidence(root, 'receipts/sh.log', ['sh', '-c', 'node gate.mjs && node gate2.mjs']).status).toBe(0);
    const result = push(root, first, ['--gate-receipt', 'receipts/sh.log']);
    expect(result.status, result.stderr).toBe(0);
    expect(remoteRef(remote)).toBe(head);
  }, 30000);

  it('[review-7-r2-2] a shell form whose program is a relative path is refused; a bare name or absolute path is accepted', () => {
    const { root, remote, first, head } = deliveryFixture();
    for (const shell of ['./sh', 'tools/bash', 'tools\\bash.exe']) {
      footer(root, 'rel.log', { argv: [shell, '-c', 'node gate.mjs'], exitCode: 0, revision: head, dirty: false });
      const result = push(root, first, ['--gate-receipt', 'receipts/rel.log']);
      expect(result.status, shell).toBe(1);
      expect(result.stderr.trim()).toBe('gate-receipt-not-gate');
      expect(remoteRef(remote)).toBe('');
    }
    // [AC:spec-27-13] a Windows path is a shell only on Windows.
    for (const shell of ['bash', '/bin/sh', ...(process.platform === 'win32' ? ['C:\\Windows\\System32\\cmd.exe'] : [])]) {
      footer(root, 'ok.log', { argv: [shell, shell.endsWith('cmd.exe') ? '/c' : '-c', 'node gate.mjs'], exitCode: 0, revision: head, dirty: false });
      const result = push(root, first, ['--gate-receipt', 'receipts/ok.log']);
      expect(result.status, `${shell}: ${result.stderr}`).toBe(0);
    }
    expect(remoteRef(remote)).toBe(head);
  }, 30000);
});

describe('spec 27 delivery polish', () => {
  it('[AC:spec-27-13] a plain gate in shell form splits on spaces and tabs only; a shell path inside the project or (POSIX) in Windows form is refused', () => {
    const { root, remote, first, head } = deliveryFixture();
    const refused: string[][] = [['sh', '-c', 'node\ngate.mjs'], ['sh', '-c', 'node\rgate.mjs'], [join(root, 'tools', 'sh'), '-c', 'node gate.mjs']];
    if (process.platform !== 'win32') refused.push(['C:\\Program Files\\Git\\bin\\bash.exe', '-c', 'node gate.mjs']);
    for (const argv of refused) {
      footer(root, 'r.log', { argv, exitCode: 0, revision: head, dirty: false });
      const result = push(root, first, ['--gate-receipt', 'receipts/r.log']);
      expect(result.status, JSON.stringify(argv)).toBe(1);
      expect(result.stderr.trim()).toBe('gate-receipt-not-gate');
      expect(remoteRef(remote)).toBe('');
    }
    for (const argv of [['sh', '-c', 'node  gate.mjs'], ['sh', '-c', 'node\tgate.mjs'], ['/bin/sh', '-c', 'node gate.mjs']]) {
      footer(root, 'ok.log', { argv, exitCode: 0, revision: head, dirty: false });
      const result = push(root, first, ['--gate-receipt', 'receipts/ok.log']);
      expect(result.status, `${JSON.stringify(argv)}: ${result.stderr}`).toBe(0);
    }
    expect(remoteRef(remote)).toBe(head);
    const usage = node(root, 'delivery.mjs', []);
    expect(usage.stderr).toContain('symlink');
  }, 30000);

  it('[AC:spec-27-14] a receipt on an ancestor of HEAD pushes when only docs-root paths changed since; any other path or a non-ancestor stays stale', () => {
    const { root, remote, first, head } = deliveryFixture();
    footer(root, 'gate.log', { argv: ['node', 'gate.mjs'], exitCode: 0, revision: head, dirty: false });
    put(join(root, 'docs/features/f/notes.md'), 'records\n');
    git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'records');
    const docsOnly = push(root, first, ['--gate-receipt', 'receipts/gate.log']);
    expect(docsOnly.status, docsOnly.stderr).toBe(0);
    const out = JSON.parse(docsOnly.stdout);
    expect(out.gateReceipt.revision).toBe(head);
    expect(remoteRef(remote)).toBe(git(root, 'rev-parse', 'HEAD'));

    put(join(root, 'tests/a.test.ts'), 'rewritten\n');
    git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'archive rewrite');
    const pushedBefore = remoteRef(remote);
    const stale = push(root, first, ['--gate-receipt', 'receipts/gate.log']);
    expect(stale.status).toBe(1);
    expect(stale.stderr.trim()).toBe('gate-receipt-stale');
    expect(remoteRef(remote)).toBe(pushedBefore);

    // A revision that is not an ancestor of HEAD: a side commit.
    git(root, 'checkout', '-q', '-b', 'side', first);
    put(join(root, 'docs/side.md'), 'side\n');
    git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'side');
    const side = git(root, 'rev-parse', 'HEAD');
    git(root, 'checkout', '-q', 'main');
    footer(root, 'side.log', { argv: ['node', 'gate.mjs'], exitCode: 0, revision: side, dirty: false });
    const notAncestor = push(root, first, ['--gate-receipt', 'receipts/side.log']);
    expect(notAncestor.status).toBe(1);
    expect(notAncestor.stderr.trim()).toBe('gate-receipt-stale');
  }, 30000);

  it('[review-27-7] only Markdown and JSON under the docs root, or any non-symlink file in a feature or archive folder, keeps an old receipt', () => {
    const cases: Array<[string, (root: string) => void, number]> = [
      ['context record', root => put(join(root, 'docs/context/log.md'), 'x\n'), 0],
      ['feature receipt log', root => put(join(root, 'docs/features/f/reviews/r.log'), 'x\n'), 0],
      ['archived receipt txt', root => put(join(root, 'docs/archive/f/reviews/p.mjs.txt'), 'x\n'), 0],
      ['code under context', root => put(join(root, 'docs/context/evil.test.ts'), 'x\n'), 1],
      ['code at the docs root', root => put(join(root, 'docs/run.mjs'), 'x\n'), 1],
      ['symlink in a feature folder', root => { mkdirSync(join(root, 'docs/features/f'), { recursive: true }); symlinkSync('../../../gate.mjs', join(root, 'docs/features/f/x.md')); }, 1],
    ];
    for (const [name, change, status] of cases) {
      const { root, first, head } = deliveryFixture();
      footer(root, 'gate.log', { argv: ['node', 'gate.mjs'], exitCode: 0, revision: head, dirty: false });
      change(root);
      git(root, 'add', '.'); git(root, 'commit', '-q', '-m', name);
      const result = push(root, first, ['--gate-receipt', 'receipts/gate.log']);
      expect(result.status, `${name}: ${result.stderr}`).toBe(status);
      if (status) expect(result.stderr.trim()).toBe('gate-receipt-stale');
    }
  }, 60000);

  it('[AC:spec-27-14] a docs root of . gives no exemption', () => {
    const { root, remote, first, head } = deliveryFixture('tests:\n  gate: node gate.mjs\npaths:\n  features: features\n  archive: archive\n  context: context\n');
    footer(root, 'gate.log', { argv: ['node', 'gate.mjs'], exitCode: 0, revision: head, dirty: false });
    put(join(root, 'features/f/notes.md'), 'records\n');
    git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'records');
    const result = push(root, first, ['--gate-receipt', 'receipts/gate.log']);
    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe('gate-receipt-stale');
    expect(remoteRef(remote)).toBe('');
  }, 30000);
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

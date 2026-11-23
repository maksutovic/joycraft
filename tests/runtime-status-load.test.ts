import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const script = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'status.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const folder = 'docs/features/demo';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/** A git project with one todo spec in a feature queue. */
function project() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-status-load-')));
  dirs.push(root);
  git(root, 'init', '-q');
  put(join(root, '.gitignore'), 'receipts/\n');
  put(join(root, folder, 'specs/01-a.md'), '---\nid: 1\nstatus: todo\n---\n# A\n');
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'demo', specs: [{ id: 1, file: '01-a.md', depends_on: [], status: 'todo', mode: 'batch', verification: {
    inputs: [{ path: `${folder}/specs/01-a.md`, kind: 'requirement' }],
    criteria: [{ id: 'a', requirement: { path: `${folder}/specs/01-a.md`, anchor: 'a' }, requiredKinds: ['runtime'] }] } }] }));
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'init');
  return root;
}
const receipt = (root: string, relative: string, footer?: Record<string, unknown>) =>
  put(join(root, relative), `output\n${footer ? `joycraft-evidence: ${JSON.stringify({ wallMs: 10, cores: 14, argv: ['x'], exitCode: 0, ...footer })}\n` : ''}`);
const status = (root: string) => {
  const result = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout).features.find((feature: { feature: string }) => feature.feature === 'demo');
};

describe('status.mjs load line', () => {
  it('[AC:spec-10-1] counts loaded runs across feature receipts and report-cited receipts, each once', () => {
    const root = project();
    receipt(root, `${folder}/receipts/a.log`, { load: [20, 18], loaded: true });
    receipt(root, `${folder}/receipts/b.log`, { load: [3, 4], loaded: false });
    receipt(root, 'receipts/c.log', { load: [16, 15], loaded: true });
    const cites = (paths: string[]) => ({ verdict: 'PASS', subject: { queuePath, specId: 1 },
      flows: [{ observations: [{ receipts: paths.map(path => ({ path, sha256: '0'.repeat(64) })) }] }] });
    put(join(root, folder, 'reviews/r1.json'), JSON.stringify(cites(['receipts/c.log', `${folder}/receipts/a.log`])));
    put(join(root, folder, 'reviews/r2.json'), JSON.stringify(cites(['receipts/c.log'])));
    expect(status(root).load).toBe("2 of 3 test runs started above the core count (14 cores). An overloaded machine makes slow, flaky runs that agents rerun. Cap workers per run with the runner's own flag; see setup.");
  });

  it('[AC:spec-10-2] no loaded run, or receipts without a footer, give no load field', () => {
    const quiet = project();
    receipt(quiet, `${folder}/receipts/a.log`, { load: [3, 4], loaded: false });
    receipt(quiet, `${folder}/receipts/b.log`, { load: null, loaded: null });
    expect(status(quiet)).not.toHaveProperty('load');
    const old = project();
    receipt(old, `${folder}/receipts/a.log`);
    receipt(old, `${folder}/receipts/b.log`);
    expect(status(old)).not.toHaveProperty('load');
  });
});

describe('status.mjs load line wording (spec 27)', () => {
  it('[AC:spec-27-10] says why, names each distinct core count, and drops the count when no footer has one', () => {
    const mixed = project();
    receipt(mixed, `${folder}/receipts/a.log`, { load: [20, 18], loaded: true, cores: 8 });
    receipt(mixed, `${folder}/receipts/b.log`, { load: [20, 18], loaded: true, cores: 16 });
    receipt(mixed, `${folder}/receipts/c.log`, { load: [20, 18], loaded: true, cores: 16 });
    const line = status(mixed).load;
    expect(line).toContain('(8 and 16 cores)');
    expect(line).toContain('An overloaded machine makes slow, flaky runs that agents rerun.');
    const none = project();
    receipt(none, `${folder}/receipts/a.log`, { load: [20, 18], loaded: true, cores: undefined });
    const bare = status(none).load;
    expect(bare).toBe("1 of 1 test runs started above the core count. An overloaded machine makes slow, flaky runs that agents rerun. Cap workers per run with the runner's own flag; see setup.");
    expect(bare).not.toContain('(0 cores)');
    expect(bare).not.toContain('(');
  });
});

// Spec: .joycraft/local/loop/iter1/chair.md, sl1-05 (status accepts --queue and lists open briefs).
describe('status.mjs --queue and openBriefs (sl1-05)', () => {
  const run = (...args: string[]) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

  it('[AC:sl1-05-status] openBriefs lists a queue-less brief, and the exit code is unchanged', () => {
    const root = project();
    const before = run('--root', root);
    expect(before.status, before.stderr).toBe(0);
    expect(JSON.parse(before.stdout).openBriefs).toEqual([]);
    put(join(root, 'docs/features/small/brief.md'), '# Add a button\n\n- Done when: the page shows one button.\n');
    put(join(root, 'docs/features/empty/notes.md'), 'no brief here\n');
    const after = run('--root', root);
    expect(after.status, after.stderr).toBe(before.status);
    const report = JSON.parse(after.stdout);
    expect(report.openBriefs).toEqual([{ folder: 'docs/features/small', brief: 'docs/features/small/brief.md' }]);
    expect(report.features.map((feature: { feature: string }) => feature.feature)).toEqual(['demo']);
  });

  it('[AC:sl1-05-status] --queue reports only that queue, relative or absolute', () => {
    const root = project();
    put(join(root, 'docs/features/other/specs/01-b.md'), '---\nid: 1\nstatus: todo\n---\n# B\n');
    put(join(root, 'docs/features/other/specs/.joycraft-spec-queue.json'), JSON.stringify({ schemaVersion: 1, feature: 'other', specs: [{ id: 1, file: '01-b.md', depends_on: [], status: 'todo', mode: 'batch', verification: {
      inputs: [{ path: 'docs/features/other/specs/01-b.md', kind: 'requirement' }],
      criteria: [{ id: 'b', requirement: { path: 'docs/features/other/specs/01-b.md', anchor: 'b' }, requiredKinds: ['runtime'] }] } }] }));
    expect(JSON.parse(run('--root', root).stdout).features).toHaveLength(2);
    for (const queue of [queuePath, join(root, queuePath)]) {
      const result = run('--root', root, '--queue', queue);
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout).features.map((feature: { queuePath: string }) => feature.queuePath)).toEqual([queuePath]);
    }
    const missing = run('--root', root, '--queue');
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain('--queue <queue-path>');
  });
});

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-test-release/specs/19-lane-cap-text.md
const root = join(__dirname, '..');
const raw = (path: string) => readFileSync(join(root, 'payload', path), 'utf8');
const flat = (path: string) => raw(path).replace(/\s+/g, ' ');
const TESTING = '.joycraft/references/testing.md';
const SETUP = '.joycraft/references/setup.md';
const REVIEW = '.joycraft/references/testing-review.md';
const evidence = join(root, 'payload', '.joycraft', 'runtime', 'evidence.mjs');
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** The text of one `## <name>` section of a payload file, whitespace flattened. */
const section = (path: string, name: string) => {
  const text = raw(path);
  const start = text.indexOf(`\n## ${name}\n`);
  expect(start, `${path} has ## ${name}`).toBeGreaterThan(-1);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end < 0 ? undefined : end).replace(/\s+/g, ' ');
};

// The guard's every-spec count at the commit before this spec (4c188d1).
const EVERY_SPEC_BEFORE = 12157;

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

/** A git project whose runner config caps workers only when JOYCRAFT_EVIDENCE is set, as setup offers. */
function cappedProject() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-lane-cap-')));
  dirs.push(dir);
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: dir, stdio: 'ignore' });
  git('init', '-q', '-b', 'main');
  writeFileSync(join(dir, '.gitignore'), 'receipts/\n');
  writeFileSync(join(dir, 'runner.config.mjs'), 'export const maxWorkers = process.env.JOYCRAFT_EVIDENCE ? 3 : undefined;\n');
  git('add', '-A'); git('commit', '-q', '-m', 'init');
  return dir;
}

describe('lane cap text', () => {
  it('[AC:spec-19-1] testing.md caps each run at cores ÷ N workers, names JOYCRAFT_EVIDENCE next to CI=1, and drops "rerun once, alone"', () => {
    const text = flat(TESTING);
    expect(text).not.toContain('rerun once, alone');
    expect(text).toContain("When N workers share the machine, give each test run at most cores ÷ N workers with the runner's own flag; a second timeout is reported with both receipts.");
    expect(text).toContain('with `CI=1`, `JOYCRAFT_EVIDENCE=1` and a 300000 ms timeout');
  });

  it('[AC:spec-19-2] setup offers a cap keyed on JOYCRAFT_EVIDENCE, never on CI, explains why, and gives the three-step order', () => {
    const text = flat(SETUP);
    expect(text).toContain('when several agents will test on this machine: offer a worker cap in the project\'s own runner config, keyed on `JOYCRAFT_EVIDENCE`');
    expect(text).toContain('never on `CI`');
    expect(text).toContain('Explain why in the same step: an overloaded machine makes slow and flaky runs that agents then rerun');
    const order = ['run less', 'then cap workers per run', 'then a project-owned slot'].map((step) => text.indexOf(step));
    expect(order.every((at) => at > -1), String(order)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // The cap setup offers reaches a run through evidence, and only there.
    const dir = cappedProject();
    const print = ['-e', "import('./runner.config.mjs').then((m) => console.log('workers=' + m.maxWorkers))"];
    const run = spawnSync(process.execPath, [evidence, 'run', '--receipt', 'receipts/cap.log', '--', process.execPath, ...print], { cwd: dir, encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);
    expect(readFileSync(join(dir, 'receipts/cap.log'), 'utf8')).toContain('workers=3');
    const plain = spawnSync(process.execPath, print, { cwd: dir, encoding: 'utf8', env: { ...process.env, JOYCRAFT_EVIDENCE: '', CI: '1' } });
    expect(plain.stdout).toContain('workers=undefined');
  });

  it('[AC:spec-19-3] testing-review says deletions and shared test tooling take the one serial lane', () => {
    const text = section(REVIEW, 'Test changes');
    expect(text).toContain('Specs that delete tests or change shared test tooling (runner config, guards, selection lists) take the one serial lane (`execution.parallel: false`); other test-only specs may run in parallel.');
  });

  it('[AC:spec-19-4] every-spec words grow by at most 15 and on-demand words stay inside their cap', () => {
    const guard = readFileSync(join(root, 'tests', 'payload-guard.test.ts'), 'utf8');
    const block = guard.slice(guard.indexOf('export const EVERY_SPEC_FILES'), guard.indexOf('export const EVERY_SPEC_CAP'));
    const everySpec = [...block.matchAll(/^\s+'([^']+)':/gm)].map(([, path]) => path);
    expect(everySpec).toHaveLength(12);
    expect(everySpec.reduce((sum, path) => sum + words(raw(path)), 0) - EVERY_SPEC_BEFORE).toBeLessThanOrEqual(15);
    const text = (readdirSync(join(root, 'payload'), { recursive: true }) as string[]).map((path) => path.split('\\').join('/'))
      .filter((path) => /^\.agents\/skills\/joycraft-[^/]+\/SKILL\.md$|^\.claude\/agents\/[^/]+\.md$|^\.joycraft\/references\/.+\.md$/.test(path));
    const onDemand = text.filter((path) => !everySpec.includes(path)).reduce((sum, path) => sum + words(raw(path)), 0);
    // The on-demand cap is +3,500 since decision `on-demand-budget` = `plus-1500`.
    expect(onDemand).toBeLessThanOrEqual(17663 + 3500);
  });
});

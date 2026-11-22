import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-test-release/specs/18-fault-proof-text.md
const root = join(__dirname, '..');
const raw = (path: string) => readFileSync(join(root, 'payload', path), 'utf8');
const flat = (path: string) => raw(path).replace(/\s+/g, ' ');
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

/** The guard's EVERY_SPEC_FILES paths and its on-demand cap (decision `on-demand-budget` = `plus-1500`: +3,500). */
const guard = () => {
  const source = readFileSync(join(root, 'tests', 'payload-guard.test.ts'), 'utf8');
  const block = source.slice(source.indexOf('export const EVERY_SPEC_FILES'), source.indexOf('export const EVERY_SPEC_CAP'));
  return { everySpec: [...block.matchAll(/^\s+'([^']+)':/gm)].map(([, path]) => path), onDemandCap: 17663 + 3500 };
};

// The guard's every-spec count at the commit before this spec (08beda2), plus later growth:
// spec 19 (lane-cap) added 7 words (a class-1 change).
const EVERY_SPEC_BEFORE = 12139 + 7;

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

/** A git project with one source file and a passing check; `.joycraft/local/` is git-ignored. */
function project() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-fault-proof-')));
  dirs.push(dir);
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: dir, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  writeFileSync(join(dir, '.gitignore'), '.joycraft/local/\n');
  writeFileSync(join(dir, 'sum.mjs'), 'export const sum = (a, b) => a + b;\n');
  writeFileSync(join(dir, 'check.mjs'), "import { sum } from './sum.mjs';\nif (sum(2, 3) !== 5) process.exit(1);\n");
  git('add', '-A'); git('commit', '-q', '-m', 'base');
  writeFileSync(join(dir, 'sum.mjs'), 'export const sum = (a, b) => a - b;\n');
  const fault = git('diff');
  git('checkout', '--', 'sum.mjs');
  const run = (patch: string, receipt: string) => spawnSync(process.execPath,
    [evidence, 'run', '--patch', patch, '--receipt', receipt, '--', process.execPath, 'check.mjs'], { cwd: dir, encoding: 'utf8' });
  return { dir, fault, run, status: () => git('status', '--porcelain') };
}

describe('fault proof text', () => {
  it('[AC:spec-18-1] testing-review has a test-only section: saved patches, --patch runs, timeouts are not fails, tests-only diff', () => {
    const text = section(REVIEW, 'Test-only specs');
    expect(text).toContain('--patch');
    expect(text).toContain('A timeout or a build error is not a fail');
    expect(text).toContain('git diff --name-only');
    expect(text).toContain('before it edits the test file');
    expect(text).toContain('A fault counts only when the old file fails on it');
    expect(text).toContain('the new file, or a named kept test');
    expect(text).toContain('changes tests, fixtures and test lists only');
    expect(text).toContain('A seam or a fix that the tests need goes first, in its own spec');
  });

  it('[AC:spec-18-2] the reviewer reruns one saved fault and one of its own, blocks only on a lost catch, and states the limit', () => {
    const text = section(REVIEW, 'Test-only specs');
    expect(text).toContain('one saved fault and one of its own, in a tree it may change and restore');
    expect(text).toContain('Block only when the old file catches a fault that the new file misses; any other survivor is a finding');
    expect(text).toContain('"the chosen faults are still caught; this does not show the test is as strong as before."');
    expect(text).toContain("A reviewer that shares the coordinator's tree runs no fault: it reads the saved receipts and states that as a limit");
  });

  it('[review-18-1] faults are chosen with intent: one per removed or changed assertion; the reviewer aims its own at a removed one', () => {
    const text = section(REVIEW, 'Test-only specs');
    expect(text).toContain('one fault per assertion or behavior the diff removes or changes');
    expect(text).toContain('kill-set preservation');
    expect(text).toContain('It aims its own fault at an assertion or behavior the diff removed');
  });

  it('[review-18-2] each patch sha256 is recorded before the test edit; the reviewer checks old-run revision and patch sha256', () => {
    const text = section(REVIEW, 'Test-only specs');
    expect(text).toContain("Before the test edit, it records each patch's sha256 in the spec or in a committed list");
    expect(text).toContain('old-run receipt carries the base revision and the same patch sha256 as the new runs');
  });

  it('[review-18-3] the reviewer keeps its own patches and receipts git-ignored; only final report receipts go in the feature folder', () => {
    const text = section(REVIEW, 'Test-only specs');
    expect(text).toContain('Its own patches and receipts go in a git-ignored path');
    expect(text).toContain('only the final report receipts go in the feature folder, after its last fault run');
  });

  it('[review-18-4] a reviewer in a separate tree gets the patches through a commit of the patch files or its packet', () => {
    expect(section(REVIEW, 'Test-only specs')).toContain('A reviewer in a separate tree gets the patches through a commit of the patch files (not the receipts) or through its packet');
  });

  it('[review-18-5] the test edit is committed before faults rerun on it; the reviewer checks out the base for the old file', () => {
    const text = section(REVIEW, 'Test-only specs');
    expect(text).toContain('Commits the test edit before it reruns the faults on it');
    expect(text).toContain('checks out the base to run the old file on it');
  });

  it('[AC:spec-18-3] testing.md drops the isolated temporary copy; verify and both agents point to the test-only section', () => {
    const testing = flat('.joycraft/references/testing.md');
    expect(testing).not.toContain('isolated temporary copy');
    expect(testing).toContain('a fault runs in place only through `evidence.mjs run --patch`');
    for (const path of ['.agents/skills/joycraft-verify/SKILL.md', '.claude/agents/joycraft-reviewer.md', '.claude/agents/joycraft-implementer.md']) {
      expect(raw(path).match(/testing-review\.md#test-only-specs/g), path).toHaveLength(1);
    }
  });

  it('[AC:spec-18-4] every-spec words grow by at most 20 and on-demand words stay inside their cap', () => {
    const { everySpec, onDemandCap } = guard();
    expect(everySpec).toHaveLength(12);
    const everySpecWords = everySpec.reduce((sum, path) => sum + words(raw(path)), 0);
    expect(everySpecWords - EVERY_SPEC_BEFORE).toBeLessThanOrEqual(20);
    const all = (readdirSync(join(root, 'payload'), { recursive: true }) as string[]).map((path) => path.split('\\').join('/'))
      .filter((path) => /^\.agents\/skills\/joycraft-[^/]+\/SKILL\.md$|^\.claude\/agents\/[^/]+\.md$|^\.joycraft\/references\/.+\.md$/.test(path));
    const onDemandWords = all.filter((path) => !everySpec.includes(path)).reduce((sum, path) => sum + words(raw(path)), 0);
    expect(onDemandWords).toBeLessThanOrEqual(onDemandCap);
  });

  it('[AC:spec-18-5] fault patches and receipts go in a git-ignored path: there --patch runs and restores; an untracked patch is refused', () => {
    expect(section(REVIEW, 'Test-only specs')).toContain('Patches and their receipts go in a git-ignored path such as `.joycraft/local/faults/`, or are committed first');
    const { dir, fault, run, status } = project();
    mkdirSync(join(dir, '.joycraft', 'local', 'faults'), { recursive: true });
    writeFileSync(join(dir, '.joycraft/local/faults/sum.diff'), fault);
    const caught = run('.joycraft/local/faults/sum.diff', '.joycraft/local/faults/sum-old.log');
    expect(caught.status, caught.stderr).toBe(1);
    expect(JSON.parse(caught.stdout).patch).toMatchObject({ patched: true, restored: true });
    expect(status()).toBe('');
    writeFileSync(join(dir, 'sum.diff'), fault);
    const refused = run('sum.diff', '.joycraft/local/faults/sum-untracked.log');
    expect(refused.status).toBe(2);
    expect(refused.stderr).toMatch(/refuses a dirty tree/);
  });
});

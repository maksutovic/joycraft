import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-test-release/specs/21-test-review-cleanup.md
const root = join(__dirname, '..');
const raw = (path: string) => readFileSync(join(root, 'payload', path), 'utf8');
const REVIEW = '.joycraft/references/testing-review.md';
const ARTIFACTS = '.joycraft/references/artifacts.md';
const evidence = join(root, 'payload', '.joycraft', 'runtime', 'evidence.mjs');

/** The text of one `## <name>` section of a payload file, whitespace flattened. */
const section = (path: string, name: string) => {
  const text = raw(path);
  const start = text.indexOf(`\n## ${name}\n`);
  expect(start, `${path} has ## ${name}`).toBeGreaterThan(-1);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end < 0 ? undefined : end).replace(/\s+/g, ' ');
};

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

/** A git project with a one-file "suite" that the review's measure step runs through evidence. */
function suiteProject() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-test-review-')));
  dirs.push(dir);
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: dir, stdio: 'ignore' });
  git('init', '-q', '-b', 'main');
  writeFileSync(join(dir, '.gitignore'), 'receipts/\n');
  writeFileSync(join(dir, 'suite.mjs'), "console.log('1 file passed in 12 ms');\n");
  git('add', '-A'); git('commit', '-q', '-m', 'init');
  return dir;
}

describe('test review as the cleanup path', () => {
  it('[AC:spec-21-1] measures the full suite once through evidence.mjs with its run facts, then ranks by what every run pays and finds CI-keyed controls and nested runners', () => {
    const measure = section(REVIEW, 'Measure first');
    expect(measure).toContain('Run the full suite one time');
    expect(measure).toContain('`node .joycraft/runtime/evidence.mjs run --receipt <path>.log -- <full suite command>`');
    for (const fact of ['`load`', '`cores`', '`loaded`']) expect(measure).toContain(fact);
    const find = section(REVIEW, 'Find');
    const rankEvery = find.indexOf('what every run pays first');
    const rankSlow = find.indexOf('Then rank by the slowest file');
    expect(rankEvery).toBeGreaterThan(-1);
    expect(rankSlow).toBeGreaterThan(rankEvery);
    expect(find).toContain('A control keyed on `CI`');
    expect(find).toContain('Key it on `JOYCRAFT_EVIDENCE`');
    expect(find).toContain('A test that starts a nested test runner');
    // The command the review names prints the run facts it asks the agent to report.
    const dir = suiteProject();
    const run = spawnSync(process.execPath, [evidence, 'run', '--receipt', 'receipts/full.log', '--', process.execPath, 'suite.mjs'], { cwd: dir, encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);
    const { facts } = JSON.parse(run.stdout);
    expect(facts).toEqual(expect.objectContaining({ wallMs: expect.any(Number), cores: expect.any(Number) }));
    expect(facts).toHaveProperty('load');
    expect(facts).toHaveProperty('loaded');
    expect(readFileSync(join(dir, 'receipts/full.log'), 'utf8')).toContain('1 file passed');
  });

  it('[AC:spec-21-2] Apply writes approved changes as test-only specs for the queue, a deletion names its claim and the owner yes, and times are reported before and after', () => {
    const apply = section(REVIEW, 'Apply');
    expect(apply).toContain('[test-only spec](#test-only-specs) for a queue');
    expect(apply).toContain('A deletion names the claim the test protected');
    expect(apply).toContain("the owner's yes");
    expect(apply).toContain('before and after');
    expect(apply).toContain('The review itself edits no test.');
    expect(raw(REVIEW).replace(/\s+/g, ' ')).toContain('Unattended cleanup never asks, and never edits or deletes a test.');
    expect(raw(REVIEW)).toContain('\n## Test-only specs\n');
  });

  it('[AC:spec-21-3] artifacts.md offers a time limit or a result cache only after a measurement, where decision options are written', () => {
    const text = raw(ARTIFACTS);
    const options = text.indexOf('**Order for a consequential choice**');
    const wordsAt = text.indexOf('**Words.**');
    const rule = text.indexOf('a time limit or a result cache is offered only\nafter a measurement');
    expect(rule).toBeGreaterThan(options);
    expect(rule).toBeLessThan(wordsAt);
    expect(text.replace(/\s+/g, ' ')).toContain('after a measurement');
  });
});

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-test-release/specs/17-test-changes-text.md
const root = join(__dirname, '..');
const raw = (path: string) => readFileSync(join(root, 'payload', path), 'utf8');
const flat = (path: string) => raw(path).replace(/\s+/g, ' ');
const runtime = join(root, 'payload', '.joycraft', 'runtime', 'test-changes.mjs');
const TEMPLATE = '.joycraft/templates/spec.md';
const REVIEW = '.joycraft/references/testing-review.md';
const VERIFY = '.agents/skills/joycraft-verify/SKILL.md';
const REVIEWER = '.claude/agents/joycraft-reviewer.md';
const DECOMPOSE = '.agents/skills/joycraft-decompose/SKILL.md';
const OLD = 'a changed expected value with no reason in the spec is a blocking finding';

/** The text of one `## <name>` section of a payload file, whitespace flattened. */
const section = (path: string, name: string) => {
  const text = raw(path);
  const start = text.indexOf(`\n## ${name}\n`);
  expect(start, `${path} has ## ${name}`).toBeGreaterThan(-1);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end < 0 ? undefined : end).replace(/\s+/g, ' ');
};

const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

/** A git project whose one spec is the shipped template with `testChanges` as its section body; tests/a and tests/b then change. */
function changedProject(testChanges: (body: string) => string) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-text-test-changes-')));
  dirs.push(dir);
  git(dir, 'init', '-q', '-b', 'main');
  const folder = 'docs/features/2026-11-21-f';
  const spec = `${folder}/specs/01-a.md`;
  put(join(dir, spec), testChanges(raw(TEMPLATE)).replace('status: todo', 'status: in-review'));
  for (const file of ['tests/a.test.ts', 'tests/b.test.ts']) put(join(dir, file), 'expect(1).toBe(1);\n');
  const queue = `${folder}/specs/.joycraft-spec-queue.json`;
  put(join(dir, queue), JSON.stringify({ schemaVersion: 1, feature: 'f', specs: [{ id: 1, file: '01-a.md', depends_on: [], status: 'in-review', mode: 'checkpoint',
    verification: { inputs: [{ path: spec, kind: 'requirement' }, { path: 'tests/a.test.ts', kind: 'check' }],
      criteria: [{ id: 'spec-1-1', requirement: { path: spec, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }] }));
  git(dir, 'add', '-A'); git(dir, 'commit', '-q', '-m', 'base');
  const base = git(dir, 'rev-parse', 'HEAD');
  for (const file of ['tests/a.test.ts', 'tests/b.test.ts']) put(join(dir, file), 'expect(1).toBe(2);\n');
  const result = spawnSync(process.execPath, [runtime, '--queue', queue, '--spec', '1', '--base', base, '--root', dir], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

/** The template's example bullet, inside the Test changes section's fence. */
const exampleBullet = () => {
  const match = /```\n(- `[^`]+` class [123][^\n]*)\n```/.exec(raw(TEMPLATE));
  expect(match, 'template example bullet').not.toBeNull();
  return match![1];
};

describe('declared test changes text', () => {
  it('[AC:spec-17-1] the spec template has ## Test changes with "none" and the three classes, and test-changes.mjs parses its example bullet', () => {
    const text = section(TEMPLATE, 'Test changes');
    for (const phrase of ['none', '1 spec-mandated', '2 same claim, changed test', '3 deleted, skipped or out of the gate', 'a fault proof per file', 'a ledger row and an owner yes per batch', 'the acceptance line states the new value']) {
      expect(text).toContain(phrase);
    }
    // The fenced example is guidance: a spec that keeps the template as written declares nothing.
    expect(changedProject((template) => template)).toMatchObject({ declared: [], undeclared: ['tests/a.test.ts', 'tests/b.test.ts'] });
    // The example bullet, written as the section body, declares tests/a.test.ts as class 1; tests/b.test.ts stays undeclared.
    const bullet = exampleBullet();
    const result = changedProject((template) => template.replace(/(## Test changes\n)[\s\S]*?(\n## )/, `$1\n${bullet}\n$2`));
    expect(result.declared).toEqual([{ path: 'tests/a.test.ts', class: 1 }]);
    expect(result.undeclared).toEqual(['tests/b.test.ts']);
  });

  it('[AC:spec-17-2] testing-review owns the reviewer rules in its ## Test changes section', () => {
    const text = section(REVIEW, 'Test changes');
    for (const rule of [
      'Read `testChanges` from startup',
      'Block only an undeclared change that no line requires.',
      'A class-1 change passes when its acceptance line states the new value',
      "A red or flaky test outside the spec's set is a follow-up, never a hold.",
      'A changed test that reads a path under the features folder',
      'is a follow-up finding',
      'A declaration of either path of a rename covers both.',
    ]) expect(text).toContain(rule);
  });

  it('[review-17-1] a declaration covers only its named change; a missing list, a rename and a required deletion have their rules', () => {
    const text = section(REVIEW, 'Test changes');
    for (const rule of [
      'A declaration covers only the change its requiring line names and its class proves; anything else in the diff of that file is undeclared.',
      'A class-1 line that does not state the new value, or a bullet with no requiring line, declares nothing.',
      'A deletion, even when required, needs the class-3 ledger row and owner yes.',
      'A declaration added after the base (`addedAfterBase`) counts only with a requiring acceptance line that existed at the base.',
      'A missing `testChanges` is never "none": run `node .joycraft/runtime/test-changes.mjs',
      '--base <captured base>` or ask the coordinator.',
      'Pair the two paths with `git diff -M <base>`; a rename that drops assertions is class 3.',
    ]) expect(text).toContain(rule);
  });

  it('[AC:spec-17-3] verify, reviewer and decompose point to testing-review.md#test-changes; the old blocking sentence is gone', () => {
    for (const path of [VERIFY, REVIEWER]) expect(flat(path)).not.toContain(OLD);
    for (const path of [VERIFY, REVIEWER, DECOMPOSE]) expect(raw(path)).toContain('testing-review.md#test-changes');
    const decompose = flat(DECOMPOSE);
    expect(decompose).toContain("Write each spec's `## Test changes` section");
    expect(decompose).toContain('when a brief\'s "no weakened tests" contradicts the feature, ask once.');
  });
});

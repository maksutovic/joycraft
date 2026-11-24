import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-test-release/specs/22-fewer-better-tests.md
const root = join(__dirname, '..');
const raw = (path: string) => readFileSync(join(root, 'payload', path), 'utf8');
const flat = (path: string) => raw(path).replace(/\s+/g, ' ');
const IMPLEMENT = '.agents/skills/joycraft-implement/SKILL.md';
const IMPLEMENTER = '.claude/agents/joycraft-implementer.md';

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

/** A committed git copy of the shipped payload, searched with `git grep` as a project would. */
function payloadRepo() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-fewer-tests-')));
  dirs.push(dir);
  cpSync(join(root, 'payload'), dir, { recursive: true });
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: dir, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('add', '-A'); git('commit', '-q', '-m', 'payload');
  return (phrase: string) => { try { return git('grep', '-l', '-F', phrase).trim().split('\n'); } catch { return []; } };
}

describe('fewer, sharper tests text', () => {
  it('[AC:spec-22-1] the implement skill and the implementer allow one test for several checks, prefer the existing file and want a failing test first', () => {
    for (const path of [IMPLEMENT, IMPLEMENTER]) {
      const text = flat(path);
      expect(text, path).not.toMatch(/one focused test per acceptance/);
      expect(text, path).toContain('existing test file');
      expect(text, path).toContain('fails before');
      expect(text, path).toContain('several checks');
    }
    // The skill is the only carrier on every host but Claude: it states the whole fail-first rule and the fewer-tests default.
    const skill = flat(IMPLEMENT);
    expect(skill).toContain('A new acceptance test fails before the code exists.');
    expect(skill).toContain('Add a test only when it can fail for a reason no existing test can');
    expect(skill).toContain('one test may carry several `[AC:]` tags');
    expect(skill).toContain('Do not commit tests of one-off run state');
  });

  // Spec: .joycraft/local/loop/iter4/specs.md, sl3-04 (no red-run receipt).
  it('[AC:sl3-04-no-receipt] neither text asks for a red-run receipt; both keep fails before the code exists', () => {
    for (const path of [IMPLEMENT, IMPLEMENTER]) {
      const text = flat(path);
      expect(text, path).not.toContain('receipt comes first');
      expect(text, path).not.toContain('receipt first');
      expect(text, path).toContain('fails before the code exists');
    }
  });

  it('[AC:spec-22-2] the spec template asks each user-flow check for the real boundary or the mocked one under Not covered', () => {
    const acceptance = section('.joycraft/templates/spec.md', 'acceptance');
    expect(acceptance).toContain('real boundary');
    expect(acceptance).toContain('mocked boundary under "Not covered"');
  });

  it('[AC:spec-22-3] testing.md forbids a special case for a test input; the test review counts a new skip in a file or a list as a removal', () => {
    expect(flat('.joycraft/references/testing.md')).toContain("or a special case for a test's input");
    const changes = section('.joycraft/references/testing-review.md', 'Test changes');
    expect(changes).toContain('in a file or a list');
    expect(changes).toMatch(/a test that leaves the gate count as removals \(class 3\)/);
  });

  it('[AC:spec-22-5] the two rules spec 1 cut are back in the payload', () => {
    const grep = payloadRepo();
    expect(grep('Do not commit tests of one-off run state')).toEqual(expect.arrayContaining([IMPLEMENTER, IMPLEMENT]));
    expect(grep('conflicts with a later owner decision')).toContain('.joycraft/references/testing-review.md');
  });
});

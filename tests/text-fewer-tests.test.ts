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
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** The every-spec file list, read from the guard's EVERY_SPEC_FILES block. */
const everySpecFiles = () => {
  const guard = readFileSync(join(root, 'tests', 'payload-guard.test.ts'), 'utf8');
  const block = guard.slice(guard.indexOf('export const EVERY_SPEC_FILES'), guard.indexOf('export const EVERY_SPEC_CAP'));
  return [...block.matchAll(/^\s+'([^']+)':/gm)].map(([, path]) => path);
};

/** The text of one `## <name>` section of a payload file, whitespace flattened. */
const section = (path: string, name: string) => {
  const text = raw(path);
  const start = text.indexOf(`\n## ${name}\n`);
  expect(start, `${path} has ## ${name}`).toBeGreaterThan(-1);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end < 0 ? undefined : end).replace(/\s+/g, ' ');
};

// Counts at the commit before this spec (40d0029). Spec 18 (fault-proof) later added 18 every-spec words: a class-1 change.
const BEFORE = { implement: 1329, everySpec: 12142 + 18 };

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
    expect(flat(IMPLEMENTER)).toContain('receipt first');
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

  it('[AC:spec-22-4] the implement skill and the every-spec text do not grow', () => {
    expect(words(raw(IMPLEMENT))).toBeLessThanOrEqual(BEFORE.implement);
    const files = everySpecFiles();
    expect(files.length).toBe(12);
    const everySpec = files.reduce((sum, path) => sum + words(raw(path)), 0);
    expect(everySpec).toBeLessThanOrEqual(BEFORE.everySpec);
  });

  it('[AC:spec-22-5] the two rules spec 1 cut are back in the payload', () => {
    const grep = payloadRepo();
    expect(grep('Do not commit tests of one-off run state')).toContain(IMPLEMENTER);
    expect(grep('conflicts with a later owner decision')).toContain('.joycraft/references/testing-review.md');
  });
});

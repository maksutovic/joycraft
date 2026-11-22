import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Specs: docs/features/2026-11-21-test-release/specs/24-archive-tests-text.md and 32-archive-list-followups.md
const root = join(__dirname, '..');
const payload = join(root, 'payload');
const raw = (path: string) => readFileSync(join(payload, path), 'utf8');
const ARCHIVE = '.joycraft/references/archive.md';
const SKILL = '.agents/skills/joycraft-session-end/SKILL.md';
const REVIEW = '.joycraft/references/testing-review.md';

/** The paragraph of a payload file that holds `needle`, whitespace flattened. */
const paragraph = (path: string, needle: string) => {
  const found = raw(path).split(/\n\s*\n/).filter(each => each.includes(needle));
  expect(found, `${path} has one paragraph with ${needle}`).toHaveLength(1);
  return found[0].replace(/\s+/g, ' ');
};

const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? files(full) : [full];
});

describe('archive tests text (spec 24)', () => {
  it('[AC:spec-24-1] archive.md has one paragraph on namedFiles, migrations and the red path', () => {
    const text = paragraph(ARCHIVE, '`namedFiles`');
    expect(text).toMatch(/comment needs no change/);
    expect(text).toMatch(/After `--apply`, change the folder path in each listed test that reads the folder, and nothing else in it/);
    expect(text).toMatch(/Never edit an applied migration/);
    expect(text).toMatch(/receipt stale/);
    expect(text).toMatch(/push is refused/);
    expect(text).toMatch(/one feature per commit/);
    expect(text).toMatch(/move the folder back, delete the archive record folder, restore the changed files with Git until `git status` prints nothing/);
    expect(text).toMatch(/not archived/);
    expect(text).toMatch(/built in pieces from a variable is not listed/);
    expect(text.split(' ').length).toBeLessThanOrEqual(115);
  });

  it('[AC:spec-32-3] a second short archive.md paragraph after the spec 24 one covers the skip and no-gate steps', () => {
    const text = paragraph(ARCHIVE, 'more than a path change');
    expect(text).toMatch(/no gate recorded/i);
    expect(text).toMatch(/asserts/);
    expect(text.trim().split(' ').length).toBeLessThanOrEqual(45);
    const blocks = raw(ARCHIVE).split(/\n\s*\n/);
    const first = blocks.findIndex(each => each.includes('`namedFiles`'));
    expect(blocks[first + 1]).toContain('more than a path change');
  });

  it('[AC:spec-24-2] the session-end skill fixes the listed tests and commits them with the move', () => {
    const text = paragraph(SKILL, 'docs: archive <slug>');
    expect(text).toMatch(/After `--apply`, fix the tests the preview listed in `namedFiles` \(see the archive guidance\), then commit the move and those edits in their own commit, `docs: archive <slug>`\./);
    expect(text).not.toMatch(/--rewrite/);
  });

  it('[AC:spec-24-3] testing-review names the archive exception and the featurePaths fix', () => {
    const opening = paragraph(REVIEW, 'never edits or deletes a test');
    expect(opening).toMatch(/exception: at archive, session end may change a folder path in a listed test/);
    const item = paragraph(REVIEW, '(`featurePaths`)');
    expect(item).toMatch(/\(`featurePaths`\) is a follow-up finding; the fix is to move the file the test reads out of the feature folder/);
  });

  it('[AC:spec-24-4] no file under payload/ names --rewrite', () => {
    const named = files(payload).filter(file => readFileSync(file, 'utf8').includes('--rewrite'));
    expect(named).toEqual([]);
  });
});

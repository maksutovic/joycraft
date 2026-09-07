import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  applyGitignoreProfile,
  planGitignoreProfile,
  PRIVATE_PROFILE_IGNORES,
  JOYCRAFT_LOCAL_DIR,
} from '../src/gitignore';
import { STATE_PATH } from '../src/version';
import { TELEMETRY_PATH } from '../src/telemetry-store';
import {
  applyGitattributes,
  GITATTRIBUTES_COMMENT,
  GITATTRIBUTES_ENTRIES,
  planGitattributes,
} from '../src/gitattributes';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'joycraft-profile-plan-'));
}

describe('pure gitignore profile planning', () => {
  it('returns the complete shared append without writing', () => {
    const plan = planGitignoreProfile('', 'shared');
    expect(plan.added).toEqual([STATE_PATH, TELEMETRY_PATH, JOYCRAFT_LOCAL_DIR]);
    expect(plan.content).toBe(`${plan.added.join('\n')}\n`);
  });

  it('preserves user lines and returns only missing private entries', () => {
    const current = 'node_modules/\n.claude/\nuser-rule\n';
    const plan = planGitignoreProfile(current, 'private');
    expect(plan.content.startsWith(current)).toBe(true);
    expect(plan.added).not.toContain('.claude/');
    expect(plan.added).toEqual(expect.arrayContaining(PRIVATE_PROFILE_IGNORES.filter((entry) => entry !== '.claude/')));
    expect(plan.content).toContain('user-rule\n');
  });

  it('is idempotent and leaves bytes unchanged when complete', () => {
    const first = planGitignoreProfile('user-rule', 'shared');
    const second = planGitignoreProfile(first.content, 'shared');
    expect(second.added).toEqual([]);
    expect(second.content).toBe(first.content);
  });

  it('keeps the mutating helper exactly in parity with the pure plan', () => {
    const root = tempDir();
    try {
      const current = 'user-rule';
      writeFileSync(join(root, '.gitignore'), current);
      const expected = planGitignoreProfile(current, 'private');
      const added = applyGitignoreProfile(root, 'private');
      expect(added).toEqual(expected.added);
      expect(readFileSync(join(root, '.gitignore'), 'utf8')).toBe(expected.content);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not create a file from a pure plan', () => {
    const root = tempDir();
    try {
      planGitignoreProfile('', 'private');
      expect(existsSync(join(root, '.gitignore'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('pure gitattributes planning', () => {
  it('returns the comment and all entries when absent without writing', () => {
    const plan = planGitattributes('');
    expect(plan.added).toEqual([...GITATTRIBUTES_ENTRIES]);
    expect(plan.content).toBe(`${GITATTRIBUTES_COMMENT}\n${GITATTRIBUTES_ENTRIES.join('\n')}\n`);
  });

  it('preserves user lines and does not duplicate the comment or entries', () => {
    const current = `*.png binary\n${GITATTRIBUTES_COMMENT}\n${GITATTRIBUTES_ENTRIES[0]}\n`;
    const plan = planGitattributes(current);
    expect(plan.content.startsWith(current)).toBe(true);
    expect(plan.added).toEqual(GITATTRIBUTES_ENTRIES.slice(1));
    const complete = planGitattributes(plan.content);
    expect(complete.added).toEqual([]);
    expect(complete.content).toBe(plan.content);
  });

  it('keeps the mutating helper exactly in parity with the pure plan', () => {
    const root = tempDir();
    try {
      const current = '*.pdf diff=astextplain';
      writeFileSync(join(root, '.gitattributes'), current);
      const expected = planGitattributes(current);
      const added = applyGitattributes(root);
      expect(added).toEqual(expected.added);
      expect(readFileSync(join(root, '.gitattributes'), 'utf8')).toBe(expected.content);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

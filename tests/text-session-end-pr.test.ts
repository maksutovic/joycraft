import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-test-release/specs/25-session-end-pr.md
const root = join(__dirname, '..');
const skill = readFileSync(join(root, 'payload', '.agents', 'skills', 'joycraft-session-end', 'SKILL.md'), 'utf8');
const flat = skill.replace(/\s+/g, ' ');

describe('session end rides the PR', () => {
  it('[AC:spec-25-1] opens with the clean-tree check, before the first runtime command, and commits nothing of the user\'s', () => {
    const check = skill.indexOf('git status --porcelain');
    const firstRuntime = skill.indexOf('.joycraft/runtime/');
    expect(check).toBeGreaterThan(-1);
    expect(firstRuntime).toBeGreaterThan(check);
    expect(flat).toMatch(/fix nothing, commit nothing of the user's/);
  });

  it('[AC:spec-25-2] runs records, the one tidy commit, prune, archive last, then one push', () => {
    const steps = ['status.mjs', 'tidy --verify', 'worktrees.mjs prune', 'archive.mjs archive', 'one push that carries'];
    const at = steps.map(step => flat.indexOf(step));
    for (const [i, step] of steps.entries()) expect(at[i], step).toBeGreaterThan(-1);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(flat).toContain('Never archive a feature whose question the user asked to wait');
  });

  it('[AC:spec-25-3] after merge it only says the next session start checks, read-only; no post-merge machinery', () => {
    expect(flat).toMatch(/next session start checks, read-only, that the change deployed and works/);
    expect(flat).not.toMatch(/post-merge|merged-PR detector|sessionEnd\.commits/i);
  });

  it('[AC:spec-25-4] the session-end skill is on-demand text, so the reorder cannot grow every-spec words', () => {
    // The guard's EVERY_SPEC_FILES block, read as text: importing a test file would rerun its tests here.
    const guard = readFileSync(join(root, 'tests', 'payload-guard.test.ts'), 'utf8');
    const block = guard.slice(guard.indexOf('export const EVERY_SPEC_FILES'), guard.indexOf('export const EVERY_SPEC_CAP'));
    expect(block).toContain('joycraft-implement/SKILL.md');
    expect(block).not.toContain('joycraft-session-end');
  });
});

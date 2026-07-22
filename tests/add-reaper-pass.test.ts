import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const OPTIMIZE_SKILL = join(
  repoRoot,
  '.claude',
  'skills',
  'joycraft-optimize',
  'SKILL.md',
);

const read = (p: string) => readFileSync(p, 'utf-8');
const content = () => read(OPTIMIZE_SKILL);

describe('add-reaper-pass: two paths present', () => {
  it('references shipped-path eligibility marker "reap: eligible"', () => {
    expect(content()).toContain('reap: eligible');
  });

  it('references the gh merge-verification command', () => {
    expect(content()).toMatch(/gh pr/);
  });

  it('references git rm for the shipped-delete path', () => {
    expect(content()).toMatch(/git rm/);
  });

  it('references the archive destination for the undead path', () => {
    expect(content()).toContain('docs/archive/features/');
  });
});

describe('add-reaper-pass: merge verification required before delete', () => {
  it('checks for MERGED state before any deletion instruction', () => {
    const c = content();
    const ghIdx = c.search(/gh pr view.*--json state|gh pr[\s\S]*MERGED/);
    expect(ghIdx).toBeGreaterThan(-1);
    expect(c).toMatch(/MERGED/);
    const mergedIdx = c.indexOf('MERGED');
    const gitRmIdx = c.indexOf('git rm');
    expect(gitRmIdx).toBeGreaterThan(-1);
    // the MERGED check must precede the git rm instruction in document order
    expect(mergedIdx).toBeLessThan(gitRmIdx);
  });
});

describe('add-reaper-pass: per-folder human approval', () => {
  it('states human approval is required on the shipped (delete) path', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/human approv/);
  });

  it('states approval is per folder / per run for the undead (archive) path', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/per folder/);
  });
});

describe('add-reaper-pass: never delete undead', () => {
  it('states undead folders are moved (archived), never deleted', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/never delete|never a candidate for (deletion|delete)/);
    expect(c).toMatch(/git mv/);
  });
});

describe('add-reaper-pass: live features excluded', () => {
  it('states live features (in-review specs / non-terminal brief status) are never candidates', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/in-review/);
    expect(c).toMatch(/never.*candidate|not a candidate/);
  });
});

describe('add-reaper-pass: PILOT marker retained', () => {
  it('the skill file still carries a PILOT divergence marker', () => {
    expect(content()).toMatch(/<!--\s*PILOT:/);
  });
});

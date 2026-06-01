import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, '..', 'src', 'claude-skills');

// joycraft-decompose migrated to the unified `todo → in-review → done`
// vocabulary (spec: execution-modes-in-decompose). joycraft-research and
// joycraft-new-feature still use the pre-unification wording; their filter
// migration is tracked separately. Each skill is asserted against the
// vocabulary it actually uses today.
const LEGACY_VOCAB_SKILLS = ['joycraft-research.md', 'joycraft-new-feature.md'];

describe('skill status filtering', () => {
  // Shared contract: every scanning skill skips some terminal states and
  // treats docs/archive/ as out-of-scope.
  for (const skill of [...LEGACY_VOCAB_SKILLS, 'joycraft-decompose.md']) {
    it(`${skill} instructs skipping/ignoring by status`, () => {
      const content = readFileSync(join(skillsDir, skill), 'utf-8');
      expect(content.toLowerCase()).toMatch(/skip|ignore|filter/);
      // deprecated/superseded are terminal in both the old and new vocab.
      expect(content).toMatch(/deprecated|superseded/);
    });

    it(`${skill} mentions docs/archive/ as out-of-scope`, () => {
      const content = readFileSync(join(skillsDir, skill), 'utf-8');
      expect(content).toContain('docs/archive/');
    });
  }

  // Legacy-vocabulary skills: still treat undecided files as `status: active`
  // and skip `shipped`.
  for (const skill of LEGACY_VOCAB_SKILLS) {
    it(`${skill} uses the pre-unification vocabulary (status: active / shipped)`, () => {
      const content = readFileSync(join(skillsDir, skill), 'utf-8');
      expect(content).toContain('status: active');
      expect(content).toMatch(/shipped/);
    });
  }

  // joycraft-decompose: unified vocabulary. The skip-set is exactly
  // done/deprecated/superseded; `in-review` is live (not skipped); the old
  // word `shipped` is gone.
  describe('joycraft-decompose uses the unified todo→in-review→done vocabulary', () => {
    const content = readFileSync(join(skillsDir, 'joycraft-decompose.md'), 'utf-8');

    it('skip-set is done/deprecated/superseded', () => {
      expect(content).toContain('done');
      expect(content).toContain('deprecated');
      expect(content).toContain('superseded');
    });

    it('does not reference the migrated-away word "shipped"', () => {
      expect(content).not.toContain('shipped');
    });

    it('treats in-review as live, not skipped', () => {
      expect(content).toMatch(/in-review/);
      expect(content).not.toMatch(/\b(skip|ignore)\b(?:(?!\bnot\b)[^.\n])*\bin-review\b/i);
    });
  });
});

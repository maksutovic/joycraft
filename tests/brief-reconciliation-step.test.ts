import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

const CANONICAL_FILES = [
  'src/skills/joycraft-design.md',
  'src/skills/joycraft-research.md',
];

const PER_HARNESS_FILES = [
  'src/claude-skills/joycraft-design.md',
  'src/codex-skills/joycraft-design.md',
  'src/pi-skills/joycraft-design.md',
  'src/claude-skills/joycraft-research.md',
  'src/codex-skills/joycraft-research.md',
  'src/pi-skills/joycraft-research.md',
];

const SECTIONS = [
  'Vision',
  'Hard Constraints',
  'Out of Scope',
  'Decomposition',
  'Test Strategy',
  'Success Criteria',
];

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8');
}

describe('brief reconciliation step', () => {
  describe('canonical skills', () => {
    for (const file of CANONICAL_FILES) {
      it(`${file} contains the "Reconcile brief with findings" step`, () => {
        const content = read(file);
        expect(content).toMatch(/Reconcile [Bb]rief [Ww]ith [Ff]indings/);
      });

      it(`${file} enumerates all 6 brief sections`, () => {
        const content = read(file);
        for (const section of SECTIONS) {
          expect(
            content,
            `Expected ${file} to mention brief section: ${section}`,
          ).toContain(section);
        }
      });

      it(`${file} mentions both "edit in place" and "diff" + "stop" criteria`, () => {
        const content = read(file);
        expect(content.toLowerCase()).toMatch(/edit in place/);
        expect(content.toLowerCase()).toMatch(/diff/);
        expect(content.toLowerCase()).toMatch(/stop/);
      });
    }

    it('joycraft-design.md places the reconciliation step OUTSIDE any harness conditional block', () => {
      const content = read('src/skills/joycraft-design.md');
      // Locate the reconciliation step and ensure no <!-- harness: ... --> tag
      // wraps it (the skill is universal — no harness blocks at all is fine).
      const idx = content.search(/Reconcile [Bb]rief [Ww]ith [Ff]indings/);
      expect(idx).toBeGreaterThan(-1);
      const before = content.slice(0, idx);
      const lastOpen = before.lastIndexOf('<!-- harness:');
      const lastClose = before.lastIndexOf('<!-- /harness');
      // If there is no harness block at all, both are -1 — that satisfies the
      // "outside" requirement. Otherwise the close must come after the open.
      expect(lastClose).toBeGreaterThanOrEqual(lastOpen);
    });
  });

  describe('per-harness regenerated skills', () => {
    for (const file of PER_HARNESS_FILES) {
      it(`${file} contains the reconciliation step`, () => {
        const content = read(file);
        expect(content).toMatch(/Reconcile [Bb]rief [Ww]ith [Ff]indings/);
      });
    }
  });

  describe('bundled-files.ts contains the regenerated content', () => {
    it('SKILLS bundle contains the reconciliation step in design and research', async () => {
      const mod = await import('../src/bundled-files.js');
      expect(mod.SKILLS['joycraft-design.md']).toMatch(
        /Reconcile [Bb]rief [Ww]ith [Ff]indings/,
      );
      expect(mod.SKILLS['joycraft-research.md']).toMatch(
        /Reconcile [Bb]rief [Ww]ith [Ff]indings/,
      );
    });

    it('CODEX_SKILLS bundle contains the reconciliation step in design and research', async () => {
      const mod = await import('../src/bundled-files.js');
      expect(mod.CODEX_SKILLS['joycraft-design.md']).toMatch(
        /Reconcile [Bb]rief [Ww]ith [Ff]indings/,
      );
      expect(mod.CODEX_SKILLS['joycraft-research.md']).toMatch(
        /Reconcile [Bb]rief [Ww]ith [Ff]indings/,
      );
    });
  });
});

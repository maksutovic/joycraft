import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const SOURCE_VARIANTS = [
  join(repoRoot, 'src', 'claude-skills', 'joycraft-session-end.md'),
  join(repoRoot, 'src', 'codex-skills', 'joycraft-session-end.md'),
  join(repoRoot, 'src', 'pi-skills', 'joycraft-session-end.md'),
];

const INSTALLED_COPIES = [
  join(repoRoot, '.claude', 'skills', 'joycraft-session-end', 'SKILL.md'),
  join(repoRoot, '.agents', 'skills', 'joycraft-session-end', 'SKILL.md'),
  join(repoRoot, '.pi', 'skills', 'joycraft-session-end', 'SKILL.md'),
];

const read = (p: string) => readFileSync(p, 'utf-8');
const label = (p: string) => p.split('/').slice(-3).join('/');

describe('session-end rescoped to feature finisher', () => {
  describe('graduates in-review → done in both systems', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} graduates in-review to done via mark-done --to done`, () => {
        const content = read(variant);
        expect(content).toContain('in-review');
        expect(content).toContain('done');
        expect(content).toMatch(/mark-done[^\n]*--to done/);
        // Both systems: queue (mark-done) and frontmatter.
        expect(content.toLowerCase()).toMatch(/frontmatter/);
      });
    }
  });

  describe('no longer sets shipped', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} does not instruct status: shipped for completion`, () => {
        const content = read(variant);
        expect(content).not.toMatch(/status:\s*shipped/);
        expect(content).not.toContain('shipped');
      });
    }
  });

  describe('validation kept and labeled the only gate', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} keeps validation and frames it as the (only) gate`, () => {
        const content = read(variant);
        const lower = content.toLowerCase();
        expect(lower).toMatch(/validation|validate|pnpm test|npm test/);
        expect(lower).toMatch(/only.*gate|mandatory|single.*validation gate/);
      });
    }
  });

  describe('consolidate-discoveries + context sweep kept', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} retains discovery consolidation and context-doc sweep`, () => {
        const content = read(variant);
        const lower = content.toLowerCase();
        expect(lower).toMatch(/discover/);
        expect(lower).toMatch(/consolidat|curate|expand.*stub/);
        expect(lower).toMatch(/context/);
      });
    }
  });

  describe('push + PR kept', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} retains push and PR steps`, () => {
        const content = read(variant);
        const lower = content.toLowerCase();
        expect(lower).toMatch(/push/);
        expect(lower).toMatch(/\bpr\b|pull request|gh pr create/);
      });
    }
  });

  describe('framed as a once-per-feature finisher', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} reads as a feature-level finisher, not per-session-after-each-spec`, () => {
        const content = read(variant);
        const lower = content.toLowerCase();
        expect(lower).toMatch(/feature finisher|once per feature|feature complete|once at the end|feature-level/);
      });
    }
  });

  describe('discovery frontmatter example does not use stale status word', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} does not seed a spec-status example of active/shipped`, () => {
        const content = read(variant);
        // The old discovery frontmatter example used `status: active`.
        expect(content).not.toMatch(/status:\s*active/);
      });
    }
  });

  describe('3-variant parity on the rescope', () => {
    const tokens = ['in-review', 'mark-done', 'done'];
    for (const token of tokens) {
      it(`every source variant contains "${token}"`, () => {
        for (const variant of SOURCE_VARIANTS) {
          expect(read(variant), `${label(variant)} missing "${token}"`).toContain(token);
        }
      });
    }
  });

  describe('installed copies synced to source variants', () => {
    for (let i = 0; i < SOURCE_VARIANTS.length; i++) {
      const src = SOURCE_VARIANTS[i];
      const installed = INSTALLED_COPIES[i];
      it(`${label(installed)} matches its source variant`, () => {
        expect(read(installed)).toBe(read(src));
      });
    }
  });
});

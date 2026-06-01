import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const SOURCE_VARIANTS = [
  join(repoRoot, 'src', 'claude-skills', 'joycraft-implement.md'),
  join(repoRoot, 'src', 'codex-skills', 'joycraft-implement.md'),
  join(repoRoot, 'src', 'pi-skills', 'joycraft-implement.md'),
];

const INSTALLED_COPIES = [
  join(repoRoot, '.claude', 'skills', 'joycraft-implement', 'SKILL.md'),
  join(repoRoot, '.agents', 'skills', 'joycraft-implement', 'SKILL.md'),
  join(repoRoot, '.pi', 'skills', 'joycraft-implement', 'SKILL.md'),
];

const read = (p: string) => readFileSync(p, 'utf-8');
const label = (p: string) => p.split('/').slice(-3).join('/');

describe('implement mode-aware hand-off', () => {
  describe('hand-off branches on the spec mode', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} reads mode frontmatter and names all three modes`, () => {
        const content = read(variant);
        expect(content).toMatch(/mode/);
        expect(content).toContain('batch');
        expect(content).toContain('checkpoint');
        expect(content).toContain('isolated');
        // It must say it reads the mode from the spec's frontmatter.
        expect(content.toLowerCase()).toMatch(/mode:?.*frontmatter|frontmatter.*mode|spec'?s `?mode/i);
      });
    }
  });

  describe('batch hand-off behavior', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} batch: continue in-conversation, session-end at the end`, () => {
        const content = read(variant).toLowerCase();
        expect(content).toMatch(/batch/);
        expect(content).toMatch(/next spec|continue/);
        expect(content).toMatch(/last spec|at the end|feature end|final spec/);
        expect(content).toMatch(/session-end/);
      });
    }
  });

  describe('checkpoint hand-off behavior', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} checkpoint: spec-done then continue`, () => {
        const content = read(variant).toLowerCase();
        expect(content).toMatch(/checkpoint/);
        expect(content).toMatch(/spec-done/);
        expect(content).toMatch(/continue|next spec/);
      });
    }
  });

  describe('isolated hand-off behavior + harness sub-cases', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} isolated: spec-done + fresh context + Pi/CC-interactive/CC-headless cases incl. ToS caveat`, () => {
        const content = read(variant);
        const lower = content.toLowerCase();
        expect(lower).toMatch(/isolated/);
        expect(lower).toMatch(/fresh context|fresh process/);
        expect(lower).toMatch(/spec-done/);
        // Three harness sub-cases.
        expect(content).toMatch(/Pi/);
        // Interactive: clear context + re-invoke (idiom differs per harness:
        // /clear on Claude Code, /new on Codex).
        expect(lower).toMatch(/\/clear|\/new/);
        expect(lower).toMatch(/headless|claude -p|codex exec/);
        // ToS / cost caveat surfaced.
        expect(lower).toMatch(/tos|terms of service|cost|caveat/);
      });
    }
  });

  describe('uses new completion vocabulary (no shipped)', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} does not define completion as shipped`, () => {
        const content = read(variant);
        expect(content).not.toContain('shipped');
      });

      it(`${label(variant)} treats a dependency as satisfied at in-review or done`, () => {
        const content = read(variant);
        // Vocabulary present somewhere (dependency check and/or next-spec).
        expect(content).toMatch(/in-review|done/);
      });
    }
  });

  describe('directory "next spec" serves todo (matches next-spec)', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} no longer calls it the "first active spec"`, () => {
        const content = read(variant);
        // The pre-unification wording was "first active spec".
        expect(content).not.toMatch(/first active spec/i);
        expect(content.toLowerCase()).toMatch(/todo/);
      });
    }
  });

  describe('does not depend on the vestigial joycraft_next_spec TOOL for hand-off', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} hand-off does not invoke the joycraft_next_spec tool`, () => {
        const content = read(variant);
        expect(content).not.toContain('joycraft_next_spec');
      });
    }
  });

  describe('3-variant parity on the mode-aware hand-off', () => {
    const tokens = ['batch', 'checkpoint', 'isolated', 'spec-done'];
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

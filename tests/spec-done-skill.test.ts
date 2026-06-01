import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const SOURCE_VARIANTS = [
  join(repoRoot, 'src', 'claude-skills', 'joycraft-spec-done.md'),
  join(repoRoot, 'src', 'codex-skills', 'joycraft-spec-done.md'),
  join(repoRoot, 'src', 'pi-skills', 'joycraft-spec-done.md'),
];

const INSTALLED_COPIES = [
  join(repoRoot, '.claude', 'skills', 'joycraft-spec-done', 'SKILL.md'),
  join(repoRoot, '.agents', 'skills', 'joycraft-spec-done', 'SKILL.md'),
  join(repoRoot, '.pi', 'skills', 'joycraft-spec-done', 'SKILL.md'),
];

const read = (p: string) => readFileSync(p, 'utf-8');
const label = (p: string) => p.split('/').slice(-3).join('/');

describe('joycraft-spec-done skill', () => {
  describe('exists in all 3 source dirs', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} exists`, () => {
        expect(existsSync(variant)).toBe(true);
      });
    }
  });

  describe('frontmatter is discoverable', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} has name + description mentioning the lightweight per-spec wrap`, () => {
        const content = read(variant);
        expect(content).toMatch(/^name:\s*joycraft-spec-done\s*$/m);
        const descMatch = content.match(/^description:\s*(.+)$/m);
        expect(descMatch, 'has a description').not.toBeNull();
        const desc = descMatch![1].toLowerCase();
        // Description signals: per-spec, lightweight, commit, status bump.
        expect(desc).toMatch(/per[- ]spec|each spec/);
        expect(desc).toMatch(/light|terse|quick|fast/);
        expect(desc).toMatch(/commit/);
        expect(desc).toMatch(/status|in-review|bump/);
      });
    }
  });

  describe('bumps BOTH systems to in-review', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} uses mark-done --to in-review and updates frontmatter`, () => {
        const content = read(variant);
        // Queue bump via the spec-3 script with the in-review target.
        expect(content).toMatch(/mark-done[^\n]*--to in-review/);
        // Frontmatter bump too (both systems).
        expect(content.toLowerCase()).toMatch(/frontmatter/);
        expect(content).toContain('in-review');
      });
    }
  });

  describe('discovery stub only if surprised', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} conditions the discovery stub on a contradiction and skips otherwise`, () => {
        const content = read(variant).toLowerCase();
        expect(content).toMatch(/discovery/);
        expect(content).toMatch(/contradict|surprise|surprised|only if/);
        expect(content).toMatch(/skip|otherwise|else/);
      });
    }
  });

  describe('explicitly NO validation / push / PR', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} states it does not validate, push, or open a PR`, () => {
        const content = read(variant);
        const lower = content.toLowerCase();
        // No validation re-run.
        expect(lower).toMatch(/no validation|does not (run )?validation|no.*pnpm test|don't (re-?)?run/);
        // No push, no PR.
        expect(lower).toMatch(/no push|does not push|don't push/);
        expect(lower).toMatch(/no pr|does not (open|create).*pr|don't.*pr/);
      });
    }
  });

  describe('commit convention spec: <name>', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} specifies the spec: <name> commit message`, () => {
        const content = read(variant);
        expect(content).toMatch(/spec:\s*<[^>]*name[^>]*>|`spec: /);
      });
    }
  });

  describe('does NOT graduate to done (agent never self-certifies)', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} does not use --to done`, () => {
        const content = read(variant);
        expect(content).not.toMatch(/--to done/);
      });
    }
  });

  describe('3-variant parity on the four core steps', () => {
    const tokens = ['in-review', 'mark-done', 'spec:', 'commit'];
    for (const token of tokens) {
      it(`every source variant contains "${token}"`, () => {
        for (const variant of SOURCE_VARIANTS) {
          expect(read(variant), `${label(variant)} missing "${token}"`).toContain(token);
        }
      });
    }
  });

  describe('installed copies exist and match source', () => {
    for (let i = 0; i < SOURCE_VARIANTS.length; i++) {
      const src = SOURCE_VARIANTS[i];
      const installed = INSTALLED_COPIES[i];
      it(`${label(installed)} exists`, () => {
        expect(existsSync(installed)).toBe(true);
      });
      it(`${label(installed)} matches its source variant`, () => {
        expect(read(installed)).toBe(read(src));
      });
    }
  });
});

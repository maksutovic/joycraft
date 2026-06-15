import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

// The three source-of-truth skill variants (FLAT .md files).
const SOURCE_VARIANTS = [
  join(repoRoot, 'src', 'claude-skills', 'joycraft-decompose.md'),
  join(repoRoot, 'src', 'codex-skills', 'joycraft-decompose.md'),
  join(repoRoot, 'src', 'pi-skills', 'joycraft-decompose.md'),
];

// The installed copies in this repo (the <dir>/SKILL.md layout).
const INSTALLED_COPIES = [
  join(repoRoot, '.claude', 'skills', 'joycraft-decompose', 'SKILL.md'),
  join(repoRoot, '.agents', 'skills', 'joycraft-decompose', 'SKILL.md'),
  join(repoRoot, '.pi', 'skills', 'joycraft-decompose', 'SKILL.md'),
];

const read = (p: string) => readFileSync(p, 'utf-8');
const label = (p: string) => p.split('/').slice(-3).join('/');

describe('execution modes in joycraft-decompose', () => {
  // AC: the three modes are documented in every source variant.
  describe('documents the three execution modes', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} names batch, checkpoint, and isolated`, () => {
        const content = read(variant);
        expect(content).toContain('batch');
        expect(content).toContain('checkpoint');
        expect(content).toContain('isolated');
      });

      it(`${label(variant)} has an Execution Modes section`, () => {
        const content = read(variant);
        expect(content.toLowerCase()).toContain('execution mode');
      });
    }
  });

  // AC: a documented size→mode heuristic (XS/S → batch-eligible, M → checkpoint, L/XL → isolated).
  describe('documents a size→mode heuristic', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} maps sizes to modes`, () => {
        const content = read(variant);
        // The heuristic references spec size buckets and ties them to modes.
        expect(content).toMatch(/XS|XL|\bS\b|\bM\b|\bL\b/);
        expect(content.toLowerCase()).toMatch(
          /size.*mode|heuristic|recommend.*mode|mode.*recommend/,
        );
      });
    }
  });

  // AC: read a project default from the harness boundary file, defaulting to batch when absent.
  // Per the canonical Cat D form (spec: canonicalize-boundary-forms), each harness uses its
  // own boundary file literal: CLAUDE.md for claude, AGENTS.md for codex/pi.
  describe('reads a project default mode from the boundary file', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} references the boundary file default and defaults to batch`, () => {
        const content = read(variant);
        const expectedBoundary = variant.includes('claude-skills')
          ? 'CLAUDE.md'
          : 'AGENTS.md';
        expect(content).toContain(expectedBoundary);
        expect(content).toContain('Default execution mode');
        // Absent ⇒ batch is the documented fallback.
        expect(content.toLowerCase()).toMatch(/default.*batch|batch.*default|absent.*batch|no.*default.*batch/);
      });
    }
  });

  // AC: present the per-spec recommendation to the human and get approval before writing.
  describe('surfaces the recommendation for human approval (not silent)', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} instructs presenting the recommendation and getting approval`, () => {
        const content = read(variant);
        expect(content.toLowerCase()).toMatch(/approv|confirm|get.*ok|present.*recommend|recommend.*approv/);
      });
    }
  });

  // AC: spec frontmatter template gains a mode: field.
  describe('frontmatter template includes a mode: field', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} frontmatter block has a mode: line`, () => {
        const content = read(variant);
        expect(content).toMatch(/^\s*mode:\s/m);
      });
    }
  });

  // AC: queue-JSON template uses "status": "todo" and includes "mode".
  describe('queue-JSON template uses todo status + mode field', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} queue template has "status": "todo"`, () => {
        const content = read(variant);
        expect(content).toMatch(/"status":\s*"todo"/);
      });

      it(`${label(variant)} queue template has a "mode" key`, () => {
        const content = read(variant);
        expect(content).toMatch(/"mode":\s*"/);
      });

      it(`${label(variant)} queue template no longer emits "status": "active"`, () => {
        const content = read(variant);
        expect(content).not.toMatch(/"status":\s*"active"/);
      });
    }
  });

  // AC: neighbor-scan filter no longer ignores in-review; skip-set is done/deprecated/superseded.
  describe('neighbor-scan filter is in-review-aware', () => {
    for (const variant of SOURCE_VARIANTS) {
      it(`${label(variant)} skip-set is done/deprecated/superseded`, () => {
        const content = read(variant);
        expect(content).toContain('done');
        expect(content).toContain('deprecated');
        expect(content).toContain('superseded');
      });

      it(`${label(variant)} does not skip "shipped" (migrated away)`, () => {
        const content = read(variant);
        // "shipped" must not appear as a skip token in the filter.
        expect(content).not.toContain('shipped');
      });

      it(`${label(variant)} treats in-review as live, not skipped`, () => {
        const content = read(variant);
        // in-review must be described as live / in-scope...
        expect(content.toLowerCase()).toMatch(
          /in-review[^.\n]*(live|in scope|stays in scope|consider)|both `?todo`? and `?in-review`? are live/i,
        );
        // ...and must NOT appear as a skip/ignore target. We allow the word
        // in positive prose ("stays in scope") but reject the skip patterns:
        // "skip ... in-review", "ignore ... in-review" (without an
        // intervening sentence boundary or a negation like "not").
        expect(content).not.toMatch(/\b(skip|ignore)\b(?:(?!\bnot\b)[^.\n])*\bin-review\b/i);
      });
    }
  });

  // AC: all three variants carry the same mode-relevant changes (parity).
  describe('3-variant parity on the mode contract', () => {
    const tokens = [
      'batch',
      'checkpoint',
      'isolated',
      'Default execution mode',
    ];
    for (const token of tokens) {
      it(`every source variant contains "${token}"`, () => {
        for (const variant of SOURCE_VARIANTS) {
          expect(read(variant), `${label(variant)} missing "${token}"`).toContain(token);
        }
      });
    }
  });

  // AC: this repo's installed copies are synced to the source variants.
  describe('installed copies are synced to source variants', () => {
    for (let i = 0; i < SOURCE_VARIANTS.length; i++) {
      const src = SOURCE_VARIANTS[i];
      const installed = INSTALLED_COPIES[i];
      it(`${label(installed)} matches its source variant`, () => {
        expect(read(installed)).toBe(read(src));
      });
    }
  });
});

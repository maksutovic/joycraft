import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const DESIGN_SKILL = join(repoRoot, '.claude', 'skills', 'joycraft-design', 'SKILL.md');
const NEW_FEATURE_SKILL = join(repoRoot, '.claude', 'skills', 'joycraft-new-feature', 'SKILL.md');
const DECIDE_SKILL = join(repoRoot, '.claude', 'skills', 'joycraft-decide', 'SKILL.md');

const AUTHORING_SKILLS = [
  ['joycraft-design', DESIGN_SKILL],
  ['joycraft-new-feature', NEW_FEATURE_SKILL],
] as const;

const ALL_THREE = [
  ['joycraft-design', DESIGN_SKILL],
  ['joycraft-new-feature', NEW_FEATURE_SKILL],
  ['joycraft-decide', DECIDE_SKILL],
] as const;

const read = (p: string) => readFileSync(p, 'utf-8');

describe('Self-scoring present in authoring skills', () => {
  for (const [name, path] of AUTHORING_SKILLS) {
    it(`${name} SKILL.md references anchor: inline scoring`, () => {
      const c = read(path);
      expect(c).toMatch(/anchor:/);
    });

    it(`${name} SKILL.md references docs/context/anchors.md`, () => {
      const c = read(path);
      expect(c).toMatch(/docs\/context\/anchors\.md/);
    });
  }
});

describe('Audit + block in decide', () => {
  it('joycraft-decide SKILL.md documents the re-anchor note format', () => {
    const c = read(DECIDE_SKILL);
    expect(c).toMatch(/anchor:\s*N\s*→\s*M/);
  });

  it('joycraft-decide SKILL.md documents the <=50 load-bearing block rule', () => {
    const c = read(DECIDE_SKILL);
    expect(c.toLowerCase()).toMatch(/load-bearing/);
    expect(c).toMatch(/(≤\s*50|<=\s*50)/);
    expect(c.toLowerCase()).toMatch(/block/);
  });
});

describe('Discrete anchors only, no free-form percentages', () => {
  for (const [name, path] of ALL_THREE) {
    it(`${name} SKILL.md enumerates the discrete anchor set {0, 25, 50, 75, 100}`, () => {
      const c = read(path);
      expect(c).toMatch(/0,\s*25,\s*50,\s*75,\s*100/);
    });

    it(`${name} SKILL.md does not use free-form "percentage" language for anchors`, () => {
      const c = read(path);
      expect(c.toLowerCase()).not.toMatch(/percentage/);
    });
  }
});

describe('New-feature spec template vocabulary unified', () => {
  it('joycraft-new-feature SKILL.md spec template emits status: todo', () => {
    const c = read(NEW_FEATURE_SKILL);
    expect(c).toMatch(/status:\s*todo/);
  });

  it('joycraft-new-feature SKILL.md spec template emits a mode: field', () => {
    const c = read(NEW_FEATURE_SKILL);
    expect(c).toMatch(/mode:/);
  });

  it('joycraft-new-feature SKILL.md spec template body does not contain status: active', () => {
    const c = read(NEW_FEATURE_SKILL);
    // Isolate the spec-body template block (between the spec structure fence markers)
    const specTemplateStart = c.indexOf('Use this structure for each spec body:');
    expect(specTemplateStart, 'spec template section found').toBeGreaterThan(-1);
    const nextFenceEnd = c.indexOf('```', c.indexOf('```', specTemplateStart) + 3);
    const specTemplate = c.slice(specTemplateStart, nextFenceEnd);
    expect(specTemplate).not.toMatch(/status:\s*active/);
    expect(specTemplate).toMatch(/status:\s*todo/);
  });
});

describe('Reconcile step restored in design', () => {
  it('joycraft-design SKILL.md contains "Reconcile Brief with Findings"', () => {
    const c = read(DESIGN_SKILL);
    expect(c).toMatch(/Reconcile [Bb]rief [Ww]ith [Ff]indings/);
  });
});

describe('graduated: no PILOT divergence markers remain', () => {
  for (const [name, path] of ALL_THREE) {
    it(`${name} SKILL.md carries no PILOT marker (graduated)`, () => {
      const c = read(path);
      expect(c).not.toMatch(/<!--\s*PILOT:/);
    });
  }
});

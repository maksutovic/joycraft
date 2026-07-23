import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const RESEARCH_SKILL = join(repoRoot, '.claude', 'skills', 'joycraft-research', 'SKILL.md');
const DESIGN_SKILL = join(repoRoot, '.claude', 'skills', 'joycraft-design', 'SKILL.md');
const DECOMPOSE_SKILL = join(repoRoot, '.claude', 'skills', 'joycraft-decompose', 'SKILL.md');

const SKILLS = [
  ['joycraft-research', RESEARCH_SKILL],
  ['joycraft-design', DESIGN_SKILL],
  ['joycraft-decompose', DECOMPOSE_SKILL],
] as const;

const read = (p: string) => readFileSync(p, 'utf-8');

describe('Retrieve Before You Reason step is present and first', () => {
  for (const [name, path] of SKILLS) {
    it(`${name} SKILL.md contains a "Retrieve Before You Reason" step`, () => {
      const c = read(path);
      expect(c).toMatch(/Retrieve Before You Reason/);
    });

    it(`${name} SKILL.md: retrieval step precedes the skill's first phase/step heading`, () => {
      const c = read(path);
      const retrievalIdx = c.indexOf('Retrieve Before You Reason');
      expect(retrievalIdx, 'retrieval heading found').toBeGreaterThan(-1);

      // Find the first existing "Step 1" / "Phase 1" heading that is NOT the retrieval
      // heading itself (i.e. the skill's original opening step).
      const headingRe = /^#{1,3}\s*(Step 1|Phase 1)\b/gm;
      let match: RegExpExecArray | null;
      let firstOtherStepIdx = -1;
      while ((match = headingRe.exec(c)) !== null) {
        firstOtherStepIdx = match.index;
        break;
      }
      expect(firstOtherStepIdx, 'a Step 1/Phase 1 heading exists').toBeGreaterThan(-1);
      expect(retrievalIdx).toBeLessThan(firstOtherStepIdx);
    });
  }
});

describe('Retrieval step is labeled PROTOCOL', () => {
  for (const [name, path] of SKILLS) {
    it(`${name} SKILL.md labels the retrieval step PROTOCOL`, () => {
      const c = read(path);
      // Must be PROTOCOL near the retrieval heading (within the same section).
      const idx = c.indexOf('Retrieve Before You Reason');
      const section = c.slice(idx, idx + 1500);
      expect(section).toMatch(/PROTOCOL/);
    });
  }
});

describe('Retrieval step is bounded (term count + read cap)', () => {
  for (const [name, path] of SKILLS) {
    it(`${name} SKILL.md specifies 3-6 search terms`, () => {
      const c = read(path);
      expect(c).toMatch(/3[–-]6/);
    });

    it(`${name} SKILL.md specifies a <=5 file read cap`, () => {
      const c = read(path);
      expect(c).toMatch(/(≤5|<=\s*5|at most 5)/);
    });
  }
});

describe('Retrieval step requires "Prior knowledge reused" citation contract', () => {
  for (const [name, path] of SKILLS) {
    it(`${name} SKILL.md requires a "Prior knowledge reused" list or explicit nothing-found line`, () => {
      const c = read(path);
      expect(c).toMatch(/Prior knowledge reused/);
    });
  }
});

describe('Retrieval step targets the knowledge layer', () => {
  for (const [name, path] of SKILLS) {
    it(`${name} SKILL.md references docs/context/ and docs/discoveries/`, () => {
      const c = read(path);
      const idx = c.indexOf('Retrieve Before You Reason');
      const section = c.slice(idx, idx + 1500);
      expect(section).toMatch(/docs\/context\//);
      expect(section).toMatch(/docs\/discoveries\//);
    });
  }
});

describe('Retrieval step surfaces contradictions instead of silently overriding', () => {
  for (const [name, path] of SKILLS) {
    it(`${name} SKILL.md surfaces contradicting prior decisions to the human`, () => {
      const c = read(path);
      const idx = c.indexOf('Retrieve Before You Reason');
      const section = c.slice(idx, idx + 1500);
      expect(section.toLowerCase()).toMatch(/contradict/);
      expect(section.toLowerCase()).toMatch(/surface/);
    });
  }
});

describe('graduated: no PILOT divergence markers remain', () => {
  for (const [name, path] of SKILLS) {
    it(`${name} SKILL.md carries no PILOT marker (graduated)`, () => {
      const c = read(path);
      expect(c).not.toMatch(/<!--\s*PILOT:/);
    });
  }
});

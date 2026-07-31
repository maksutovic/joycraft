import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const skill = (name: string) => join(repoRoot, 'src', 'skills', `${name}.md`);
const read = (name: string) => readFileSync(skill(name), 'utf-8');

/**
 * Spec 3 (add-artifact-render-steps) adds a render-and-open step to the gate of
 * the six skills that lack one, modeled on `joycraft-decide`'s Step 4. The gate's
 * markdown stays canonical (D4); the HTML is a slot-filled render of
 * `docs/templates/REVIEW_GATE_TEMPLATE.html` (spec 1).
 *
 * `joycraft-decide` is deliberately NOT a target — its dossier flow is the model.
 */

const RENDER_SKILLS = [
  'joycraft-new-feature',
  'joycraft-design',
  'joycraft-decompose',
  'joycraft-research',
  'joycraft-tune',
  'joycraft-optimize',
] as const;

const TEMPLATE = 'docs/templates/REVIEW_GATE_TEMPLATE.html';
const HEADLESS = 'print the absolute path and continue';
const CAP_SENTENCE = 'Ten lines maximum';

describe('the six gate skills instruct the render-and-open flow', () => {
  for (const name of RENDER_SKILLS) {
    it(`${name}.md reads the shared review-gate template`, () => {
      expect(read(name)).toContain(TEMPLATE);
    });

    it(`${name}.md fills only the slot regions, never freeform HTML`, () => {
      const c = read(name);
      expect(c).toContain('<!-- SLOT:');
      expect(c).toMatch(/byte-identical/);
      expect(c.toLowerCase()).toContain('never generate freeform');
    });

    it(`${name}.md opens the render with open/xdg-open before asking`, () => {
      const c = read(name);
      expect(c).toContain('`open <path>`');
      expect(c).toContain('`xdg-open <path>`');
    });

    it(`${name}.md degrades to a no-op when both openers fail`, () => {
      expect(read(name)).toContain(HEADLESS);
    });

    it(`${name}.md offers — does not push — a hosted artifact`, () => {
      const c = read(name);
      expect(c).toContain("Offer — don't push");
      expect(c).toContain('hosted artifact');
    });

    it(`${name}.md states the markdown stays canonical (D4)`, () => {
      const c = read(name);
      const idx = c.indexOf(TEMPLATE);
      expect(idx).toBeGreaterThan(-1);
      // The D4 sentence rides with the render step, not somewhere across the file.
      const window = c.slice(Math.max(0, idx - 1200), idx + 1600);
      expect(window.toLowerCase()).toContain('canonical');
      expect(window).toMatch(/render of it|is a render|never invents content/);
    });

    it(`${name}.md places the render step adjacent to the gate slot template`, () => {
      const c = read(name);
      const render = c.indexOf(TEMPLATE);
      const cap = c.indexOf(CAP_SENTENCE);
      expect(render).toBeGreaterThan(-1);
      expect(cap).toBeGreaterThan(-1);
      // Nearest cap sentence must be within a short distance of the render step.
      // 2026-07-31 (stamp-gate-artifacts): the render flow gained two steps —
      // the timestamp/revision stamp and the autoOpen check — which sit between
      // the render step and the slot template by design; the window widened
      // from 2000 to absorb them. Still fails if the two drift a file apart.
      let nearest = Infinity;
      let idx = c.indexOf(CAP_SENTENCE);
      while (idx > -1) {
        nearest = Math.min(nearest, Math.abs(idx - render));
        idx = c.indexOf(CAP_SENTENCE, idx + 1);
      }
      expect(nearest).toBeLessThan(3200);
    });
  }
});

describe('render steps name each gate\'s own artifact path', () => {
  const EXPECTED_HTML: Record<string, string> = {
    'joycraft-new-feature': 'docs/features/<slug>/brief.html',
    'joycraft-design': 'docs/features/<slug>/design.html',
    'joycraft-decompose': 'docs/features/<slug>/decompose.html',
    'joycraft-research': 'docs/features/<slug>/research.html',
  };

  for (const [name, path] of Object.entries(EXPECTED_HTML)) {
    it(`${name}.md writes the render to ${path}`, () => {
      expect(read(name)).toContain(path);
    });
  }

  it('joycraft-tune writes the render beside its assessment report', () => {
    const c = read('joycraft-tune');
    expect(c).toMatch(/assessment\.html/);
  });

  it('joycraft-optimize writes the render beside its overhead report', () => {
    const c = read('joycraft-optimize');
    expect(c).toMatch(/\.html/);
    const idx = c.indexOf(TEMPLATE);
    expect(c.slice(idx, idx + 1200)).toMatch(/\.html/);
  });
});

describe('joycraft-decide stays untouched — it is the model, not a target', () => {
  it('decide still renders the dossier template, not the review-gate template', () => {
    const c = read('joycraft-decide');
    expect(c).toContain('docs/templates/DECISION_DOSSIER_TEMPLATE.html');
    expect(c).not.toContain(TEMPLATE);
  });
});

describe('gitattributes collapses the new gate HTML the same way as the dossier', () => {
  const gitattributes = readFileSync(join(repoRoot, '.gitattributes'), 'utf-8');

  it('collapses every docs/features artifact, which covers <gate>.html', () => {
    expect(gitattributes).toMatch(/docs\/features\/\*\*\s+linguist-generated=true/);
  });

  it('collapses the tune assessment render outside docs/features', () => {
    expect(gitattributes).toMatch(/docs\/assessment\.html\s+linguist-generated=true/);
  });

  it('collapses the optimize overhead render outside docs/features', () => {
    expect(gitattributes).toMatch(/docs\/context\/\*\.html\s+linguist-generated=true/);
  });
});

describe('render steps respect the position-fragile windows', () => {
  // tests/retrieval-pass-skill.test.ts slices 1500 chars from this heading.
  for (const name of ['joycraft-research', 'joycraft-design', 'joycraft-decompose'] as const) {
    it(`${name}.md places no render step inside a 1500-char retrieval window`, () => {
      const c = read(name);
      let idx = c.indexOf('Retrieve Before You Reason');
      expect(idx).toBeGreaterThan(-1);
      while (idx > -1) {
        expect(c.slice(idx, idx + 1500)).not.toContain(TEMPLATE);
        idx = c.indexOf('Retrieve Before You Reason', idx + 1);
      }
    });
  }

  // tests/confidence-scoring-skill.test.ts slices between the fences following
  // this line, and bans "percentage" file-wide in design, new-feature, decide.
  for (const name of ['joycraft-design', 'joycraft-new-feature'] as const) {
    it(`${name}.md places no render step inside the spec-body fence`, () => {
      const c = read(name);
      const start = c.indexOf('Use this structure for each spec body:');
      if (start === -1) return;
      const end = c.indexOf('```', c.indexOf('```', start) + 3);
      expect(c.slice(start, end)).not.toContain(TEMPLATE);
    });
  }

  for (const name of ['joycraft-design', 'joycraft-new-feature', 'joycraft-decide'] as const) {
    it(`${name}.md introduces no banned "percentage" wording`, () => {
      expect(read(name).toLowerCase()).not.toMatch(/percentage/);
    });
  }
});

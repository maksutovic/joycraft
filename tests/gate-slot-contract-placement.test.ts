import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const skill = (name: string) => join(repoRoot, 'src', 'skills', `${name}.md`);
const read = (name: string) => readFileSync(skill(name), 'utf-8');

const STYLE_DOC = 'docs/templates/reference/output-style.md';
const CAP_SENTENCE = 'Ten lines maximum';

/**
 * Spec 2 (inline-gate-slot-contracts) puts a fixed-slot chat template inline at
 * the human-review gate of seven canonical skills in `src/skills/`. Decision D2:
 * the gate moment gets the stronger inline mechanism because a referenced doc
 * gets partially read or skipped at output time.
 *
 * Spec 5 (gate-contract-tests) owns the durable cross-skill content oracle.
 * These assertions guard what *this* spec must not break: the fixed-slot block
 * is present and anchored at each gate, and it stays clear of the
 * position-fragile windows that `tests/retrieval-pass-skill.test.ts` and
 * `tests/confidence-scoring-skill.test.ts` slice out of the *installed* copies
 * — windows those suites cannot see until spec 6 syncs them, which is exactly
 * why a placement mistake here would otherwise surface late.
 */

const GATED = [
  'joycraft-new-feature',
  'joycraft-design',
  'joycraft-decompose',
  'joycraft-research',
  'joycraft-decide',
  'joycraft-tune',
  'joycraft-optimize',
] as const;

// Expected slot-template count per skill. A skill carries more than one when it
// has several distinct gate moments, or per-harness blocks where a single block
// placed outside them would vanish for the other emitted variants:
//
//  - new-feature: Phase 2 brief presentation + Phase 4 hand-off.
//  - research: three harness blocks (claude, codex|copilot|omp, pi), one gate
//    each.
const EXPECTED_SLOTS: Record<string, number> = {
  'joycraft-new-feature': 2,
  'joycraft-research': 3,
};

const slotCount = (c: string) => c.split(CAP_SENTENCE).length - 1;

describe('gate skills carry the inline fixed-slot template', () => {
  for (const name of GATED) {
    it(`${name}.md contains the ten-line cap sentence at its gate`, () => {
      expect(read(name)).toContain(CAP_SENTENCE);
    });

    it(`${name}.md carries one slot template per gate moment`, () => {
      expect(slotCount(read(name))).toBe(EXPECTED_SLOTS[name] ?? 1);
    });

    it(`${name}.md renders the slot template inside a fenced block`, () => {
      const c = read(name);
      let from = 0;
      for (let i = 0; i < (EXPECTED_SLOTS[name] ?? 1); i++) {
        const idx = c.indexOf(CAP_SENTENCE, from);
        expect(idx, 'cap sentence found').toBeGreaterThan(-1);
        // The nearest fence marker before the cap sentence must be an opening
        // ```markdown fence — i.e. the template is inside a fenced block.
        const fenceIdx = c.lastIndexOf('```', idx);
        expect(fenceIdx, 'a fence precedes the cap sentence').toBeGreaterThan(-1);
        expect(c.slice(fenceIdx, fenceIdx + 11)).toBe('```markdown');
        from = idx + CAP_SENTENCE.length;
      }
    });

    it(`${name}.md anchors each slot template under a preceding heading`, () => {
      const c = read(name);
      let from = 0;
      for (let i = 0; i < (EXPECTED_SLOTS[name] ?? 1); i++) {
        const idx = c.indexOf(CAP_SENTENCE, from);
        const before = c.slice(0, idx);
        const lastHeading = before.lastIndexOf('\n#');
        expect(lastHeading, 'a heading precedes the slot template').toBeGreaterThan(-1);
        // The anchoring heading must be close to the block, not the file title.
        // 2026-07-31 (stamp-gate-artifacts): the render flow under the same
        // heading gained the stamp + autoOpen steps; widened from 2500.
        expect(idx - lastHeading).toBeLessThan(3600);
        from = idx + CAP_SENTENCE.length;
      }
    });

    it(`${name}.md carries the inline-placement rationale sentence`, () => {
      const c = read(name);
      expect(c).toContain('inline placement is load-bearing');
    });

    it(`${name}.md keeps the required slot labels`, () => {
      const c = read(name);
      for (const label of ['Artifact:', 'Decisions needed:', 'Next:']) {
        expect(c).toContain(label);
      }
    });
  }
});

describe('slot templates stay clear of the position-fragile windows', () => {
  // tests/retrieval-pass-skill.test.ts slices 1500 chars forward from the
  // literal `Retrieve Before You Reason` heading and asserts inside it.
  for (const name of ['joycraft-research', 'joycraft-design', 'joycraft-decompose'] as const) {
    it(`${name}.md places no slot template inside a 1500-char retrieval window`, () => {
      const c = read(name);
      // research repeats the heading once per harness block — check every one.
      let idx = c.indexOf('Retrieve Before You Reason');
      expect(idx, 'retrieval heading present').toBeGreaterThan(-1);
      while (idx > -1) {
        expect(c.slice(idx, idx + 1500)).not.toContain(CAP_SENTENCE);
        idx = c.indexOf('Retrieve Before You Reason', idx + 1);
      }
    });
  }

  // tests/confidence-scoring-skill.test.ts slices between the fences that
  // follow `Use this structure for each spec body:`.
  for (const name of ['joycraft-design', 'joycraft-new-feature'] as const) {
    it(`${name}.md places no slot template inside the spec-body fence`, () => {
      const c = read(name);
      const start = c.indexOf('Use this structure for each spec body:');
      if (start === -1) return; // design carries no spec-body template
      const end = c.indexOf('```', c.indexOf('```', start) + 3);
      expect(c.slice(start, end)).not.toContain(CAP_SENTENCE);
    });
  }

  // The same suite bans the word file-wide in these three.
  for (const name of ['joycraft-design', 'joycraft-new-feature', 'joycraft-decide'] as const) {
    it(`${name}.md introduces no banned "percentage" wording`, () => {
      expect(read(name).toLowerCase()).not.toMatch(/percentage/);
    });
  }
});

describe('slot templates are structure, not a restatement of the style doc', () => {
  // Phrases lifted from the reference doc's rule headings, guarded file-wide by
  // tests/style-pointer-placement.test.ts. The slot template governs structure;
  // tone still defers to the doc, so it must not reproduce these.
  const RESTATEMENTS = [
    'Open with the outcome',
    'End when the answer is done',
    'exactly one next action',
    'every claim carry a specific fact',
    'same plain register',
    'state as structure',
    'Match the output',
    'in your own words',
  ];

  for (const name of GATED) {
    it(`${name}.md does not restate a rule from the style doc`, () => {
      const c = read(name);
      for (const phrase of RESTATEMENTS) {
        expect(c).not.toContain(phrase);
      }
    });
  }

  // Adding a slot template must not add style-doc citations: the pointer suite
  // pins each of these skills at exactly one.
  for (const name of GATED) {
    it(`${name}.md adds no new style-doc citation`, () => {
      const c = read(name);
      const count = c.split(STYLE_DOC).length - 1;
      expect(count).toBeLessThanOrEqual(1);
    });
  }
});

describe('generated trees derive from canonical sources, never hand edits', () => {
  // `tests/regenerate-bundled-files.test.ts` executes the generator as a test
  // side effect, so `src/*-skills/` regenerates from `src/skills/` whenever the
  // canonical sources change. That is sanctioned — the failure mode to guard
  // (the 0.7.3 twelve-wrong-copilot-skills incident) is a *hand* edit that the
  // generator would not reproduce. So assert derivation, not immutability:
  // whatever the generated tree carries must be reproducible from canonical.
  //
  // Installed copies (`.claude/skills/` etc.) are deliberately NOT asserted
  // here — spec 6 (regen-and-sync) owns bringing them forward.
  for (const tree of [
    'claude-skills',
    'codex-skills',
    'pi-skills',
    'copilot-skills',
    'omp-skills',
  ] as const) {
    it(`src/${tree}/ slot templates match the canonical source count`, () => {
      const p = join(repoRoot, 'src', tree, 'joycraft-design.md');
      let generated: string;
      try {
        generated = readFileSync(p, 'utf-8');
      } catch {
        return; // tree shape differs; the generation spec owns it
      }
      // design has exactly one gate, and no harness-variant fan-out, so the
      // generated variant must carry exactly what canonical carries.
      expect(slotCount(generated)).toBe(slotCount(read('joycraft-design')));
    });
  }
});

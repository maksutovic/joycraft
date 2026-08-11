import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const skill = (name: string) => join(repoRoot, 'src', 'skills', `${name}.md`);
const read = (name: string) => readFileSync(skill(name), 'utf-8');

const STYLE_DOC = 'docs/templates/reference/output-style.md';

/**
 * Spec 3 (add-style-pointers-to-skills) edits eleven canonical skills in
 * `src/skills/`. Spec 4 owns the presence assertions against the *installed*
 * copies; these assertions guard the placement invariants that spec 3 itself
 * must not violate — the position-fragile windows that
 * `tests/retrieval-pass-skill.test.ts` and
 * `tests/confidence-scoring-skill.test.ts` slice out of the installed copies
 * and therefore cannot see until spec 6 syncs them.
 */

const POINTERED = [
  'joycraft-tune',
  'joycraft-session-end',
  'joycraft-decompose',
  'joycraft-design',
  'joycraft-new-feature',
  'joycraft-implement-feature',
  'joycraft-optimize',
  'joycraft-verify',
  'joycraft-decide',
  'joycraft-interview',
  'joycraft-bugfix',
] as const;

// Expected citation count per skill. Two reasons a skill carries more than one:
//
//  - per-harness blocks (verify, implement-feature): a pointer outside every
//    block would vanish for two of the three emitted variants.
//  - several distinct output moments (interview, session-end): the draft brief
//    and the playback, or the ledger row and the wrap-up report, are written at
//    different steps and each needs the contract where it is written.
const EXPECTED_CITATIONS: Record<string, number> = {
  'joycraft-verify': 3,
  'joycraft-implement-feature': 3,
  'joycraft-interview': 3,
  'joycraft-session-end': 2,
};

describe('canonical skills cite the output-style reference', () => {
  for (const name of POINTERED) {
    it(`${name}.md cites ${STYLE_DOC}`, () => {
      expect(read(name)).toContain(STYLE_DOC);
    });

    it(`${name}.md cites the user-project path, never src/templates/`, () => {
      expect(read(name)).not.toMatch(/src\/templates\/reference\/output-style\.md/);
    });

    it(`${name}.md carries one pointer per emitted variant`, () => {
      const c = read(name);
      const count = c.split(STYLE_DOC).length - 1;
      expect(count).toBe(EXPECTED_CITATIONS[name] ?? 1);
    });
  }

  it('joycraft-setup.md does NOT cite the style doc', () => {
    expect(read('joycraft-setup')).not.toContain('output-style.md');
  });
});

describe('pointers stay clear of the position-fragile windows', () => {
  // tests/retrieval-pass-skill.test.ts slices 1500 chars forward from the
  // literal `Retrieve Before You Reason` heading and asserts inside it.
  for (const name of ['joycraft-design', 'joycraft-decompose'] as const) {
    it(`${name}.md places no pointer inside the 1500-char retrieval window`, () => {
      const c = read(name);
      const idx = c.indexOf('Retrieve Before You Reason');
      expect(idx, 'retrieval heading present').toBeGreaterThan(-1);
      expect(c.slice(idx, idx + 1500)).not.toContain('output-style.md');
    });
  }

  // tests/confidence-scoring-skill.test.ts slices between the fences that
  // follow `Use this structure for each spec body:`.
  it('joycraft-new-feature.md places no pointer inside the spec-template fence', () => {
    const c = read('joycraft-new-feature');
    const start = c.indexOf('Use this structure for each spec body:');
    expect(start, 'spec template marker present').toBeGreaterThan(-1);
    const end = c.indexOf('```', c.indexOf('```', start) + 3);
    expect(c.slice(start, end)).not.toContain('output-style.md');
  });

  // The same suite bans the word file-wide in these three.
  for (const name of ['joycraft-design', 'joycraft-new-feature', 'joycraft-decide'] as const) {
    it(`${name}.md introduces no banned "percentage" wording`, () => {
      expect(read(name).toLowerCase()).not.toMatch(/percentage/);
    });
  }
});

describe('pointers defer to the doc rather than restating it', () => {
  // Phrases lifted from the reference doc's rule headings. A pointer that
  // reproduces one is inlining the contract instead of citing it.
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

  for (const name of POINTERED) {
    it(`${name}.md does not restate a rule from the style doc`, () => {
      const c = read(name);
      for (const phrase of RESTATEMENTS) {
        expect(c).not.toContain(phrase);
      }
    });

    it(`${name}.md keeps each pointer on a single line`, () => {
      const lines = read(name)
        .split('\n')
        .filter((l) => l.includes(STYLE_DOC));
      expect(lines.length).toBe(EXPECTED_CITATIONS[name] ?? 1);
      for (const l of lines) {
        expect(l.trim().length).toBeLessThanOrEqual(320);
      }
    });

    it(`${name}.md adds no rubric or self-scoring instruction for style`, () => {
      const c = read(name).toLowerCase();
      expect(c).not.toMatch(/style (rubric|score|self-score)/);
      expect(c).not.toMatch(/score (your|the) (output|report|prose) (style|against)/);
    });
  }
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

/**
 * Presence-only wiring check for the output-style contract.
 *
 * The pointer is the only mechanism carrying the style doc to a skill's output
 * moment, so an unenforced pointer set decays silently back to the uncited-doc
 * failure mode this feature exists to fix.
 *
 * Deliberate ceiling: this file proves the wiring exists, not that the prose
 * complies. No ordering assertion, no position assertion, no prose assertion —
 * D3's presence-vs-ordering half is still open in
 * `docs/backlog/2026-07-27-output-style-deferred-decisions.md`, and the ordering
 * idiom is already the most fragile in this suite.
 *
 * Reads the canonical sources under `src/skills/` only, never the generated
 * trees or `src/bundled-files.ts`, so it is decoupled from bundle regeneration.
 */

const STYLE_DOC = 'docs/templates/reference/output-style.md';
const AUTHORING_PATH = /src\/templates\/reference\/output-style/;

const read = (name: string) =>
  readFileSync(join(repoRoot, 'src', 'skills', `${name}.md`), 'utf-8');

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Explicit literal list, deliberately NOT derived from `entry:` frontmatter.
 * The set crosses the taxonomy on purpose: `optimize`, `verify`, and `decide`
 * are `entry: agent` but emit heavily human-read reports and dossiers, while
 * `joycraft-setup` is `entry: human` and excluded because it is an 18-line
 * router. Deriving this list would silently drift back to the taxonomy and
 * undo D7.
 */
const POINTER_SKILLS = [
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

describe('output-style pointer presence', () => {
  for (const name of POINTER_SKILLS) {
    it(`${name} cites ${STYLE_DOC}`, () => {
      expect(read(name)).toContain(STYLE_DOC);
    });
  }

  it('covers exactly the eleven skills D7 named', () => {
    expect(POINTER_SKILLS).toHaveLength(11);
  });
});

describe('output-style pointer exclusions', () => {
  it('joycraft-setup does not cite the style doc', () => {
    expect(read('joycraft-setup')).not.toContain('output-style.md');
  });
});

/**
 * D3 (2026-07-27): ordering is enforced, anchored to the *heading* the pointer
 * sits under — not to a following fenced block.
 *
 * The fence is not the anchor. `joycraft-tune` and `joycraft-decide` have no
 * fenced template after their pointer (their output moments are a written
 * assessment and a bulleted summary), so a fence-anchored rule would fail two
 * correctly-placed skills. Every one of the pointers does sit under a
 * report/present/playback heading, which is what "at the output moment"
 * actually means.
 *
 * This is a plain index comparison — nearest preceding heading — not the
 * 1500-char windowed slice in `tests/retrieval-pass-skill.test.ts`. D3's
 * original framing conflated the two and overstated the fragility.
 */
const OUTPUT_MOMENT =
  /report|present|verdict|hand ?off|play ?back|discuss|feature brief|write assessment/i;
// `feature brief` and `write assessment` are matched as phrases, not on the bare
// words: `brief` alone also matches navigational headings like
// "Step 1: Locate the brief", which would let a pointer buried at the top of a
// skill pass. Verified by burying decide's pointer under that exact heading —
// the loose pattern accepted it, this one rejects it.

describe('output-style pointer sits at the output moment', () => {
  for (const name of POINTER_SKILLS) {
    it(`${name} cites the doc at an output moment`, () => {
      const content = read(name);
      const occurrences = [...content.matchAll(new RegExp(escapeRe(STYLE_DOC), 'g'))];
      expect(occurrences.length, 'pointer present').toBeGreaterThan(0);

      // At least one citation must sit at an output moment — that is what makes
      // the contract reach the agent when it writes. Additional citations may
      // sit elsewhere: a skill can reference the contract from a guidance bullet
      // or a mid-procedure step (interview's draft-brief rule, session-end's
      // ledger row) where the rules also apply. Requiring every citation to be
      // at an output moment would forbid those, which is not the intent.
      const headingsFor = (index: number) =>
        (content.slice(0, index).match(/^#{1,4} .*$/gm) ?? []).at(-1) ?? '';

      const sited = occurrences.map((m) => headingsFor(m.index));
      expect(
        sited.some((h) => OUTPUT_MOMENT.test(h)),
        `no citation in ${name} sits at an output moment; found under ${JSON.stringify(sited)}`,
      ).toBe(true);
    });
  }
});

describe('output-style pointer path correctness', () => {
  for (const name of POINTER_SKILLS) {
    it(`${name} cites the user-project path, not the authoring-time path`, () => {
      // `src/templates/...` exists only in this repo; a shipped skill citing it
      // is a dead pointer in every scaffolded project. This is the failure D1
      // exists to prevent.
      expect(read(name)).not.toMatch(AUTHORING_PATH);
    });
  }
});

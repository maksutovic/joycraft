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

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyTemplate } from '../scripts/lib/skill-template.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

/**
 * Every generated per-harness skill must match what the generator would
 * produce from the current canonical source, right now, on disk.
 *
 * `tests/regenerate-bundled-files.test.ts` also covers generation, but it runs
 * the generator in `beforeAll` and then inspects the result — so it repairs the
 * drift before it can observe it, and a stale committed tree always passes.
 * This suite compares the committed bytes against a fresh in-memory transform
 * instead, so drift is a red test rather than a silent working-tree edit.
 *
 * That gap is not hypothetical: PR #61 added `src/copilot-skills/` generated
 * from the v0.7.1 canonical skills, while v0.7.2 had already rewritten twelve
 * of those skills to add output-style pointers. The merge was textually clean,
 * the whole suite stayed green, and twelve copilot skills shipped stale.
 *
 * Unlike `installed-skills-sync.test.ts`, this checks the *generated* trees
 * under `src/`, so it covers harnesses Joycraft does not dogfood — there is no
 * `.github/skills` in this repo, so Copilot has no installed copy to compare.
 *
 * A failure here means someone edited a canonical skill without regenerating.
 * Run `node scripts/generate-bundled-files.mjs` and commit the result; never
 * hand-edit a file under a `src/*-skills/` tree.
 */

const CANONICAL_DIR = join(repoRoot, 'src', 'skills');

const HARNESSES = [
  { harness: 'claude', tree: 'claude-skills' },
  { harness: 'codex', tree: 'codex-skills' },
  { harness: 'pi', tree: 'pi-skills' },
  { harness: 'copilot', tree: 'copilot-skills' },
] as const;

function canonicalSkills(): string[] {
  return readdirSync(CANONICAL_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();
}

describe.each(HARNESSES)('$harness generated skills are fresh', ({ harness, tree }) => {
  const files = canonicalSkills();

  it('has canonical sources to generate from', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${basename(file, '.md')} matches a fresh transform`, () => {
      const source = readFileSync(join(CANONICAL_DIR, file), 'utf-8');
      const expected = applyTemplate(source, harness, file);
      const committed = readFileSync(join(repoRoot, 'src', tree, file), 'utf-8');

      // The generator writes native line endings; normalize so this test is
      // meaningful on Windows checkouts too.
      expect(
        committed.replace(/\r\n/g, '\n'),
        `src/${tree}/${file} is stale — regenerate with scripts/generate-bundled-files.mjs`,
      ).toBe(expected.replace(/\r\n/g, '\n'));
    });
  }
});

describe('generated trees carry no skill the canonical source does not define', () => {
  const expected = new Set(canonicalSkills());

  for (const { tree } of HARNESSES) {
    it(`src/${tree} has no orphaned skill`, () => {
      const orphans = readdirSync(join(repoRoot, 'src', tree))
        .filter((f) => f.endsWith('.md'))
        .filter((f) => !expected.has(f));

      expect(
        orphans,
        `src/${tree} contains skills with no canonical source — a rename or deletion left them behind`,
      ).toEqual([]);
    });
  }
});

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

/**
 * Every installed skill copy must byte-match the generated variant it mirrors.
 *
 * `tests/implement-mode-handoff.test.ts` asserts this too, but only for
 * `joycraft-implement`. That single-skill coverage is why eleven skills shipped
 * out of sync through two commits during the 2026-07-27 output-style feature
 * without a red test: the source edits landed, the installed copies stayed
 * stale, and nothing looked at them. This suite closes that gap for all 22.
 *
 * The mapping is generated tree -> installed tree:
 *   src/claude-skills/<name>.md -> .claude/skills/<name>/SKILL.md
 *   src/codex-skills/<name>.md  -> .agents/skills/<name>/SKILL.md
 *   src/pi-skills/<name>.md     -> .pi/skills/<name>/SKILL.md
 *
 * A failure here means the generator ran but the installed copies were not
 * re-synced — regenerate and copy, never edit an installed copy by hand (a
 * rebuild silently discards it).
 */

const TREES = [
  { generated: 'claude-skills', installed: join('.claude', 'skills'), harness: 'claude' },
  { generated: 'codex-skills', installed: join('.agents', 'skills'), harness: 'codex' },
  { generated: 'pi-skills', installed: join('.pi', 'skills'), harness: 'pi' },
  { generated: 'omp-skills', installed: join('.omp', 'skills'), harness: 'omp' },
] as const;

const read = (p: string) => readFileSync(p, 'utf-8');

function generatedSkills(tree: string): string[] {
  return readdirSync(join(repoRoot, 'src', tree))
    .filter((f) => f.endsWith('.md'))
    .map((f) => basename(f, '.md'))
    .sort();
}

describe.each(TREES)('installed $harness skills byte-match their generated source', (tree) => {
  const names = generatedSkills(tree.generated);

  it('has at least one generated skill to compare', () => {
    expect(names.length).toBeGreaterThan(0);
  });

  for (const name of names) {
    it(`${name} is installed and identical`, () => {
      const source = join(repoRoot, 'src', tree.generated, `${name}.md`);
      const installed = join(repoRoot, tree.installed, name, 'SKILL.md');

      expect(
        existsSync(installed),
        `${tree.installed}/${name}/SKILL.md is missing — the generated skill was never installed`,
      ).toBe(true);

      expect(
        read(installed),
        `${tree.installed}/${name}/SKILL.md differs from src/${tree.generated}/${name}.md — regenerate and re-sync`,
      ).toBe(read(source));
    });
  }
});

describe('installed trees carry no skill the generator does not produce', () => {
  for (const tree of TREES) {
    it(`${tree.installed} has no orphaned skill`, () => {
      const expected = new Set(generatedSkills(tree.generated));
      const dir = join(repoRoot, tree.installed);
      const installed = readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, 'SKILL.md')))
        .map((e) => e.name);

      // Scoped to `joycraft-*` — every product skill carries that prefix, so
      // anything else in an installed tree is a repo-local maintainer skill
      // from `src/local-skills/` (synced by scripts/sync-skills.mjs, never
      // bundled). Those have no generated source under `src/*-skills/` by
      // design, so an unscoped check would report them as orphans forever.
      const orphans = installed
        .filter((n) => n.startsWith('joycraft-'))
        .filter((n) => !expected.has(n));
      expect(
        orphans,
        `${tree.installed} contains joycraft-* skills with no generated source — a rename or deletion left them behind`,
      ).toEqual([]);
    });
  }
});

/**
 * omp skill discovery is non-recursive: it reads `.omp/skills/<name>/SKILL.md`
 * and never descends further. A nested subdirectory is silently invisible, so
 * the layout is asserted rather than assumed.
 */
describe('.omp/skills is flat — one SKILL.md per skill dir, no nesting', () => {
  it('every installed omp skill is exactly <name>/SKILL.md', () => {
    const dir = join(repoRoot, '.omp', 'skills');
    const skillDirs = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory());
    expect(skillDirs.length).toBeGreaterThan(0);

    for (const entry of skillDirs) {
      const contents = readdirSync(join(dir, entry.name), { withFileTypes: true });
      expect(
        contents.filter((e) => e.isDirectory()).map((e) => e.name),
        `.omp/skills/${entry.name} has a nested subdirectory — omp discovery is non-recursive`,
      ).toEqual([]);
      expect(contents.map((e) => e.name)).toContain('SKILL.md');
    }
  });
});

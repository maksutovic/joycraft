import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyTemplate } from '../scripts/lib/skill-template.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

/**
 * Repo-local skills live in `src/local-skills/` and serve Joycraft's own
 * maintainers. They are deliberately outside the product pipeline:
 * `generate-bundled-files.mjs` never reads that directory, so nothing there
 * reaches `bundled-files.ts` or npm.
 *
 * They still need per-harness transformation — a maintainer on Codex or Pi
 * should see `.agents/skills` and `AGENTS.md`, not Claude's paths — so
 * `scripts/sync-skills.mjs` runs them through the same `applyTemplate` engine
 * into all four installed trees.
 *
 * Two invariants, both easy to break by hand:
 *   1. Every local skill is installed, transformed, in all four trees.
 *   2. No local skill ever leaks into the shipped bundle.
 */

const LOCAL_DIR = join(repoRoot, 'src', 'local-skills');

const TARGETS = [
  { harness: 'claude', installed: join('.claude', 'skills') },
  { harness: 'codex', installed: join('.agents', 'skills') },
  { harness: 'pi', installed: join('.pi', 'skills') },
  { harness: 'copilot', installed: join('.github', 'skills') },
] as const;

function localSkills(): string[] {
  if (!existsSync(LOCAL_DIR)) return [];
  return readdirSync(LOCAL_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();
}

describe('repo-local skills are installed to every harness', () => {
  const files = localSkills();

  it('has at least one local skill', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const name = basename(file, '.md');
    for (const { harness, installed } of TARGETS) {
      it(`${name} is installed and transformed for ${harness}`, () => {
        const dest = join(repoRoot, installed, name, 'SKILL.md');
        expect(
          existsSync(dest),
          `${installed}/${name}/SKILL.md is missing — run pnpm sync-skills`,
        ).toBe(true);

        const expected = applyTemplate(readFileSync(join(LOCAL_DIR, file), 'utf-8'), harness, file);
        expect(
          readFileSync(dest, 'utf-8').replace(/\r\n/g, '\n'),
          `${installed}/${name}/SKILL.md is stale — run pnpm sync-skills`,
        ).toBe(expected.replace(/\r\n/g, '\n'));
      });
    }
  }
});

describe('repo-local skills never ship to users', () => {
  const bundlePath = join(repoRoot, 'src', 'bundled-files.ts');

  for (const file of localSkills()) {
    const name = basename(file, '.md');
    it(`${name} is absent from bundled-files.ts`, () => {
      // The bundle is what npm publishes. A local skill appearing here means
      // someone moved it into src/skills/ or taught the generator to read
      // src/local-skills/ — either way it would ship to every user.
      expect(
        existsSync(bundlePath) ? readFileSync(bundlePath, 'utf-8').includes(name) : false,
        `${name} leaked into bundled-files.ts — repo-local skills must not ship`,
      ).toBe(false);
    });
  }

  it('the generator does not read src/local-skills', () => {
    const gen = readFileSync(join(repoRoot, 'scripts', 'generate-bundled-files.mjs'), 'utf-8');
    expect(gen.includes('local-skills')).toBe(false);
  });
});

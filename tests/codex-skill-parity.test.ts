import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS_DIR = join(__dirname, '..', 'src', 'claude-skills');
const CODEX_SKILLS_DIR = join(__dirname, '..', 'src', 'codex-skills');

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    result[key] = value;
  }
  return result;
}

const claudeSkills = readdirSync(SKILLS_DIR).filter((f) => f.endsWith('.md'));
const codexSkills = readdirSync(CODEX_SKILLS_DIR).filter((f) =>
  f.endsWith('.md'),
);

describe('Codex skill parity', () => {
  describe('every Claude skill has a corresponding Codex skill', () => {
    for (const file of claudeSkills) {
      it(`${file} exists in codex-skills/`, () => {
        expect(codexSkills).toContain(file);
      });
    }
  });

  describe('no orphan Codex skills', () => {
    for (const file of codexSkills) {
      it(`${file} exists in skills/`, () => {
        expect(claudeSkills).toContain(file);
      });
    }
  });

  describe('name field matches between Claude and Codex skills', () => {
    const shared = claudeSkills.filter((f) => codexSkills.includes(f));
    for (const file of shared) {
      it(`${file} has matching name field`, () => {
        const claudeContent = readFileSync(join(SKILLS_DIR, file), 'utf-8');
        const codexContent = readFileSync(
          join(CODEX_SKILLS_DIR, file),
          'utf-8',
        );
        const claudeFm = parseFrontmatter(claudeContent);
        const codexFm = parseFrontmatter(codexContent);
        expect(codexFm.name).toBe(claudeFm.name);
      });
    }
  });

  describe('no banned Claude-specific tool references in Codex skills', () => {
    const banned = ['TodoWrite', 'EnterWorktree', 'LSP'];
    for (const file of codexSkills) {
      it(`${file} does not reference banned tools`, () => {
        const content = readFileSync(join(CODEX_SKILLS_DIR, file), 'utf-8');
        for (const tool of banned) {
          const regex = new RegExp(`\\b${tool}\\b`);
          expect(
            regex.test(content),
            `Found banned tool reference "${tool}" in ${file}`,
          ).toBe(false);
        }
      });
    }
  });

  describe('no /joycraft- invocation syntax in Codex skills', () => {
    for (const file of codexSkills) {
      it(`${file} does not use /joycraft- invocation syntax`, () => {
        const content = readFileSync(join(CODEX_SKILLS_DIR, file), 'utf-8');
        // Match /joycraft- preceded by start-of-line, space, or backtick
        // but NOT preceded by path components like docs/ or other dir/
        const regex = /(?:^|[\s`])\/joycraft-/gm;
        const matches = content.match(regex);
        expect(
          matches,
          `Found /joycraft- invocation syntax in ${file} — use $joycraft- instead`,
        ).toBeNull();
      });
    }
  });
});

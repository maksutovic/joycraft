import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, '..', 'src', 'claude-skills');

const BACKLOG_SKILLS = ['joycraft-interview.md', 'joycraft-new-feature.md', 'joycraft-design.md'];

describe('skill backlog prompts (offer, do not auto-write)', () => {
  for (const skill of BACKLOG_SKILLS) {
    it(`${skill} mentions docs/backlog/ and asks before writing`, () => {
      const content = readFileSync(join(skillsDir, skill), 'utf-8');
      expect(content).toContain('docs/backlog/');
      // Must explicitly ask, not silently capture
      expect(content.toLowerCase()).toMatch(/want me to capture|ask the user|with confirmation|never auto-write|do not auto-write/);
    });
  }
});

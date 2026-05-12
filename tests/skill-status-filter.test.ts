import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, '..', 'src', 'claude-skills');

const SCANNING_SKILLS = ['joycraft-research.md', 'joycraft-new-feature.md', 'joycraft-decompose.md'];

describe('skill status filtering', () => {
  for (const skill of SCANNING_SKILLS) {
    it(`${skill} instructs filtering by status: active`, () => {
      const content = readFileSync(join(skillsDir, skill), 'utf-8');
      expect(content).toContain('status: active');
      expect(content.toLowerCase()).toMatch(/skip|ignore|filter/);
      expect(content).toMatch(/shipped|deprecated|superseded/);
    });

    it(`${skill} mentions docs/archive/ as out-of-scope`, () => {
      const content = readFileSync(join(skillsDir, skill), 'utf-8');
      expect(content).toContain('docs/archive/');
    });
  }
});

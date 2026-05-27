import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PI_SKILLS_DIR = join(__dirname, '..', 'src', 'pi-skills');

describe('Pi skill content', () => {
  describe('research skill uses subagent tool pattern', () => {
    it('contains subagent reference', () => {
      const content = readFileSync(
        join(PI_SKILLS_DIR, 'joycraft-research.md'),
        'utf-8',
      );
      expect(content).toContain('subagent');
    });

    it('references joycraft-researcher agent', () => {
      const content = readFileSync(
        join(PI_SKILLS_DIR, 'joycraft-research.md'),
        'utf-8',
      );
      expect(content).toContain('joycraft-researcher');
    });
  });

  describe('verify skill uses subagent tool pattern', () => {
    it('contains subagent reference', () => {
      const content = readFileSync(
        join(PI_SKILLS_DIR, 'joycraft-verify.md'),
        'utf-8',
      );
      expect(content).toContain('subagent');
    });

    it('references joycraft-verifier agent', () => {
      const content = readFileSync(
        join(PI_SKILLS_DIR, 'joycraft-verify.md'),
        'utf-8',
      );
      expect(content).toContain('joycraft-verifier');
    });
  });

  describe('research skill has no $joycraft- references', () => {
    it('uses /skill:joycraft- not $joycraft-', () => {
      const content = readFileSync(
        join(PI_SKILLS_DIR, 'joycraft-research.md'),
        'utf-8',
      );
      expect(content).not.toMatch(/\$joycraft-/);
    });
  });

  describe('verify skill has no $joycraft- references', () => {
    it('uses /skill:joycraft- not $joycraft-', () => {
      const content = readFileSync(
        join(PI_SKILLS_DIR, 'joycraft-verify.md'),
        'utf-8',
      );
      expect(content).not.toMatch(/\$joycraft-/);
    });
  });
});

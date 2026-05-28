import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PI_SKILLS_DIR = join(__dirname, '..', 'src', 'pi-skills');

function readPiSkill(filename: string): string {
  return readFileSync(join(PI_SKILLS_DIR, filename), 'utf-8');
}

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

  // --- Spec 2: Back-References ---
  describe('research skill includes brief back-reference instruction', () => {
    it('contains **Research:** back-reference format', () => {
      const content = readPiSkill('joycraft-research.md');
      expect(content).toContain('**Research:**');
    });

    it('references brief.md for back-reference write', () => {
      const content = readPiSkill('joycraft-research.md');
      expect(content).toContain('brief.md');
    });
  });

  describe('design skill includes brief back-reference instruction', () => {
    it('contains **Design:** back-reference format', () => {
      const content = readPiSkill('joycraft-design.md');
      expect(content).toContain('**Design:**');
    });

    it('references brief.md for back-reference write', () => {
      const content = readPiSkill('joycraft-design.md');
      expect(content).toContain('brief.md');
    });
  });

  // --- Spec 3: Fallback Paths ---
  describe('research skill has fallback output path', () => {
    it('mentions docs/research/ as fallback path', () => {
      const content = readPiSkill('joycraft-research.md');
      expect(content).toContain('docs/research/');
    });

    it('retains docs/features/<slug>/research.md as primary path', () => {
      const content = readPiSkill('joycraft-research.md');
      expect(content).toMatch(/docs\/features\/.*research\.md/);
    });
  });
});

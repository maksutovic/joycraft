import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, '..', 'src', 'claude-skills');

const SKILLS_WITH_HANDOFF = [
  'joycraft-interview.md',
  'joycraft-new-feature.md',
  'joycraft-research.md',
  'joycraft-design.md',
  'joycraft-decompose.md',
  'joycraft-bugfix.md',
  'joycraft-session-end.md',
  'joycraft-add-fact.md',
  // joycraft-implement is deliberately absent: since frictionless-implement it
  // performs the per-spec wrap-up itself and self-continues through the queue —
  // it no longer ends by handing a command back to the human.
];

describe('skill handoff blocks', () => {
  for (const skill of SKILLS_WITH_HANDOFF) {
    it(`${skill} contains the canonical Handoff block`, () => {
      const content = readFileSync(join(skillsDir, skill), 'utf-8');
      expect(content).toContain('Next:');
      // Fenced bash block followed by /clear hint
      expect(content).toMatch(/```bash[\s\S]*?\/joycraft-/);
      expect(content).toContain('Run /clear first.');
    });
  }

  it('joycraft-design Handoff block is post-approval-only', () => {
    const content = readFileSync(join(skillsDir, 'joycraft-design.md'), 'utf-8');
    // Must explicitly call out that Handoff emits AFTER human approval
    expect(content.toLowerCase()).toMatch(/after\s+(?:human\s+)?approval|once\s+the\s+(?:user|human)\s+approves/);
  });
});

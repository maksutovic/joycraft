import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, '..', 'src', 'claude-skills');

const ARTIFACT_SKILLS = [
  'joycraft-interview.md',
  'joycraft-new-feature.md',
  'joycraft-research.md',
  'joycraft-design.md',
  'joycraft-decompose.md',
  'joycraft-bugfix.md',
  'joycraft-session-end.md',
  'joycraft-add-fact.md',
];

describe('skill frontmatter instructions', () => {
  for (const skill of ARTIFACT_SKILLS) {
    it(`${skill} contains YAML frontmatter emission instructions`, () => {
      const content = readFileSync(join(skillsDir, skill), 'utf-8');
      // Must reference the YAML delimiter convention
      expect(content).toContain('---');
      // Personal/shared frontmatter fields referenced
      const hasPersonal = content.includes('status:') && content.includes('owner:') && content.includes('created:');
      const hasShared = content.includes('last_updated:') && content.includes('last_updated_by:');
      expect(hasPersonal || hasShared).toBe(true);
    });
  }
});

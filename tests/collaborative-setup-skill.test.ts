import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, '..', 'src', 'claude-skills');
const templatesDir = join(__dirname, '..', 'src', 'templates');

describe('joycraft-collaborative-setup skill', () => {
  it('skill markdown exists', () => {
    expect(existsSync(join(skillsDir, 'joycraft-collaborative-setup.md'))).toBe(true);
  });

  it('has YAML frontmatter with name and description', () => {
    const content = readFileSync(join(skillsDir, 'joycraft-collaborative-setup.md'), 'utf-8');
    expect(content.startsWith('---')).toBe(true);
    expect(content).toMatch(/^name:\s*joycraft-collaborative-setup\b/m);
    expect(content).toMatch(/^description:\s*\S+/m);
  });

  it('references docs/areas/ and CONTRIBUTING-joycraft', () => {
    const content = readFileSync(join(skillsDir, 'joycraft-collaborative-setup.md'), 'utf-8');
    expect(content).toContain('docs/areas/');
    expect(content).toContain('CONTRIBUTING-joycraft');
  });

  it('tells user to run npx joycraft upgrade first if flat layout detected', () => {
    const content = readFileSync(join(skillsDir, 'joycraft-collaborative-setup.md'), 'utf-8');
    expect(content.toLowerCase()).toContain('flat layout');
    expect(content).toContain('joycraft upgrade');
  });

  it('ends with the canonical Handoff block', () => {
    const content = readFileSync(join(skillsDir, 'joycraft-collaborative-setup.md'), 'utf-8');
    expect(content).toContain('Next:');
    expect(content).toMatch(/```bash[\s\S]*?\/joycraft-/);
    expect(content).toContain('Run /clear first.');
  });

  it('CONTRIBUTING-joycraft template exists in src/templates', () => {
    expect(existsSync(join(templatesDir, 'CONTRIBUTING-joycraft-template.md'))).toBe(true);
  });
});

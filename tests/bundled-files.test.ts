import { describe, it, expect } from 'vitest';
import { SKILLS, TEMPLATES, CODEX_SKILLS } from '../src/bundled-files';

describe('bundled SKILLS', () => {
  it('includes joycraft-collaborative-setup.md', () => {
    expect(Object.keys(SKILLS)).toContain('joycraft-collaborative-setup.md');
  });

  it('content for collaborative-setup skill is non-empty and references docs/areas/', () => {
    const content = SKILLS['joycraft-collaborative-setup.md'];
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('docs/areas/');
  });
});

describe('bundled TEMPLATES', () => {
  it('includes CONTRIBUTING-joycraft template', () => {
    expect(Object.keys(TEMPLATES)).toContain('CONTRIBUTING-joycraft-template.md');
  });
});

describe('bundled CODEX_SKILLS', () => {
  it('is non-empty', () => {
    expect(Object.keys(CODEX_SKILLS).length).toBeGreaterThan(0);
  });
});

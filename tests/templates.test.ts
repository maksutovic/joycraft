import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, '..', 'templates');

describe('template backlog references', () => {
  it('FEATURE_BRIEF_TEMPLATE.md mentions docs/backlog/', () => {
    const content = readFileSync(join(templatesDir, 'FEATURE_BRIEF_TEMPLATE.md'), 'utf-8');
    expect(content).toContain('docs/backlog/');
  });

  it('DESIGN_SPEC_TEMPLATE.md mentions docs/backlog/', () => {
    const content = readFileSync(join(templatesDir, 'DESIGN_SPEC_TEMPLATE.md'), 'utf-8');
    expect(content).toContain('docs/backlog/');
  });
});

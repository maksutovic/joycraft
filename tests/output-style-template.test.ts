import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..');
const TEMPLATES_DIR = join(ROOT, 'src', 'templates');
const STYLE_DOC = join(TEMPLATES_DIR, 'reference', 'output-style.md');

function read(): string {
  return readFileSync(STYLE_DOC, 'utf-8');
}

/**
 * Slice the lines belonging to a `## <heading>` section, stopping at the next
 * `## `. Scoping the rule count this way keeps the Scope section and the worked
 * example from inflating it.
 */
function section(content: string, heading: RegExp): string[] {
  const lines = content.split('\n');
  const start = lines.findIndex((l) => /^## /.test(l) && heading.test(l));
  if (start === -1) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^## /.test(l));
  return end === -1 ? rest : rest.slice(0, end);
}

describe('output style template: file exists', () => {
  it('src/templates/reference/output-style.md exists', () => {
    expect(existsSync(STYLE_DOC), `${STYLE_DOC} should exist`).toBe(true);
  });
});

describe('output style template: rule count', () => {
  it('holds between 6 and 10 rules inclusive, counted structurally', () => {
    // Rules are `### N. <text>` headings scoped to the `## The Rules` section.
    const rules = section(read(), /rules/i).filter((l) => /^### \d+\. /.test(l));
    expect(rules.length).toBeGreaterThanOrEqual(6);
    expect(rules.length).toBeLessThanOrEqual(10);
  });
});

describe('output style template: worked example', () => {
  it('carries at least one before/after worked example', () => {
    const example = section(read(), /example/i).join('\n');
    expect(example.length, 'no worked example section found').toBeGreaterThan(0);
    expect(example).toMatch(/before/i);
    expect(example).toMatch(/after/i);
  });
});

describe('output style template: reference-doc shape', () => {
  it('has an H1, a blockquote purpose line, and at least one section', () => {
    const lines = read().split('\n');
    expect(lines.some((l) => /^# /.test(l)), 'missing H1').toBe(true);
    expect(lines.some((l) => /^> /.test(l)), 'missing blockquote').toBe(true);
    expect(lines.some((l) => /^## /.test(l)), 'missing section').toBe(true);
  });
});

describe('output style template: no absolute or repo paths', () => {
  it('uses project-relative paths only', () => {
    const content = read();
    expect(content).not.toMatch(/\/Users\//);
    expect(content).not.toMatch(/joycraft\/src/);
  });
});

describe('output style template: auto-bundle key shape', () => {
  it('maps to the reference/output-style.md bundle key', () => {
    // Mirrors the bundler's readTreeDir(relative(TEMPLATES_DIR, file)) normalization.
    // Does NOT read the @generated bundled-files.ts — spec 6 owns regeneration.
    expect(existsSync(STYLE_DOC), `${STYLE_DOC} should exist`).toBe(true);
    const key = relative(TEMPLATES_DIR, STYLE_DOC).split(/[\\/]/).join('/');
    expect(key).toBe('reference/output-style.md');
  });
});

describe('output style template: no self-scoring rubric', () => {
  it('contains no numeric scoring rubric', () => {
    expect(read()).not.toMatch(/\b(?:1-10|1 to 10|score .* out of)\b/i);
  });
});

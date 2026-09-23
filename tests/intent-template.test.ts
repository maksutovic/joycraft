import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INTENT_README } from '../src/update-inventory';

const ROOT = join(__dirname, '..');
const TEMPLATE = join(ROOT, 'src', 'templates', 'INTENT_TEMPLATE.md');
const README = join(ROOT, 'src', 'templates', 'intent', 'README.md');

function read(path: string): string {
  return readFileSync(path, 'utf-8');
}

/**
 * The eight intent sections, in order. Author, Status, and source are header
 * fields (`Label: value` lines skills stamp in place); the rest are `## `
 * headings.
 */
const SECTIONS: Array<[string, RegExp]> = [
  ['Author', /^Author:/m],
  ['Status', /^Status:/m],
  ['source', /^source:/m],
  ['Problem', /^## Problem\s*$/m],
  ['Proposed outcome', /^## Proposed outcome\s*$/m],
  ['Affected users and systems', /^## Affected users and systems\s*$/m],
  ['Constraints', /^## Constraints\s*$/m],
  ['Open questions', /^## Open questions\s*$/m],
];

describe('INTENT_TEMPLATE.md', () => {
  it('carries the eight intent sections in order', () => {
    const content = read(TEMPLATE);
    let last = -1;
    for (const [name, pattern] of SECTIONS) {
      const match = pattern.exec(content);
      expect(match, `missing section: ${name}`).not.toBeNull();
      expect(match!.index, `section out of order: ${name}`).toBeGreaterThan(last);
      last = match!.index;
    }
  });

  it('documents source as an open free-text field with no schema', () => {
    const content = read(TEMPLATE);
    for (const value of ['human', 'interview', 'linear:<id>', 'alert:<name>', '<system>:<id>']) {
      expect(content).toContain(value);
    }
    expect(content.toLowerCase()).toMatch(/no schema/);
    expect(content.toLowerCase()).toMatch(/validator/);
    expect(content).not.toMatch(/```json/);
    expect(content).not.toContain('$schema');
  });
});

describe('docs/intent inbox README', () => {
  it('maps the playbook vocabulary onto Joycraft artifact paths', () => {
    const content = read(README);
    for (const needle of ['docs/features/', 'brief.md', 'design.md', 'specs/']) {
      expect(content).toContain(needle);
    }
    expect(content).toContain('docs/templates/INTENT_TEMPLATE.md');
  });

  it('renames nothing', () => {
    const content = read(README).toLowerCase();
    expect(content).not.toMatch(/\brename (your|the|it|them)\b/);
    expect(content).toMatch(/no(thing is)? renam/);
  });

  it('is the exact content the installer writes', () => {
    expect(INTENT_README).toBe(read(README));
  });
});

describe('no absolute paths', () => {
  it.each([TEMPLATE, README])('%s has no absolute or repo-internal paths', (path) => {
    const content = read(path);
    expect(content).not.toMatch(/\/Users\//);
    expect(content).not.toMatch(/joycraft\/src/);
  });
});

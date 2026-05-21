import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..');
const TEMPLATES_DIR = join(ROOT, 'src', 'templates');
const REFERENCE_DIR = join(TEMPLATES_DIR, 'context', 'reference');

const EXPECTED_FILES = [
  'backend.md',
  'design-system.md',
  'frontend-methodology.md',
  'reference-doc.md',
  'testing.md',
];

/** Recursively walk a directory and return all file paths (mirrors the bundler). */
function walkDir(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

describe('reference templates: files exist', () => {
  it('directory exists and contains exactly the five expected files', () => {
    expect(existsSync(REFERENCE_DIR), `${REFERENCE_DIR} should exist`).toBe(true);
    const found = readdirSync(REFERENCE_DIR)
      .filter((f) => f.endsWith('.md'))
      .sort();
    expect(found).toEqual(EXPECTED_FILES);
  });
});

describe('reference templates: shape', () => {
  for (const file of EXPECTED_FILES) {
    it(`${file} has an H1, a blockquote purpose line, and at least one section`, () => {
      const content = readFileSync(join(REFERENCE_DIR, file), 'utf-8');
      const lines = content.split('\n');
      expect(lines.some((l) => /^# /.test(l)), `${file} missing H1`).toBe(true);
      expect(lines.some((l) => /^> /.test(l)), `${file} missing blockquote`).toBe(true);
      expect(lines.some((l) => /^## /.test(l)), `${file} missing section`).toBe(true);
    });

    it(`${file} contains deletable italic example prose`, () => {
      const content = readFileSync(join(REFERENCE_DIR, file), 'utf-8');
      // Match _italic_ example markers in the established fact-doc shape.
      expect(/_[^_]+_/.test(content), `${file} has no italic example`).toBe(true);
    });
  }
});

describe('reference templates: no absolute or repo paths', () => {
  for (const file of EXPECTED_FILES) {
    it(`${file} uses project-relative paths only`, () => {
      const content = readFileSync(join(REFERENCE_DIR, file), 'utf-8');
      expect(content).not.toMatch(/\/Users\//);
      expect(content).not.toMatch(/joycraft\/src/);
    });
  }
});

describe('reference templates: auto-bundle key shape', () => {
  it('maps each file to a context/reference/<name>.md bundle key', () => {
    // Structural assertion mirroring the bundler's readTreeDir(relative(TEMPLATES_DIR, file)).
    // Does NOT read the @generated bundled-files.ts (spec 9 owns regeneration).
    const keys = walkDir(REFERENCE_DIR)
      .map((f) => relative(TEMPLATES_DIR, f).split(/[\\/]/).join('/'))
      .sort();
    expect(keys).toEqual(EXPECTED_FILES.map((f) => `context/reference/${f}`));
  });
});

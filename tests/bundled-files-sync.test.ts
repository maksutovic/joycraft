import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..');
const SKILLS_DIR = join(ROOT, 'src', 'claude-skills');
const CODEX_SKILLS_DIR = join(ROOT, 'src', 'codex-skills');
const TEMPLATES_DIR = join(ROOT, 'src', 'templates');

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

function buildExpectedRecord(
  dir: string,
  mode: 'flat' | 'tree',
): Record<string, string> {
  if (mode === 'flat') {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .sort();
    const record: Record<string, string> = {};
    for (const file of files) {
      record[file] = readFileSync(join(dir, file), 'utf-8');
    }
    return record;
  }
  const allFiles = walkDir(dir).sort();
  const record: Record<string, string> = {};
  for (const file of allFiles) {
    record[relative(dir, file)] = readFileSync(file, 'utf-8');
  }
  return record;
}

describe('bundled-files.ts sync check', () => {
  // Import the generated module — this reads the current bundled-files.ts
  let actual: {
    SKILLS: Record<string, string>;
    TEMPLATES: Record<string, string>;
    CODEX_SKILLS: Record<string, string>;
  };

  it('SKILLS matches src/claude-skills/', async () => {
    actual = await import('../src/bundled-files.js');
    const expected = buildExpectedRecord(SKILLS_DIR, 'flat');
    expect(Object.keys(actual.SKILLS).sort()).toEqual(
      Object.keys(expected).sort(),
    );
    for (const [key, value] of Object.entries(expected)) {
      expect(actual.SKILLS[key], `SKILLS["${key}"] content drift`).toBe(value);
    }
  });

  it('TEMPLATES matches src/templates/', async () => {
    actual = actual ?? (await import('../src/bundled-files.js'));
    const expected = buildExpectedRecord(TEMPLATES_DIR, 'tree');
    expect(Object.keys(actual.TEMPLATES).sort()).toEqual(
      Object.keys(expected).sort(),
    );
    for (const [key, value] of Object.entries(expected)) {
      expect(actual.TEMPLATES[key], `TEMPLATES["${key}"] content drift`).toBe(
        value,
      );
    }
  });

  it('CODEX_SKILLS matches src/codex-skills/', async () => {
    actual = actual ?? (await import('../src/bundled-files.js'));
    const expected = buildExpectedRecord(CODEX_SKILLS_DIR, 'flat');
    expect(Object.keys(actual.CODEX_SKILLS).sort()).toEqual(
      Object.keys(expected).sort(),
    );
    for (const [key, value] of Object.entries(expected)) {
      expect(
        actual.CODEX_SKILLS[key],
        `CODEX_SKILLS["${key}"] content drift`,
      ).toBe(value);
    }
  });
});

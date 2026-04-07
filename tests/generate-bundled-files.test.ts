import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..');
const SCRIPT = join(ROOT, 'scripts', 'generate-bundled-files.mjs');
const OUTPUT = join(ROOT, 'src', 'bundled-files.ts');
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

describe('generate-bundled-files script', () => {
  beforeAll(() => {
    execSync(`node ${SCRIPT}`, { cwd: ROOT });
  });

  it('produces a file with SKILLS, TEMPLATES, and CODEX_SKILLS exports', async () => {
    const mod = await import(OUTPUT);
    expect(mod.SKILLS).toBeDefined();
    expect(typeof mod.SKILLS).toBe('object');
    expect(mod.TEMPLATES).toBeDefined();
    expect(typeof mod.TEMPLATES).toBe('object');
    expect(mod.CODEX_SKILLS).toBeDefined();
    expect(typeof mod.CODEX_SKILLS).toBe('object');
  });

  it('SKILLS keys match src/claude-skills/ filenames', async () => {
    const mod = await import(OUTPUT);
    const expected = readdirSync(SKILLS_DIR).filter((f) => f.endsWith('.md')).sort();
    expect(Object.keys(mod.SKILLS).sort()).toEqual(expected);
  });

  it('CODEX_SKILLS keys match src/codex-skills/ filenames', async () => {
    const mod = await import(OUTPUT);
    const expected = readdirSync(CODEX_SKILLS_DIR).filter((f) => f.endsWith('.md')).sort();
    expect(Object.keys(mod.CODEX_SKILLS).sort()).toEqual(expected);
  });

  it('TEMPLATES keys match src/templates/ relative paths', async () => {
    const mod = await import(OUTPUT);
    const allFiles = walkDir(TEMPLATES_DIR);
    const expected = allFiles.map((f) => relative(TEMPLATES_DIR, f)).sort();
    expect(Object.keys(mod.TEMPLATES).sort()).toEqual(expected);
  });

  it('SKILLS values match source file contents', async () => {
    const mod = await import(OUTPUT);
    for (const [key, value] of Object.entries(mod.SKILLS)) {
      const source = readFileSync(join(SKILLS_DIR, key), 'utf-8');
      expect(value, `SKILLS["${key}"] content mismatch`).toBe(source);
    }
  });

  it('CODEX_SKILLS values match source file contents', async () => {
    const mod = await import(OUTPUT);
    for (const [key, value] of Object.entries(mod.CODEX_SKILLS)) {
      const source = readFileSync(join(CODEX_SKILLS_DIR, key), 'utf-8');
      expect(value, `CODEX_SKILLS["${key}"] content mismatch`).toBe(source);
    }
  });

  it('TEMPLATES values match source file contents', async () => {
    const mod = await import(OUTPUT);
    for (const [key, value] of Object.entries(mod.TEMPLATES)) {
      const source = readFileSync(join(TEMPLATES_DIR, key), 'utf-8');
      expect(value, `TEMPLATES["${key}"] content mismatch`).toBe(source);
    }
  });

  it('generated file uses no backtick template literals for values', () => {
    const content = readFileSync(OUTPUT, 'utf-8');
    // Values should be JSON.stringify'd (double-quoted), not backtick template literals.
    // Match lines like:   "key": `...` — which would indicate template literal usage.
    const lines = content.split('\n');
    const templateLiteralLines = lines.filter((line) =>
      /^\s+"[^"]+"\s*:\s*`/.test(line),
    );
    expect(
      templateLiteralLines,
      'Generated file should not contain backtick template literals for values',
    ).toEqual([]);
  });
});

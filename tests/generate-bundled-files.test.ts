import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..');
const SCRIPT = join(ROOT, 'scripts', 'generate-bundled-files.mjs');
const OUTPUT = join(ROOT, 'src', 'bundled-files.ts');
const SKILLS_DIR = join(ROOT, 'src', 'claude-skills');
const CODEX_SKILLS_DIR = join(ROOT, 'src', 'codex-skills');
const PI_SKILLS_DIR = join(ROOT, 'src', 'pi-skills');
const CANONICAL_SKILLS_DIR = join(ROOT, 'src', 'skills');
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

// ---------------------------------------------------------------------------
// Pipeline tests for `src/skills/` -> per-harness dirs (spec: wire-generator-pipeline)
// ---------------------------------------------------------------------------

const HARNESS_DIRS = [
  ['claude', SKILLS_DIR],
  ['codex', CODEX_SKILLS_DIR],
  ['pi', PI_SKILLS_DIR],
] as const;

function scanResidue(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .flatMap((f) => {
      const content = readFileSync(join(dir, f), 'utf-8');
      const vars = content.match(/\{\{[a-z_]+\}\}/g) ?? [];
      return vars.map((v) => `${f}: ${v}`);
    });
}

function scanUnclosed(dir: string): string[] {
  const violations: string[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const content = readFileSync(join(dir, f), 'utf-8');
    const opens = (content.match(/<!--\s*harness:[^>]+?-->/g) ?? []).length;
    const closes = (content.match(/<!--\s*\/harness\s*-->/g) ?? []).length;
    if (opens !== closes) {
      violations.push(`${f}: ${opens} open / ${closes} close`);
    }
  }
  return violations;
}

describe('generator pipeline: src/skills/ -> per-harness dirs', () => {
  // Snapshot src/skills/ before mutating so we can restore — the canonical
  // dir is now populated (spec 5+ migration) and wiping it would desync the
  // per-harness dirs from the bundled-files.ts that sibling sync tests check.
  const canonicalBackup: Record<string, string> = {};

  beforeAll(() => {
    if (existsSync(CANONICAL_SKILLS_DIR)) {
      for (const f of readdirSync(CANONICAL_SKILLS_DIR)) {
        if (f.endsWith('.md')) {
          canonicalBackup[f] = readFileSync(join(CANONICAL_SKILLS_DIR, f), 'utf-8');
          rmSync(join(CANONICAL_SKILLS_DIR, f));
        }
      }
    }
    execSync(`node ${SCRIPT}`, { cwd: ROOT });
  });

  afterAll(() => {
    // Restore canonical files and regenerate so sibling tests see consistent state.
    mkdirSync(CANONICAL_SKILLS_DIR, { recursive: true });
    for (const [f, content] of Object.entries(canonicalBackup)) {
      writeFileSync(join(CANONICAL_SKILLS_DIR, f), content);
    }
    execSync(`node ${SCRIPT}`, { cwd: ROOT });
  });

  it('runs as a no-op when src/skills/ is empty (idempotent + sync-test-compatible)', () => {
    // beforeAll already ran the script with src/skills/ empty. Capture the
    // resulting bundled-files.ts, run again, and assert byte-for-byte equality.
    // (The sibling sync tests assert that bundled-files.ts matches the disk
    // contents of the per-harness dirs — the existing pre-pipeline behavior —
    // so passing them + this idempotency check together proves "no-op when
    // src/skills/ is empty".)
    const before = readFileSync(OUTPUT, 'utf-8');
    execSync(`node ${SCRIPT}`, { cwd: ROOT });
    const after = readFileSync(OUTPUT, 'utf-8');
    expect(after).toBe(before);
  });

  it('creates src/skills/ if absent (no error on missing canonical dir)', () => {
    // After the generator runs in beforeAll, the canonical dir must exist.
    expect(existsSync(CANONICAL_SKILLS_DIR)).toBe(true);
    expect(statSync(CANONICAL_SKILLS_DIR).isDirectory()).toBe(true);
  });

  it('no {{var}} residue in any emitted per-harness skill file', () => {
    const findings = HARNESS_DIRS.flatMap(([, dir]) => scanResidue(dir));
    expect(findings).toEqual([]);
  });

  it('no unclosed <!-- harness: --> blocks in any emitted per-harness skill file', () => {
    const findings = HARNESS_DIRS.flatMap(([, dir]) => scanUnclosed(dir));
    expect(findings).toEqual([]);
  });
});

describe('generator pipeline: canonical fixture roundtrip', () => {
  const fixtureName = '__test-fixture-pipeline.md';
  const canonicalPath = join(CANONICAL_SKILLS_DIR, fixtureName);
  const claudeOut = join(SKILLS_DIR, fixtureName);
  const codexOut = join(CODEX_SKILLS_DIR, fixtureName);
  const piOut = join(PI_SKILLS_DIR, fixtureName);

  beforeAll(() => {
    mkdirSync(CANONICAL_SKILLS_DIR, { recursive: true });
    writeFileSync(
      canonicalPath,
      `---\nname: fixture\ninstructions: 5\n---\n` +
        `Run {{skill_prefix}}fix in {{skills_dir}}.\n` +
        `<!-- harness:claude -->\nclaude only\n<!-- /harness -->\n` +
        `<!-- harness:codex|pi -->\ncodex or pi\n<!-- /harness -->\n`,
    );
    execSync(`node ${SCRIPT}`, { cwd: ROOT });
  });

  afterAll(() => {
    if (existsSync(canonicalPath)) rmSync(canonicalPath);
    if (existsSync(claudeOut)) rmSync(claudeOut);
    if (existsSync(codexOut)) rmSync(codexOut);
    if (existsSync(piOut)) rmSync(piOut);
    // Regenerate so the rest of the suite sees clean per-harness dirs and
    // bundled-files.ts matches main again.
    execSync(`node ${SCRIPT}`, { cwd: ROOT });
  });

  it('writes a transformed file to each per-harness dir', () => {
    expect(existsSync(claudeOut)).toBe(true);
    expect(existsSync(codexOut)).toBe(true);
    expect(existsSync(piOut)).toBe(true);
  });

  it('claude variant keeps instructions field and substitutes claude vars', () => {
    const out = readFileSync(claudeOut, 'utf-8');
    expect(out).toContain('instructions: 5');
    expect(out).toContain('/joycraft-fix in .claude/skills');
    expect(out).toContain('claude only');
    expect(out).not.toContain('codex or pi');
    expect(out).not.toContain('{{');
    expect(out).not.toContain('<!-- harness:');
  });

  it('codex variant strips instructions and substitutes codex vars', () => {
    const out = readFileSync(codexOut, 'utf-8');
    expect(out).not.toContain('instructions:');
    expect(out).toContain('$joycraft-fix in .agents/skills');
    expect(out).toContain('codex or pi');
    expect(out).not.toContain('claude only');
    expect(out).not.toContain('{{');
    expect(out).not.toContain('<!-- harness:');
  });

  it('pi variant strips instructions and substitutes pi vars', () => {
    const out = readFileSync(piOut, 'utf-8');
    expect(out).not.toContain('instructions:');
    expect(out).toContain('/skill:joycraft-fix in .pi/skills');
    expect(out).toContain('codex or pi');
    expect(out).not.toContain('claude only');
    expect(out).not.toContain('{{');
    expect(out).not.toContain('<!-- harness:');
  });
});

describe('generator pipeline: unknown variable surfaces at build time', () => {
  const fixtureName = '__test-fixture-bad-var.md';
  const canonicalPath = join(CANONICAL_SKILLS_DIR, fixtureName);
  const claudeOut = join(SKILLS_DIR, fixtureName);
  const codexOut = join(CODEX_SKILLS_DIR, fixtureName);
  const piOut = join(PI_SKILLS_DIR, fixtureName);

  afterAll(() => {
    if (existsSync(canonicalPath)) rmSync(canonicalPath);
    if (existsSync(claudeOut)) rmSync(claudeOut);
    if (existsSync(codexOut)) rmSync(codexOut);
    if (existsSync(piOut)) rmSync(piOut);
    execSync(`node ${SCRIPT}`, { cwd: ROOT });
  });

  it('fails the build (non-zero exit) on unknown {{var}}', () => {
    mkdirSync(CANONICAL_SKILLS_DIR, { recursive: true });
    writeFileSync(canonicalPath, `Hello {{nope}}.\n`);
    let threw = false;
    let stderr = '';
    try {
      execSync(`node ${SCRIPT}`, { cwd: ROOT, stdio: 'pipe' });
    } catch (err) {
      threw = true;
      // execSync exception carries stderr buffer.
      // @ts-expect-error -- ExecException shape
      stderr = (err.stderr?.toString() ?? '') + (err.message ?? '');
    }
    expect(threw).toBe(true);
    expect(stderr).toContain('unknown template variable: {{nope}}');
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const SCRIPT = join(ROOT, 'scripts', 'generate-bundled-files.mjs');
const OUTPUT = join(ROOT, 'src', 'bundled-files.ts');

describe('regenerate bundled files (feature finalization)', () => {
  let content: string;

  beforeAll(() => {
    // Run the generator cleanly — this is the only sanctioned way to produce the artifact.
    execSync(`node ${SCRIPT}`, { cwd: ROOT });
    content = readFileSync(OUTPUT, 'utf-8');
  });

  it('retains the @generated marker (never hand-edited)', () => {
    expect(content.startsWith('// @generated')).toBe(true);
  });

  it('bundles the three new Claude skills', () => {
    expect(content).toContain('"joycraft-add-context.md"');
    expect(content).toContain('"joycraft-gather-context.md"');
    expect(content).toContain('"joycraft-setup.md"');
  });

  it('bundles the reference template keys under context/reference/', () => {
    for (const name of [
      'design-system',
      'frontend-methodology',
      'backend',
      'testing',
      'reference-doc',
    ]) {
      expect(content).toContain(`"context/reference/${name}.md"`);
    }
  });

  it('contains no legacy docs/specs/ anywhere in the bundle (skills or templates)', () => {
    // docs/specs/ is fully retired: feature specs live under docs/features/<slug>/specs/,
    // bugfixes under docs/bugfixes/<area>/. Nothing the bundler ships should reference it.
    expect(content).not.toContain('docs/specs/');
  });

  it('is deterministic — a second regen yields identical output', () => {
    execSync(`node ${SCRIPT}`, { cwd: ROOT });
    const second = readFileSync(OUTPUT, 'utf-8');
    expect(second).toBe(content);
  });
});

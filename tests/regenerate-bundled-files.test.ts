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

  it('reflects spec 1: bundled SKILLS/CODEX_SKILLS content carries no legacy docs/specs/', () => {
    // Scope to the skill records (spec 1's surface). Pre-existing template content
    // (CONTRIBUTING, spec-dispatch.yml) is out of this feature's scope and excluded.
    const skillsBlock = content.slice(
      content.indexOf('export const SKILLS'),
      content.indexOf('export const TEMPLATES'),
    );
    const codexBlock = content.slice(content.indexOf('export const CODEX_SKILLS'));
    expect(skillsBlock).not.toContain('docs/specs/');
    expect(codexBlock).not.toContain('docs/specs/');
  });

  it('is deterministic — a second regen yields identical output', () => {
    execSync(`node ${SCRIPT}`, { cwd: ROOT });
    const second = readFileSync(OUTPUT, 'utf-8');
    expect(second).toBe(content);
  });
});

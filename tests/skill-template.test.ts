import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore — .mjs sibling, no .d.ts
import { applyTemplate } from '../scripts/lib/skill-template.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('applyTemplate — variable substitution', () => {
  it('substitutes {{skill_prefix}} for claude', () => {
    expect(applyTemplate('use {{skill_prefix}}foo', 'claude')).toBe('use /joycraft-foo');
  });

  it('substitutes {{skill_prefix}} for codex', () => {
    expect(applyTemplate('use {{skill_prefix}}foo', 'codex')).toBe('use $joycraft-foo');
  });

  it('substitutes {{skill_prefix}} for pi', () => {
    expect(applyTemplate('use {{skill_prefix}}foo', 'pi')).toBe('use /skill:joycraft-foo');
  });

  it('{{clear}} for claude contains /clear', () => {
    const out = applyTemplate('When done, {{clear}}.', 'claude');
    expect(out).toContain('/clear');
  });

  it('{{clear}} for codex is multi-surface (CLI + Cmd+N)', () => {
    const out = applyTemplate('When done, {{clear}}.', 'codex');
    expect(out).toContain('/clear');
    expect(out).toContain('in the CLI');
    expect(out).toContain('Cmd+N');
  });

  it('{{clear}} for pi expands to /new without a standalone /clear', () => {
    const out = applyTemplate('When done, {{clear}}.', 'pi');
    expect(out).toContain('/new');
    // For pi the expansion should not contain /clear at all (no multi-surface sentence).
    expect(out).not.toContain('/clear');
  });

  it('{{skills_dir}} per harness', () => {
    expect(applyTemplate('{{skills_dir}}', 'claude')).toBe('.claude/skills');
    expect(applyTemplate('{{skills_dir}}', 'codex')).toBe('.agents/skills');
    expect(applyTemplate('{{skills_dir}}', 'pi')).toBe('.pi/skills');
  });

  it('{{boundary_file}} per harness', () => {
    expect(applyTemplate('{{boundary_file}}', 'claude')).toBe('CLAUDE.md');
    expect(applyTemplate('{{boundary_file}}', 'codex')).toBe('AGENTS.md');
    expect(applyTemplate('{{boundary_file}}', 'pi')).toBe('CLAUDE.md and/or AGENTS.md');
  });

  it('substitutes two {{var}} on the same line', () => {
    const out = applyTemplate('{{skill_prefix}}a and {{skill_prefix}}b', 'claude');
    expect(out).toBe('/joycraft-a and /joycraft-b');
  });

  it('throws on unknown variable with filename', () => {
    expect(() => applyTemplate('hi {{nope}}', 'claude', 'x.md')).toThrow(
      'unknown template variable: {{nope}} in x.md',
    );
  });

  it('throws on unknown variable without filename', () => {
    expect(() => applyTemplate('hi {{nope}}', 'claude')).toThrow(
      /unknown template variable: \{\{nope\}\}/,
    );
  });
});

describe('applyTemplate — conditional blocks', () => {
  it('keeps a single-harness block when harness matches (claude)', () => {
    const src = 'before\n<!-- harness:claude -->X<!-- /harness -->\nafter';
    const out = applyTemplate(src, 'claude');
    expect(out).toContain('X');
    expect(out).not.toContain('<!-- harness:');
    expect(out).not.toContain('<!-- /harness -->');
  });

  it('strips a single-harness block when harness does not match (pi)', () => {
    const src = 'before\n<!-- harness:claude -->X<!-- /harness -->\nafter';
    const out = applyTemplate(src, 'pi');
    expect(out).not.toContain('X');
    expect(out).not.toContain('<!-- harness:');
    expect(out).not.toContain('<!-- /harness -->');
  });

  it('keeps a pipe-list block for any listed harness (codex)', () => {
    const src = 'A\n<!-- harness:claude|codex -->Y<!-- /harness -->\nB';
    expect(applyTemplate(src, 'codex')).toContain('Y');
    expect(applyTemplate(src, 'claude')).toContain('Y');
  });

  it('strips a pipe-list block when harness is not listed (pi)', () => {
    const src = 'A\n<!-- harness:claude|codex -->Y<!-- /harness -->\nB';
    const out = applyTemplate(src, 'pi');
    expect(out).not.toContain('Y');
    expect(out).not.toContain('<!-- harness:');
  });

  it('supports pipe-list with whitespace (trims)', () => {
    const src = '<!-- harness:claude | codex -->Z<!-- /harness -->';
    expect(applyTemplate(src, 'codex')).toContain('Z');
    expect(applyTemplate(src, 'pi')).not.toContain('Z');
  });

  it('strips blocks for an unknown harness name (e.g. emacs)', () => {
    const src = '<!-- harness:emacs -->NOPE<!-- /harness -->';
    expect(applyTemplate(src, 'claude')).not.toContain('NOPE');
    expect(applyTemplate(src, 'codex')).not.toContain('NOPE');
    expect(applyTemplate(src, 'pi')).not.toContain('NOPE');
  });

  it('throws on unclosed harness block', () => {
    const src = '<!-- harness:claude -->oops\nno closer';
    expect(() => applyTemplate(src, 'claude', 'bad.md')).toThrow(/unclosed harness block/);
  });

  it('strips a block first so {{vars}} inside a stripped block never throw', () => {
    const src = '<!-- harness:claude -->{{not_a_var}}<!-- /harness -->';
    // For codex this block is stripped → no throw, output empty/clean
    expect(() => applyTemplate(src, 'codex')).not.toThrow();
  });
});

describe('applyTemplate — frontmatter', () => {
  it('drops instructions: for codex, preserves other keys in order', () => {
    const src = '---\nname: a\ndescription: b\ninstructions: c\nextra: d\n---\nbody\n';
    const out = applyTemplate(src, 'codex');
    expect(out).not.toMatch(/^instructions:/m);
    // Order preserved
    const yaml = out.split('---')[1];
    const idxName = yaml.indexOf('name:');
    const idxDesc = yaml.indexOf('description:');
    const idxExtra = yaml.indexOf('extra:');
    expect(idxName).toBeLessThan(idxDesc);
    expect(idxDesc).toBeLessThan(idxExtra);
  });

  it('drops instructions: for pi', () => {
    const src = '---\nname: a\ninstructions: c\n---\nbody\n';
    const out = applyTemplate(src, 'pi');
    expect(out).not.toMatch(/^instructions:/m);
    expect(out).toContain('name: a');
  });

  it('retains instructions: for claude verbatim', () => {
    const src = '---\nname: a\ninstructions: 32\n---\nbody\n';
    const out = applyTemplate(src, 'claude');
    expect(out).toContain('instructions: 32');
  });

  it('handles no frontmatter', () => {
    const src = 'just a body, no frontmatter\n';
    expect(applyTemplate(src, 'claude')).toBe('just a body, no frontmatter\n');
  });

  it('leaves frontmatter unchanged when no instructions: field present (codex)', () => {
    const src = '---\nname: a\ndescription: b\n---\nbody\n';
    const out = applyTemplate(src, 'codex');
    expect(out).toContain('name: a');
    expect(out).toContain('description: b');
  });

  it('does not leave a blank line where instructions: was stripped', () => {
    const src = '---\nname: a\ninstructions: c\ndescription: b\n---\nbody\n';
    const out = applyTemplate(src, 'codex');
    // Frontmatter should not contain two consecutive newlines (blank line residue)
    const yaml = out.split('---')[1];
    expect(yaml).not.toMatch(/\n\n/);
  });
});

describe('applyTemplate — purity', () => {
  it('source module imports no fs/path/process/network modules', () => {
    const modPath = join(__dirname, '..', 'scripts', 'lib', 'skill-template.mjs');
    const src = readFileSync(modPath, 'utf-8');
    // Forbid any import/require of node fs/path/process/network packages
    expect(src).not.toMatch(/from ['"]node:fs/);
    expect(src).not.toMatch(/from ['"]node:path/);
    expect(src).not.toMatch(/from ['"]node:process/);
    expect(src).not.toMatch(/from ['"]node:https?/);
    expect(src).not.toMatch(/from ['"]fs['"]/);
    expect(src).not.toMatch(/from ['"]path['"]/);
    expect(src).not.toMatch(/require\(['"](node:)?(fs|path|process|https?)['"]\)/);
  });
});

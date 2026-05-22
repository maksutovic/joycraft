import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const CLAUDE_FILE = join(ROOT, 'src', 'claude-skills', 'joycraft-add-context.md');
const CODEX_FILE = join(ROOT, 'src', 'codex-skills', 'joycraft-add-context.md');

const claude = () => readFileSync(CLAUDE_FILE, 'utf-8');
const codex = () => readFileSync(CODEX_FILE, 'utf-8');

describe('add-context skill: files exist', () => {
  it('Claude and Codex skill files both exist', () => {
    expect(existsSync(CLAUDE_FILE), `${CLAUDE_FILE} should exist`).toBe(true);
    expect(existsSync(CODEX_FILE), `${CODEX_FILE} should exist`).toBe(true);
  });
});

describe('add-context skill: Claude frontmatter', () => {
  it('has name, description, and instructions frontmatter fields', () => {
    const c = claude();
    expect(c).toMatch(/^---\n[\s\S]*?\n---/);
    expect(c).toMatch(/\bname:\s*joycraft-add-context/);
    expect(c).toMatch(/\bdescription:\s*\S/);
    expect(c).toMatch(/\binstructions:\s*\d+/);
  });
});

describe('add-context skill: distinct invocation vocabulary', () => {
  it('description carries long-form reference / authoring vocabulary', () => {
    const desc = claude().match(/description:\s*(.+)/)?.[1] ?? '';
    expect(desc.toLowerCase()).toMatch(/reference doc|long-form|design system|methodology|conventions/);
  });

  it('does not duplicate add-fact operational signal-word phrasing', () => {
    // add-fact's description routes to production map / dangerous assumptions / decision log etc.
    const desc = claude().match(/description:\s*(.+)/)?.[1]?.toLowerCase() ?? '';
    expect(desc).not.toContain('production map');
    expect(desc).not.toContain('dangerous assumptions');
    expect(desc).not.toContain('decision log');
  });
});

describe('add-context skill: scaffolds reference doc from template', () => {
  it('references the reference/ doc destination and the template source', () => {
    const c = claude();
    expect(c).toContain('docs/context/reference/');
    expect(c).toContain('docs/templates/context/reference/');
  });

  it('names the five bundled templates including the generic fallback', () => {
    const c = claude();
    expect(c).toContain('design-system');
    expect(c).toContain('frontend-methodology');
    expect(c).toContain('backend');
    expect(c).toContain('testing');
    expect(c).toContain('reference-doc');
  });

  it('lazy-creates the reference/ directory on first write', () => {
    expect(claude().toLowerCase()).toMatch(/lazy[- ]create|create.*on first write|create.*if (it )?does(n.t| not) exist/);
  });

  it('writes the doc immediately, per-doc (not batched)', () => {
    expect(claude().toLowerCase()).toMatch(/immediately|per[- ]doc|write[- ]as[- ]you[- ]go|single[- ]doc/);
  });
});

describe('add-context skill: idempotent Context Map row', () => {
  it('describes create-or-update of the ## Context Map section and row', () => {
    const c = claude();
    expect(c).toContain('## Context Map');
    expect(c.toLowerCase()).toMatch(/create.*section.*if.*absent|create the section|if.*context map.*does(n.t| not) exist/);
    expect(c.toLowerCase()).toMatch(/update.*in place|update the row|update it/);
  });

  it('explicitly forbids duplicate rows', () => {
    expect(claude().toLowerCase()).toMatch(/do not duplicate|never duplicate|no duplicate|without duplicating/);
  });
});

describe('add-context skill: self-contained', () => {
  it('does not instruct importing or calling another skill for its logic', () => {
    expect(claude().toLowerCase()).not.toMatch(/import .*add-fact|call into .*add-fact|delegate to .*add-fact/);
  });
});

describe('add-context skill: project-relative paths only', () => {
  it('Claude file uses no absolute or repo paths', () => {
    const c = claude();
    expect(c).not.toMatch(/\/Users\//);
    expect(c).not.toMatch(/joycraft\/src/);
  });

  it('Codex file uses no absolute or repo paths', () => {
    const c = codex();
    expect(c).not.toMatch(/\/Users\//);
    expect(c).not.toMatch(/joycraft\/src/);
  });
});

describe('add-context skill: Codex mirror parity', () => {
  it('Codex name matches Claude name', () => {
    const cn = claude().match(/name:\s*(.+)/)?.[1]?.trim();
    const xn = codex().match(/name:\s*(.+)/)?.[1]?.trim();
    expect(xn).toBe(cn);
  });

  it('Codex has no instructions: frontmatter field', () => {
    const fm = codex().match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    expect(fm).not.toMatch(/\binstructions:/);
  });

  it('Codex uses $joycraft- sigil, not /joycraft- invocation syntax', () => {
    const c = codex();
    expect(c).toContain('$joycraft-add-context');
    expect(c).not.toMatch(/(?:^|[\s`])\/joycraft-/m);
  });

  it('Codex references .agents/ rather than .claude/', () => {
    const c = codex();
    expect(c).not.toContain('.claude/');
  });
});

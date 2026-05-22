import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const CLAUDE_FILE = join(ROOT, 'src', 'claude-skills', 'joycraft-gather-context.md');
const CODEX_FILE = join(ROOT, 'src', 'codex-skills', 'joycraft-gather-context.md');

const claude = () => readFileSync(CLAUDE_FILE, 'utf-8');
const codex = () => readFileSync(CODEX_FILE, 'utf-8');

describe('gather-context skill: files exist', () => {
  it('Claude and Codex skill files both exist', () => {
    expect(existsSync(CLAUDE_FILE), `${CLAUDE_FILE} should exist`).toBe(true);
    expect(existsSync(CODEX_FILE), `${CODEX_FILE} should exist`).toBe(true);
  });
});

describe('gather-context skill: Claude frontmatter', () => {
  it('has name, description, and instructions frontmatter fields', () => {
    const c = claude();
    expect(c).toMatch(/^---\n[\s\S]*?\n---/);
    expect(c).toMatch(/\bname:\s*joycraft-gather-context/);
    expect(c).toMatch(/\bdescription:\s*\S/);
    expect(c).toMatch(/\binstructions:\s*\d+/);
  });
});

describe('gather-context skill: onboarding vocabulary', () => {
  it('description carries onboarding / first-run vocabulary', () => {
    const desc = claude().match(/description:\s*(.+)/)?.[1]?.toLowerCase() ?? '';
    expect(desc).toMatch(/onboard|first[- ]run|first[- ]time|gather|populate.*context/);
  });

  it('description does not duplicate add-fact operational signal-word phrasing', () => {
    const desc = claude().match(/description:\s*(.+)/)?.[1]?.toLowerCase() ?? '';
    expect(desc).not.toContain('route it to the correct context document');
  });
});

describe('gather-context skill: scan breadth limited', () => {
  it('mentions scanning README + docs/ + CLAUDE.md', () => {
    const c = claude();
    expect(c).toContain('README');
    expect(c).toContain('docs/');
    expect(c).toContain('CLAUDE.md');
  });

  it('gates code-inference scan behind an explicit ask + cost note', () => {
    const c = claude().toLowerCase();
    expect(c).toMatch(/code[- ]inference|code scan|deeper review|full review/);
    expect(c).toMatch(/explicit|only if .*ask|only when .*ask/);
    expect(c).toMatch(/cost|more tokens|token/);
  });
});

describe('gather-context skill: gap-only per-doc skip', () => {
  it('states it skips docs that already have real content (per-doc)', () => {
    const c = claude().toLowerCase();
    expect(c).toMatch(/per[- ]doc/);
    expect(c).toMatch(/already (has|have).*content|skip.*content|not all[- ]or[- ]nothing/);
  });

  it('offers (does not force) the gap interview', () => {
    expect(claude().toLowerCase()).toMatch(/offer|optional|decline/);
  });
});

describe('gather-context skill: inline shape routing', () => {
  it('contains the one-row-vs-paragraphs shape test', () => {
    const c = claude().toLowerCase();
    expect(c).toMatch(/one row|single row|row in a table/);
    expect(c).toMatch(/paragraph/);
  });

  it('routes to the flat fact-docs and to reference docs', () => {
    const c = claude();
    expect(c).toContain('docs/context/');
    expect(c).toContain('docs/context/reference/');
  });

  it('is self-contained — does not instruct importing add-fact/add-context', () => {
    const c = claude().toLowerCase();
    expect(c).not.toMatch(/import .*add-fact|call (into )?.*add-fact as|delegate to .*add-fact/);
    expect(c).not.toMatch(/import .*add-context|call (into )?.*add-context as|delegate to .*add-context/);
  });
});

describe('gather-context skill: batch write + final confirm', () => {
  it('states answers are collected then written in one batch with a final confirm', () => {
    const c = claude().toLowerCase();
    expect(c).toMatch(/batch|one go|one batch|all at once/);
    expect(c).toMatch(/final confirm|confirm.*before writing|one .*confirm/);
    expect(c).toMatch(/collect all|gather all|all .*answers/);
  });

  it('also writes the Context Map rows in the batch', () => {
    expect(claude()).toContain('## Context Map');
  });
});

describe('gather-context skill: project-relative paths only', () => {
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

describe('gather-context skill: Codex mirror parity', () => {
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
    expect(c).toContain('$joycraft-gather-context');
    expect(c).not.toMatch(/(?:^|[\s`])\/joycraft-/m);
  });

  it('Codex references .agents/ rather than .claude/', () => {
    expect(codex()).not.toContain('.claude/');
  });
});

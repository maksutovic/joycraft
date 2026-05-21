import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const CLAUDE_FILE = join(ROOT, 'src', 'claude-skills', 'joycraft-tune.md');
const CODEX_FILE = join(ROOT, 'src', 'codex-skills', 'joycraft-tune.md');

const claude = () => readFileSync(CLAUDE_FILE, 'utf-8');
const codex = () => readFileSync(CODEX_FILE, 'utf-8');

describe('tune context layer: first-run invokes gather', () => {
  it('Claude body invokes /joycraft-gather-context', () => {
    expect(claude()).toContain('/joycraft-gather-context');
  });

  it('the old narrow all-or-nothing risk interview is gone', () => {
    const c = claude();
    // The replaced text routed a "Risk interview (3-5 questions...)" inline in Step 5.
    expect(c).not.toMatch(/Risk interview \(3-5 questions/);
    expect(c).not.toMatch(/What services connect to prod\?/);
  });

  it('Codex body invokes $joycraft-gather-context and no /joycraft-', () => {
    const c = codex();
    expect(c).toContain('$joycraft-gather-context');
    expect(c).not.toMatch(/(?:^|[\s`])\/joycraft-/m);
  });
});

describe('tune context layer: recognizes reference/ in scoring', () => {
  it('Claude assessment references docs/context/reference/', () => {
    expect(claude()).toContain('docs/context/reference/');
  });

  it('Codex assessment references docs/context/reference/', () => {
    expect(codex()).toContain('docs/context/reference/');
  });
});

describe('tune context layer: Documentation dimension flags monoliths', () => {
  it('Claude Documentation dimension flags a ~200-line CLAUDE.md with extract-to-reference + Context Map recommendation', () => {
    const c = claude();
    expect(c).toMatch(/200/);
    expect(c).toContain('docs/context/reference/');
    expect(c).toContain('## Context Map');
  });

  it('the monolith recommendation is advisory — tune never auto-edits CLAUDE.md', () => {
    const c = claude().toLowerCase();
    expect(c).toMatch(/advisory|never auto-edit|do(es)? not auto-edit|recommend(ation)?\b/);
    expect(c).toMatch(/never auto-edit|do(es)? not auto-edit/);
  });

  it('Codex mirrors the monolith flag', () => {
    const c = codex();
    expect(c).toMatch(/200/);
    expect(c).toContain('## Context Map');
  });
});

describe('tune context layer: project-relative paths only', () => {
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

describe('tune context layer: Codex parity', () => {
  it('Codex has no instructions: frontmatter field', () => {
    const fm = codex().match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    expect(fm).not.toMatch(/\binstructions:/);
  });
});

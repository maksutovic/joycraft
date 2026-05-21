import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const CLAUDE_FILE = join(ROOT, 'src', 'claude-skills', 'joycraft-setup.md');
const CODEX_FILE = join(ROOT, 'src', 'codex-skills', 'joycraft-setup.md');

const claude = () => readFileSync(CLAUDE_FILE, 'utf-8');
const codex = () => readFileSync(CODEX_FILE, 'utf-8');

describe('setup alias skill: files exist', () => {
  it('Claude and Codex skill files both exist', () => {
    expect(existsSync(CLAUDE_FILE), `${CLAUDE_FILE} should exist`).toBe(true);
    expect(existsSync(CODEX_FILE), `${CODEX_FILE} should exist`).toBe(true);
  });
});

describe('setup alias skill: Claude frontmatter + newcomer vocabulary', () => {
  it('has name, description, and instructions frontmatter fields', () => {
    const c = claude();
    expect(c).toMatch(/\bname:\s*joycraft-setup/);
    expect(c).toMatch(/\bdescription:\s*\S/);
    expect(c).toMatch(/\binstructions:\s*\d+/);
  });

  it('description carries newcomer vocabulary', () => {
    const desc = claude().match(/description:\s*(.+)/)?.[1]?.toLowerCase() ?? '';
    expect(desc).toMatch(/set up|set-up|setup/);
    expect(desc).toMatch(/get started|getting started/);
    expect(desc).toMatch(/first time|first-time|first run/);
  });
});

describe('setup alias skill: thin router', () => {
  it('Claude body routes to /joycraft-tune', () => {
    expect(claude()).toContain('/joycraft-tune');
  });

  it('does not duplicate tune 7-dimension scoring logic', () => {
    const c = claude();
    expect(c).not.toMatch(/7 [Dd]imensions/);
    expect(c).not.toMatch(/Spec Granularity/);
    expect(c).not.toMatch(/1-5 scale/);
  });
});

describe('setup alias skill: Codex mirror parity', () => {
  it('Codex name matches Claude name', () => {
    const cn = claude().match(/name:\s*(.+)/)?.[1]?.trim();
    const xn = codex().match(/name:\s*(.+)/)?.[1]?.trim();
    expect(xn).toBe(cn);
  });

  it('Codex routes to $joycraft-tune and has no /joycraft- syntax', () => {
    const c = codex();
    expect(c).toContain('$joycraft-tune');
    expect(c).not.toMatch(/(?:^|[\s`])\/joycraft-/m);
  });

  it('Codex has no instructions: frontmatter field', () => {
    const fm = codex().match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    expect(fm).not.toMatch(/\binstructions:/);
  });

  it('Codex references .agents/ rather than .claude/', () => {
    expect(codex()).not.toContain('.claude/');
  });
});

describe('setup alias skill: project-relative paths only', () => {
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

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

describe('gather-context skill: product identity elicitation (D5)', () => {
  it('asks Values, Glossary, and Taste questions', () => {
    const c = claude();
    expect(c).toContain('Product Identity');
    expect(c.toLowerCase()).toMatch(/\bvalues\b/);
    expect(c.toLowerCase()).toMatch(/\bglossary\b/);
    expect(c.toLowerCase()).toMatch(/\btaste\b/);
  });

  it('is gap-only: skips when a Product Identity section already exists', () => {
    expect(claude().toLowerCase()).toMatch(/already has a .*product identity.*skip|product identity.*already exists.*skip|skip this step/);
  });

  it('states the zero-sum admission: each directional line names what it displaces', () => {
    const c = claude().toLowerCase();
    expect(c).toContain('zero-sum');
    expect(c).toMatch(/displace/);
    expect(c).toMatch(/deny pattern/);
    expect(c).toMatch(/harden/);
  });

  it('states the behavioral check: 2–3 behaviors, small and dated, review at next optimize run', () => {
    const c = claude().toLowerCase();
    expect(c).toMatch(/2–3|2-3/);
    expect(c).toMatch(/concrete behavior/);
    expect(c).toMatch(/small and dated|dated/);
    expect(c).toMatch(/next .*optimize run/);
  });

  it('never writes a stub section when the human has nothing to say', () => {
    const c = claude().toLowerCase();
    expect(c).toMatch(/no section and no placeholder|never write.*stub|no stub/);
  });

  it('routes rule-shaped answers toward harden, keeping taste-shaped ones', () => {
    const c = claude().toLowerCase();
    expect(c).toMatch(/rule-shaped|discipline rule/);
    expect(c).toMatch(/taste-shaped/);
  });
});

describe('interview skill: identity pointer only (ONE_HOME)', () => {
  const INTERVIEW = join(ROOT, 'src', 'claude-skills', 'joycraft-interview.md');
  const interview = () => readFileSync(INTERVIEW, 'utf-8');

  it('references the identity block in at most one line', () => {
    const lines = interview().split('\n').filter((l) => /product identity/i.test(l));
    expect(lines.length).toBe(1);
    expect(lines[0].toLowerCase()).toContain('gather-context');
  });

  it('does not duplicate the elicitation questions', () => {
    const c = interview().toLowerCase();
    expect(c).not.toContain('refuse to be');
    expect(c).not.toContain('wince even when it works');
    expect(c).not.toContain('outsiders misread');
  });

  it('stays within its pre-change line budget (pointer paid for by a trim)', () => {
    expect(readFileSync(join(ROOT, 'src', 'skills', 'joycraft-interview.md'), 'utf-8').split('\n').length).toBeLessThanOrEqual(329);
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

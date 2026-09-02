import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const CANONICAL = join(ROOT, 'src', 'skills', 'joycraft-tune.md');
const CLAUDE_FILE = join(ROOT, 'src', 'claude-skills', 'joycraft-tune.md');
const CODEX_FILE = join(ROOT, 'src', 'codex-skills', 'joycraft-tune.md');
const INSTALLED = join(ROOT, '.claude', 'skills', 'joycraft-tune', 'SKILL.md');

const read = (p: string) => readFileSync(p, 'utf-8');

describe('tune auto-memory finding: detection condition', () => {
  it('canonical source names auto-memory and the autoMemoryEnabled setting', () => {
    const c = read(CANONICAL);
    expect(c).toMatch(/auto-memory/i);
    expect(c).toContain('autoMemoryEnabled');
  });

  it('detection also requires a non-empty project memory dir', () => {
    const c = read(CANONICAL);
    expect(c).toMatch(/memory dir/i);
    expect(c).toMatch(/non-empty/i);
  });

  it('the finding lives inside a dimension row (Knowledge Capture)', () => {
    const c = read(CANONICAL);
    const row = c.split('\n').find((l) => /^\|\s*Knowledge Capture\s*\|/.test(l));
    expect(row, 'Knowledge Capture dimension row exists').toBeDefined();
    expect(row!).toMatch(/auto-memory/i);
  });
});

describe('tune auto-memory finding: graduate-then-archive recommendation', () => {
  const c = () => read(CANONICAL);

  it('recommends graduating durable content to docs/context/ via add-fact routing', () => {
    expect(c()).toMatch(/graduate/i);
    expect(c()).toContain('docs/context/');
    expect(c()).toMatch(/add-fact/);
  });

  it('the rest goes dormant or is deleted with approval', () => {
    const t = c().toLowerCase();
    expect(t).toMatch(/dormant/);
    expect(t).toMatch(/approval/);
  });

  it('names joycraft-owner.txt as exempt — never treated as stale memory', () => {
    const t = c();
    expect(t).toContain('joycraft-owner.txt');
    const idx = t.indexOf('joycraft-owner.txt');
    const around = t.slice(Math.max(0, idx - 400), idx + 400).toLowerCase();
    expect(around).toMatch(/exempt|never|spare|not (a )?stale/);
  });
});

describe('tune auto-memory finding: advisory voice', () => {
  it('the finding is advisory — no auto-edit or auto-delete instruction', () => {
    const c = read(CANONICAL);
    const idx = c.toLowerCase().indexOf('auto-memory');
    expect(idx).toBeGreaterThanOrEqual(0);
    const section = c.slice(idx, idx + 1400).toLowerCase();
    expect(section).toMatch(/advisory|never auto-edit|recommend/);
    expect(section).not.toMatch(/automatically delete|delete the (memory )?files yourself/);
  });

  it('never instructs deletion without human approval', () => {
    const t = read(CANONICAL).toLowerCase();
    expect(t).toMatch(/deleted (only )?with (the human's |human )?approval|delete.*only with.*approval/);
  });
});

describe('tune auto-memory finding: Pi/Codex is one research line, not machinery', () => {
  it('mentions Pi reportedly none (unverified) and Codex unknown', () => {
    const t = read(CANONICAL);
    expect(t).toMatch(/Pi/);
    expect(t).toMatch(/unverified/i);
    expect(t).toMatch(/Codex/);
    expect(t).toMatch(/unknown/i);
  });

  it('the note is a single line', () => {
    const lines = read(CANONICAL).split('\n').filter((l) => /unverified/i.test(l));
    expect(lines.length).toBe(1);
  });
});

describe('tune auto-memory finding: no absolute paths', () => {
  for (const [label, file] of [
    ['canonical', CANONICAL],
    ['claude', CLAUDE_FILE],
    ['codex', CODEX_FILE],
  ] as const) {
    it(`${label} body carries no /Users/ path and no expanded home path`, () => {
      const c = read(file);
      expect(c).not.toMatch(/\/Users\//);
      expect(c).not.toMatch(/\/home\/[a-z]/);
    });
  }

  it('the memory dir is described as derived from $HOME + encoded cwd', () => {
    const c = read(CANONICAL);
    expect(c).toMatch(/\$HOME/);
    expect(c).toMatch(/cwd/);
  });
});

describe('tune auto-memory finding: copies in sync', () => {
  it('generated claude copy carries the finding', () => {
    expect(read(CLAUDE_FILE)).toContain('autoMemoryEnabled');
  });

  it('generated codex copy carries the finding', () => {
    expect(read(CODEX_FILE)).toContain('autoMemoryEnabled');
  });

  it('installed claude skill carries the finding', () => {
    expect(read(INSTALLED)).toContain('autoMemoryEnabled');
  });
});

describe('tune auto-memory finding: line budget paid same-commit', () => {
  it('canonical tune source does not grow past its pre-spec size (228 lines)', () => {
    // wc -l equivalent: count terminating newlines
    const lines = read(CANONICAL).split('\n').length - 1;
    expect(lines).toBeLessThanOrEqual(228);
  });
});

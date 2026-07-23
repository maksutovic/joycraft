import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const HARDEN_SKILL = join(repoRoot, '.claude', 'skills', 'joycraft-harden', 'SKILL.md');
const TUNE_SKILL = join(repoRoot, '.claude', 'skills', 'joycraft-tune', 'SKILL.md');
const AGENTS_MD = join(repoRoot, 'AGENTS.md');
const DENY_PATTERNS = join(repoRoot, '.claude', 'hooks', 'joycraft', 'deny-patterns.txt');
const HOOK_SCRIPT = join(repoRoot, '.claude', 'hooks', 'joycraft', 'block-dangerous.sh');

const read = (p: string) => readFileSync(p, 'utf-8');

describe('joycraft-harden skill exists with entry: agent frontmatter', () => {
  it('.claude/skills/joycraft-harden/SKILL.md exists', () => {
    expect(existsSync(HARDEN_SKILL)).toBe(true);
  });

  it('frontmatter declares entry: agent', () => {
    const content = read(HARDEN_SKILL);
    const fm = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    expect(fm).toMatch(/^entry:\s*agent\s*$/m);
  });

  it('description is terse and anti-discovery (invoked by tune/optimize/session-end, not a user entry point)', () => {
    const content = read(HARDEN_SKILL);
    const descMatch = content.match(/^description:\s*(.+)$/m);
    expect(descMatch, 'has a description').not.toBeNull();
    const desc = descMatch![1].toLowerCase();
    expect(desc).toMatch(/tune/);
    expect(desc).toMatch(/optimize/);
    expect(desc).toMatch(/session-end/);
    expect(desc).toMatch(/not a user entry point|not.*human.*entry|internal/);
  });
});

describe('joycraft-harden flow completeness', () => {
  const content = () => read(HARDEN_SKILL);

  it('reads boundary-file boundaries + current settings.json permissions.deny + deny-patterns.txt', () => {
    const c = content();
    // Claude-installed variant renders {{boundary_file}} as CLAUDE.md
    expect(c).toMatch(/CLAUDE\.md|AGENTS\.md/);
    expect(c).toMatch(/permissions\.deny/);
    expect(c).toContain('deny-patterns.txt');
  });

  it('classifies each rule eligible or ineligible', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/\beligible\b/);
    expect(c).toMatch(/\bineligible\b/);
    expect(c).toMatch(/classify/);
  });

  it('proposes exact diffs to the two surfaces', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/exact diff/);
  });

  it('applies only on explicit human approval, marked PROTOCOL, never auto-apply', () => {
    const c = content();
    expect(c.toLowerCase()).toMatch(/explicit (human )?approval/);
    expect(c.toLowerCase()).toMatch(/never auto-apply/);
    expect(c).toMatch(/PROTOCOL/);
  });

  it('stamps inline provenance on the AGENTS.md rule line, marked PROTOCOL', () => {
    const c = content();
    expect(c.toLowerCase()).toMatch(/stamp/);
    expect(c.toLowerCase()).toMatch(/provenance/);
  });
});

describe('joycraft-harden provenance comment format', () => {
  it('SKILL.md documents the literal origin:/probation: comment template', () => {
    const c = read(HARDEN_SKILL);
    expect(c).toMatch(/<!--\s*origin:\s*<failure\|source>\s*<date>,\s*probation:\s*<model>\s*-->/);
  });
});

describe('joycraft-harden constraints', () => {
  const content = () => read(HARDEN_SKILL);

  it('targets only permissions.deny and deny-patterns.txt as the two surfaces', () => {
    const c = content();
    expect(c).toMatch(/permissions\.deny/);
    expect(c).toContain('deny-patterns.txt');
  });

  it('never rewrites the hook script or adds new hook frameworks', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/never rewrite the hook script|never the hook script/);
    expect(c).toMatch(/never a new hook framework|never add a new hook framework/);
  });

  it('flags ASK FIRST -> deny conversions as a semantic downgrade', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/ask first/);
    expect(c).toMatch(/downgrade/);
  });

  it('graduated: no PILOT divergence marker remains', () => {
    const c = content();
    expect(c).not.toMatch(/<!--\s*PILOT:/);
  });
});

describe('proof conversion: NEVER push directly to main/master is live', () => {
  it('deny-patterns.txt has a new git-push-to-main/master regex', () => {
    const c = read(DENY_PATTERNS);
    expect(c).toMatch(/git.*push.*\(main\|master\)/i);
  });

  it('AGENTS.md rule line for "Push directly to main/master" carries an origin: HTML comment', () => {
    const c = read(AGENTS_MD);
    const lines = c.split('\n');
    const ruleLineIdx = lines.findIndex((l) => /Push directly to main\/master/.test(l));
    expect(ruleLineIdx, 'rule line found in AGENTS.md').toBeGreaterThanOrEqual(0);
    expect(lines[ruleLineIdx]).toMatch(/<!--\s*origin:.*probation:.*-->/);
  });
});

describe('hook still works: block-dangerous.sh blocks the new pattern', () => {
  it('exits 2 for a direct push to main', () => {
    const input = JSON.stringify({ tool_input: { command: 'git push origin main' }, command: 'git push origin main' });
    let exitCode = 0;
    try {
      execFileSync(HOOK_SCRIPT, ['Bash'], { input, cwd: repoRoot });
    } catch (err: any) {
      exitCode = err.status ?? 1;
    }
    expect(exitCode).toBe(2);
  });

  it('does not block a push to a differently-named branch (main-docs)', () => {
    const input = JSON.stringify({ tool_input: { command: 'git push origin main-docs' }, command: 'git push origin main-docs' });
    let exitCode = 0;
    try {
      execFileSync(HOOK_SCRIPT, ['Bash'], { input, cwd: repoRoot });
    } catch (err: any) {
      exitCode = err.status ?? 1;
    }
    expect(exitCode).toBe(0);
  });
});

describe('joycraft-tune learns declared vs verified boundary labels', () => {
  const content = () => read(TUNE_SKILL);

  it('references declared and verified labels for boundaries', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/\bdeclared\b/);
    expect(c).toMatch(/\bverified\b/);
  });

  it('surfaces probation-due rules (provenance model != current model)', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/probation/);
  });

  it('roadmap/tier suggestions reference /joycraft-harden', () => {
    const c = content();
    expect(c).toContain('/joycraft-harden');
  });

  it('graduated: no PILOT divergence marker remains', () => {
    const c = content();
    expect(c).not.toMatch(/<!--\s*PILOT:/);
  });
});

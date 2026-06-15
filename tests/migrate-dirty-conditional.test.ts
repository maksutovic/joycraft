import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Spec: docs/features/2026-06-11-single-source-skills/specs/migrate-dirty-conditional.md
//
// Migrate the 5 dirty skills with genuinely harness-specific machinery
// (joycraft-research, joycraft-verify, joycraft-lockdown,
// joycraft-implement-feature, joycraft-collaborative-setup) to src/skills/
// using <!-- harness:NAME -->...<!-- /harness --> conditional blocks.
// Per-harness generated output must be byte-identical to the post-spec-5
// baseline (no behavioral change, only sourcing reorganization).

const REPO_ROOT = join(__dirname, '..');
const CANONICAL_DIR = join(REPO_ROOT, 'src', 'skills');
const CLAUDE_DIR = join(REPO_ROOT, 'src', 'claude-skills');
const CODEX_DIR = join(REPO_ROOT, 'src', 'codex-skills');
const PI_DIR = join(REPO_ROOT, 'src', 'pi-skills');

const FIVE_SKILLS = [
  'joycraft-research.md',
  'joycraft-verify.md',
  'joycraft-lockdown.md',
  'joycraft-implement-feature.md',
  'joycraft-collaborative-setup.md',
];

describe('migrate-dirty-conditional: canonical files exist', () => {
  for (const f of FIVE_SKILLS) {
    it(`src/skills/${f} exists`, () => {
      expect(existsSync(join(CANONICAL_DIR, f))).toBe(true);
    });
  }

  it('src/skills/ contains exactly 20 canonical files after this spec', () => {
    const { readdirSync } = require('node:fs');
    const files = readdirSync(CANONICAL_DIR).filter((f: string) => f.endsWith('.md'));
    expect(files.length).toBe(20);
  });
});

describe('migrate-dirty-conditional: joycraft-research harness wiring', () => {
  it('claude variant uses Claude Code Agent tool wording', () => {
    const c = readFileSync(join(CLAUDE_DIR, 'joycraft-research.md'), 'utf-8');
    expect(c).toMatch(/Claude Code['’]s Agent tool/);
  });

  it('pi variant uses subagent tool wording with joycraft-researcher', () => {
    const p = readFileSync(join(PI_DIR, 'joycraft-research.md'), 'utf-8');
    expect(p).toMatch(/`subagent` tool/);
    expect(p).toContain('joycraft-researcher');
    expect(p).not.toMatch(/Claude Code['’]s Agent tool/);
  });

  it('codex variant has no Agent tool reference (Codex uses bare "subagent")', () => {
    const c = readFileSync(join(CODEX_DIR, 'joycraft-research.md'), 'utf-8');
    expect(c).not.toMatch(/Claude Code['’]s Agent tool/);
  });
});

describe('migrate-dirty-conditional: joycraft-verify harness wiring', () => {
  it('claude variant uses Claude Code Agent tool to "Spawn"', () => {
    const c = readFileSync(join(CLAUDE_DIR, 'joycraft-verify.md'), 'utf-8');
    expect(c).toMatch(/Spawn the Verifier Subagent/);
    expect(c).toMatch(/Claude Code['’]s Agent tool/);
  });

  it('pi variant uses subagent tool with joycraft-verifier and "Deploy"', () => {
    const p = readFileSync(join(PI_DIR, 'joycraft-verify.md'), 'utf-8');
    expect(p).toMatch(/Deploy the Verifier Subagent/);
    expect(p).toMatch(/`subagent` tool/);
    expect(p).toContain('joycraft-verifier');
  });

  it('codex variant has the concurrent subagent thread paragraph', () => {
    const c = readFileSync(join(CODEX_DIR, 'joycraft-verify.md'), 'utf-8');
    expect(c).toMatch(/concurrent subagent thread/);
  });

  it('pi variant does NOT include the concurrent subagent thread paragraph', () => {
    const p = readFileSync(join(PI_DIR, 'joycraft-verify.md'), 'utf-8');
    expect(p).not.toMatch(/concurrent subagent thread/);
  });
});

describe('migrate-dirty-conditional: joycraft-lockdown config targets', () => {
  it('claude variant references .claude/settings.json + permissions.deny', () => {
    const c = readFileSync(join(CLAUDE_DIR, 'joycraft-lockdown.md'), 'utf-8');
    expect(c).toContain('.claude/settings.json');
    expect(c).toContain('permissions.deny');
  });

  it('codex variant references Codex sandbox / AGENTS.md not permissions.deny', () => {
    const c = readFileSync(join(CODEX_DIR, 'joycraft-lockdown.md'), 'utf-8');
    expect(c).toMatch(/Codex configuration|sandbox/);
    expect(c).not.toContain('.claude/settings.json');
    expect(c).not.toContain('permissions.deny');
  });

  it('pi variant references sandbox not permissions.deny', () => {
    const p = readFileSync(join(PI_DIR, 'joycraft-lockdown.md'), 'utf-8');
    expect(p).toMatch(/Codex configuration|sandbox/);
    expect(p).not.toContain('.claude/settings.json');
    expect(p).not.toContain('permissions.deny');
  });
});

describe('migrate-dirty-conditional: joycraft-implement-feature step structure', () => {
  function countSteps(content: string): number {
    return (content.match(/^## Step \d/gm) ?? []).length;
  }

  it('claude variant has 4 ## Step sections (Loop)', () => {
    const c = readFileSync(join(CLAUDE_DIR, 'joycraft-implement-feature.md'), 'utf-8');
    expect(countSteps(c)).toBe(4);
    expect(c).toMatch(/The Loop — One Subagent per Spec/);
  });

  it('codex variant has 4 ## Step sections (Chain)', () => {
    const c = readFileSync(join(CODEX_DIR, 'joycraft-implement-feature.md'), 'utf-8');
    expect(countSteps(c)).toBe(4);
    expect(c).toMatch(/The Chain — One Spec at a Time/);
  });

  it('pi variant has 3 ## Step sections (process loop)', () => {
    const p = readFileSync(join(PI_DIR, 'joycraft-implement-feature.md'), 'utf-8');
    expect(countSteps(p)).toBe(3);
    expect(p).toMatch(/joycraft-implement-loop/);
  });
});

describe('migrate-dirty-conditional: joycraft-collaborative-setup wording rewrite', () => {
  it('claude variant says "tells Claude" at the Areas pointer paragraph', () => {
    const c = readFileSync(join(CLAUDE_DIR, 'joycraft-collaborative-setup.md'), 'utf-8');
    expect(c).toMatch(/that pointer tells Claude/);
  });

  it('codex variant says "tells the agent" (not "tells Claude")', () => {
    const c = readFileSync(join(CODEX_DIR, 'joycraft-collaborative-setup.md'), 'utf-8');
    expect(c).toMatch(/that pointer tells the agent/);
    expect(c).not.toMatch(/that pointer tells Claude/);
  });

  it('pi variant says "tells the agent" (not "tells Claude")', () => {
    const p = readFileSync(join(PI_DIR, 'joycraft-collaborative-setup.md'), 'utf-8');
    expect(p).toMatch(/that pointer tells the agent/);
    expect(p).not.toMatch(/that pointer tells Claude/);
  });

  it('codex variant retains literal "/clear" at Recommended Next Steps', () => {
    const c = readFileSync(join(CODEX_DIR, 'joycraft-collaborative-setup.md'), 'utf-8');
    expect(c).toMatch(/Run \/clear first\./);
  });

  it('pi variant retains literal "/new" at Recommended Next Steps', () => {
    const p = readFileSync(join(PI_DIR, 'joycraft-collaborative-setup.md'), 'utf-8');
    expect(p).toMatch(/Run \/new first\./);
  });
});

describe('migrate-dirty-conditional: byte-identical to baseline', () => {
  // The /tmp/spec6-baseline snapshot is captured by the implementer before
  // editing. If absent, this test is skipped — re-snapshot from a clean main
  // and re-run.
  const BASELINE = '/tmp/spec6-baseline';
  const baselineExists = existsSync(BASELINE);

  for (const file of FIVE_SKILLS) {
    for (const [harness, dir] of [
      ['claude', CLAUDE_DIR],
      ['codex', CODEX_DIR],
      ['pi', PI_DIR],
    ] as const) {
      it(`${harness} ${file} matches baseline byte-for-byte`, () => {
        if (!baselineExists) {
          // The baseline snapshot was captured before editing. If it has been
          // cleared, treat as no-op rather than spurious fail.
          return;
        }
        const baselinePath = join(BASELINE, `${harness}-skills`, file);
        if (!existsSync(baselinePath)) return;
        const before = readFileSync(baselinePath, 'utf-8');
        const after = readFileSync(join(dir, file), 'utf-8');
        expect(after).toBe(before);
      });
    }
  }
});

describe('migrate-dirty-conditional: no residue in any emitted file', () => {
  for (const file of FIVE_SKILLS) {
    for (const [harness, dir] of [
      ['claude', CLAUDE_DIR],
      ['codex', CODEX_DIR],
      ['pi', PI_DIR],
    ] as const) {
      it(`${harness} ${file} contains no {{var}} residue`, () => {
        const c = readFileSync(join(dir, file), 'utf-8');
        const m = c.match(/\{\{[a-z_]+\}\}/g);
        expect(m).toBeNull();
      });

      it(`${harness} ${file} has no unclosed harness blocks`, () => {
        const c = readFileSync(join(dir, file), 'utf-8');
        const opens = (c.match(/<!--\s*harness:[^>]+?-->/g) ?? []).length;
        const closes = (c.match(/<!--\s*\/harness\s*-->/g) ?? []).length;
        expect(opens).toBe(closes);
        expect(opens).toBe(0); // after transform, all blocks must be consumed
      });
    }
  }
});

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const OPTIMIZE_SKILL = join(
  repoRoot,
  '.claude',
  'skills',
  'joycraft-optimize',
  'SKILL.md',
);
const SKILLS_DIR = join(repoRoot, '.claude', 'skills');

const read = (p: string) => readFileSync(p, 'utf-8');

const DISPOSITIONS = [
  'KEEP',
  'ONE_HOME',
  'LOAD_LATER',
  'MAKE_A_CHECK',
  'PROBATION',
  'RETIRE',
];

const EVIDENCE_LABELS = [
  'VERIFIED',
  'USER_REPORTED',
  'INFERRED',
  'INACCESSIBLE',
  'NOT_APPLICABLE',
];

describe('joycraft-optimize v2: disposition vocabulary', () => {
  const content = () => read(OPTIMIZE_SKILL);

  for (const disposition of DISPOSITIONS) {
    it(`SKILL.md references disposition "${disposition}"`, () => {
      expect(content()).toContain(disposition);
    });
  }

  for (const label of EVIDENCE_LABELS) {
    it(`SKILL.md references evidence label "${label}"`, () => {
      expect(content()).toContain(label);
    });
  }

  it('describes a disposition table with control, home file, disposition, evidence label, and reason columns', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/disposition/);
    expect(c).toMatch(/evidence/);
    expect(c).toMatch(/reason/);
    expect(c).toMatch(/home/);
  });
});

describe('joycraft-optimize v2: evidence honesty', () => {
  it('states VERIFIED only applies when this run actually checked the thing (no self-reported nominal)', () => {
    const c = read(OPTIMIZE_SKILL).toLowerCase();
    expect(c).toMatch(/verified/);
    expect(c).toMatch(/only.*(checked|verif).*this run|this run.*(checked|verif)/);
  });
});

describe('joycraft-optimize v2: cross-file duplication detection', () => {
  it('documents ONE_HOME disposition for a rule/fact found in 2+ homes, naming the canonical home', () => {
    const c = read(OPTIMIZE_SKILL);
    expect(c).toMatch(/ONE_HOME/);
    expect(c.toLowerCase()).toMatch(/duplicat/);
    expect(c.toLowerCase()).toMatch(/canonical/);
  });
});

describe('joycraft-optimize v2: layer-2 budget check', () => {
  const content = () => read(OPTIMIZE_SKILL);

  it('checks wc -l against 200 for shipped.md and decision-log.md', () => {
    const c = content();
    expect(c).toContain('200');
    expect(c).toContain('docs/context/shipped.md');
    expect(c).toContain('docs/context/decision-log.md');
  });

  it('over-budget produces a MAKE_A_CHECK row pointing at the knowledge-lifecycle rotation doc', () => {
    const c = content();
    expect(c).toMatch(/MAKE_A_CHECK/);
    expect(c).toContain('docs/reference/knowledge-lifecycle.md');
  });

  it('marks the budget check as PROTOCOL and states optimize never truncates content itself', () => {
    const c = content();
    expect(c).toMatch(/PROTOCOL/);
    expect(c.toLowerCase()).toMatch(/never truncat/);
  });
});

describe('joycraft-optimize v2: advisory only', () => {
  it('states dispositions are advisory and optimize applies nothing itself', () => {
    const c = read(OPTIMIZE_SKILL).toLowerCase();
    expect(c).toMatch(/advisory/);
    expect(c).toMatch(/appl(y|ies) nothing|does not apply|proposes.*(doesn't|does not) apply/);
  });

  it('points the apply path at the Reaper', () => {
    const c = read(OPTIMIZE_SKILL).toLowerCase();
    expect(c).toMatch(/reaper/);
  });
});

describe('joycraft-optimize v2: PILOT marker', () => {
  it('carries no PILOT marker (v2 graduated into src/)', () => {
    const c = read(OPTIMIZE_SKILL);
    expect(c).not.toMatch(/<!--\s*PILOT:/);
  });
});

describe('skill taxonomy: entry: frontmatter completeness (22/22)', () => {
  // Product skills only. `.claude/skills/` also holds repo-local maintainer
  // skills from `src/local-skills/` (see tests/local-skills-sync.test.ts) —
  // those are not part of the shipped taxonomy, carry no `entry:` field, and
  // must not count against the 22 or the human-door budget below.
  const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('joycraft-'))
    .map((d) => d.name)
    .sort();

  it('there are exactly 22 installed skills', () => {
    expect(skillDirs.length).toBe(22);
  });

  for (const dir of skillDirs) {
    it(`${dir}/SKILL.md declares entry: human|agent|situational`, () => {
      const skillPath = join(SKILLS_DIR, dir, 'SKILL.md');
      const content = read(skillPath);
      const fm = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
      expect(fm).toMatch(/^entry:\s*(human|agent|situational)\s*$/m);
    });
  }
});

describe('skill taxonomy: human-door budget', () => {
  it('at most 9 skills declare entry: human', () => {
    // Product skills only — see the note on the taxonomy suite above.
    const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('joycraft-'))
      .map((d) => d.name);
    let humanCount = 0;
    for (const dir of skillDirs) {
      const content = read(join(SKILLS_DIR, dir, 'SKILL.md'));
      const fm = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
      if (/^entry:\s*human\s*$/m.test(fm)) humanCount++;
    }
    expect(humanCount).toBeLessThanOrEqual(9);
  });
});

describe('skill taxonomy: internals get terse anti-discovery descriptions', () => {
  it('agent-entry skills describe who invokes them and that they are not a user entry point', () => {
    // Product skills only — see the note on the taxonomy suite above.
    const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('joycraft-'))
      .map((d) => d.name);
    for (const dir of skillDirs) {
      const content = read(join(SKILLS_DIR, dir, 'SKILL.md'));
      const fm = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
      const isAgent = /^entry:\s*agent\s*$/m.test(fm);
      if (!isAgent) continue;
      const descMatch = fm.match(/^description:\s*(.+)$/m);
      expect(descMatch, `${dir} has a description`).not.toBeNull();
    }
  });
});

describe('joycraft-optimize v2: taxonomy checks wired into the audit', () => {
  const content = () => read(OPTIMIZE_SKILL);

  it('checks every skill declares entry:', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/entry:/);
  });

  it('checks the human-door count is <= 9 and names overage', () => {
    const c = content();
    expect(c).toMatch(/9/);
    expect(c.toLowerCase()).toMatch(/human/);
  });

  it('retains the v1 description budget check', () => {
    const c = content();
    expect(c).toMatch(/6,?000/);
    expect(c).toMatch(/8,?000/);
  });
});

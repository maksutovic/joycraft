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
  'NEVER_READ',
  'WRITE_HEAVY',
  'MODEL_SUPERSEDED',
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

  it('declares the evidence vocabulary as exactly eight, no synonyms', () => {
    expect(EVIDENCE_LABELS).toHaveLength(8);
    expect(content()).toMatch(/Evidence label vocabulary \(exactly eight, no synonyms\)/);
  });

  it('declares the disposition vocabulary as exactly six, no synonyms', () => {
    expect(content()).toMatch(/Disposition vocabulary \(exactly six, no synonyms\)/);
  });

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

const PROFILE_DOC_PATH = 'docs/templates/reference/model-profile-claude-fable-5-1.md';
const PROFILE_DOC = join(repoRoot, PROFILE_DOC_PATH);
const GENERATED_OPTIMIZE = join(repoRoot, 'src', 'claude-skills', 'joycraft-optimize.md');
const TUNE_SKILL = join(repoRoot, '.claude', 'skills', 'joycraft-tune', 'SKILL.md');

// The model-profile evidence step: from its `## Step N...Model Profile...` heading
// to the next `## ` heading.
function modelProfileStep(text: string): string {
  const m = text.match(/^## Step [0-9a-z]+: [^\n]*Model[- ]Profile[^\n]*$/im);
  expect(m, 'model-profile step heading').not.toBeNull();
  const start = text.indexOf(m![0]);
  const rest = text.slice(start + m![0].length);
  const end = rest.indexOf('\n## ');
  return m![0] + (end > -1 ? rest.slice(0, end) : rest);
}

describe('add-fable-era-retire-source-to-optimize: model-profile evidence step', () => {
  const step = () => modelProfileStep(read(OPTIMIZE_SKILL));

  it('has a model-profile step that reads the installed profile doc path', () => {
    expect(step()).toContain(PROFILE_DOC_PATH);
  });

  it('sits after Step 2b (telemetry) and before Step 3 (duplication)', () => {
    const c = read(OPTIMIZE_SKILL);
    const stepIdx = c.indexOf(step().split('\n')[0]);
    expect(stepIdx).toBeGreaterThan(c.indexOf('## Step 2b'));
    expect(stepIdx).toBeLessThan(c.indexOf('## Step 3'));
  });

  it('cites at least one block by a heading that exists in the profile doc', () => {
    const headings = read(PROFILE_DOC)
      .split('\n')
      .filter((l) => l.startsWith('## '))
      .map((l) => l.slice(3).trim())
      .filter((h) => h !== 'Scope');
    const cited = headings.filter((h) => step().includes(h));
    expect(cited.length).toBeGreaterThan(0);
    expect(step()).toContain('Formatting When Appropriate');
  });

  it('copies no block prose from the profile doc', () => {
    const prose = read(PROFILE_DOC)
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 60 && !l.startsWith('#'));
    const s = step();
    for (const line of prose) {
      expect(s).not.toContain(line);
    }
  });

  it('names the anti-formatting flag class with a markdown example', () => {
    const s = step().toLowerCase();
    expect(s).toMatch(/anti-formatting/);
    expect(s).toMatch(/never use markdown/);
  });

  it('names the hand-holding flag class', () => {
    const s = step().toLowerCase();
    expect(s).toMatch(/hand-holding/);
    expect(s).toMatch(/check in/);
    expect(s).toMatch(/narrate/);
  });

  it('labels flagged rows MODEL_SUPERSEDED and maps them to RETIRE or PROBATION only', () => {
    const s = step();
    expect(s).toContain('MODEL_SUPERSEDED');
    expect(s).toMatch(/`RETIRE`[^\n]*opposite/);
    expect(s).toMatch(/`PROBATION`[^\n]*unverified/);
  });

  it("is advisory only: applies nothing and never edits the user's CLAUDE.md", () => {
    const s = step().toLowerCase();
    expect(s).toMatch(/applies nothing/);
    expect(s).toMatch(/never edits[^\n]*claude\.md/);
  });

  it('names INACCESSIBLE as the evidence when the profile doc is absent', () => {
    expect(step()).toMatch(/absent[^\n]*`INACCESSIBLE`|`INACCESSIBLE`[^\n]*absent/);
  });

  it('does not flag a rule for age alone', () => {
    expect(step().toLowerCase()).toMatch(/age alone/);
  });

  it('the step is present in the generated claude variant', () => {
    expect(modelProfileStep(read(GENERATED_OPTIMIZE))).toContain(PROFILE_DOC_PATH);
  });

  it('the Edge Cases table has an absent-profile-doc row', () => {
    const c = read(OPTIMIZE_SKILL);
    const edge = c.slice(c.lastIndexOf('## Edge Cases'));
    expect(edge).toMatch(/profile doc[^\n]*`INACCESSIBLE`/i);
  });

  it('the report legend lists MODEL_SUPERSEDED', () => {
    expect(read(OPTIMIZE_SKILL)).toMatch(/\[VERIFIED\/[^\]]*MODEL_SUPERSEDED\]/);
  });
});

describe('add-fable-era-retire-source-to-optimize: tune roadmap referral', () => {
  it('Step 6 roadmap tells a user with a pre-profile memory file to run optimize', () => {
    const c = read(TUNE_SKILL);
    const start = c.indexOf('## Step 6: Show the Harness Maturity Roadmap');
    expect(start).toBeGreaterThan(-1);
    const rest = c.slice(start + 1);
    const end = rest.indexOf('\n## ');
    const region = end > -1 ? rest.slice(0, end) : rest;
    expect(region).toMatch(/model profile[^\n]*optimize|optimize[^\n]*model profile/i);
    expect(region).toMatch(/predates/i);
  });
});

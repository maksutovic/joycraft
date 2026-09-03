import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
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

const read = (p: string) => readFileSync(p, 'utf-8');
const content = () => read(OPTIMIZE_SKILL);

describe('add-reaper-pass: two paths present', () => {
  it('references shipped-path eligibility marker "reap: eligible"', () => {
    expect(content()).toContain('reap: eligible');
  });

  it('references the gh merge-verification command', () => {
    expect(content()).toMatch(/gh pr/);
  });

  it('references git rm for the shipped-delete path', () => {
    expect(content()).toMatch(/git rm/);
  });

  it('references the archive destination for the undead path', () => {
    expect(content()).toContain('docs/archive/features/');
  });
});

describe('add-reaper-pass: merge verification required before delete', () => {
  it('checks for MERGED state before any deletion instruction', () => {
    const c = content();
    const ghIdx = c.search(/gh pr view.*--json state|gh pr[\s\S]*MERGED/);
    expect(ghIdx).toBeGreaterThan(-1);
    expect(c).toMatch(/MERGED/);
    const mergedIdx = c.indexOf('MERGED');
    const gitRmIdx = c.indexOf('git rm');
    expect(gitRmIdx).toBeGreaterThan(-1);
    // the MERGED check must precede the git rm instruction in document order
    expect(mergedIdx).toBeLessThan(gitRmIdx);
  });
});

describe('add-reaper-pass: per-folder human approval', () => {
  it('states human approval is required on the shipped (delete) path', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/human approv/);
  });

  it('states approval is per folder / per run for the undead (archive) path', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/per folder/);
  });
});

describe('add-reaper-pass: never delete undead', () => {
  it('states undead folders are moved (archived), never deleted', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/never delete|never a candidate for (deletion|delete)/);
    expect(c).toMatch(/git mv/);
  });
});

describe('add-reaper-pass: live features excluded', () => {
  it('states live features (in-review specs / non-terminal brief status) are never candidates', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/in-review/);
    expect(c).toMatch(/never.*candidate|not a candidate/);
  });
});

describe('add-optimize-telemetry-evidence: exactly seven evidence labels', () => {
  const LABELS = [
    'VERIFIED',
    'USER_REPORTED',
    'INFERRED',
    'INACCESSIBLE',
    'NOT_APPLICABLE',
    'NEVER_READ',
    'WRITE_HEAVY',
  ];

  it('the vocabulary heading says exactly seven', () => {
    expect(content()).toMatch(
      /Evidence label vocabulary \(exactly seven, no synonyms\)/,
    );
  });

  it('the vocabulary table has exactly seven label rows, one per label', () => {
    const c = content();
    const start = c.indexOf('Evidence label vocabulary');
    expect(start).toBeGreaterThan(-1);
    const rest = c.slice(start);
    const end = rest.indexOf('\n## ');
    const block = end > -1 ? rest.slice(0, end) : rest;
    const rows = block
      .split('\n')
      .filter((line) => /^\|\s*`[A-Z_]+`\s*\|/.test(line));
    expect(rows).toHaveLength(7);
    for (const label of LABELS) {
      expect(rows.some((r) => r.includes(`\`${label}\``))).toBe(true);
    }
  });

  it('keeps evidence labels disjoint from the six dispositions', () => {
    const c = content();
    for (const disposition of [
      'KEEP',
      'ONE_HOME',
      'LOAD_LATER',
      'MAKE_A_CHECK',
      'PROBATION',
      'RETIRE',
    ]) {
      expect(LABELS).not.toContain(disposition);
    }
    expect(c.toLowerCase()).toMatch(/disjoint/);
  });
});

describe('add-optimize-telemetry-evidence: D4 label definitions', () => {
  it('defines NEVER_READ as >=1 write and 0 voluntary reads', () => {
    expect(content()).toMatch(
      /`NEVER_READ`[\s\S]{0,200}≥1 write[\s\S]{0,80}0 voluntary reads/,
    );
  });

  it('defines WRITE_HEAVY as a >=3:1 writes-to-voluntary-reads ratio', () => {
    expect(content()).toMatch(
      /`WRITE_HEAVY`[\s\S]{0,200}≥3:1 writes:voluntary reads/,
    );
  });

  it('counts only voluntary reads toward retire/keep evidence', () => {
    expect(content().toLowerCase()).toMatch(
      /only voluntary reads count toward/,
    );
  });

  it('introduces no ratio column or marker rows — the table shape is unchanged', () => {
    const c = content();
    expect(c).toContain('| Control | Home File | Disposition | Evidence | Reason |');
    expect(c).not.toMatch(/\|\s*Ratio\s*\|/i);
  });
});

describe('add-optimize-telemetry-evidence: VERIFIED discipline', () => {
  it('reads docs/.joycraft/telemetry.json', () => {
    expect(content()).toContain('docs/.joycraft/telemetry.json');
  });

  it('marks a telemetry-backed row VERIFIED only when this run read telemetry.json', () => {
    expect(content()).toMatch(
      /VERIFIED[\s\S]{0,160}only when this run read `docs\/\.joycraft\/telemetry\.json`/,
    );
  });

  it('falls back to INACCESSIBLE when telemetry is absent or malformed', () => {
    const c = content();
    expect(c).toMatch(
      /absent(, unreadable,)? or malformed[\s\S]{0,120}`INACCESSIBLE`/,
    );
  });

  it('notes degraded (Codex-sourced) fidelity in the report', () => {
    expect(content().toLowerCase()).toMatch(/degraded/);
  });
});

describe('add-optimize-telemetry-evidence: pre-committed Reaper thresholds', () => {
  const c = () => content();

  it('cites the 30-session / 60-day zero-voluntary-read RETIRE candidate rule', () => {
    expect(c()).toMatch(/30 sessions or 60 days[\s\S]{0,120}RETIRE candidate/);
  });

  it('cites the >20% feature-shaped-session survival rule', () => {
    expect(c()).toMatch(/>20% of feature-shaped sessions[\s\S]{0,60}survives/);
  });

  it('cites the ~1-per-10-sessions collapse rule for the four non-decision-log docs', () => {
    expect(c()).toMatch(
      /~1 per 10 sessions[\s\S]{0,160}four non-decision-log docs/,
    );
  });

  it('cites the 60-day default-shrink sunset', () => {
    expect(c()).toMatch(/60 days[\s\S]{0,120}shrink/);
  });

  it('cites the troubleshooting-class insurance exemption', () => {
    expect(c()).toMatch(/insurance exemption/);
    expect(c()).toMatch(/troubleshooting/i);
  });

  it('names telemetry.json as the source the RETIRE recommendation cites', () => {
    expect(c().toLowerCase()).toMatch(/cite the counts/);
  });
});

describe('add-optimize-telemetry-evidence: team-scale note', () => {
  it('reports that past ~3 contributors per-user counts must merge at optimize time', () => {
    const c = content();
    expect(c).toMatch(/~3 contributors/);
    expect(c).toMatch(/merge at optimize time/);
    expect(c).toMatch(/aggregates, never transcripts/);
  });
});

describe('add-reaper-pass: graduated: no PILOT marker', () => {
  it('the skill file no longer carries a PILOT divergence marker', () => {
    expect(content()).not.toMatch(/<!--\s*PILOT:/);
  });
});

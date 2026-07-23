import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const DECOMPOSE_SKILL = join(repoRoot, '.claude', 'skills', 'joycraft-decompose', 'SKILL.md');
const VERIFY_SKILL = join(repoRoot, '.claude', 'skills', 'joycraft-verify', 'SKILL.md');

const read = (p: string) => readFileSync(p, 'utf-8');

describe('Decompose: cite requirement and vocabulary', () => {
  it('SKILL.md requires a [src: cite on Constraints/Acceptance Criteria lines', () => {
    const c = read(DECOMPOSE_SKILL);
    expect(c).toMatch(/\[src:/);
  });

  it('SKILL.md documents the exact four-source cite vocabulary', () => {
    const c = read(DECOMPOSE_SKILL);
    expect(c).toMatch(/D<n>/);
    expect(c).toMatch(/design §<n>/);
    expect(c).toMatch(/brief "<section>"/);
    expect(c).toMatch(/INVENTED/);
  });
});

describe('Decompose: INVENTED review gate precedes spec generation', () => {
  it('Step 4 (Present and Iterate) contains the INVENTED review sub-step', () => {
    const c = read(DECOMPOSE_SKILL);
    const step4Idx = c.indexOf('## Step 4: Present and Iterate');
    const step5Idx = c.indexOf('## Step 5: Generate Atomic Specs');
    expect(step4Idx, 'Step 4 heading found').toBeGreaterThan(-1);
    expect(step5Idx, 'Step 5 heading found').toBeGreaterThan(-1);
    const step4Section = c.slice(step4Idx, step5Idx);
    expect(step4Section).toMatch(/INVENTED/);
  });

  it('the INVENTED review sub-step is labeled PROTOCOL', () => {
    const c = read(DECOMPOSE_SKILL);
    const step4Idx = c.indexOf('## Step 4: Present and Iterate');
    const step5Idx = c.indexOf('## Step 5: Generate Atomic Specs');
    const step4Section = c.slice(step4Idx, step5Idx);
    expect(step4Section).toMatch(/PROTOCOL/);
  });

  it('the INVENTED review requires human approve/reword/drop before spec files are written', () => {
    const c = read(DECOMPOSE_SKILL);
    const step4Idx = c.indexOf('## Step 4: Present and Iterate');
    const step5Idx = c.indexOf('## Step 5: Generate Atomic Specs');
    const step4Section = c.slice(step4Idx, step5Idx);
    expect(step4Section).toMatch(/approve/i);
    expect(step4Section).toMatch(/reword/i);
    expect(step4Section).toMatch(/drop/i);
  });

  it('zero-INVENTED decompositions state that explicitly (earned silence)', () => {
    const c = read(DECOMPOSE_SKILL);
    expect(c.toLowerCase()).toMatch(/all constraints traced/);
  });

  it('approved INVENTED items are stamped as a new clarified decision in the decisions: frontmatter', () => {
    const c = read(DECOMPOSE_SKILL);
    expect(c).toMatch(/decisions:/);
    expect(c.toLowerCase()).toMatch(/clarified/);
  });
});

describe('Decompose: cite requirement scoped to Constraints/Acceptance Criteria only', () => {
  it('does not require cites in Approach or Edge Cases sections', () => {
    const c = read(DECOMPOSE_SKILL);
    // The Approach/Edge Cases section headers in the spec body template should
    // remain free of a blanket cite requirement statement immediately after them.
    const approachIdx = c.indexOf('## Approach\nStrategy');
    expect(approachIdx, 'Approach template section found').toBeGreaterThan(-1);
  });
});

describe('Decompose: graduated: no PILOT marker', () => {
  it('SKILL.md carries no PILOT marker (graduated)', () => {
    const c = read(DECOMPOSE_SKILL);
    expect(c).not.toMatch(/<!--\s*PILOT:/);
  });
});

describe('Verify: oracle re-pointed to brief + decisions + boundaries', () => {
  it('SKILL.md references the brief Hard Constraints as a verifier input', () => {
    const c = read(VERIFY_SKILL);
    expect(c.toLowerCase()).toMatch(/hard constraints/);
  });

  it('SKILL.md references the decisions: frontmatter block as a verifier input', () => {
    const c = read(VERIFY_SKILL);
    expect(c).toMatch(/decisions:/);
  });

  it('SKILL.md references the project boundary file as a verifier input', () => {
    const c = read(VERIFY_SKILL);
    // Claude-installed variant renders {{boundary_file}} as CLAUDE.md
    expect(c).toMatch(/CLAUDE\.md|AGENTS\.md/);
  });

  it('SKILL.md asks the verifier to flag spec-vs-brief drift as a finding', () => {
    const c = read(VERIFY_SKILL);
    expect(c.toLowerCase()).toMatch(/drift/);
  });

  it('SKILL.md carries no PILOT marker on the oracle edit (graduated)', () => {
    const c = read(VERIFY_SKILL);
    expect(c).not.toMatch(/<!--\s*PILOT:/);
  });
});

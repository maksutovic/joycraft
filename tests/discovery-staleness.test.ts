import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf-8');

const lifecycle = () => read('docs/reference/knowledge-lifecycle.md');
const templateTwin = () => read('src/templates/reference/knowledge-lifecycle.md');
const sessionEnd = () => read('src/skills/joycraft-session-end.md');
const optimize = () => read('src/skills/joycraft-optimize.md');

describe('staleness rule: one home in the lifecycle doc', () => {
  for (const [name, doc] of [
    ['docs/reference twin', lifecycle],
    ['shipped template twin', templateTwin],
  ] as const) {
    it(`${name} states the D1 rule: >7 days, non-terminal, advisory`, () => {
      const d = doc().toLowerCase();
      expect(d).toMatch(/more than 7 days/);
      expect(d).toMatch(/terminal/);
      expect(d).toMatch(/advisory/);
      expect(d).toMatch(/never auto-delete/);
      expect(d).toMatch(/created:/);
    });

    it(`${name} makes the telemetry condition additive: zero voluntary reads`, () => {
      const d = doc().toLowerCase();
      expect(d).toMatch(/zero voluntary reads/);
      expect(d).toMatch(/when (the )?telemetry (store )?(exists|is present)|telemetry.*additive|additive.*telemetry/);
    });

    it(`${name} names the graduation targets`, () => {
      const d = doc().toLowerCase();
      expect(d).toMatch(/shipped ledger/);
      expect(d).toMatch(/this happened/);
      expect(d).toMatch(/harden/);
      expect(d).toMatch(/always true/);
      expect(d).toMatch(/this was a moment/);
    });

    it(`${name} records the D1 validation rule`, () => {
      const d = doc().toLowerCase();
      expect(d).toMatch(/more than half/);
      expect(d).toMatch(/threshold moves|move the threshold|threshold is retuned/);
    });

    it(`${name} states the honest-residue caveat`, () => {
      const d = doc().toLowerCase();
      expect(d).toMatch(/situational must-read/);
      expect(d).toMatch(/harden/);
      expect(d).toMatch(/accepted risk/);
    });

    it(`${name} covers the edge cases: exact-7-days, missing created, graduated file`, () => {
      const d = doc().toLowerCase();
      expect(d).toMatch(/exactly 7 days.*not flagged|not flagged.*exactly 7/);
      expect(d).toMatch(/missing.*created|created.*missing|no `?created/);
      expect(d).toMatch(/never guess/);
      expect(d).toMatch(/graduat/);
    });

    it(`${name} carries the invoked-by-citation contract sentence`, () => {
      expect(doc().toLowerCase()).toMatch(/defined once here and invoked from/);
    });
  }

  it('the two twins carry the same staleness section', () => {
    const extract = (d: string) => d.slice(d.indexOf('## Staleness'));
    expect(extract(lifecycle())).toBe(extract(templateTwin()));
  });
});

describe('skills invoke the rule by citation only', () => {
  it('session-end cites the lifecycle doc for staleness', () => {
    const s = sessionEnd();
    expect(s).toMatch(/stale[\s\S]{0,200}knowledge-lifecycle\.md|knowledge-lifecycle\.md[\s\S]{0,200}stale/i);
  });

  it('optimize cites the lifecycle doc for staleness', () => {
    const o = optimize();
    expect(o).toMatch(/stale[\s\S]{0,200}knowledge-lifecycle\.md|knowledge-lifecycle\.md[\s\S]{0,200}stale/i);
  });

  it('neither skill restates the staleness-rule body', () => {
    for (const skill of [sessionEnd(), optimize()]) {
      expect(skill.toLowerCase()).not.toContain('more than 7 days');
      expect(skill.toLowerCase()).not.toContain('7-day');
      expect(skill.toLowerCase()).not.toContain('7 days');
    }
    // session-end has no telemetry vocabulary of its own either; optimize's
    // RETIRE threshold table legitimately carries voluntary-read counts.
    expect(sessionEnd().toLowerCase()).not.toContain('zero voluntary reads');
  });

  /**
   * Budgets guard against *restating* the staleness rule (the bloat this
   * describe block exists to prevent), not against the per-harness fan-out.
   * These count the canonical sources, where every harness's blocks coexist —
   * so optimize's ceiling rose 282 → 285 when omp gained its own MCP-path row
   * (`~/.omp/agent/config.yml`) alongside the claude/codex/pi/copilot rows.
   * Each *rendered* variant still carries exactly one such row. The restated-body
   * assertion above is what actually polices duplication.
   */
  it('line budgets do not grow (session-end ≤210, optimize ≤285)', () => {
    expect(sessionEnd().trimEnd().split('\n').length).toBeLessThanOrEqual(210);
    expect(optimize().trimEnd().split('\n').length).toBeLessThanOrEqual(285);
  });
});

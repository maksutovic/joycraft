import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const addFact = () => readFileSync(join(ROOT, 'src', 'skills', 'joycraft-add-fact.md'), 'utf-8');
const sessionEnd = () => readFileSync(join(ROOT, 'src', 'skills', 'joycraft-session-end.md'), 'utf-8');

describe('add-fact: harden-first escalation (intervention-elimination hierarchy)', () => {
  it('asks the escalation question before doc classification and before the decay bans', () => {
    const c = addFact();
    const escalation = c.search(/enforced as architecture/i);
    expect(escalation).toBeGreaterThan(-1);
    expect(escalation).toBeLessThan(c.indexOf('Reject before you route'));
    expect(escalation).toBeLessThan(c.indexOf('docs/context/production-map.md'));
  });

  it('routes eligible facts to harden and treats prose as the residue', () => {
    const c = addFact().toLowerCase();
    expect(c).toMatch(/\{\{skill_prefix\}\}harden/);
    expect(c).toMatch(/deny pattern/);
    expect(c).toMatch(/ci check/);
    expect(c).toMatch(/prose is the residue/);
  });

  it('has exactly one escalation-question home — old Step 6 is folded in', () => {
    const c = addFact();
    expect(c.match(/enforced as architecture/gi)?.length).toBe(1);
    expect(c).not.toMatch(/## Step 6: Evaluate/);
    expect(c).not.toMatch(/Add a \{\{boundary_file\}\} rule if the fact/);
  });

  it('keeps escalation advisory: declined or harden-missing falls through to classification', () => {
    const c = addFact().toLowerCase();
    expect(c).toMatch(/declin/);
    expect(c).toMatch(/not installed|isn't installed/);
    expect(c).toMatch(/continue/);
    expect(c).toMatch(/never blocking|advisory/);
  });

  it('check-eligible facts can still land their why in the decision log', () => {
    expect(addFact().toLowerCase()).toMatch(/why[\s\S]{0,120}decision log|decision log[\s\S]{0,120}why/);
  });
});

describe('session-end: Step 1b escalation gate', () => {
  it('gates prose routing behind the harden escalation line', () => {
    const c = sessionEnd();
    const gate = c.search(/architecture, a deny pattern, or a ci check/i);
    expect(gate).toBeGreaterThan(c.indexOf('## 1b.'));
    expect(gate).toBeLessThan(c.indexOf('docs/context/production-map.md'));
    expect(c.slice(gate, gate + 300)).toMatch(/\{\{skill_prefix\}\}harden/);
  });
});

describe('line budgets stay paid', () => {
  it('add-fact ≤207, session-end ≤210', () => {
    expect(addFact().trimEnd().split('\n').length).toBeLessThanOrEqual(207);
    expect(sessionEnd().trimEnd().split('\n').length).toBeLessThanOrEqual(210);
  });
});

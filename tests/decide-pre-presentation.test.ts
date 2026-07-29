import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const read = (name: string) =>
  readFileSync(join(repoRoot, 'src', 'skills', `${name}.md`), 'utf-8');

/**
 * Spec 4 (enforce-decide-pre-presentation): the decide gate fires BEFORE
 * presentation, unconditionally, in every gate skill whose artifact can carry
 * open questions. The Block Rule's one home stays `docs/context/anchors.md`.
 */

const GATE_SKILLS = [
  'joycraft-new-feature',
  'joycraft-design',
  'joycraft-decompose',
  'joycraft-research',
  'joycraft-bugfix',
] as const;

describe('all five gate skills carry the pre-presentation decide rule', () => {
  for (const name of GATE_SKILLS) {
    it(`${name}.md states the rule fires before presenting`, () => {
      expect(read(name)).toContain('before presenting');
    });

    it(`${name}.md invokes decide at that point`, () => {
      expect(read(name)).toMatch(/\{\{skill_prefix\}\}decide/);
    });

    it(`${name}.md covers open questions and ≤50 load-bearing claims`, () => {
      const c = read(name);
      const idx = c.indexOf('before presenting');
      expect(idx).toBeGreaterThan(-1);
      const window = c.slice(Math.max(0, idx - 700), idx + 700);
      expect(window).toMatch(/open question/i);
      expect(window).toContain('≤50');
    });

    it(`${name}.md points at anchors.md as the Block Rule's one home`, () => {
      const c = read(name);
      const idx = c.indexOf('before presenting');
      const window = c.slice(Math.max(0, idx - 700), idx + 700);
      expect(window).toContain('docs/context/anchors.md');
      expect(window).toContain('Block Rule');
    });

    it(`${name}.md does not restate anchor definitions at the rule`, () => {
      const c = read(name);
      const idx = c.indexOf('before presenting');
      const window = c.slice(Math.max(0, idx - 700), idx + 700);
      expect(window).not.toMatch(/\{0, ?25, ?50, ?75, ?100\}/);
    });
  }
});

describe('joycraft-design resolves the Step 4 / Step 5 ordering ambiguity', () => {
  const c = read('joycraft-design');

  it('places the decide invocation before the presentation template', () => {
    const step4 = c.indexOf('## Step 4: Present and STOP');
    const rule = c.indexOf('before presenting');
    const template = c.indexOf('At this gate, your chat message is EXACTLY this template');
    expect(step4).toBeGreaterThan(-1);
    expect(rule).toBeGreaterThan(step4);
    expect(rule).toBeLessThan(template);
  });

  it('no longer gates the decide invocation on human approval in Step 5', () => {
    const step5 = c.indexOf('## Step 5: Hand Off');
    expect(step5).toBeGreaterThan(-1);
    const tail = c.slice(step5);
    expect(tail).not.toMatch(/invoke `\{\{skill_prefix\}\}decide/);
  });

  it('Step 5 records decisions as already terminated at the Step 4 gate', () => {
    const step5 = c.indexOf('## Step 5: Hand Off');
    expect(c.slice(step5)).toMatch(/already terminated in Step 4/);
  });
});

describe('joycraft-decompose\'s decision gate covers ≤50 load-bearing claims', () => {
  const c = read('joycraft-decompose');

  it('extends the frontmatter gate beyond `decisions:` rows', () => {
    const gate = c.indexOf('decisions:');
    expect(gate).toBeGreaterThan(-1);
    const window = c.slice(gate, gate + 3000);
    expect(window).toContain('≤50');
    expect(window).toContain('docs/context/anchors.md');
  });
});

describe('the rule respects the position-fragile windows', () => {
  for (const name of ['joycraft-research', 'joycraft-design', 'joycraft-decompose'] as const) {
    it(`${name}.md keeps the rule out of the 1500-char retrieval window`, () => {
      const c = read(name);
      let idx = c.indexOf('Retrieve Before You Reason');
      expect(idx).toBeGreaterThan(-1);
      while (idx > -1) {
        expect(c.slice(idx, idx + 1500)).not.toContain('before presenting');
        idx = c.indexOf('Retrieve Before You Reason', idx + 1);
      }
    });
  }

  for (const name of ['joycraft-design', 'joycraft-new-feature'] as const) {
    it(`${name}.md keeps the rule out of the spec-body fence`, () => {
      const c = read(name);
      const start = c.indexOf('Use this structure for each spec body:');
      if (start === -1) return;
      const end = c.indexOf('```', c.indexOf('```', start) + 3);
      expect(c.slice(start, end)).not.toContain('before presenting');
    });
  }

  for (const name of ['joycraft-design', 'joycraft-new-feature', 'joycraft-decide'] as const) {
    it(`${name}.md introduces no banned "percentage" wording`, () => {
      expect(read(name).toLowerCase()).not.toMatch(/percentage/);
    });
  }
});

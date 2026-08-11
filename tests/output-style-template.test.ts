import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..');
const TEMPLATES_DIR = join(ROOT, 'src', 'templates');
const STYLE_DOC = join(TEMPLATES_DIR, 'reference', 'output-style.md');

function read(): string {
  return readFileSync(STYLE_DOC, 'utf-8');
}

/**
 * Slice the lines belonging to a `## <heading>` section, stopping at the next
 * `## `. The heading regex must match the WHOLE heading line, not a substring
 * of any earlier one — the STE rewrite introduced several `## ` headings, so a
 * loose slicer would select the wrong one.
 */
function section(content: string, heading: RegExp): string[] {
  const lines = content.split('\n');
  const start = lines.findIndex((l) => /^## /.test(l) && heading.test(l));
  if (start === -1) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^## /.test(l));
  return end === -1 ? rest : rest.slice(0, end);
}

describe('output style template: file exists', () => {
  it('src/templates/reference/output-style.md exists', () => {
    expect(existsSync(STYLE_DOC), `${STYLE_DOC} should exist`).toBe(true);
  });
});

describe('output style template: rule count', () => {
  it('holds between 9 and 12 rules inclusive, counted structurally', () => {
    // Rules are `### N. <text>` headings scoped to the `## The Rules` section.
    const rules = section(read(), /^## The Rules$/).filter((l) => /^### \d+\. /.test(l));
    expect(rules.length).toBeGreaterThanOrEqual(9);
    expect(rules.length).toBeLessThanOrEqual(12);
  });
});

describe('output style template: STE mechanics are integrated rules', () => {
  const mechanics: Array<[string, RegExp]> = [
    ['sentence limits by passage type', /\b20\b[\s\S]{0,200}\b25\b/],
    ['modal ladder', /should[\s\S]{0,40}must/i],
    ['may / might / could collapse to can', /may[\s\S]{0,60}can\b/i],
    ['one word per concept', /one word/i],
    ['condition before command', /condition/i],
    ['no contractions', /contraction/i],
    ['no semicolons', /semicolon/i],
    ['no Latin abbreviations', /latin/i],
  ];

  for (const [label, pattern] of mechanics) {
    it(`states the rule: ${label}`, () => {
      const rules = section(read(), /^## The Rules$/).join('\n');
      expect(rules, `missing STE mechanic: ${label}`).toMatch(pattern);
    });
  }

  it('carries the slop-to-simple table inside the rule set', () => {
    const rules = section(read(), /^## The Rules$/).join('\n');
    const tableRows = rules.split('\n').filter((l) => /^\|.*\|$/.test(l));
    expect(tableRows.length, 'no slop-to-simple table found').toBeGreaterThan(3);
  });
});

describe('output style template: prior 8 rules survive merged', () => {
  const priorIntent: Array<[string, RegExp]> = [
    ['open with the outcome', /first line/i],
    ['end when done', /last line/i],
    ['one next action', /one[\s\S]{0,40}action|next action/i],
    ['every claim carries a fact', /\bfact\b|specific/i],
    ['failure in the same plain register', /fail/i],
    ['state as structure', /table|list/i],
    ['length matches the decision', /length/i],
    ['write plainly', /plain/i],
  ];

  for (const [label, pattern] of priorIntent) {
    it(`keeps the intent: ${label}`, () => {
      const rules = section(read(), /^## The Rules$/).join('\n');
      expect(rules, `lost prior rule intent: ${label}`).toMatch(pattern);
    });
  }
});

describe('output style template: scope covers all human-facing surfaces', () => {
  const surfaces: Array<[string, RegExp]> = [
    ['gate artifacts', /artifact/i],
    ['PR bodies', /\bPR\b|pull request/i],
    ['session-end summaries', /session-end/i],
    ['interview playback', /interview/i],
    ['gate chat / dialogue', /dialogue|chat/i],
  ];

  for (const [label, pattern] of surfaces) {
    it(`names the governed surface: ${label}`, () => {
      const scope = section(read(), /^## Scope$/).join('\n');
      expect(scope, `Scope does not name: ${label}`).toMatch(pattern);
    });
  }

  it('keeps the agent-facing exemption list', () => {
    const scope = section(read(), /^## Scope$/).join('\n');
    expect(scope).toMatch(/exempt/i);
    expect(scope).toMatch(/spec/i);
    expect(scope).toMatch(/frontmatter|queue|discovery/i);
  });
});

describe('output style template: two-tier self-check', () => {
  const selfCheck = () => section(read(), /^## Self-Check$/).join('\n');

  it('has a Self-Check section', () => {
    expect(selfCheck().length, 'no Self-Check section found').toBeGreaterThan(0);
  });

  it('names the fix-to-zero tier and its five classes', () => {
    const text = selfCheck();
    expect(text).toMatch(/fix to zero/i);
    for (const cls of [/contraction/i, /semicolon/i, /modal/i, /latin/i, /slop/i]) {
      expect(text, `fix-to-zero tier is missing a class: ${cls}`).toMatch(cls);
    }
  });

  it('names the advisory tier with sentence length and synonym rotation', () => {
    const text = selfCheck();
    expect(text).toMatch(/advisory/i);
    expect(text).toMatch(/sentence length/i);
    expect(text).toMatch(/synonym/i);
  });

  it('imposes no script obligation on the reader', () => {
    expect(read()).not.toMatch(/ste[-_]lint|python3?\s+scripts\//i);
  });
});

describe('output style template: the doc obeys its own fix-to-zero classes', () => {
  /**
   * Normative prose only. Two carve-outs, both of which spec 3's linter must
   * honor as well:
   *   1. The Worked Example's "before" sample demonstrates the failures on
   *      purpose.
   *   2. Inline code spans and the doubled-quoted samples inside the rules —
   *      a doc that bans `should` has to be able to write the word `should`.
   */
  function normativeProse(): string {
    const lines = read().split('\n');
    const exampleStart = lines.findIndex((l) => /^## Worked Example$/.test(l));
    const kept = exampleStart === -1 ? lines : lines.slice(0, exampleStart);
    return kept
      .join('\n')
      .replace(/`[^`]*`/g, '`CODE`')
      .replace(/"[^"]*"/g, '"SAMPLE"');
  }

  it('uses no contractions', () => {
    expect(normativeProse()).not.toMatch(/\b\w+['’](?:t|s|re|ve|ll|d|m)\b/i);
  });

  it('uses no semicolons', () => {
    expect(normativeProse()).not.toMatch(/;/);
  });

  it('uses no banned modals', () => {
    expect(normativeProse()).not.toMatch(/\b(?:should|may|might|could)\b/i);
  });

  it('uses no Latin abbreviations', () => {
    expect(normativeProse()).not.toMatch(/\b(?:e\.g\.|i\.e\.|etc\.|via|vs\.?)\b/i);
  });
});

describe('output style template: worked example', () => {
  it('carries at least one before/after worked example', () => {
    const example = section(read(), /^## Worked Example$/).join('\n');
    expect(example.length, 'no worked example section found').toBeGreaterThan(0);
    expect(example).toMatch(/before/i);
    expect(example).toMatch(/after/i);
  });
});

describe('output style template: reference-doc shape', () => {
  it('has an H1, a blockquote purpose line, and at least one section', () => {
    const lines = read().split('\n');
    expect(lines.some((l) => /^# /.test(l)), 'missing H1').toBe(true);
    expect(lines.some((l) => /^> /.test(l)), 'missing blockquote').toBe(true);
    expect(lines.some((l) => /^## /.test(l)), 'missing section').toBe(true);
  });
});

describe('output style template: no absolute or repo paths', () => {
  it('uses project-relative paths only', () => {
    const content = read();
    expect(content).not.toMatch(/\/Users\//);
    expect(content).not.toMatch(/joycraft\/src/);
  });
});

describe('output style template: auto-bundle key shape', () => {
  it('maps to the reference/output-style.md bundle key', () => {
    // Mirrors the bundler's readTreeDir(relative(TEMPLATES_DIR, file)) normalization.
    expect(existsSync(STYLE_DOC), `${STYLE_DOC} should exist`).toBe(true);
    const key = relative(TEMPLATES_DIR, STYLE_DOC).split(/[\\/]/).join('/');
    expect(key).toBe('reference/output-style.md');
  });
});

describe('output style template: no self-scoring rubric', () => {
  it('contains no numeric scoring rubric', () => {
    expect(read()).not.toMatch(/\b(?:1-10|1 to 10|score .* out of)\b/i);
  });
});

describe('output style template: installed copy stays byte-identical', () => {
  it('docs/templates/reference/output-style.md matches the source template', () => {
    const installed = join(ROOT, 'docs', 'templates', 'reference', 'output-style.md');
    expect(existsSync(installed), `${installed} should exist`).toBe(true);
    expect(readFileSync(installed, 'utf-8')).toBe(read());
  });
});

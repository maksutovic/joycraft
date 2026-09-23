import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Spec cite-profile-in-skills: five skills cite the model-profile doc by its
 * installed path plus a block name, at the line where the behavior matters.
 * Citations point; they never restate block prose (D1: one home per fact).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PROFILE_INSTALLED = 'docs/templates/reference/model-profile-claude-fable-5-1.md';
const PROFILE_SOURCE = join(ROOT, 'src', 'templates', 'reference', 'model-profile-claude-fable-5-1.md');

const SKILLS = [
  'joycraft-implement',
  'joycraft-implement-feature',
  'joycraft-session-end',
  'joycraft-new-feature',
  'joycraft-interview',
] as const;

const src = (name: string) => readFileSync(join(ROOT, 'src', 'skills', `${name}.md`), 'utf-8');
const generated = (name: string) =>
  readFileSync(join(ROOT, 'src', 'claude-skills', `${name}.md`), 'utf-8');

const profile = () => readFileSync(PROFILE_SOURCE, 'utf-8');
const headings = () =>
  profile()
    .split('\n')
    .filter((l) => l.startsWith('## '))
    .map((l) => l.slice(3).trim());

/** Lines of a skill that carry the profile citation. */
const citationLines = (content: string) =>
  content.split('\n').filter((l) => l.includes(PROFILE_INSTALLED));

/** Block names cited on a line: every double-quoted string that names a heading. */
const citedBlocks = (line: string) => [...line.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

describe('five skills cite the model-profile doc by installed path', () => {
  for (const name of SKILLS) {
    it(`${name}.md cites ${PROFILE_INSTALLED}`, () => {
      expect(src(name)).toContain(PROFILE_INSTALLED);
    });

    it(`${name}.md never cites the src/templates path`, () => {
      expect(src(name)).not.toMatch(/src\/templates\/reference\/model-profile/);
    });

    it(`${name}.md names at least one existing block on every citation line`, () => {
      const known = new Set(headings());
      const lines = citationLines(src(name));
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        const blocks = citedBlocks(line).filter((b) => known.has(b));
        expect(blocks.length, `no known block named on: ${line}`).toBeGreaterThan(0);
      }
    });

    it(`generated src/claude-skills/${name}.md carries the citation`, () => {
      expect(generated(name)).toContain(PROFILE_INSTALLED);
    });
  }
});

describe('every cited block name resolves to a ## heading in the profile doc', () => {
  it('all quoted names on citation lines that look like block names exist', () => {
    const known = new Set(headings());
    const cited = new Set<string>();
    for (const name of SKILLS) {
      for (const line of citationLines(src(name))) {
        for (const b of citedBlocks(line)) cited.add(b);
      }
    }
    expect(cited.size).toBeGreaterThan(0);
    for (const b of cited) {
      expect(known.has(b), `cited block "${b}" is not a ## heading in the profile doc`).toBe(true);
    }
  });
});

describe('citations sit where the behavior matters', () => {
  it('implement cites "Finish the Whole Task" inside Step 6, before the Report block', () => {
    const c = src('joycraft-implement');
    const step6 = c.indexOf('## Step 6:');
    const report = c.indexOf('### Report', step6);
    const cite = c.indexOf(PROFILE_INSTALLED);
    expect(step6).toBeGreaterThan(-1);
    expect(report).toBeGreaterThan(step6);
    expect(cite).toBeGreaterThan(step6);
    expect(cite).toBeLessThan(report);
    const line = citationLines(c).find((l) => l.includes('"Finish the Whole Task"'));
    expect(line).toBeDefined();
  });

  it('implement-feature cites inside the harness:claude queue-driving branch', () => {
    const c = src('joycraft-implement-feature');
    const branchStart = c.indexOf('<!-- harness:claude -->\n\n');
    const loop = c.indexOf('## Step 2:', branchStart);
    const branchEnd = c.indexOf('<!-- /harness -->', loop);
    const cite = c.indexOf(PROFILE_INSTALLED);
    expect(loop).toBeGreaterThan(-1);
    expect(cite).toBeGreaterThan(loop);
    expect(cite).toBeLessThan(branchEnd);
  });

  it('session-end cites inside section 3 spec graduation', () => {
    const c = src('joycraft-session-end');
    const start = c.indexOf('## 3. Graduate Specs');
    const end = c.indexOf('## 4.', start);
    const cite = c.indexOf(PROFILE_INSTALLED);
    expect(cite).toBeGreaterThan(start);
    expect(cite).toBeLessThan(end);
  });

  it('new-feature cites in Phase 1, before Phase 2 opens', () => {
    const c = src('joycraft-new-feature');
    const start = c.indexOf('## Phase 1: Interview');
    const end = c.indexOf('## Phase 2: Feature Brief');
    const cite = c.indexOf(PROFILE_INSTALLED);
    expect(cite).toBeGreaterThan(start);
    expect(cite).toBeLessThan(end);
  });

  it('interview cites in the playback and hand-off regions, above the fences', () => {
    const c = src('joycraft-interview');
    const regions: Array<[string, string]> = [
      ['### 3. Play Back Understanding', '### 4.'],
      ['### 6. Hand Off', '## Recommended Next Steps'],
    ];
    for (const [from, to] of regions) {
      const start = c.indexOf(from);
      const end = c.indexOf(to, start);
      const fence = c.indexOf('```', start);
      const cite = c.indexOf(PROFILE_INSTALLED, start);
      expect(start, from).toBeGreaterThan(-1);
      expect(cite, `citation in ${from}`).toBeGreaterThan(start);
      expect(cite).toBeLessThan(end);
      expect(cite, `citation above the fence in ${from}`).toBeLessThan(fence);
    }
    const guidelines = c.indexOf('## Guidelines');
    expect(c.slice(guidelines)).not.toContain(PROFILE_INSTALLED);
  });
});

describe('citations point, they do not restate', () => {
  /** Body sentences of each profile block (headings and the Scope preamble excluded). */
  const bodySentences = () => {
    const out: string[] = [];
    let inBlock = false;
    for (const line of profile().split('\n')) {
      if (line.startsWith('## ')) {
        inBlock = line.slice(3).trim() !== 'Scope';
        continue;
      }
      if (!inBlock) continue;
      for (const s of line.replace(/^[-*>\d.\s]+/, '').split(/(?<=[.!?])\s+/)) {
        const t = s.trim();
        if (t.length >= 40) out.push(t);
      }
    }
    return out;
  };

  for (const name of SKILLS) {
    it(`${name}.md copies no block body sentence verbatim`, () => {
      const c = src(name);
      const sentences = bodySentences();
      expect(sentences.length).toBeGreaterThan(0);
      for (const s of sentences) {
        expect(c.includes(s), `copied from profile: ${s}`).toBe(false);
      }
    });
  }
});

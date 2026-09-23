import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Spec: consume-intent-in-new-feature-and-bugfix.
 *
 * The read end of the docs/intent/ inbox: joycraft-new-feature and
 * joycraft-bugfix accept an intent path as their argument, pre-fill from it,
 * stamp `intent:` into the artifact they write, and update the intent's
 * `Status:` header while leaving the file in place.
 */

const ROOT = join(__dirname, '..');
const SKILLS = ['joycraft-new-feature', 'joycraft-bugfix'] as const;

function read(dir: string, skill: string): string {
  return readFileSync(join(ROOT, 'src', dir, `${skill}.md`), 'utf-8');
}

/** Every fenced ```yaml block in the skill body. */
function yamlBlocks(content: string): string[] {
  return [...content.matchAll(/```yaml\n([\s\S]*?)```/g)].map((m) => m[1]);
}

/** The yaml block that documents the artifact's own frontmatter. */
function artifactFrontmatter(content: string, key: 'feature' | 'area'): string {
  const block = yamlBlocks(content).find(
    (b) => /^status:/m.test(b) && /^owner:/m.test(b) && /^created:/m.test(b) && new RegExp(`^${key}:`, 'm').test(b),
  );
  expect(block, `no frontmatter block with ${key}:`).toBeDefined();
  return block as string;
}

describe('intent consumers — canonical skills', () => {
  for (const skill of SKILLS) {
    describe(skill, () => {
      const content = read('skills', skill);

      it('accepts an intent path as its argument', () => {
        expect(content).toContain('docs/intent/');
        expect(content).toMatch(/intent path/i);
        expect(content).toMatch(/argument/i);
      });

      it('cites the intent template by path rather than restating it', () => {
        expect(content).toContain('docs/templates/INTENT_TEMPLATE.md');
      });

      it('names the intent sections it pre-fills from', () => {
        const sections = ['Problem', 'Proposed outcome', 'Affected users and systems', 'Constraints'];
        const named = sections.filter((s) => content.includes(`**${s}**`));
        expect(named.length).toBeGreaterThanOrEqual(skill === 'joycraft-bugfix' ? 2 : 3);
        expect(content).toContain('**Problem**');
        expect(content).toContain('**Affected users and systems**');
      });

      it('states the intent file stays in docs/intent/ and is never moved or deleted', () => {
        expect(content).toMatch(/stays in `docs\/intent\/`/);
        expect(content).toMatch(/never (move|delete)/i);
      });

      it("updates the intent's Status: header, naming the consuming skill", () => {
        expect(content).toMatch(/`Status:`/);
        expect(content).toContain(`consumed by ${skill}`);
      });

      it('falls back to the no-argument flow when the intent path does not exist', () => {
        expect(content).toMatch(/does not exist/i);
      });
    });
  }

  it('new-feature pre-fills Open questions as opening interview questions', () => {
    expect(read('skills', 'joycraft-new-feature')).toContain('**Open questions**');
  });

  it("new-feature's brief frontmatter carries intent: alongside the 4 fields", () => {
    const block = artifactFrontmatter(read('skills', 'joycraft-new-feature'), 'feature');
    expect(block).toMatch(/^intent: docs\/intent\//m);
  });

  it("bugfix's spec frontmatter carries intent: alongside the 4 fields", () => {
    const block = artifactFrontmatter(read('skills', 'joycraft-bugfix'), 'area');
    expect(block).toMatch(/^intent: docs\/intent\//m);
    expect(block).toMatch(/^status: todo$/m);
  });

  it('new-feature still accepts a brief path argument', () => {
    expect(read('skills', 'joycraft-new-feature')).toMatch(/brief path/);
  });

  it('bugfix still writes to docs/bugfixes/<area>/ and keeps the area README index', () => {
    const content = read('skills', 'joycraft-bugfix');
    expect(content).toContain('docs/bugfixes/<area>/');
    expect(content).toContain('docs/bugfixes/<area>/README.md');
    expect(content).toMatch(/Lazy-create/);
  });
});

describe('intent consumers — generated parity', () => {
  for (const dir of ['claude-skills', 'codex-skills']) {
    it(`${dir} new-feature carries the intent argument and intent: frontmatter`, () => {
      const content = read(dir, 'joycraft-new-feature');
      expect(content).toContain('docs/intent/');
      expect(content).toMatch(/intent path/i);
      expect(artifactFrontmatter(content, 'feature')).toMatch(/^intent: docs\/intent\//m);
    });

    it(`${dir} bugfix carries the intent argument and intent: frontmatter`, () => {
      const content = read(dir, 'joycraft-bugfix');
      expect(content).toContain('docs/intent/');
      expect(content).toMatch(/intent path/i);
      expect(artifactFrontmatter(content, 'area')).toMatch(/^intent: docs\/intent\//m);
    });
  }
});

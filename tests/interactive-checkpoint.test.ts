import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { getBundleInventory, TEMPLATE_HARNESS_GATES } from '../src/bundle-inventory.js';
import { TEMPLATES } from '../src/bundled-files.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEMPLATE_KEY = 'CHECKPOINT_TEMPLATE.html';
const DOC_KEY = 'reference/interactive-checkpoint.md';
const TEMPLATE_SRC = join(ROOT, 'src', 'templates', TEMPLATE_KEY);
const DOC_SRC = join(ROOT, 'src', 'templates', DOC_KEY);
const INSTALLED_DOC = `docs/templates/${DOC_KEY}`;
const INSTALLED_TEMPLATE = `docs/templates/${TEMPLATE_KEY}`;

const template = () => readFileSync(TEMPLATE_SRC, 'utf-8');
const doc = () => readFileSync(DOC_SRC, 'utf-8');
const skill = (name: string) => readFileSync(join(ROOT, 'src', 'skills', `${name}.md`), 'utf-8');

/**
 * The interactive checkpoint: a gate page that captures answers through the
 * Artifact db capability and is read back with ArtifactData. Claude-only by
 * construction, because no other harness has those tools.
 */

const SLOTS = ['title', 'eyebrow', 'title-h1', 'dek', 'context-strip', 'sections', 'checkpoint-data', 'howto', 'footer'];

describe('CHECKPOINT_TEMPLATE.html — shape', () => {
  it('exists in src/templates/', () => {
    expect(existsSync(TEMPLATE_SRC)).toBe(true);
  });

  for (const slot of SLOTS) {
    it(`declares the ${slot} slot region`, () => {
      expect(template()).toContain(`SLOT:${slot}`);
    });
  }

  it('carries the JSON data block the runtime renders from', () => {
    const t = template();
    expect(t).toContain('<script type="application/json" id="checkpoint-data">');
    const json = t.match(/<script type="application\/json" id="checkpoint-data">([\s\S]*?)<\/script>/)?.[1] ?? '';
    const parsed = JSON.parse(json);
    expect(parsed.collection).toBe('answers');
    expect(parsed.statusDoc).toBe('meta/status');
    expect(parsed.questions[0].options.length).toBeGreaterThanOrEqual(2);
  });

  it('reaches the db capability through claude.use and never a flat member', () => {
    const t = template();
    expect(t).toContain('window.claude.use("db")');
    expect(t).not.toMatch(/window\.claude\.db\b/);
  });

  it('writes one document per answer and a status document on submit', () => {
    const t = template();
    expect(t).toContain('db.collection(COLLECTION).doc(id)');
    expect(t).toContain('db.doc(STATUS_DOC).set(');
    expect(t).toContain('onSnapshot');
  });

  it('carries the three fixed escapes the decision states allow', () => {
    const t = template();
    for (const key of ['__backlog', '__discard', '__defer']) expect(t).toContain(key);
    expect(t).toContain('backlogged');
    expect(t).toContain('discarded');
    expect(t).toContain('assigned');
    expect(t).toContain('clarified');
  });

  it('degrades honestly without a data store', () => {
    expect(template()).toContain('Not saving');
    expect(template()).toContain('copy the output block');
  });

  it('is self-contained: no external requests', () => {
    const t = template();
    expect(t).not.toMatch(/\b(src|href)=["']https?:/);
    expect(t).not.toMatch(/@import|fetch\(|XMLHttpRequest|<link/);
  });

  it('follows the artifact page contract: tokens, dark mode, body background, gutter', () => {
    const t = template();
    expect(t).toContain(':root {');
    expect(t).toContain('@media (prefers-color-scheme: dark)');
    expect(t).toContain(':root:not([data-theme="light"])');
    expect(t).toContain(':root[data-theme="dark"]');
    expect(t).toMatch(/body \{[^}]*background: var\(--ground\)/);
    expect(t).toContain('--gutter: 16px');
    expect(t).toContain('name="viewport"');
  });

  it('names the reject-this-framing escape in the how-to slot and the reason box', () => {
    const t = template();
    expect(t.toLowerCase()).toContain('reject-this-framing');
    expect(t).toContain('reject the framing');
  });

  it('runtime script parses as JavaScript', () => {
    const scripts = [...template().matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(scripts).toHaveLength(1);
    expect(() => new vm.Script(scripts[0])).not.toThrow();
  });

  it('uses project-relative paths only', () => {
    expect(template()).not.toMatch(/\/Users\//);
    expect(template()).not.toMatch(/joycraft\/src/);
  });
});

const BLOCKS = [
  'When to Build a Checkpoint',
  'The Loop',
  'Anatomy of the Page',
  'Data Contract',
  'Publish and Verify',
  'Read Back',
  'Fallbacks',
  'Lessons From the First Run',
];

describe('reference/interactive-checkpoint.md — the one home of the protocol', () => {
  it('has the reference-doc shape', () => {
    const lines = doc().split('\n');
    expect(lines.some((l) => /^# /.test(l))).toBe(true);
    expect(lines.some((l) => /^> /.test(l))).toBe(true);
  });

  for (const block of BLOCKS) {
    it(`carries the "${block}" block exactly once`, () => {
      const matches = doc().split('\n').filter((l) => l === `## ${block}`);
      expect(matches).toHaveLength(1);
    });
  }

  it('names the template, the db capability, and the read-back tool', () => {
    const d = doc();
    expect(d).toContain('docs/templates/CHECKPOINT_TEMPLATE.html');
    expect(d).toContain('capabilities: {"db": {}}');
    expect(d).toContain('`ArtifactData`');
    expect(d).toContain('answers/<id>');
    expect(d).toContain('meta/status');
  });

  it('keeps the one-re-prompt rule and the reversal confirmation', () => {
    const d = doc();
    expect(d).toContain('exactly one re-prompt');
    expect(d).toContain('(not given after re-prompt)');
    expect(d).toContain('Never ask the same question twice');
  });

  it('uses project-relative paths only', () => {
    expect(doc()).not.toMatch(/\/Users\//);
    expect(doc()).not.toMatch(/joycraft\/src/);
  });
});

describe('harness gating — claude only', () => {
  it('gates both files to claude', () => {
    expect(TEMPLATE_HARNESS_GATES[TEMPLATE_KEY]).toEqual(['claude']);
    expect(TEMPLATE_HARNESS_GATES[DOC_KEY]).toEqual(['claude']);
  });

  it('bundles both files', () => {
    expect(TEMPLATES[TEMPLATE_KEY]).toBe(template());
    expect(TEMPLATES[DOC_KEY]).toBe(doc());
  });

  it('installs for claude and for a mixed selection that includes claude', () => {
    for (const selection of [['claude'], ['claude', 'codex']] as const) {
      const paths = getBundleInventory([...selection]).map((e) => e.path);
      expect(paths).toContain(INSTALLED_DOC);
      expect(paths).toContain(INSTALLED_TEMPLATE);
    }
  });

  it('never installs for codex, pi, omp, or copilot alone', () => {
    for (const harness of ['codex', 'pi', 'omp', 'copilot'] as const) {
      const paths = getBundleInventory([harness]).map((e) => e.path);
      expect(paths, harness).not.toContain(INSTALLED_DOC);
      expect(paths, harness).not.toContain(INSTALLED_TEMPLATE);
    }
  });
});

const CITING_SKILLS = [
  'joycraft-decide',
  'joycraft-interview',
  'joycraft-new-feature',
  'joycraft-design',
  'joycraft-research',
  'joycraft-decompose',
  'joycraft-tune',
  'joycraft-optimize',
] as const;

/** Text inside every claude-including harness block, plus text outside any block. */
function claudeVisible(content: string): string {
  const out: string[] = [];
  const re = /<!-- harness:([^ ]+) -->([\s\S]*?)<!-- \/harness -->/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    out.push(content.slice(last, m.index));
    if (m[1].split('|').includes('claude')) out.push(m[2]);
    last = m.index + m[0].length;
  }
  out.push(content.slice(last));
  return out.join('');
}

function nonClaudeOnly(content: string): string {
  return [...content.matchAll(/<!-- harness:([^ ]+) -->([\s\S]*?)<!-- \/harness -->/g)]
    .filter((m) => !m[1].split('|').includes('claude'))
    .map((m) => m[2])
    .join('');
}

describe('gate skills cite the checkpoint on the claude harness only', () => {
  for (const name of CITING_SKILLS) {
    it(`${name}.md cites the reference doc where claude reads it`, () => {
      expect(claudeVisible(skill(name))).toContain(INSTALLED_DOC);
    });

    it(`${name}.md keeps the citation out of the other harnesses' blocks`, () => {
      expect(nonClaudeOnly(skill(name))).not.toContain('interactive-checkpoint');
    });

    it(`${name}.md does not restate the read-back protocol`, () => {
      expect(skill(name)).not.toContain('answers/<id>');
      expect(skill(name)).not.toContain('meta/status');
    });
  }

  it('decide no longer forbids interactive capture on claude', () => {
    const visible = claudeVisible(skill('joycraft-decide'));
    expect(visible).not.toContain('never via interactive HTML');
  });

  it('generated non-claude variants carry no checkpoint reference', () => {
    for (const tree of ['codex-skills', 'pi-skills', 'omp-skills', 'copilot-skills']) {
      for (const name of CITING_SKILLS) {
        const p = join(ROOT, 'src', tree, `${name}.md`);
        if (!existsSync(p)) continue;
        expect(readFileSync(p, 'utf-8'), `${tree}/${name}`).not.toContain('interactive-checkpoint');
      }
    }
  });
});

describe('installed copies on this repo', () => {
  it('docs/templates/ holds byte-identical copies of both files', () => {
    expect(readFileSync(join(ROOT, INSTALLED_TEMPLATE), 'utf-8')).toBe(template());
    expect(readFileSync(join(ROOT, INSTALLED_DOC), 'utf-8')).toBe(doc());
  });
});

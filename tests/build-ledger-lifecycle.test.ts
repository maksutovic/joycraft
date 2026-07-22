import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const SESSION_END_SKILL = join(repoRoot, '.claude', 'skills', 'joycraft-session-end', 'SKILL.md');
const ADD_FACT_SKILL = join(repoRoot, '.claude', 'skills', 'joycraft-add-fact', 'SKILL.md');
const KNOWLEDGE_LIFECYCLE = join(repoRoot, 'docs', 'reference', 'knowledge-lifecycle.md');

const read = (p: string) => readFileSync(p, 'utf-8');

describe('joycraft-session-end graduation path (ledger + reap marker)', () => {
  const content = () => read(SESSION_END_SKILL);

  it('prepends a ledger row to docs/context/shipped.md', () => {
    const c = content();
    expect(c).toMatch(/shipped\.md/);
    expect(c.toLowerCase()).toMatch(/prepend/);
  });

  it('confirms the feature\'s D-ids landed in the decision log, reporting landed/missing', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/decision-log/);
    expect(c).toMatch(/d-id/);
    expect(c).toMatch(/landed/);
    expect(c).toMatch(/missing/);
  });

  it('sets reap: eligible in the brief frontmatter', () => {
    const c = content();
    expect(c).toMatch(/reap:\s*eligible/);
  });

  it('explicitly states it never deletes the folder (D1)', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/never delete/);
  });

  it('carries the PILOT divergence marker', () => {
    const c = content();
    expect(c).toMatch(/<!--\s*PILOT:/);
  });

  it('references the overlap check before creating a new discovery/context file or row', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/grep/);
    expect(c).toMatch(/overlap/);
  });

  it('references the rotation procedure in knowledge-lifecycle.md', () => {
    const c = content();
    expect(c).toMatch(/knowledge-lifecycle\.md/);
  });
});

describe('joycraft-add-fact overlap check + rotation reference', () => {
  const content = () => read(ADD_FACT_SKILL);

  it('greps the knowledge layer for an existing home before creating a new file/row', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/grep/);
    expect(c).toMatch(/overlap/);
  });

  it('on overlap, updates the existing doc in place and says so', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/update.*in place|in place.*update/);
  });

  it('references the rotation procedure in knowledge-lifecycle.md', () => {
    const c = content();
    expect(c).toMatch(/knowledge-lifecycle\.md/);
  });

  it('carries the PILOT divergence marker', () => {
    const c = content();
    expect(c).toMatch(/<!--\s*PILOT:/);
  });
});

describe('docs/reference/knowledge-lifecycle.md', () => {
  it('exists', () => {
    expect(existsSync(KNOWLEDGE_LIFECYCLE)).toBe(true);
  });

  const content = () => read(KNOWLEDGE_LIFECYCLE);

  it('defines all five lifecycle verbs: Keep, Update, Consolidate, Replace, Delete', () => {
    const c = content();
    for (const verb of ['Keep', 'Update', 'Consolidate', 'Replace', 'Delete']) {
      expect(c, `missing verb: ${verb}`).toMatch(new RegExp(`\\b${verb}\\b`));
    }
  });

  it('gates Delete behind an inbound-link grep', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/inbound/);
    expect(c).toMatch(/grep/);
  });

  it('states contradictions between docs are surfaced to the human, never silently resolved', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/contradiction/);
    expect(c).toMatch(/never silently|not silently|surface/);
  });

  it('documents the 200-line rotation procedure with numbered shards and a pointer-only manifest', () => {
    const c = content();
    expect(c).toMatch(/200/);
    expect(c.toLowerCase()).toMatch(/shard/);
    expect(c.toLowerCase()).toMatch(/manifest/);
    expect(c.toLowerCase()).toMatch(/pointer-only/);
  });

  it('names the shipped-manifest.json pattern and creates the manifest only at first rotation', () => {
    const c = content();
    expect(c).toMatch(/shipped-manifest\.json|shipped-001\.md/);
    expect(c.toLowerCase()).toMatch(/first rotation/);
  });
});

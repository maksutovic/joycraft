import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const DOC_PATH = join(ROOT, 'docs', 'reference', 'spec-status-lifecycle.md');

/** Read the doc once per test — asserts on the real file on disk, not a fixture copy. */
function readDoc(): string {
  return readFileSync(DOC_PATH, 'utf-8');
}

describe('spec-status-lifecycle doc: exists', () => {
  it('exists at docs/reference/spec-status-lifecycle.md', () => {
    expect(existsSync(DOC_PATH), `${DOC_PATH} should exist`).toBe(true);
  });
});

describe('spec-status-lifecycle doc: defines all three states', () => {
  it('contains the three canonical state tokens', () => {
    const doc = readDoc();
    expect(doc).toContain('todo');
    expect(doc).toContain('in-review');
    expect(doc).toContain('done');
  });

  it('uses the hyphenated in-review form, never in_review or inreview', () => {
    const doc = readDoc();
    expect(doc).not.toMatch(/in_review/);
    expect(doc).not.toMatch(/inreview/);
  });

  it('contains the three glyphs used by joycraft-spec-status', () => {
    const doc = readDoc();
    expect(doc).toContain('[ ]');
    expect(doc).toContain('[~]');
    expect(doc).toContain('[✓]');
  });
});

describe('spec-status-lifecycle doc: migration mapping', () => {
  it('documents all four old→new mappings', () => {
    const doc = readDoc();
    // assert each old token co-occurs with its new target somewhere in the doc
    expect(doc).toMatch(/active[\s\S]*?todo/);
    expect(doc).toMatch(/backlog[\s\S]*?todo/);
    expect(doc).toMatch(/complete[\s\S]*?done/);
    expect(doc).toMatch(/shipped[\s\S]*?done/);
  });
});

describe('spec-status-lifecycle doc: invariants', () => {
  it('states the "same three words" invariant for queue JSON and frontmatter', () => {
    const doc = readDoc();
    expect(doc).toMatch(/same three words/i);
  });

  it('states the agent-never-self-certifies invariant', () => {
    const doc = readDoc();
    expect(doc).toMatch(/never self-certif/i);
  });

  it('notes that merged/shipped is a git fact, not a tracked spec status', () => {
    const doc = readDoc();
    expect(doc).toMatch(/git/i);
    expect(doc).toMatch(/merged|shipped/i);
  });
});

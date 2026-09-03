import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  renderFolderMap,
  ensureFolderMapSection,
  diffFolderMap,
  FOLDER_MAP_OPEN,
  FOLDER_MAP_CLOSE,
} from '../src/folder-map';
import { init } from '../src/init';

function createTmpDir(): string {
  const dir = join(tmpdir(), `joycraft-folder-map-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

let tree: string;

beforeEach(() => {
  tree = createTmpDir();
  for (const d of ['src', 'docs/context', 'docs/features', 'tests', 'scripts', 'mystery-dir', 'node_modules/x', '.git', 'dist']) {
    mkdirSync(join(tree, d), { recursive: true });
  }
  return () => rmSync(tree, { recursive: true, force: true });
});

describe('renderFolderMap', () => {
  it('emits folders with one-line descriptions, deterministic across runs', () => {
    const first = renderFolderMap(tree);
    const second = renderFolderMap(tree);
    expect(first).toBe(second);
    expect(first).toContain(FOLDER_MAP_OPEN);
    expect(first).toContain(FOLDER_MAP_CLOSE);
    expect(first).toContain('`src/`');
    expect(first).toContain('`docs/`');
    expect(first).toContain('`docs/context/`');
    expect(first).toContain('`tests/`');
  });

  it('skips dot, dependency, and build-output directories', () => {
    const map = renderFolderMap(tree);
    expect(map).not.toContain('node_modules');
    expect(map).not.toContain('.git');
    expect(map).not.toContain('dist');
  });

  it('gives unknown folders a placeholder, never invented prose', () => {
    const row = renderFolderMap(tree).split('\n').find((l) => l.includes('mystery-dir'));
    expect(row).toBeDefined();
    expect(row).toContain('TODO');
  });

  it('documents the nested per-directory growth path', () => {
    const map = renderFolderMap(tree).toLowerCase();
    expect(map).toMatch(/per-directory/);
    expect(map).toContain('collaborative-setup');
    expect(map).toMatch(/never a bigger tree/);
  });

  it('caps rows for very wide trees and recommends the growth path', () => {
    for (let i = 0; i < 40; i++) mkdirSync(join(tree, `pkg-${String(i).padStart(2, '0')}`));
    const map = renderFolderMap(tree);
    const rows = map.split('\n').filter((l) => l.startsWith('| `'));
    expect(rows.length).toBeLessThanOrEqual(31); // 30 folder rows + header
    expect(map.toLowerCase()).toMatch(/capped/);
    // The cap cuts key subfolders before it cuts top-level breadth.
    expect(map).not.toContain('| `docs/context/`');
  });
});

describe('ensureFolderMapSection', () => {
  it('appends an Architecture section with the map when none exists', () => {
    const out = ensureFolderMapSection('# Proj\n\n## Development\n\nstuff\n', tree);
    expect(out).toContain('## Architecture');
    expect(out).toContain(FOLDER_MAP_OPEN);
  });

  it('regenerates rows between markers while preserving human descriptions', () => {
    const original = ensureFolderMapSection('# Proj\n', tree);
    const edited = original.replace(/\| `src\/` \|[^\n]*/, '| `src/` | my hand-written line |');
    mkdirSync(join(tree, 'brand-new'));
    const regenerated = ensureFolderMapSection(edited, tree);
    expect(regenerated).toContain('my hand-written line');
    expect(regenerated).toContain('`brand-new/`');
  });

  it('drops rows for folders that no longer exist', () => {
    const original = ensureFolderMapSection('# Proj\n', tree);
    rmSync(join(tree, 'scripts'), { recursive: true });
    const regenerated = ensureFolderMapSection(original, tree);
    expect(regenerated).not.toContain('`scripts/`');
  });

  it('leaves a hand-written Architecture section without markers untouched', () => {
    const doc = '# Proj\n\n## Architecture\n\nMy own prose tree.\n';
    expect(ensureFolderMapSection(doc, tree)).toBe(doc);
  });
});

describe('diffFolderMap', () => {
  it('reports structural drift, ignoring description wording', () => {
    const doc = ensureFolderMapSection('# Proj\n', tree).replace(
      /\| `src\/` \|[^\n]*/,
      '| `src/` | reworded by a human |'
    );
    mkdirSync(join(tree, 'added-later'));
    rmSync(join(tree, 'tests'), { recursive: true });
    const drift = diffFolderMap(doc, tree);
    expect(drift).not.toBeNull();
    expect(drift!.added).toContain('added-later/');
    expect(drift!.removed).toContain('tests/');
    expect(drift!.added).not.toContain('src/');
  });

  it('returns null when the document has no folder-map block', () => {
    expect(diffFolderMap('# Proj\n\n## Architecture\n\nprose\n', tree)).toBeNull();
  });
});

describe('init wiring', () => {
  it('scaffolds generated files containing the folder map; re-init keeps it', async () => {
    const proj = createTmpDir();
    mkdirSync(join(proj, 'src'));
    try {
      await init(proj, { force: false });
      const agents = readFileSync(join(proj, 'AGENTS.md'), 'utf-8');
      expect(agents).toContain(FOLDER_MAP_OPEN);
      expect(agents).toContain('`src/`');
    } finally {
      rmSync(proj, { recursive: true, force: true });
    }
  });
});

describe('tune drift check (advisory)', () => {
  const tune = readFileSync(join(__dirname, '..', 'src', 'skills', 'joycraft-tune.md'), 'utf-8');

  it('contains the regenerate-and-diff instruction in an advisory voice', () => {
    const t = tune.toLowerCase();
    expect(t).toMatch(/folder[- ]map/);
    expect(t).toMatch(/drift/);
    expect(t).toMatch(/added.*removed|removed.*added/);
    expect(t).toMatch(/never auto-edit|advisory|report only/);
  });
});

describe("Joycraft's own AGENTS.md", () => {
  it('uses the map shape instead of a deep hand-maintained tree', () => {
    const agents = readFileSync(join(__dirname, '..', 'AGENTS.md'), 'utf-8');
    expect(agents).toContain(FOLDER_MAP_OPEN);
    // No deep ascii tree remains (file-level entries three levels deep).
    expect(agents).not.toMatch(/│\s+│/);
  });
});

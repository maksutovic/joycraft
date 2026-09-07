import { describe, expect, it } from 'vitest';
import { HARNESSES } from '../src/harness';
import { getBundleInventory, type BundleInventoryEntry } from '../src/bundle-inventory';

function paths(entries: readonly BundleInventoryEntry[]): string[] {
  return entries.map((entry) => entry.path);
}

describe('getBundleInventory', () => {
  it('describes each harness separately and does not resurrect unselected trees', () => {
    for (const harness of HARNESSES) {
      const entries = getBundleInventory([harness]);
      expect(entries.some((entry) => entry.harness === harness && entry.kind === 'vendor')).toBe(true);
      expect(entries.every((entry) => entry.harness === 'shared' || entry.harness === harness)).toBe(true);
    }

    const codexPaths = paths(getBundleInventory(['codex']));
    expect(codexPaths.some((path) => path.startsWith('.claude/'))).toBe(false);
    expect(codexPaths.some((path) => path.startsWith('.pi/'))).toBe(false);
  });

  it('includes shared vendor files, create-once documents, and owned patches', () => {
    const entries = getBundleInventory(['claude', 'codex', 'pi', 'copilot', 'omp']);
    expect(entries.some((entry) => entry.path === 'docs/templates/output/README.md' && entry.kind === 'vendor')).toBe(true);
    expect(entries.filter((entry) => entry.kind === 'create-once').map((entry) => entry.path)).toEqual(
      expect.arrayContaining(['CLAUDE.md', 'AGENTS.md']),
    );
    const patches = entries.filter((entry) => entry.kind === 'config-patch');
    expect(patches.length).toBeGreaterThan(0);
    expect(patches.every((entry) => entry.path === '.claude/settings.json')).toBe(true);
    expect(patches.every((entry) => entry.ownedKey || entry.ownedRegion)).toBe(true);
  });

  it('declares the checker payload and active Claude adapter ownership', () => {
    const entries = getBundleInventory(['claude']);
    const checkerEntries = entries.filter((entry) =>
      entry.path === 'docs/.joycraft/check.mjs' || entry.path === '.claude/hooks/joycraft-version-check.mjs',
    );
    expect(checkerEntries).toHaveLength(2);
    expect(checkerEntries.every((entry) => entry.ownership === 'managed')).toBe(true);
    expect(checkerEntries.find((entry) => entry.path === 'docs/.joycraft/check.mjs')).toEqual(expect.objectContaining({ active: true, installable: true, executable: true }));
    expect(checkerEntries.find((entry) => entry.path === '.claude/hooks/joycraft-version-check.mjs')).toEqual(expect.objectContaining({ active: true, installable: true, executable: true }));
  });

  it('marks executable runtime scripts with their install mode', () => {
    const entries = getBundleInventory(['pi']);
    const scripts = entries.filter((entry) => entry.path.startsWith('.pi/scripts/joycraft/'));
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.filter((entry) => !entry.path.endsWith('README.md')).every((entry) => entry.executable && entry.mode === 0o755)).toBe(true);
    expect(scripts.find((entry) => entry.path.endsWith('README.md'))?.executable).toBe(false);
  });
});

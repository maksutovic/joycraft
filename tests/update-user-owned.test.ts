import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { getBundleInventory, USER_OWNED_VENDOR_PATHS, type BundleInventoryEntry } from '../src/bundle-inventory';
import { init } from '../src/init';
import { upgrade } from '../src/upgrade';
import { formatUpdateOutcome, type UpdateOutcome } from '../src/update';
import { manifestPath, normalizedVendorHash, type InstallationManifest } from '../src/install-manifest';
import { createUpdatePlan } from '../src/update-plan';
import { generateDenyPatternsFile } from '../src/safeguard';

const DENY = '.claude/hooks/joycraft/deny-patterns.txt';
const EXAMPLE_TASK = 'docs/templates/evals/example-task.json';
const inventory = getBundleInventory(['claude']);
const denyEntry = inventory.find((entry) => entry.path === DENY)!;
const defaultDeny = generateDenyPatternsFile();
const customDeny = `${defaultDeny}git\\s+push\\s+([a-zA-Z0-9._/-]+\\s+)?(main|master)($|\\s)\n`;

function manifestWith(file: InstallationManifest['files'][string]): InstallationManifest {
  return {
    schemaVersion: 1,
    targetVersion: '0.7.13',
    bundleIntegrity: '',
    harnesses: ['claude'],
    profile: 'shared',
    files: { [DENY]: file },
  };
}

const unknownVendorRow = {
  vendorVersion: '0.7.13',
  vendorHash: normalizedVendorHash(defaultDeny),
  kind: 'vendor' as const,
  ownership: 'unknown' as const,
};

function plan(current: string | undefined, manifest: InstallationManifest, entries: readonly BundleInventoryEntry[] = [denyEntry], options = {}) {
  return createUpdatePlan({
    snapshot: { files: current === undefined ? {} : { [DENY]: { content: current } } },
    manifest,
    inventory: entries,
    options: { targetVersion: '0.7.16', ...options },
  });
}

describe('user-owned files the product tells users to edit', () => {
  it('declares deny-patterns.txt and the example eval task as create-once with install content', () => {
    for (const path of [DENY, EXAMPLE_TASK]) {
      const entry = getBundleInventory(['claude']).find((candidate) => candidate.path === path);
      expect(entry?.kind).toBe('create-once');
      expect(entry?.content).toBeTruthy();
      expect(USER_OWNED_VENDOR_PATHS).toContain(path);
    }
  });

  it('keeps an edited deny-patterns.txt with unknown ownership instead of reporting a conflict', () => {
    const result = plan(customDeny, manifestWith(unknownVendorRow));
    const action = result.actions.find((candidate) => candidate.path === DENY)!;
    expect(action.kind).toBe('preserve');
    expect(action.selected).toBe(false);
    expect(action.preservedContent).toBe(customDeny);
    expect(result.conflicts).toEqual([]);
    expect(result.nextManifest.files[DENY].kind).toBe('create-once');
  });

  it('keeps an edited deny-patterns.txt that was recorded as a verified vendor file', () => {
    const result = plan(customDeny, manifestWith({ ...unknownVendorRow, ownership: 'verified' }));
    expect(result.actions.find((candidate) => candidate.path === DENY)?.kind).toBe('preserve');
    expect(result.conflicts).toEqual([]);
    expect(result.nextManifest.files[DENY].kind).toBe('create-once');
  });

  it('moves an untouched verified copy to create-once and never updates it afterwards', () => {
    const first = plan(defaultDeny, manifestWith({ ...unknownVendorRow, ownership: 'verified' }));
    expect(first.actions.find((candidate) => candidate.path === DENY)?.kind).toBe('reconcile');
    expect(first.nextManifest.files[DENY]).toMatchObject({ kind: 'create-once', ownership: 'verified' });

    const changedTarget = { ...denyEntry, content: `${defaultDeny}NEW_DEFAULT\n` };
    const second = plan(defaultDeny, first.nextManifest, [changedTarget]);
    const action = second.actions.find((candidate) => candidate.path === DENY)!;
    expect(action.kind).toBe('preserve');
    expect(action.selected).toBe(false);
    expect(action.nonActionable).toBe(true);
    expect(second.preserved.map((entry) => entry.path)).toContain(DENY);
  });

  it('creates both user-owned files on a fresh install and records them as verified create-once', () => {
    const entries = getBundleInventory(['claude']).filter((entry) => entry.path === DENY || entry.path === EXAMPLE_TASK);
    const result = createUpdatePlan({
      snapshot: { files: {} },
      manifest: { ...manifestWith(unknownVendorRow), files: {} },
      inventory: entries,
    });
    for (const path of [DENY, EXAMPLE_TASK]) {
      expect(result.actions.find((candidate) => candidate.path === path)?.kind).toBe('create');
      expect(result.nextManifest.files[path]).toMatchObject({ kind: 'create-once', ownership: 'verified' });
    }
  });

  it('still replaces deny-patterns.txt when the user names it explicitly', () => {
    const result = plan(customDeny, manifestWith(unknownVendorRow), [denyEntry], { replaceCustomized: [DENY] });
    const action = result.actions.find((candidate) => candidate.path === DENY)!;
    expect(action.selected).toBe(true);
    expect(action.content).toBe(defaultDeny);
  });

  it('upgrades an existing install with an edited deny-patterns.txt with exit 0 and unchanged bytes', async () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft-user-owned-'));
    try {
      const bundle = { version: '1.0.0', integrity: '', inventory };
      await init(root, { nonInteractive: true, yes: true, harnesses: ['claude'], bundle });
      const manifestFile = join(root, manifestPath('shared'));
      const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as InstallationManifest;
      manifest.files[DENY] = { ...unknownVendorRow };
      writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
      writeFileSync(join(root, DENY), customDeny);

      for (let run = 0; run < 2; run += 1) {
        const result = await upgrade(root, { nonInteractive: true, yes: true, bundle: { ...bundle, version: '1.0.1' } });
        expect(result.status).not.toBe('conflict');
        expect(result.exitCode).toBe(0);
        expect(result.conflicts).toEqual([]);
        expect(readFileSync(join(root, DENY), 'utf8')).toBe(customDeny);
        const after = JSON.parse(readFileSync(manifestFile, 'utf8')) as InstallationManifest;
        expect(after.files[DENY].kind).toBe('create-once');
        expect(after.pendingConflicts ?? []).not.toContain(DENY);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('existing installs that recorded deny-patterns.txt as vendor', () => {
  it('keeps an untouched verified copy on disk and moves its row to create-once', async () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft-user-owned-'));
    try {
      const bundle = { version: '1.0.0', integrity: '', inventory };
      await init(root, { nonInteractive: true, yes: true, harnesses: ['claude'], bundle });
      const manifestFile = join(root, manifestPath('shared'));
      const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as InstallationManifest;
      manifest.files[DENY] = { ...unknownVendorRow, ownership: 'verified' };
      writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');

      const result = await upgrade(root, { nonInteractive: true, yes: true, bundle: { ...bundle, version: '1.0.1' } });
      expect(result.exitCode).toBe(0);
      expect(readFileSync(join(root, DENY), 'utf8')).toBe(defaultDeny);
      const after = JSON.parse(readFileSync(manifestFile, 'utf8')) as InstallationManifest;
      expect(after.files[DENY]).toMatchObject({ kind: 'create-once', ownership: 'verified' });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('update outcome text', () => {
  function outcome(status: UpdateOutcome['status'], extra: Partial<UpdateOutcome> = {}): UpdateOutcome {
    return {
      status,
      exitCode: 0,
      targetVersion: '0.7.16',
      applied: [],
      preserved: [],
      conflicts: [],
      diagnostics: [],
      registry: 'unknown',
      ...extra,
    } as UpdateOutcome;
  }

  it('leads with a plain sentence for each status', () => {
    expect(formatUpdateOutcome(outcome('applied', { applied: ['a'] }))).toMatch(/^Joycraft updated to 0\.7\.16\.\n {2}Applied: 1$/);
    expect(formatUpdateOutcome(outcome('noop'))).toBe('Joycraft is up to date (0.7.16).');
    expect(formatUpdateOutcome(outcome('preserved', { preserved: ['CLAUDE.md'] }))).toBe(
      'Joycraft is up to date (0.7.16).\n  Kept your versions: CLAUDE.md',
    );
    expect(formatUpdateOutcome(outcome('conflict', { conflicts: ['x'] }))).toBe(
      'Joycraft update needs your review.\n  Target: 0.7.16\n  Needs review: x',
    );
    expect(formatUpdateOutcome(outcome('failed'))).toMatch(/^Joycraft update: failed\.\n {2}Target: 0\.7\.16$/);
  });

  it('keeps the JSON keys unchanged', () => {
    const json = JSON.parse(formatUpdateOutcome(outcome('preserved', { preserved: ['CLAUDE.md'] }), true));
    expect(json.preserved).toEqual(['CLAUDE.md']);
    expect(json.conflicts).toEqual([]);
    expect(json.status).toBe('preserved');
  });
});

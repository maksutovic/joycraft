import { describe, expect, it } from 'vitest';
import { normalizedVendorHash, rawFileHash, type InstallationManifest } from '../src/install-manifest';
import { createUpdatePlan, type UpdateSnapshot } from '../src/update-plan';
import type { BundleInventoryEntry } from '../src/bundle-inventory';

const path = 'skills/one.md';
const base = 'base\n';
const target = 'target\n';

function manifestFor(overrides: Partial<InstallationManifest['files'][string]> = {}): InstallationManifest {
  return {
    schemaVersion: 1,
    targetVersion: '1.0.0',
    bundleIntegrity: '',
    harnesses: ['claude'],
    profile: 'shared',
    files: {
      [path]: {
        vendorVersion: '1.0.0',
        vendorHash: normalizedVendorHash(base),
        kind: 'vendor',
        ownership: 'verified',
        ...overrides,
      },
    },
  };
}

function vendor(content = target): BundleInventoryEntry {
  return {
    path,
    harness: 'claude',
    kind: 'vendor',
    ownership: 'managed',
    active: true,
    installable: true,
    content,
  };
}

function snapshot(content: string | Buffer | undefined): UpdateSnapshot {
  return { files: content === undefined ? {} : { [path]: { content } } };
}

describe('createUpdatePlan comparison contract', () => {
  it.each([
    ['current equals target', target, target, manifestFor(), 'reconcile'],
    ['current equals verified base', base, target, manifestFor(), 'replace'],
    ['local-only edit', 'local\n', base, manifestFor(), 'preserve'],
    ['current and target diverge', 'local\n', target, manifestFor(), 'conflict'],
    ['verified local deletion', undefined, target, manifestFor(), 'preserve'],
  ])('%s', (_name, current, targetContent, manifest, kind) => {
    const plan = createUpdatePlan({ snapshot: snapshot(current), manifest, inventory: [vendor(targetContent)] });
    expect(plan.actions.find((action) => action.path === path)?.kind).toBe(kind);
  });

  it('creates a selected inventory file with no previous entry', () => {
    const plan = createUpdatePlan({
      snapshot: { files: {} },
      manifest: { ...manifestFor(), files: {} },
      inventory: [vendor()],
    });
    const action = plan.actions.find((candidate) => candidate.path === path);
    expect(action?.kind).toBe('create');
    expect(action?.content).toBe(target);
    expect(plan.nextManifest.files[path].vendorHash).toBe(normalizedVendorHash(target));
  });

  it('adopts an existing file only when it exactly matches trusted target bytes', () => {
    const plan = createUpdatePlan({
      snapshot: snapshot(target),
      manifest: { ...manifestFor(), files: {} },
      inventory: [vendor()],
    });
    expect(plan.actions.find((action) => action.path === path)?.kind).toBe('adopt');
    expect(plan.nextManifest.files[path].ownership).toBe('verified');
  });

  it('deletes only an owned file when the target no longer contains it', () => {
    const plan = createUpdatePlan({ snapshot: snapshot(base), manifest: manifestFor(), inventory: [] });
    expect(plan.actions.find((action) => action.path === path)?.kind).toBe('delete');
    expect(plan.nextManifest.files[path]).toBeUndefined();
  });

  it('preserves a customized orphan and exposes a real diff and bytes', () => {
    const plan = createUpdatePlan({ snapshot: snapshot('local\n'), manifest: manifestFor(), inventory: [vendor(target)] });
    const action = plan.actions.find((candidate) => candidate.path === path)!;
    expect(action.kind).toBe('conflict');
    expect(action.preservedContent).toBe('local\n');
    expect(action.diff).toContain('-local');
    expect(action.diff).toContain('+target');
    expect(action.rawPrecondition).toBe(rawFileHash('local\n'));
    expect(action.rawTargetHash).toBe(rawFileHash(target));
  });

  it('uses normalized vendor comparison while preserving current newlines for replacement', () => {
    const current = 'base\r\n';
    const plan = createUpdatePlan({ snapshot: snapshot(current), manifest: manifestFor(), inventory: [vendor('target\n')] });
    const action = plan.actions.find((candidate) => candidate.path === path)!;
    expect(action.kind).toBe('replace');
    expect(action.content).toBe('target\r\n');
    expect(action.rawPrecondition).toBe(rawFileHash(current));
  });

  it('does not select a customized replacement unattended, but records explicit selection', () => {
    const unattended = createUpdatePlan({
      snapshot: snapshot('local\n'),
      manifest: manifestFor(),
      inventory: [vendor()],
      options: { safeUnattended: true },
    });
    expect(unattended.actions.find((action) => action.path === path)?.selected).toBe(false);

    const explicit = createUpdatePlan({
      snapshot: snapshot('local\n'),
      manifest: manifestFor(),
      inventory: [vendor()],
      options: { safeUnattended: true, replaceCustomized: [path] },
    });
    const action = explicit.actions.find((candidate) => candidate.path === path)!;
    expect(action.kind).toBe('conflict');
    expect(action.selected).toBe(true);
    expect(action.resolution).toBe('replace');
    expect(action.content).toBe(target);
  });

  it('requires explicit repair to restore a verified local deletion', () => {
    const plan = createUpdatePlan({
      snapshot: snapshot(undefined),
      manifest: manifestFor(),
      inventory: [vendor()],
      options: { repair: [path] },
    });
    const action = plan.actions.find((candidate) => candidate.path === path)!;
    expect(action.kind).toBe('repair');
    expect(action.selected).toBe(true);
    expect(action.content).toBe(target);
  });
});

describe('createUpdatePlan safety and owned patches', () => {
  it('does not use filesystem, network, or prompt boundaries', () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = (async () => { fetchCalled = true; throw new Error('must not fetch'); }) as typeof fetch;
    try {
      createUpdatePlan({ snapshot: snapshot(base), manifest: manifestFor(), inventory: [vendor()] });
      expect(fetchCalled).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('composes owned JSON key and marked-region patches while retaining unrelated content', () => {
    const jsonPath = 'settings.json';
    const textPath = 'config.txt';
    const jsonCurrent = '{\n  "user": "keep",\n  "managed": "old"\n}\n';
    const regionCurrent = 'before\n<!-- joycraft:managed -->\nold\n<!-- /joycraft:managed -->\nafter\n';
    const jsonEntry: BundleInventoryEntry = {
      path: jsonPath, harness: 'claude', kind: 'config-patch', ownership: 'managed', active: true, installable: true,
      ownedKey: 'managed', content: JSON.stringify('new'),
    };
    const regionEntry: BundleInventoryEntry = {
      path: textPath, harness: 'claude', kind: 'config-patch', ownership: 'managed', active: true, installable: true,
      ownedRegion: 'joycraft:managed', content: 'new\n',
    };
    const input = { files: { [jsonPath]: { content: jsonCurrent }, [textPath]: { content: regionCurrent } } };
    const before = JSON.stringify(input);
    const manifest: InstallationManifest = { ...manifestFor(), files: {
      [jsonPath]: { vendorVersion: '1.0.0', vendorHash: normalizedVendorHash(JSON.stringify('old')), kind: 'config-patch', ownership: 'verified', ownedKey: 'managed' },
      [textPath]: { vendorVersion: '1.0.0', vendorHash: normalizedVendorHash('old\n'), kind: 'config-patch', ownership: 'verified', ownedRegion: 'joycraft:managed' },
    } };
    const plan = createUpdatePlan({ snapshot: input, manifest, inventory: [jsonEntry, regionEntry] });
    const jsonAction = plan.actions.find((action) => action.path === jsonPath)!;
    const regionAction = plan.actions.find((action) => action.path === textPath)!;
    expect(JSON.parse(String(jsonAction.content))).toEqual({ user: 'keep', managed: 'new' });
    expect(String(regionAction.content)).toContain('before\n');
    expect(String(regionAction.content)).toContain('new\n');
    expect(String(regionAction.content)).toContain('after\n');
    expect(JSON.stringify(input)).toBe(before);
  });

  it('does not treat descriptive patch selectors or inactive entries as payloads', () => {
    const selector: BundleInventoryEntry = {
      path: 'settings.json', harness: 'claude', kind: 'config-patch', ownership: 'managed', active: true, installable: false,
      ownedRegion: 'hooks.SessionStart[command=node checker]',
    };
    const inactive: BundleInventoryEntry = {
      path, harness: 'claude', kind: 'vendor', ownership: 'managed', active: false, installable: false,
    };
    const plan = createUpdatePlan({ snapshot: snapshot(base), manifest: manifestFor(), inventory: [selector, inactive] });
    expect(plan.actions.some((action) => action.path === path && action.kind === 'delete')).toBe(false);
    expect(plan.actions.some((action) => action.path === 'settings.json' && action.selected)).toBe(false);
  });
});

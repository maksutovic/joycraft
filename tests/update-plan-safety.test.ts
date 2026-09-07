import { describe, expect, it } from 'vitest';
import { createUpdatePlan } from '../src/update-plan';
import { normalizedVendorHash, type InstallationManifest } from '../src/install-manifest';
import type { BundleInventoryEntry } from '../src/bundle-inventory';

const path = '.claude/settings.json';
const entry = (overrides: Partial<BundleInventoryEntry> = {}): BundleInventoryEntry => ({
  path, harness: 'claude', kind: 'config-patch', ownership: 'managed',
  active: true, installable: true, ownedKey: 'joycraft.enabled', content: 'true',
  ...overrides,
});
const manifest = (vendorContent: string, kind: 'vendor' | 'create-once' | 'config-patch' = 'config-patch'): InstallationManifest => ({
  schemaVersion: 1, targetVersion: '0.7.13', bundleIntegrity: '', harnesses: ['claude'], profile: 'shared',
  files: { [path]: { vendorVersion: '0.7.13', vendorHash: normalizedVendorHash(vendorContent), kind, ownership: 'verified', ...(kind === 'config-patch' ? { ownedKey: 'joycraft.enabled' } : {}) } },
});

describe('update planner preservation boundaries', () => {
  it('plans an active owned patch beside an inactive declaration for the same settings file', () => {
    const current = JSON.stringify({ joycraft: { enabled: false }, personal: ['keep'] });
    const plan = createUpdatePlan({
      snapshot: { files: { [path]: current } }, manifest: manifest('false'),
      inventory: [entry(), entry({ ownedKey: 'future.setting', active: false, installable: false, content: undefined })],
    });
    const action = plan.actions.find(action => action.path === path);
    expect(action?.selected).toBe(true);
    expect(action?.content).toBeDefined();
    expect(JSON.parse(String(action?.content))).toEqual({ joycraft: { enabled: true }, personal: ['keep'] });
  });

  it('reports malformed user JSON as a preserved conflict, not an empty successful plan', () => {
    const current = '{ "my unfinished settings":';
    const plan = createUpdatePlan({ snapshot: { files: { [path]: current } }, manifest: manifest('false'), inventory: [entry()] });
    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0].selected).toBe(false);
    expect(plan.conflicts[0].preservedContent).toBe(current);
    expect(plan.nextManifest.files[path].vendorHash).toBe(normalizedVendorHash('false'));
  });

  it('never replaces an existing create-once document just because its bytes match an old generator', () => {
    const current = '# Existing project policy\n';
    const plan = createUpdatePlan({
      snapshot: { files: { [path]: current } }, manifest: manifest(current, 'create-once'),
      inventory: [entry({ kind: 'create-once', ownedKey: undefined, content: '# New policy\n' })],
    });
    expect(plan.actions.some(action => action.selected && ['replace', 'delete', 'repair', 'create'].includes(action.kind))).toBe(false);
    expect(plan.nextManifest.files[path].vendorHash).toBe(normalizedVendorHash(current));
  });

  it('retains the ownership record when a known managed payload is temporarily inactive', () => {
    const current = 'old checker';
    const previous = manifest(current, 'vendor');
    const plan = createUpdatePlan({ snapshot: { files: { [path]: current } }, manifest: previous, inventory: [entry({ kind: 'vendor', active: false, installable: false, content: undefined })] });
    expect(plan.actions.some(action => action.kind === 'delete')).toBe(false);
    expect(plan.nextManifest.files[path]).toEqual(previous.files[path]);
  });

  it('does not delete a create-once document when the next bundle omits its declaration', () => {
    const current = '# Project policy\n';
    const plan = createUpdatePlan({ snapshot: { files: { [path]: current } }, manifest: manifest(current, 'create-once'), inventory: [] });
    expect(plan.actions.some(action => action.selected && action.kind === 'delete')).toBe(false);
  });

  it('reconciles a previously applied region patch without a formatting-induced conflict', () => {
    const current = 'Personal introduction\r\n<!-- joycraft:managed -->\r\nold\r\n<!-- /joycraft:managed -->\r\nPersonal ending\r\n';
    const previous = manifest('old\n');
    previous.files[path] = { ...previous.files[path], ownedKey: undefined, ownedRegion: 'joycraft:managed' };
    const inventory = [entry({ ownedKey: undefined, ownedRegion: 'joycraft:managed', content: 'new' })];
    const first = createUpdatePlan({ snapshot: { files: { [path]: current } }, manifest: previous, inventory });
    const changed = first.actions.find(action => action.path === path);
    expect(changed?.kind).toBe('replace');
    expect(String(changed?.content)).toContain('Personal ending\r\n');
    const second = createUpdatePlan({ snapshot: { files: { [path]: String(changed?.content) } }, manifest: first.nextManifest, inventory });
    expect(second.conflicts).toHaveLength(0);
    expect(second.actions[0].kind).toBe('reconcile');
    expect(second.actions[0].content).toBeUndefined();
  });
});

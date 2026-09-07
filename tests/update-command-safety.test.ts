import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { update } from '../src/update';
import { manifestPath, normalizedVendorHash, type InstallationManifest } from '../src/install-manifest';
import type { BundleInventoryEntry } from '../src/bundle-inventory';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function project() { const root = mkdtempSync(join(tmpdir(), 'joycraft-command-safety-')); roots.push(root); return root; }
function put(root: string, path: string, text: string) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); }
const file = '.agents/skills/joycraft-tune/SKILL.md';
function inventory(content = 'new\n'): BundleInventoryEntry[] { return [{ path: file, harness: 'codex', kind: 'vendor', ownership: 'managed', active: true, installable: true, content }]; }
function manifest(profile: 'shared' | 'private' = 'shared'): InstallationManifest {
  return { schemaVersion: 1, targetVersion: '1.0.0', bundleIntegrity: '', harnesses: ['codex'], profile, files: { [file]: { vendorVersion: '1.0.0', vendorHash: normalizedVendorHash('old\n'), kind: 'vendor', ownership: 'verified' } } };
}
function install(root: string) { put(root, file, 'old\n'); put(root, manifestPath('shared'), JSON.stringify(manifest())); }
const options = () => ({ nonInteractive: true, bundle: { version: '1.0.1', inventory: inventory() } });

describe('update command authority and outcome safety', () => {
  for (const explicit of [undefined, 'shared']) {
    it(`blocks a corrupt second authority with profile ${explicit ?? 'inferred'}`, async () => {
      const root = project(); install(root); put(root, manifestPath('private'), '{broken');
      const result = await update(root, { ...options(), gitignore: explicit });
      expect(result.exitCode).toBe(3);
      expect(readFileSync(join(root, file), 'utf8')).toBe('old\n');
      expect(result.applied).toEqual([]);
    });
    it(`blocks duplicate valid authorities with profile ${explicit ?? 'inferred'}`, async () => {
      const root = project(); install(root); put(root, manifestPath('private'), JSON.stringify(manifest('private')));
      const result = await update(root, { ...options(), gitignore: explicit });
      expect(result.exitCode).toBe(3);
      expect(readFileSync(join(root, file), 'utf8')).toBe('old\n');
    });
  }
  it('changes selection using the unchanged on-disk manifest as the precondition', async () => {
    const root = project(); install(root);
    const result = await update(root, { ...options(), harnesses: ['codex', 'pi'] });
    expect(result.exitCode).toBe(0);
    expect(readFileSync(join(root, file), 'utf8')).toBe('new\n');
    expect(JSON.parse(readFileSync(join(root, manifestPath('shared')), 'utf8')).harnesses).toEqual(['codex', 'pi']);
  });
  it('does not report planned writes as applied while the project is locked', async () => {
    const root = project(); install(root);
    put(root, 'docs/.joycraft/local/update.lock/owner.json', JSON.stringify({ operationId: 'live-test', pid: process.pid, startedAt: new Date().toISOString() }));
    const result = await update(root, options());
    expect(result.exitCode).toBe(3);
    expect(result.applied).toEqual([]);
    expect(readFileSync(join(root, file), 'utf8')).toBe('old\n');
  });
  it('rejects invalid profiles as invalid input, leaving the project untouched', async () => {
    const root = project();
    const result = await update(root, { ...options(), harnesses: ['codex'], gitignore: 'garbage' });
    expect(result.exitCode).toBe(1);
    expect(existsSync(join(root, file))).toBe(false);
  });
  it('rejects an invalid explicit harness instead of falling back to the saved selection', async () => {
    const root = project(); install(root);
    const result = await update(root, { ...options(), harnesses: 'codex,typo' });
    expect(result.exitCode).toBe(1);
    expect(readFileSync(join(root, file), 'utf8')).toBe('old\n');
  });
  it('retains create-once ownership and preserves later local edits', async () => {
    const root = project();
    const initial = { ...options(), harnesses: ['codex'] as const, bundle: { version: '1.0.0', inventory: [{ path: 'AGENTS.md', harness: 'shared' as const, kind: 'create-once' as const, ownership: 'managed' as const, active: true, installable: true, content: '# Original instructions\n' }] } };
    expect((await update(root, initial)).exitCode).toBe(0);
    expect(JSON.parse(readFileSync(join(root, manifestPath('shared')), 'utf8')).files['AGENTS.md'].kind).toBe('create-once');
    put(root, 'AGENTS.md', '# My edited instructions\n');
    const next = await update(root, { ...initial, bundle: { version: '1.0.1', inventory: initial.bundle.inventory.map((entry) => ({ ...entry, content: '# New upstream instructions\n' })) } });
    expect(next.exitCode).toBe(0);
    expect(readFileSync(join(root, 'AGENTS.md'), 'utf8')).toBe('# My edited instructions\n');
  });
  it('adopts legacy harness selection and preserves local preferences before retiring old state', async () => {
    const root = project();
    put(root, file, 'old\n');
    const legacy = { version: '0.7.13', harnesses: ['codex'], gitignoreProfile: 'shared', autoOpen: false, updatePolicy: 'off', privateSetting: 'keep-me', files: {} };
    const legacyText = JSON.stringify(legacy);
    put(root, 'docs/.joycraft/state.json', legacyText);
    const result = await update(root, { yes: true, bundle: { version: '0.7.13', inventory: inventory('old\n') } });
    expect(result.exitCode).toBe(0);
    expect(result.harnesses).toEqual(['codex']);
    const local = JSON.parse(readFileSync(join(root, 'docs/.joycraft/local/settings.json'), 'utf8'));
    expect(local.autoOpen).toBe(false);
    expect(local.updatePolicy).toBe('off');
    expect(local.legacy.state.privateSetting).toBe('keep-me');
    expect(existsSync(join(root, 'docs/.joycraft/state.json'))).toBe(false);
    const backup = JSON.parse(readFileSync(join(root, 'docs/.joycraft/local/legacy-state-backup.json'), 'utf8'));
    expect(Buffer.from(backup['docs/.joycraft/state.json'], 'base64').toString('utf8')).toBe(legacyText);
    expect(readFileSync(join(root, manifestPath('shared')), 'utf8')).not.toContain('keep-me');
  });
  it('preserves the managed checker registration and unrelated hooks during legacy migration', async () => {
    const root = project();
    const skill = '.claude/skills/joycraft-tune/SKILL.md';
    put(root, skill, 'old\n');
    const state = JSON.stringify({ version: '0.7.13', harnesses: ['claude'], files: {} });
    put(root, 'docs/.joycraft/state.json', state);
    const settings = { customSetting: true, hooks: { SessionStart: [
      { matcher: '', hooks: [{ type: 'command', command: 'node .claude/hooks/joycraft-version-check.mjs' }, { type: 'command', command: 'echo keep' }] },
      { matcher: 'resume', hooks: [{ type: 'command', command: 'node .claude/hooks/my-joycraft-helper.mjs' }] },
    ] } };
    const settingsText = JSON.stringify(settings, null, 2) + '\n';
    put(root, '.claude/settings.json', settingsText);
    const result = await update(root, { yes: true, bundle: { version: '0.7.13', inventory: [{ ...inventory('old\n')[0], path: skill, harness: 'claude' }] } });
    expect(result.exitCode).toBe(0);
    const current = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8'));
    expect(current.customSetting).toBe(true);
    expect(current.hooks.SessionStart).toEqual(settings.hooks.SessionStart);
    expect((await update(root, { recovery: 'rollback' })).exitCode).toBe(0);
    expect(readFileSync(join(root, '.claude/settings.json'), 'utf8')).toBe(settingsText);
    expect(readFileSync(join(root, 'docs/.joycraft/state.json'), 'utf8')).toBe(state);
  });
  for (const path of ['.gitignore', '.gitattributes']) {
    it.skipIf(process.platform === 'win32')(`rejects a ${path} symlink before any managed file changes`, async () => {
      const root = project(); install(root);
      const outside = project(); put(outside, 'user-file', 'outside user data\n');
      symlinkSync(join(outside, 'user-file'), join(root, path));
      const result = await update(root, options());
      expect(result.exitCode).not.toBe(0);
      expect(readFileSync(join(outside, 'user-file'), 'utf8')).toBe('outside user data\n');
      expect(readFileSync(join(root, file), 'utf8')).toBe('old\n');
    });
  }
  it('rolls back git profile bookkeeping with the managed update', async () => {
    const root = project(); install(root);
    const ignore = 'node_modules\n# custom ignore\n';
    const attributes = '*.png binary\n';
    put(root, '.gitignore', ignore);
    put(root, '.gitattributes', attributes);
    expect((await update(root, options())).exitCode).toBe(0);
    expect(readFileSync(join(root, '.gitignore'), 'utf8')).not.toBe(ignore);
    expect((await update(root, { recovery: 'rollback' })).exitCode).toBe(0);
    expect(readFileSync(join(root, '.gitignore'), 'utf8')).toBe(ignore);
    expect(readFileSync(join(root, '.gitattributes'), 'utf8')).toBe(attributes);
    expect(readFileSync(join(root, file), 'utf8')).toBe('old\n');
  });
  it('preserves newer local preferences when adopting legacy state', async () => {
    const root = project(); put(root, file, 'old\n');
    put(root, 'docs/.joycraft/state.json', JSON.stringify({ version: '0.7.13', harnesses: ['codex'], autoOpen: false, updatePolicy: 'auto-safe', files: {} }));
    put(root, 'docs/.joycraft/local/settings.json', JSON.stringify({ autoOpen: true, updatePolicy: 'off', customLocal: 42 }));
    const result = await update(root, { yes: true, bundle: { version: '0.7.13', inventory: inventory('old\n') } });
    expect(result.exitCode).toBe(0);
    const local = JSON.parse(readFileSync(join(root, 'docs/.joycraft/local/settings.json'), 'utf8'));
    expect(local).toMatchObject({ autoOpen: true, updatePolicy: 'off', customLocal: 42 });
  });
  it('honors explicit replacement of a local-only edit even when the vendor release is unchanged', async () => {
    const root = project(); install(root); put(root, file, 'local-only customization\n');
    const result = await update(root, { yes: true, replaceCustomized: [file], bundle: { version: '1.0.0', inventory: inventory('old\n') } });
    expect(result.exitCode).toBe(0);
    expect(result.applied).toContain(file);
    expect(readFileSync(join(root, file), 'utf8')).toBe('old\n');
  });
  for (const invalidSettings of ['null', '[]']) {
    it(`preserves a non-object local settings file (${invalidSettings}) during adoption`, async () => {
      const root = project(); put(root, file, 'old\n');
      put(root, 'docs/.joycraft/state.json', JSON.stringify({ version: '0.7.13', harnesses: ['codex'], autoOpen: false, files: {} }));
      put(root, 'docs/.joycraft/local/settings.json', invalidSettings);
      await update(root, { yes: true, bundle: { version: '0.7.13', inventory: inventory('old\n') } });
      expect(readFileSync(join(root, 'docs/.joycraft/local/settings.json'), 'utf8')).toBe(invalidSettings);
    });
  }
});

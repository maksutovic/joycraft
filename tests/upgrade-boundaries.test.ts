import { afterEach, describe, expect, it } from 'vitest';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createUpdatePlan } from '../src/update-plan';
import { applyUpdatePlan, recoverInterruptedUpdate } from '../src/update-transaction';
import { manifestPath, normalizedVendorHash, type InstallationManifest } from '../src/install-manifest';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('integrated update filesystem boundaries', () => {
  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)('preserves installed bytes after denied staging and recovers once access returns', () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft denied staging with spaces '));
    roots.push(root);
    const path = '.agents/skills/joycraft-tune/SKILL.md';
    const before = Buffer.from('original vendor\r\n');
    const directory = dirname(join(root, path));
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(root, path), before);
    const manifest: InstallationManifest = {
      schemaVersion: 1, targetVersion: '1.0.0', bundleIntegrity: '', harnesses: ['codex'], profile: 'shared',
      files: { [path]: { vendorVersion: '1.0.0', vendorHash: normalizedVendorHash(before.toString('utf8')), kind: 'vendor', ownership: 'verified' } },
    };
    const state = JSON.stringify(manifest, null, 2) + '\n';
    mkdirSync(dirname(join(root, manifestPath())), { recursive: true });
    writeFileSync(join(root, manifestPath()), state);
    const plan = createUpdatePlan({
      snapshot: { files: { [path]: before.toString('utf8') } }, manifest,
      inventory: [{ path, harness: 'codex', kind: 'vendor', ownership: 'managed', active: true, installable: true, content: 'new vendor\n' }],
      options: { targetVersion: '1.0.1' },
    });
    chmodSync(directory, 0o555);
    try {
      expect(() => applyUpdatePlan(root, plan)).toThrow(/EACCES|EPERM|permission denied/i);
      expect(readFileSync(join(root, path))).toEqual(before);
      expect(readFileSync(join(root, manifestPath()), 'utf8')).toBe(state);
    } finally {
      chmodSync(directory, 0o755);
    }
    expect(recoverInterruptedUpdate(root).status).toBe('rolled-back');
    expect(readFileSync(join(root, path))).toEqual(before);
    expect(readFileSync(join(root, manifestPath()), 'utf8')).toBe(state);
    expect(applyUpdatePlan(root, plan).status).toBe('applied');
    expect(readFileSync(join(root, path), 'utf8')).toBe('new vendor\r\n');
  });
});

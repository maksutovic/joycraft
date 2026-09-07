import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  LOCAL_SETTINGS_PATH,
  STATE_PATH,
  getAutoOpen,
  writeAutoOpen,
  writeVersion,
} from '../src/version';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-auto-open-'));
  roots.push(root);
  return root;
}

function write(root: string, relative: string, content: string): void {
  const path = join(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

describe('local auto-open settings migration', () => {
  it('falls back to legacy state until local settings exist', () => {
    const root = project();
    writeVersion(root, '1.0.0', {}, undefined, undefined, false);

    expect(getAutoOpen(root)).toBe(false);
  });

  it('lets a valid local setting win over the legacy value', () => {
    const root = project();
    writeVersion(root, '1.0.0', {}, undefined, undefined, false);
    write(root, LOCAL_SETTINGS_PATH, JSON.stringify({ autoOpen: true }));

    expect(getAutoOpen(root)).toBe(true);
  });

  it('writes local settings, preserves policies and unknown keys, and leaves legacy bytes unchanged', () => {
    const root = project();
    const legacy = JSON.stringify({ version: '1.0.0', files: {}, autoOpen: false }) + '\n';
    write(root, STATE_PATH, legacy);
    write(root, LOCAL_SETTINGS_PATH, JSON.stringify({ updatePolicy: 'off', futurePreference: { keep: true } }));

    expect(writeAutoOpen(root, true)).toBe(true);
    expect(JSON.parse(readFileSync(join(root, LOCAL_SETTINGS_PATH), 'utf8'))).toEqual({
      updatePolicy: 'off',
      futurePreference: { keep: true },
      autoOpen: true,
    });
    expect(readFileSync(join(root, STATE_PATH), 'utf8')).toBe(legacy);
  });

  it('does not overwrite malformed local settings or recreate legacy state', () => {
    const root = project();
    const malformed = '{not-json';
    write(root, LOCAL_SETTINGS_PATH, malformed);

    expect(getAutoOpen(root)).toBe(true);
    expect(writeAutoOpen(root, false)).toBe(false);
    expect(readFileSync(join(root, LOCAL_SETTINGS_PATH), 'utf8')).toBe(malformed);
    expect(existsSync(join(root, STATE_PATH))).toBe(false);
  });

  it.skipIf(process.platform === 'win32')('fails closed for symlinked local settings', () => {
    const root = project();
    writeVersion(root, '1.0.0', {}, undefined, undefined, false);
    const outside = join(root, 'outside-settings.json');
    const local = join(root, LOCAL_SETTINGS_PATH);
    mkdirSync(dirname(local), { recursive: true });
    writeFileSync(outside, JSON.stringify({ autoOpen: false }));
    symlinkSync(outside, local);

    expect(getAutoOpen(root)).toBe(true);
    expect(writeAutoOpen(root, false)).toBe(false);
    expect(JSON.parse(readFileSync(outside, 'utf8'))).toEqual({ autoOpen: false });
  });

  it('points every canonical gate at local settings and level 5 at manifests', () => {
    const gates = ['design', 'new-feature', 'interview', 'decompose', 'decide', 'tune'];
    for (const gate of gates) {
      const source = readFileSync(join(process.cwd(), 'src', 'skills', `joycraft-${gate}.md`), 'utf8');
      expect(source).toContain('`docs/.joycraft/local/settings.json`');
      expect(source).not.toContain('`docs/.joycraft/state.json`');
    }

    const tune = readFileSync(join(process.cwd(), 'src', 'skills', 'joycraft-tune.md'), 'utf8');
    expect(tune).toContain('write the key there preserving every other local setting');
    const level5 = readFileSync(join(process.cwd(), 'src', 'skills', 'joycraft-implement-level5.md'), 'utf8');
    expect(level5).toContain('`docs/.joycraft/manifest.json`');
    expect(level5).toContain('`docs/.joycraft/local/manifest.json`');
  });
});

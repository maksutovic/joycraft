import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { acknowledgeUpdate, checkForUpdate, compareStableVersions, readUpdatePolicy, setUpdatePolicy } from '../src/update-check.js';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function project(policy?: string): string {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-auto-discovery-'));
  roots.push(root);
  mkdirSync(join(root, 'docs/.joycraft/local'), { recursive: true });
  writeFileSync(join(root, 'docs/.joycraft/manifest.json'), JSON.stringify({ schemaVersion: 1, targetVersion: '1.0.0', bundleIntegrity: '', profile: 'shared', harnesses: ['codex'], files: {}, updatePolicy: 'auto-safe' }));
  if (policy) writeFileSync(join(root, 'docs/.joycraft/local/settings.json'), JSON.stringify({ updatePolicy: policy }));
  writeFileSync(join(root, 'untouched.txt'), 'keep this project byte-for-byte');
  return root;
}

describe('automatic update discovery', () => {
  it('requires a deliberate local policy change and preserves unrelated preferences', () => {
    const root = project();
    const path = join(root, 'docs/.joycraft/local/settings.json');
    writeFileSync(path, JSON.stringify({ futurePreference: { keep: true } }));
    expect(setUpdatePolicy(root, 'auto-safe')).toBe(true);
    expect(readUpdatePolicy(root)).toBe('auto-safe');
    expect(JSON.parse(readFileSync(path, 'utf8')).futurePreference).toEqual({ keep: true });
    expect(setUpdatePolicy(root, 'off')).toBe(true);
    expect(readUpdatePolicy(root)).toBe('off');
    const before = readFileSync(path, 'utf8');
    expect(setUpdatePolicy(root, 'anything' as never)).toBe(false);
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('reports a candidate requiring verification only after local opt-in, without executing it', async () => {
    for (const policy of [undefined, 'notify', 'off', 'auto-safe']) {
      const root = project(policy);
      const result = await checkForUpdate(root, { fetchLatest: async () => ({ version: '1.1.0' }), sessionId: 'session-a' });
      if (policy === 'auto-safe') {
        expect(result.automaticUpdate).toEqual({
          verificationRequired: true,
          command: ['npm', 'exec', '--yes', '--', 'joycraft@1.1.0', 'update', '--auto-safe', '--non-interactive', '--json'],
        });
      } else expect(result.automaticUpdate).toBeUndefined();
      expect(readFileSync(join(root, 'untouched.txt'), 'utf8')).toBe('keep this project byte-for-byte');
      expect(JSON.parse(readFileSync(join(root, 'docs/.joycraft/manifest.json'), 'utf8')).targetVersion).toBe('1.0.0');
    }
  });

  it('does not schedule repeated automatic attempts in one session after acknowledgement', async () => {
    const root = project('auto-safe');
    const check = (sessionId: string) => checkForUpdate(root, { fetchLatest: async () => ({ version: '1.1.0' }), sessionId });
    expect((await check('one')).automaticUpdate).toBeDefined();
    expect(acknowledgeUpdate(root, { release: '1.1.0', session: 'one' })).toBe(true);
    expect((await check('one')).automaticUpdate).toBeUndefined();
    expect((await check('two')).automaticUpdate).toBeDefined();
  });

  it('never offers noncanonical, prerelease, or older versions for automation', async () => {
    expect(compareStableVersions('01.2.3', '1.2.3')).toBeNull();
    for (const version of ['01.2.3', '2.0.0-rc.1', '0.9.0']) {
      const result = await checkForUpdate(project('auto-safe'), { fetchLatest: async () => ({ version }) });
      expect(result.automaticUpdate).toBeUndefined();
    }
  });
});

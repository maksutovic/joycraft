import { afterEach, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { acknowledgeUpdate, checkForUpdate } from '../src/update-check.js';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const manifest = { schemaVersion: 1, targetVersion: '1.2.3', bundleIntegrity: '', harnesses: ['codex'], profile: 'shared', files: {} };
function write(root: string, path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}
function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-check-safety-'));
  roots.push(root);
  write(root, 'docs/.joycraft/manifest.json', JSON.stringify(manifest));
  return root;
}

it('does not choose between two manifest authorities even when their versions agree', async () => {
  const root = project();
  write(root, 'docs/.joycraft/local/manifest.json', JSON.stringify({ ...manifest, profile: 'private' }));
  const fetchLatest = vi.fn(async () => ({ version: '1.2.4' }));
  const result = await checkForUpdate(root, { fetchLatest });
  expect(result.status).toBe('unknown');
  expect(result.display).toBe(false);
  expect(fetchLatest).not.toHaveBeenCalled();
});

it('preserves invalid local settings and remains quiet instead of guessing a notification policy', async () => {
  const root = project();
  write(root, 'docs/.joycraft/local/settings.json', '[]\n');
  const fetchLatest = vi.fn(async () => ({ version: '1.2.4' }));
  const result = await checkForUpdate(root, { fetchLatest });
  expect(result.status).toBe('unknown');
  expect(result.display).toBe(false);
  expect(fetchLatest).not.toHaveBeenCalled();
  expect(readFileSync(join(root, 'docs/.joycraft/local/settings.json'), 'utf8')).toBe('[]\n');
});

it('does not write acknowledgement through a symlinked local-state directory', () => {
  const root = project();
  const outside = join(root, 'outside');
  mkdirSync(outside);
  const settings = '{"updatePolicy":"off","custom":"keep"}\n';
  writeFileSync(join(outside, 'settings.json'), settings);
  symlinkSync(outside, join(root, 'docs/.joycraft/local'), process.platform === 'win32' ? 'junction' : 'dir');
  expect(acknowledgeUpdate(root, { release: '1.2.4', session: 'session-a' })).toBe(false);
  expect(readFileSync(join(outside, 'settings.json'), 'utf8')).toBe(settings);
});

it('does not throw when local state cannot be created', async () => {
  const root = project();
  writeFileSync(join(root, 'docs/.joycraft/local'), 'user file');
  const fetchLatest = vi.fn(async () => ({ version: '1.2.4' }));
  await expect(checkForUpdate(root, { fetchLatest })).resolves.toEqual(expect.objectContaining({ status: 'unknown', display: false }));
  expect(fetchLatest).not.toHaveBeenCalled();
  expect(readFileSync(join(root, 'docs/.joycraft/local'), 'utf8')).toBe('user file');
});

it('can refresh after an expired lock left by a dead checker', async () => {
  const root = project();
  write(root, 'docs/.joycraft/local/check.lock', JSON.stringify({ pid: 2_147_483_647, startedAt: Date.now() - 3_600_000 }));
  const fetchLatest = vi.fn(async () => ({ version: '1.2.4' }));
  const result = await checkForUpdate(root, { fetchLatest });
  expect(result.status).toBe('available');
  expect(fetchLatest).toHaveBeenCalledTimes(1);
});

it('does not steal an old lock whose owner is still alive', async () => {
  const root = project();
  write(root, 'docs/.joycraft/local/check.lock', JSON.stringify({ pid: process.pid, startedAt: Date.now() - 3_600_000 }));
  const fetchLatest = vi.fn(async () => ({ version: '1.2.4' }));
  const result = await checkForUpdate(root, { fetchLatest });
  expect(result.display).toBe(false);
  expect(fetchLatest).not.toHaveBeenCalled();
});

it('does not remove a replacement lock when its own refresh finishes', async () => {
  const root = project();
  const replacement = JSON.stringify({ pid: 2_147_483_646, startedAt: Date.now(), owner: 'replacement' });
  await checkForUpdate(root, { fetchLatest: async () => {
    writeFileSync(join(root, 'docs/.joycraft/local/check.lock'), replacement);
    return { version: '1.2.4' };
  } });
  const lock = join(root, 'docs/.joycraft/local/check.lock');
  expect(existsSync(lock)).toBe(true);
  expect(readFileSync(lock, 'utf8')).toBe(replacement);
});

it('skips registry work when checks are off while allowing a deliberate check', async () => {
  const root = project();
  write(root, 'docs/.joycraft/local/settings.json', '{"updatePolicy":"off"}\n');
  const fetchLatest = vi.fn(async () => ({ version: '1.2.4' }));
  expect((await checkForUpdate(root, { fetchLatest })).display).toBe(false);
  expect(fetchLatest).not.toHaveBeenCalled();
  expect(await checkForUpdate(root, { fetchLatest, explicit: true })).toEqual(expect.objectContaining({ status: 'available', display: true, policy: 'off' }));
  expect(fetchLatest).toHaveBeenCalledTimes(1);
});

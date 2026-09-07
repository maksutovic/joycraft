import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  acknowledgeUpdate,
  CHECK_CACHE_PATH,
  CHECK_LOCK_PATH,
  CHECK_SETTINGS_PATH,
  checkForUpdate,
  compareStableVersions,
  postponeUpdate,
  resolveUpdateStatus,
  type CheckMetadata,
  type InstallationCheckState,
} from '../src/update-check';

function project(): string {
  return mkdtempSync(join(tmpdir(), 'joycraft-check-'));
}

function manifest(root: string, version: string, fileVersion = version, ownership: 'verified' | 'unknown' = 'verified'): void {
  mkdirSync(join(root, 'docs/.joycraft'), { recursive: true });
  writeFileSync(join(root, 'docs/.joycraft/manifest.json'), JSON.stringify({
    schemaVersion: 1,
    targetVersion: version,
    bundleIntegrity: '',
    harnesses: ['codex'],
    profile: 'shared',
    files: { '.agents/skills/joycraft-tune/SKILL.md': {
      vendorVersion: fileVersion,
      vendorHash: ownership === 'verified' ? 'a'.repeat(64) : '',
      kind: 'vendor',
      ownership,
    } },
  }));
}

function metadata(version: string): CheckMetadata {
  return { version };
}

const clock = (value: number) => () => value;

describe('shared update checker', () => {
  it('compares numeric stable versions and rejects prereleases', () => {
    expect(compareStableVersions('1.10.0', '1.9.99')).toBeGreaterThan(0);
    expect(compareStableVersions('01.2.3', '1.2.3')).toBe(0);
    expect(compareStableVersions('1.2.3-beta.1', '1.2.3')).toBeNull();
  });

  it.each([
    ['current', '1.0.0', '1.0.0', undefined],
    ['available', '1.0.0', '1.1.0', undefined],
    ['postponed', '1.0.0', '1.1.0', 'postponed'],
    ['pending-conflicts', '1.0.0', '1.1.0', 'pending'],
  ] as const)('resolves %s status', (status, installed, available, marker) => {
    const result = resolveUpdateStatus({
      installedVersion: installed,
      availableVersion: available,
      postponedRelease: marker === 'postponed' ? available : undefined,
      pendingConflicts: marker === 'pending',
    });
    expect(result.status).toBe(status);
  });

  it('returns unknown when the manifest authority is invalid and never clobbers it', async () => {
    const root = project();
    try {
      mkdirSync(join(root, 'docs/.joycraft'), { recursive: true });
      const path = join(root, 'docs/.joycraft/manifest.json');
      writeFileSync(path, '{future');
      const result = await checkForUpdate(root, { now: clock(1000), fetchLatest: async () => metadata('2.0.0') });
      expect(result.status).toBe('unknown');
      expect(readFileSync(path, 'utf8')).toBe('{future');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('preserves a future cache object while failing quietly', async () => {
    const root = project();
    try {
      manifest(root, '1.0.0');
      mkdirSync(join(root, 'docs/.joycraft/local'), { recursive: true });
      const path = join(root, CHECK_CACHE_PATH);
      writeFileSync(path, JSON.stringify({ schemaVersion: 99, version: '2.0.0', keep: ['future'] }));
      const result = await checkForUpdate(root, { now: clock(1000), fetchLatest: async () => { throw new Error('offline'); } });
      expect(result.status).toBe('unknown');
      expect(readFileSync(path, 'utf8')).toContain('future');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('uses a fresh cache without fetching and refreshes stale cache', async () => {
    const root = project();
    try {
      manifest(root, '1.0.0');
      mkdirSync(join(root, 'docs/.joycraft/local'), { recursive: true });
      writeFileSync(join(root, CHECK_CACHE_PATH), JSON.stringify({ schemaVersion: 1, fetchedAt: 1000, version: '1.1.0', future: { keep: true } }));
      let calls = 0;
      const fresh = await checkForUpdate(root, { now: clock(1000 + 60_000), fetchLatest: async () => { calls += 1; return metadata('1.2.0'); } });
      expect(fresh.availableVersion).toBe('1.1.0');
      expect(calls).toBe(0);
      const stale = await checkForUpdate(root, { now: clock(1000 + 86_400_001), fetchLatest: async () => { calls += 1; return metadata('1.2.0'); } });
      expect(stale.availableVersion).toBe('1.2.0');
      expect(calls).toBe(1);
      expect(JSON.parse(readFileSync(join(root, CHECK_CACHE_PATH), 'utf8')).future).toEqual({ keep: true });
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('bounds a hanging fetch and records bounded failure backoff', async () => {
    const root = project();
    try {
      manifest(root, '1.0.0');
      const started = Date.now();
      const result = await checkForUpdate(root, { deadlineMs: 20, now: clock(1000), fetchLatest: () => new Promise<CheckMetadata>(() => {}) });
      expect(Date.now() - started).toBeLessThan(500);
      expect(result.status).toBe('unknown');
      const cache = JSON.parse(readFileSync(join(root, CHECK_CACHE_PATH), 'utf8')) as Record<string, unknown>;
      expect(cache.failureCount).toBe(1);
      expect(Number(cache.nextRetryAt)).toBeGreaterThan(1000);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('does not duplicate refresh work when a competing lock exists', async () => {
    const root = project();
    try {
      manifest(root, '1.0.0');
      mkdirSync(join(root, 'docs/.joycraft/local'), { recursive: true });
      writeFileSync(join(root, CHECK_LOCK_PATH), JSON.stringify({ pid: 1, startedAt: 1000 }));
      let calls = 0;
      const result = await checkForUpdate(root, { now: clock(1000), fetchLatest: async () => { calls += 1; return metadata('2.0.0'); } });
      expect(result.status).toBe('unknown');
      expect(calls).toBe(0);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('keeps policy local, and separates acknowledgement from postponement', async () => {
    const root = project();
    try {
      manifest(root, '1.0.0');
      const first = await checkForUpdate(root, { now: clock(1000), fetchLatest: async () => metadata('1.1.0'), sessionId: 's1' });
      expect(first.policy).toBe('notify');
      expect(first.display).toBe(true);
      await acknowledgeUpdate(root, { release: '1.1.0', session: 's1' });
      expect((await checkForUpdate(root, { now: clock(1000), fetchLatest: async () => metadata('1.1.0'), sessionId: 's1', explicit: false })).display).toBe(false);
      expect((await checkForUpdate(root, { now: clock(1000), fetchLatest: async () => metadata('1.1.0'), sessionId: 's2', explicit: false })).display).toBe(true);
      await postponeUpdate(root, '1.1.0');
      expect((await checkForUpdate(root, { now: clock(1000), fetchLatest: async () => metadata('1.1.0'), sessionId: 's2', explicit: false })).status).toBe('postponed');
      expect((await checkForUpdate(root, { now: clock(1000), fetchLatest: async () => metadata('1.1.0'), sessionId: 's2', explicit: true })).status).toBe('available');
      const settings = JSON.parse(readFileSync(join(root, CHECK_SETTINGS_PATH), 'utf8')) as Record<string, unknown>;
      expect(settings.acknowledgedRelease).toBe('1.1.0');
      expect(settings.postponedRelease).toBe('1.1.0');
      expect(JSON.parse(readFileSync(join(root, CHECK_SETTINGS_PATH), 'utf8')).updatePolicy).toBeUndefined();
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('reads off and auto-safe only from local settings, never from the shared manifest', async () => {
    const root = project();
    try {
      manifest(root, '1.0.0');
      const sharedPath = join(root, 'docs/.joycraft/manifest.json');
      const shared = JSON.parse(readFileSync(sharedPath, 'utf8')) as Record<string, unknown>;
      shared.updatePolicy = 'auto-safe';
      writeFileSync(sharedPath, JSON.stringify(shared));
      const defaultResult = await checkForUpdate(root, { now: clock(1000), fetchLatest: async () => metadata('1.1.0') });
      expect(defaultResult.policy).toBe('notify');
      mkdirSync(join(root, 'docs/.joycraft/local'), { recursive: true });
      writeFileSync(join(root, CHECK_SETTINGS_PATH), JSON.stringify({ updatePolicy: 'off', keep: true }));
      const offResult = await checkForUpdate(root, { now: clock(1000), fetchLatest: async () => metadata('1.2.0') });
      expect(offResult.policy).toBe('off');
      expect(offResult.display).toBe(false);
      writeFileSync(join(root, CHECK_SETTINGS_PATH), JSON.stringify({ updatePolicy: 'auto-safe', keep: true }));
      const safeResult = await checkForUpdate(root, { now: clock(1000), fetchLatest: async () => metadata('1.3.0') });
      expect(safeResult.policy).toBe('auto-safe');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('offers a newer release after postponement and treats malformed responses as unknown', async () => {
    const root = project();
    try {
      manifest(root, '1.0.0');
      await postponeUpdate(root, '1.1.0');
      const newer = await checkForUpdate(root, { now: clock(1000), fetchLatest: async () => metadata('1.2.0') });
      expect(newer.status).toBe('available');
      const malformed = await checkForUpdate(root, { now: clock(1000 + 86_400_001), fetchLatest: async () => ({ nope: true }) });
      expect(malformed.status).toBe('unknown');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('reports pending conflicts from per-file baselines even when stamp matches', async () => {
    const root = project();
    try {
      manifest(root, '1.1.0', '1.0.0');
      const result = await checkForUpdate(root, { now: clock(1000), fetchLatest: async () => metadata('1.1.0') });
      expect(result.status).toBe('pending-conflicts');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('runs the generated checker from its installed location', () => {
    const root = project();
    try {
      const script = join(root, 'docs/.joycraft/check.mjs');
      mkdirSync(join(root, 'docs/.joycraft'), { recursive: true });
      writeFileSync(join(root, 'docs/.joycraft/manifest.json'), JSON.stringify({ schemaVersion: 1, targetVersion: '0.7.13', bundleIntegrity: '', harnesses: [], profile: 'shared', files: {} }));
      // The generated file is copied by the bundle generation test/build; this
      // assertion intentionally executes the artifact as a real subprocess.
      const source = readFileSync(join(process.cwd(), 'src/check.mjs'), 'utf8');
      writeFileSync(script, source);
      const result = JSON.parse(execFileSync(process.execPath, [script, 'check', '--json'], { encoding: 'utf8', env: { ...process.env, JOYCRAFT_CHECK_FETCH: '0' } }));
      expect(result).toEqual(expect.objectContaining({ status: expect.any(String), installedVersion: '0.7.13' }));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('acknowledges a displayed wrapper notice for the stable session', () => {
    const root = project();
    try {
      manifest(root, '0.7.13');
      mkdirSync(join(root, 'docs/.joycraft/local'), { recursive: true });
      writeFileSync(join(root, CHECK_CACHE_PATH), JSON.stringify({
        schemaVersion: 1,
        fetchedAt: Date.now(),
        version: '9.9.9',
      }));
      const script = join(root, 'docs/.joycraft/check.mjs');
      writeFileSync(script, readFileSync(join(process.cwd(), 'src/check.mjs'), 'utf8'));
      const env = { ...process.env, JOYCRAFT_SESSION_ID: 'wrapper-session', JOYCRAFT_CHECK_FETCH: '0' };
      const first = execFileSync(process.execPath, [script, 'check'], { encoding: 'utf8', env });
      expect(first).toContain('Joycraft 9.9.9 available');
      expect(JSON.parse(readFileSync(join(root, CHECK_SETTINGS_PATH), 'utf8'))).toEqual(expect.objectContaining({
        acknowledgedRelease: '9.9.9',
        acknowledgedSession: 'wrapper-session',
      }));
      const second = execFileSync(process.execPath, [script, 'check'], { encoding: 'utf8', env });
      expect(second).toBe('');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

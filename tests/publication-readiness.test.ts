import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readPublishedMetadata, verifyPublishedRelease } from '../scripts/verify-publication.mjs';

const roots: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true }));
});

const expected = { packageName: 'joycraft', version: '0.7.14', integrity: `sha512-${Buffer.alloc(64, 1).toString('base64')}` };
const metadata = (latest = expected.version, integrity = expected.integrity) => ({ name: expected.packageName, version: expected.version, 'dist.integrity': integrity, 'dist-tags.latest': latest });

function fixture(observations: Array<any>) {
  let clock = 0;
  let calls = 0;
  const logs: string[] = [];
  const timeouts: number[] = [];
  const sleeps: number[] = [];
  return {
    options: {
      ...expected, timeoutMs: 30, pollIntervalMs: 10, maxPollIntervalMs: 10,
      now: () => clock,
      sleep: async (ms: number) => { clock += ms; sleeps.push(ms); },
      log: (line: string) => logs.push(line),
      readMetadata: async ({ timeoutMs }: { timeoutMs: number }) => {
        timeouts.push(timeoutMs);
        const value = observations[Math.min(calls++, observations.length - 1)];
        if (value instanceof Error) throw value;
        return value;
      },
    },
    logs, timeouts, sleeps,
    get clock() { return clock; },
    get calls() { return calls; },
  };
}

describe('published package readiness', () => {
  it('revalidates delayed metadata through real npm against a local registry', async () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft-publication-registry-'));
    roots.push(root);
    writeFileSync(join(root, 'npmrc'), '');
    vi.stubEnv('NPM_CONFIG_USERCONFIG', join(root, 'npmrc'));
    vi.stubEnv('NPM_CONFIG_CACHE', join(root, 'cache'));
    vi.stubEnv('NPM_CONFIG_UPDATE_NOTIFIER', 'false');
    let reads = 0;
    const server = createServer((request, response) => {
      if (request.url !== '/joycraft') {
        response.writeHead(404).end();
        return;
      }
      reads++;
      response.setHeader('content-type', 'application/json');
      response.setHeader('cache-control', 'public, max-age=300');
      response.end(JSON.stringify({
        name: expected.packageName,
        'dist-tags': { latest: reads === 1 ? '0.7.13' : expected.version },
        versions: { [expected.version]: { name: expected.packageName, version: expected.version, dist: { integrity: expected.integrity } } },
      }));
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    vi.stubEnv('NPM_CONFIG_REGISTRY', `http://127.0.0.1:${(server.address() as { port: number }).port}`);
    try {
      const result = await verifyPublishedRelease({ ...expected, timeoutMs: 10_000, pollIntervalMs: 1, log: () => {} });
      expect(result.attempts).toBe(2);
      expect(reads).toBe(2);
    } finally {
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  }, 15_000);

  it('terminates a stalled npm subprocess within the remaining budget', async () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft-publication-timeout-'));
    roots.push(root);
    const npm = join(root, 'npm');
    writeFileSync(npm, '#!/usr/bin/env node\nsetInterval(() => {}, 1000);\n');
    chmodSync(npm, 0o755);
    vi.stubEnv('PATH', `${root}:${process.env.PATH}`);
    await expect(readPublishedMetadata({ ...expected, timeoutMs: 100 })).rejects.toMatchObject({ killed: true, signal: 'SIGKILL' });
  });

  it('waits through missing and stale metadata until exact identity and latest match', async () => {
    const run = fixture([new Error('E404'), metadata('0.7.13'), metadata()]);
    await expect(verifyPublishedRelease(run.options)).resolves.toMatchObject({ version: expected.version, attempts: 3 });
    expect(run.timeouts).toEqual([30, 20, 10]);
    expect(run.logs.join('\n')).toContain('expected latest=0.7.14');
    expect(run.logs.join('\n')).toContain('observed latest=0.7.13');
  });

  it('bounds persistent stale metadata and reports the last observation', async () => {
    const run = fixture([metadata('0.7.13')]);
    await expect(verifyPublishedRelease(run.options)).rejects.toThrow(/deadline.*expected latest=0\.7\.14.*observed latest=0\.7\.13/i);
    expect(run.calls).toBe(3);
  });

  it.each([
    { ...metadata(), 'dist.integrity': `sha512-${Buffer.alloc(64, 2).toString('base64')}` },
    { ...metadata(), version: '0.7.15' },
    { ...metadata(), name: 'wrong-package' },
    metadata('0.7.15'),
  ])('stops immediately for conflicting identity or newer latest: %j', async (value) => {
    const run = fixture([value, metadata()]);
    await expect(verifyPublishedRelease(run.options)).rejects.toThrow(/mismatch|newer/i);
    expect(run.calls).toBe(1);
  });

  it('does not accept latest without exact package integrity', async () => {
    const run = fixture([{ name: expected.packageName, version: expected.version, 'dist-tags.latest': expected.version }]);
    await expect(verifyPublishedRelease(run.options)).rejects.toThrow(/deadline/i);
  });

  it.each(['0.7.15-rc.1', 'unknown'])('stops immediately for an unsupported latest tag %s', async (latest) => {
    const run = fixture([metadata(latest), metadata()]);
    await expect(verifyPublishedRelease(run.options)).rejects.toThrow(/not a stable version/i);
    expect(run.calls).toBe(1);
  });

  // 1.5.0 and 1.5.2: npm publish returned, the registry listed the version 7 min 11 s later.
  it('waits through the registry lag seen on 1.5.0 and 1.5.2 with the default deadline', async () => {
    const lagMs = (7 * 60 + 11) * 1000;
    const run = fixture([]);
    let reads = 0;
    const result = await verifyPublishedRelease({
      ...expected, now: run.options.now, sleep: run.options.sleep, log: run.options.log,
      readMetadata: async () => {
        reads++;
        if (run.clock < lagMs) throw new Error('npm error code E404 npm error 404 No match found for version 0.7.14');
        return metadata();
      },
    });
    expect(result.version).toBe(expected.version);
    expect(run.clock).toBeGreaterThanOrEqual(lagMs);
    expect(run.clock).toBeLessThan(lagMs + 30_000);
    expect(reads).toBeLessThan(30);
    expect(run.logs.at(-1)).toMatch(/Publication verified after 7m\d\ds/);
  });

  it('backs off from 5 s to 30 s and gives up after 20 minutes with a rerun hint', async () => {
    const run = fixture([new Error('npm error code E404 No match found for version 0.7.14')]);
    const { timeoutMs, pollIntervalMs, maxPollIntervalMs, ...defaults } = run.options;
    await expect(verifyPublishedRelease(defaults)).rejects.toThrow(
      /deadline expired after 20m00s.*observed latest=missing.*publish itself succeeded.*GitHub release was not created.*Re-running the failed publish job is safe.*npm view joycraft@0\.7\.14/,
    );
    expect(run.sleeps.slice(0, 6)).toEqual([5000, 7500, 11250, 16875, 25313, 30000]);
    expect(Math.max(...run.sleeps)).toBe(30_000);
    expect(run.clock).toBe(20 * 60 * 1000);
    expect(run.calls).toBeLessThan(50);
    expect(run.timeouts.every(ms => ms > 0)).toBe(true);
  });

  it('rejects a maximum interval smaller than the first interval', async () => {
    const run = fixture([metadata()]);
    await expect(verifyPublishedRelease({ ...run.options, pollIntervalMs: 10, maxPollIntervalMs: 5 })).rejects.toThrow(/Maximum polling interval/);
    expect(run.calls).toBe(0);
  });

  it.each([0, -1, NaN, Infinity])('rejects an invalid deadline %s before reading the registry', async (timeoutMs) => {
    const run = fixture([metadata()]);
    await expect(verifyPublishedRelease({ ...run.options, timeoutMs })).rejects.toThrow(/timeout/i);
    expect(run.calls).toBe(0);
  });
});

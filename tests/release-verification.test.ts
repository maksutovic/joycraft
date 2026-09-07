import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  DEFAULT_RUNTIME_LANES,
  DEFAULT_CACHE_MODES,
  createReadinessPlan,
  verifyExactVersionMetadata,
  validateRequiredValidationReport,
  waitForRegistryReadiness,
  createNpmVerificationAdapter,
  verifyConsumerInstallations,
  verifyRegistryConsumerInstallation,
  runRegistryReadiness,
} from '../scripts/release-verification.mjs';

const integrity = `sha512-${Buffer.alloc(64).toString('base64')}`;

describe('release verification', () => {
  it('schedules cold, warmed-full, and warmed-compact consumers for both supported runtime lanes', () => {
    const plan = createReadinessPlan();
    expect(DEFAULT_RUNTIME_LANES.map((lane: any) => lane.node)).toEqual(['22.23.1', '24.20.0']);
    expect(DEFAULT_CACHE_MODES).toEqual(['cold', 'warmed-full', 'warmed-compact']);
    expect(plan.prime).toEqual(expect.arrayContaining([
      expect.objectContaining({ cacheMode: 'warmed-full' }),
      expect.objectContaining({ cacheMode: 'warmed-compact' }),
    ]));
    expect(plan.verify).toHaveLength(6);
    expect(plan.verify).toEqual(expect.arrayContaining([
      expect.objectContaining({ node: '22.23.1', npm: '10.9.8', cacheMode: 'cold' }),
      expect.objectContaining({ node: '24.20.0', npm: '11.19.0', cacheMode: 'warmed-compact' }),
    ]));
  });

  it('requires exact candidate metadata and retained SHA-512 integrity', () => {
    const metadata = {
      name: 'joycraft',
      version: '1.2.3',
      dist: { integrity, tarball: 'https://registry.invalid/joycraft.tgz' },
    };
    expect(verifyExactVersionMetadata({ metadata, packageName: 'joycraft', version: '1.2.3', integrity })).toEqual(expect.objectContaining({ ok: true }));
    expect(verifyExactVersionMetadata({ metadata: { ...metadata, version: '1.2.4' }, packageName: 'joycraft', version: '1.2.3', integrity }).ok).toBe(false);
    expect(verifyExactVersionMetadata({ metadata, packageName: 'joycraft', version: '1.2.3', integrity: 'sha512-other' }).ok).toBe(false);
  });

  it('fails closed when required validation is absent, failed, incomplete, or mismatched', () => {
    const expected = { releaseSha: 'a'.repeat(40), version: '1.2.3', integrity };
    const checks = ['node22-linux-node', 'node24-linux-node'];
    const complete = {
      schemaVersion: 1,
      ...expected,
      complete: true,
      checks: checks.map(id => ({ id, status: 'passed' })),
    };
    expect(validateRequiredValidationReport(complete, { ...expected, requiredChecks: checks })).toEqual(expect.objectContaining({ complete: true }));
    for (const report of [undefined, {}, { ...complete, complete: false }, { ...complete, checks: [{ id: checks[0], status: 'failed' }] }, { ...complete, releaseSha: 'b'.repeat(40) }, { ...complete, integrity: 'sha512-other' }]) {
      expect(() => validateRequiredValidationReport(report, { ...expected, requiredChecks: checks })).toThrow();
    }
  });

  it('does not become ready before five minutes and stops at the bounded deadline', async () => {
    let now = 0;
    const attempts: number[] = [];
    const result = await waitForRegistryReadiness({
      startedAt: 0,
      now: () => now,
      sleep: async (ms: number) => { now += ms; },
      minFreshnessMs: 300_000,
      deadlineMs: 310_000,
      intervalMs: 100_000,
      check: async () => { attempts.push(now); return false; },
    });
    expect(result.ready).toBe(false);
    expect(result.reason).toMatch(/deadline/i);
    expect(attempts.some(value => value >= 300_000)).toBe(true);
  });

  it('emits bounded, isolated npm commands with prefer-online for cache recovery', async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const adapter = createNpmVerificationAdapter({
      run: async (command: string, args: string[]) => {
        calls.push({ command, args });
        return { stdout: JSON.stringify({ version: '1.2.3', dist: { integrity } }), stderr: '' };
      },
    });
    const cache = join(mkdtempSync(join(tmpdir(), 'joycraft-cache-')), 'with spaces');
    mkdirSync(cache, { recursive: true });
    await adapter.viewExactMetadata({ packageName: 'joycraft', version: '1.2.3', cacheDir: cache, preferOnline: true });
    await adapter.install({ spec: '/tmp/retained artifact.tgz', cwd: '/tmp/consumer project', cacheDir: cache, preferOnline: true, attempt: 1 });
    expect(calls[0].args).toEqual(['view', 'joycraft@1.2.3', '--json', '--prefer-online', '--cache', cache]);
    expect(calls[1].args).toEqual(['install', '/tmp/retained artifact.tgz', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-online', '--cache', cache]);
    expect(calls.every(call => Array.isArray(call.args))).toBe(true);
  });

  it('runs fresh and previous-version consumer installs from retained local tarballs', async () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft-consumer-'));
    const calls: Array<{ command: string; args: string[]; options?: any }> = [];
    const adapter = createNpmVerificationAdapter({
      run: async (command: string, args: string[], options: any) => {
        calls.push({ command, args, options });
        if (args.includes(`--package=${join(root, 'prior.tgz')}`) && args.includes('--non-interactive')) {
          throw new Error("legacy CLI: unknown option '--non-interactive'");
        }
        return { stdout: '', stderr: '' };
      },
    });
    const result = await verifyConsumerInstallations({
      packageName: 'joycraft',
      version: '1.2.3',
      tarball: join(root, 'candidate.tgz'),
      previousTarball: join(root, 'prior.tgz'),
      root,
      adapter,
    });
    expect(result.freshInstall).toBe(true);
    expect(result.previousVersionUpdate).toBe(true);
    expect(calls).toHaveLength(6);
    expect(calls[3].args.slice(-1)).toEqual(['init']);
    expect(calls[5].args.slice(-4)).toEqual(['update', '--non-interactive', '--replace-customized', '.claude/hooks/joycraft-version-check.mjs']);
    expect(calls.every(call => call.args.includes('--prefer-online'))).toBe(true);
    expect(calls.every(call => call.args.includes('--cache'))).toBe(true);
    expect(calls.some(call => call.args.includes(join(root, 'prior.tgz')))).toBe(true);
  });

  it('installs an exact registry version and compares its descriptor to the retained bytes', async () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft-registry-consumer-'));
    const descriptor = { schemaVersion: 1, releaseVersion: '1.2.3', manifestSchemas: [1], autoSafeEligible: false };
    const installed = join(root, 'node_modules', 'joycraft', 'dist');
    mkdirSync(installed, { recursive: true });
    writeFileSync(join(installed, 'joycraft-release.json'), `${JSON.stringify(descriptor)}\n`);
    const adapter = createNpmVerificationAdapter({
      run: async (command: string, args: string[], options: any) => {
        if (command === 'npm' && args[0] === 'install') {
          writeFileSync(join(root, 'package-lock.json'), JSON.stringify({ packages: { '': {}, 'node_modules/joycraft': { integrity } } }));
        }
        return command === 'npm' && args[0] === 'view'
          ? { stdout: JSON.stringify({ name: 'joycraft', version: '1.2.3', dist: { integrity } }), stderr: '' }
          : { stdout: '', stderr: '' };
      },
    });
    await expect(verifyRegistryConsumerInstallation({
      packageName: 'joycraft', version: '1.2.3', integrity, descriptor,
      root, cacheDir: join(root, 'cache'), adapter,
    })).resolves.toEqual(expect.objectContaining({ ok: true, version: '1.2.3' }));
  });

  it('polls every planned registry cache lane and only returns readiness after freshness', async () => {
    let now = 0;
    let calls = 0;
    const descriptor = { schemaVersion: 1, releaseVersion: '1.2.3', manifestSchemas: [1], autoSafeEligible: false };
    const cacheRoot = mkdtempSync(join(tmpdir(), 'joycraft-readiness-'));
    const result = await runRegistryReadiness({
      packageName: 'joycraft', version: '1.2.3', integrity, descriptor,
      adapter: {
        viewExactMetadata: async () => { calls += 1; return { name: 'joycraft', version: '1.2.3', dist: { integrity } }; },
        install: async ({ cwd }: any) => {
          mkdirSync(join(cwd, 'node_modules', 'joycraft', 'dist'), { recursive: true });
          writeFileSync(join(cwd, 'node_modules', 'joycraft', 'dist', 'joycraft-release.json'), JSON.stringify(descriptor));
          writeFileSync(join(cwd, 'package-lock.json'), JSON.stringify({ packages: { '': {}, 'node_modules/joycraft': { integrity } } }));
        },
      },
      cacheRoot,
      consumerRoot: join(cacheRoot, 'consumers'),
      now: () => now,
      sleep: async (ms: number) => { now += ms; },
      minFreshnessMs: 300_000,
      deadlineMs: 310_000,
      intervalMs: 100_000,
    });
    expect(result.ready).toBe(true);
    expect(result.checkedAt).toBeGreaterThanOrEqual(300_000);
    expect(calls).toBe(12);
  });
});

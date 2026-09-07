import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createPromotionPlan,
  createPromotionProcessAdapter,
  promoteVerifiedRelease,
  validatePromotionCredential,
} from '../scripts/release-promotion.mjs';
import { createReadinessPlan, MIN_FRESHNESS_MS, runRegistryReadiness } from '../scripts/release-verification.mjs';

const integrity = `sha512-${Buffer.alloc(64).toString('base64')}`;
const expected = {
  releaseSha: 'a'.repeat(40),
  version: '1.2.3',
  integrity,
  tarball: '/tmp/retained-candidate.tgz',
  descriptor: { schemaVersion: 1, releaseVersion: '1.2.3', manifestSchemas: [1], autoSafeEligible: false },
};
const report = {
  schemaVersion: 1,
  ...expected,
  complete: true,
  checks: [{ id: 'runtime-node22-linux', status: 'passed' }],
};
const requiredChecks = ['runtime-node22-linux'];

async function verifiedReadiness() {
  const cacheRoot = mkdtempSync('/tmp/joycraft-promotion-cache-');
  const consumerRoot = mkdtempSync('/tmp/joycraft-promotion-consumer-');
  const descriptor = expected.descriptor;
  const plan = createReadinessPlan({ packageName: 'joycraft', version: expected.version, runtimeLanes: [{ node: '24.20.0', npm: '11.19.0' }] });
  return runRegistryReadiness({
    packageName: 'joycraft',
    version: expected.version,
    integrity,
    descriptor,
    plan,
    cacheRoot,
    consumerRoot,
    adapter: {
      viewExactMetadata: async () => ({ name: 'joycraft', version: expected.version, dist: { integrity } }),
      install: async ({ cwd }: { cwd: string }) => {
        const packageDir = join(cwd, 'node_modules', 'joycraft');
        mkdirSync(join(packageDir, 'dist'), { recursive: true });
        writeFileSync(join(packageDir, 'package.json'), `${JSON.stringify({ name: 'joycraft', version: expected.version })}\n`);
        writeFileSync(join(cwd, 'package-lock.json'), `${JSON.stringify({ packages: { 'node_modules/joycraft': { integrity } } })}\n`);
        writeFileSync(join(packageDir, 'dist', 'joycraft-release.json'), `${JSON.stringify(descriptor)}\n`);
      },
    },
    startedAt: 0,
    now: () => MIN_FRESHNESS_MS,
    sleep: async () => {},
    minFreshnessMs: MIN_FRESHNESS_MS,
    deadlineMs: MIN_FRESHNESS_MS + 1,
  });
}

describe('release promotion', () => {
  it('requires a non-expired Joycraft-scoped credential', () => {
    expect(() => validatePromotionCredential({ env: {} })).toThrow(/credential/i);
    expect(() => validatePromotionCredential({ env: { JOYCRAFT_NPM_PROMOTION_TOKEN: 'token', JOYCRAFT_NPM_PROMOTION_TOKEN_EXPIRES_AT: '2020-01-01T00:00:00Z' }, now: () => new Date('2026-01-01T00:00:00Z') })).toThrow(/expired/i);
    expect(validatePromotionCredential({ env: { JOYCRAFT_NPM_PROMOTION_TOKEN: 'token', JOYCRAFT_NPM_PROMOTION_TOKEN_EXPIRES_AT: '2030-01-01T00:00:00Z' }, now: () => new Date('2026-01-01T00:00:00Z') })).toEqual(expect.objectContaining({ valid: true }));
  });

  it('only plans promotion after complete exact validation and readiness', async () => {
    const registryReady = await verifiedReadiness();
    const plan = createPromotionPlan({ packageName: 'joycraft', expected, report, requiredChecks, registryReady, latestVersion: '1.2.2', credential: { token: 'token' } });
    expect(plan.commands[0]).toEqual(['npm', 'dist-tag', 'add', 'joycraft@1.2.3', 'latest']);
    expect(plan.commands.some((args: string[]) => args.includes('latest'))).toBe(true);
    expect(() => createPromotionPlan({ packageName: 'joycraft', expected, report: { ...report, complete: false }, requiredChecks, registryReady, latestVersion: '1.2.2', credential: { token: 'token' } })).toThrow(/validation/i);
    expect(() => createPromotionPlan({ packageName: 'joycraft', expected, report, requiredChecks, registryReady: false, latestVersion: '1.2.2', credential: { token: 'token' } })).toThrow(/readiness/i);
  });

  it('rejects lookalike readiness and requires a verifier callback before reads or mutations', async () => {
    expect(() => createPromotionPlan({ packageName: 'joycraft', expected, report, requiredChecks, registryReady: { ready: true }, latestVersion: '1.2.2', credential: { token: 'token' } })).toThrow(/verifier/i);
    let calls = 0;
    const adapter = createPromotionProcessAdapter({ run: async () => { calls += 1; return { stdout: '', stderr: '' }; } });
    await expect(promoteVerifiedRelease({ packageName: 'joycraft', expected, report, requiredChecks, registryReady: { ready: true }, credential: { token: 'token' }, adapter })).rejects.toThrow(/callback/i);
    expect(calls).toBe(0);
  });

  it('refuses to downgrade latest and requires a fresh latest check before GitHub release', async () => {
    const registryReady = await verifiedReadiness();
    expect(() => createPromotionPlan({ packageName: 'joycraft', expected, report, requiredChecks, registryReady, latestVersion: '1.2.4', credential: { token: 'token' } })).toThrow(/downgrade/i);
    const plan = createPromotionPlan({ packageName: 'joycraft', expected, report, requiredChecks, registryReady, latestVersion: '1.2.2', credential: { token: 'token' }, completedSteps: ['consumer', 'candidate'] });
    expect(plan.rerunReadiness).toBe(true);
    expect(plan.commands.some((args: string[]) => args[0] === 'gh')).toBe(true);
    expect(plan.commands.findIndex((args: string[]) => args[0] === 'npm' && args[1] === 'view')).toBeLessThan(plan.commands.findIndex((args: string[]) => args[0] === 'gh'));
  });

  it('runs the guarded command arrays and treats an existing release as idempotent', async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    let latestReads = 0;
    const adapter = createPromotionProcessAdapter({
      run: async (command: string, args: string[]) => {
        calls.push({ command, args });
        if (command === 'npm' && args[0] === 'view') {
          latestReads += 1;
          if (args[1] === 'joycraft@1.2.3') return { stdout: JSON.stringify({ version: '1.2.3', dist: { integrity } }), stderr: '' };
          return { stdout: JSON.stringify(latestReads === 1 ? '1.2.2' : '1.2.3'), stderr: '' };
        }
        if (command === 'gh' && args[0] === 'release' && args[1] === 'view') return { stdout: JSON.stringify({ tagName: 'v1.2.3', targetCommitish: 'a'.repeat(40) }), stderr: '' };
        return { stdout: '', stderr: '' };
      },
    });
    adapter.verifyFreshLatest = async () => true;
    const result = await promoteVerifiedRelease({ packageName: 'joycraft', expected, report, requiredChecks, readinessCheck: verifiedReadiness, credential: { token: 'token' }, adapter });
    expect(result.promoted).toBe(true);
    expect(result.releaseCreated).toBe(false);
    expect(calls.find(call => call.command === 'npm' && call.args[0] === 'dist-tag')?.args).toEqual(['dist-tag', 'add', 'joycraft@1.2.3', 'latest']);
    expect(calls.some(call => call.command === 'gh' && call.args[0] === 'release' && call.args[1] === 'create')).toBe(false);
  });

  it('skips a same-version mutation but still verifies the fresh client before the release gate', async () => {
    const calls: Array<{ command: string; args: string[]; options?: any }> = [];
    const adapter = createPromotionProcessAdapter({
      run: async (command: string, args: string[], options: any) => {
        calls.push({ command, args, options });
        if (command === 'npm' && args[0] === 'view' && args[1] === 'joycraft') return { stdout: JSON.stringify('1.2.3'), stderr: '' };
        if (command === 'npm' && args[0] === 'view') return { stdout: JSON.stringify({ version: '1.2.3', dist: { integrity } }), stderr: '' };
        if (command === 'gh' && args[0] === 'release' && args[1] === 'view') return { stdout: JSON.stringify({ tagName: 'v1.2.3', targetCommitish: 'a'.repeat(40) }), stderr: '' };
        return { stdout: '', stderr: '' };
      },
    });
    adapter.verifyFreshLatest = async () => true;
    const result = await promoteVerifiedRelease({ packageName: 'joycraft', expected, report, requiredChecks, readinessCheck: verifiedReadiness, adapter, credential: { token: 'token' } });
    expect(result.promotionSkipped).toBe(true);
    expect(calls.some(call => call.command === 'npm' && call.args[0] === 'dist-tag')).toBe(false);
    expect(calls.findIndex(call => call.command === 'npm' && call.args[0] === 'install')).toBeLessThan(calls.findIndex(call => call.command === 'gh'));
  });

  it('reruns readiness on a retry and never forwards the credential to npm reads or gh', async () => {
    let readinessRuns = 0;
    const calls: Array<{ command: string; args: string[]; options?: any }> = [];
    const adapter = createPromotionProcessAdapter({
      run: async (command: string, args: string[], options: any) => {
        calls.push({ command, args, options });
        if (command === 'npm' && args[0] === 'view' && args[1] === 'joycraft@1.2.3') return { stdout: JSON.stringify({ version: '1.2.3', dist: { integrity } }), stderr: '' };
        if (command === 'npm' && args[0] === 'view') return { stdout: JSON.stringify('1.2.3'), stderr: '' };
        if (command === 'gh' && args[0] === 'release' && args[1] === 'view') return { stdout: JSON.stringify({ tagName: 'v1.2.3', targetCommitish: 'a'.repeat(40) }), stderr: '' };
        return { stdout: '', stderr: '' };
      },
    });
    adapter.verifyFreshLatest = async () => true;
    const retryOptions = {
      packageName: 'joycraft', expected, report, requiredChecks, completedSteps: ['promotion', 'release'], credential: { token: 'fixture-secret' },
      adapter, readinessCheck: async () => { readinessRuns += 1; return verifiedReadiness(); },
    };
    await promoteVerifiedRelease(retryOptions);
    await promoteVerifiedRelease(retryOptions);
    expect(readinessRuns).toBe(2);
    expect(calls.every(call => call.options?.env?.JOYCRAFT_NPM_PROMOTION_TOKEN === undefined)).toBe(true);
    expect(calls.every(call => call.options?.env?.NPM_TOKEN === undefined)).toBe(true);
  });

  it('uses a disposable 0600 npmrc only for the dist-tag mutation', async () => {
    const calls: Array<{ command: string; args: string[]; options?: any }> = [];
    let authPath: string | undefined;
    let latestReads = 0;
    const adapter = createPromotionProcessAdapter({
      run: async (command: string, args: string[], options: any) => {
        calls.push({ command, args, options });
        if (command === 'npm' && args[0] === 'view' && args[1] === 'joycraft@1.2.3') return { stdout: JSON.stringify({ version: '1.2.3', dist: { integrity } }), stderr: '' };
        if (command === 'npm' && args[0] === 'view') {
          latestReads += 1;
          return { stdout: JSON.stringify(latestReads === 1 ? '1.2.2' : '1.2.3'), stderr: '' };
        }
        if (command === 'npm' && args[0] === 'dist-tag') {
          authPath = options.env.npm_config_userconfig;
          expect(readFileSync(authPath, 'utf8')).toContain('fixture-secret');
          expect(statSync(authPath).mode & 0o777).toBe(0o600);
        }
        if (command === 'gh' && args[0] === 'release' && args[1] === 'view') return { stdout: JSON.stringify({ tagName: 'v1.2.3', targetCommitish: 'a'.repeat(40) }), stderr: '' };
        return { stdout: '', stderr: '' };
      },
    });
    adapter.verifyFreshLatest = async () => true;
    await promoteVerifiedRelease({ packageName: 'joycraft', expected, report, requiredChecks, readinessCheck: verifiedReadiness, credential: { token: 'fixture-secret' }, adapter });
    expect(authPath).toBeDefined();
    expect(existsSync(authPath!)).toBe(false);
    const mutation = calls.find(call => call.command === 'npm' && call.args[0] === 'dist-tag');
    expect(mutation?.options?.env?.JOYCRAFT_NPM_PROMOTION_TOKEN).toBeUndefined();
  });
});

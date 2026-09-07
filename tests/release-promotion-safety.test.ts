import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createPromotionPlan } from '../scripts/release-promotion.mjs';
import { createReadinessPlan, MIN_FRESHNESS_MS, runRegistryReadiness } from '../scripts/release-verification.mjs';

const descriptor = { schemaVersion: 1, releaseVersion: '1.2.3', manifestSchemas: [1], autoSafeEligible: false };
const expected = { releaseSha: 'a'.repeat(40), version: '1.2.3', integrity: `sha512-${Buffer.alloc(64).toString('base64')}`, descriptor };
const requiredChecks = ['node22-linux', 'node24-windows'];
const report = { schemaVersion: 1, complete: true, ...expected, requiredChecks, checks: requiredChecks.map(id => ({ id, status: 'passed' })) };
async function verifiedReadiness() {
  const cacheRoot = mkdtempSync('/tmp/joycraft-promotion-safety-cache-');
  const consumerRoot = mkdtempSync('/tmp/joycraft-promotion-safety-consumer-');
  const plan = createReadinessPlan({ packageName: 'joycraft', version: expected.version, runtimeLanes: [{ node: '24.20.0', npm: '11.19.0' }] });
  return runRegistryReadiness({
    packageName: 'joycraft', version: expected.version, integrity: expected.integrity, descriptor, plan,
    cacheRoot, consumerRoot,
    adapter: {
      viewExactMetadata: async () => ({ name: 'joycraft', version: expected.version, dist: { integrity: expected.integrity } }),
      install: async ({ cwd }: { cwd: string }) => {
        const packageDir = join(cwd, 'node_modules', 'joycraft');
        mkdirSync(join(packageDir, 'dist'), { recursive: true });
        writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'joycraft', version: expected.version }));
        writeFileSync(join(cwd, 'package-lock.json'), JSON.stringify({ packages: { 'node_modules/joycraft': { integrity: expected.integrity } } }));
        writeFileSync(join(packageDir, 'dist', 'joycraft-release.json'), JSON.stringify(descriptor));
      },
    },
    startedAt: 0, now: () => MIN_FRESHNESS_MS, sleep: async () => {},
    minFreshnessMs: MIN_FRESHNESS_MS, deadlineMs: MIN_FRESHNESS_MS + 1,
  });
}

describe('promotion fail-closed boundaries', () => {
  it('does not print the promotion credential from the actual credential-check entry', () => {
    const token = 'fixture-secret-that-must-never-be-printed';
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/release-promotion.mjs', import.meta.url)), 'credential-check'], {
      encoding: 'utf8', timeout: 5000,
      env: { ...process.env, JOYCRAFT_NPM_PROMOTION_TOKEN: token, JOYCRAFT_NPM_PROMOTION_TOKEN_EXPIRES_AT: '2099-01-01T00:00:00Z' },
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).not.toContain(token);
    expect(JSON.parse(result.stdout)).toEqual(expect.objectContaining({ valid: true }));
  });

  it('does not let a report select its own required validation set', async () => {
    const safeInputs = { packageName: 'joycraft', expected, report, requiredChecks, registryReady: await verifiedReadiness(), latestVersion: '1.2.2', credential: { token: 'test-only-token' } };
    const { requiredChecks: _required, ...inputs } = safeInputs;
    expect(() => createPromotionPlan(inputs)).toThrow(/required|matrix|configured/i);
  });

  it('requires the candidate descriptor even when version and registry readiness match', async () => {
    const safeInputs = { packageName: 'joycraft', expected, report, requiredChecks, registryReady: await verifiedReadiness(), latestVersion: '1.2.2', credential: { token: 'test-only-token' } };
    const { descriptor: _descriptor, ...identity } = expected;
    const { descriptor: _reportDescriptor, ...withoutDescriptor } = report;
    expect(() => createPromotionPlan({ ...safeInputs, expected: identity, report: withoutDescriptor })).toThrow(/descriptor/i);
  });

  it.each([
    { releaseSha: 'a' },
    { integrity: 'sha512-not-a-real-digest' },
  ])('rejects malformed artifact identity %j even if a report repeats it', async (invalid) => {
    const safeInputs = { packageName: 'joycraft', expected, report, requiredChecks, registryReady: await verifiedReadiness(), latestVersion: '1.2.2', credential: { token: 'test-only-token' } };
    expect(() => createPromotionPlan({
      ...safeInputs,
      expected: { ...expected, ...invalid },
      report: { ...report, ...invalid },
    })).toThrow();
  });

  it('rejects a bare readiness boolean even when every other input is complete', async () => {
    const safeInputs = { packageName: 'joycraft', expected, report, requiredChecks, registryReady: await verifiedReadiness(), latestVersion: '1.2.2', credential: { token: 'test-only-token' } };
    expect(() => createPromotionPlan({ ...safeInputs, registryReady: true })).toThrow(/verifier/i);
  });
});

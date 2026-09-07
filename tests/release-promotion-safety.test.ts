import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createPromotionPlan } from '../scripts/release-promotion.mjs';

const descriptor = { schemaVersion: 1, releaseVersion: '1.2.3', manifestSchemas: [1], autoSafeEligible: false };
const expected = { releaseSha: 'a'.repeat(40), version: '1.2.3', integrity: `sha512-${Buffer.alloc(64).toString('base64')}`, descriptor };
const requiredChecks = ['node22-linux', 'node24-windows'];
const report = { schemaVersion: 1, complete: true, ...expected, requiredChecks, checks: requiredChecks.map(id => ({ id, status: 'passed' })) };
const safeInputs = { packageName: 'joycraft', expected, report, requiredChecks, registryReady: true, latestVersion: '1.2.2', credential: { token: 'test-only-token' } };

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

  it('does not let a report select its own required validation set', () => {
    const { requiredChecks: _required, ...inputs } = safeInputs;
    expect(() => createPromotionPlan(inputs)).toThrow(/required|matrix|configured/i);
  });

  it('requires the candidate descriptor even when version and registry readiness match', () => {
    const { descriptor: _descriptor, ...identity } = expected;
    const { descriptor: _reportDescriptor, ...withoutDescriptor } = report;
    expect(() => createPromotionPlan({ ...safeInputs, expected: identity, report: withoutDescriptor })).toThrow(/descriptor/i);
  });

  it.each([
    { releaseSha: 'a' },
    { integrity: 'sha512-not-a-real-digest' },
  ])('rejects malformed artifact identity %j even if a report repeats it', (invalid) => {
    expect(() => createPromotionPlan({
      ...safeInputs,
      expected: { ...expected, ...invalid },
      report: { ...report, ...invalid },
    })).toThrow();
  });
});

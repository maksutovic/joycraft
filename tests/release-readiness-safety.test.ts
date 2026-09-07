import { expect, it } from 'vitest';
import { waitForRegistryReadiness } from '../scripts/release-verification.mjs';

it('starts a default readiness window at the current clock rather than the Unix epoch', async () => {
  let clock = 1_000_000;
  const checks: number[] = [];
  const result = await waitForRegistryReadiness({
    now: () => clock,
    sleep: async (ms: number) => { clock += ms; },
    check: async () => { checks.push(clock); return true; },
  });
  expect(result.ready).toBe(true);
  expect(checks[0]).toBeGreaterThanOrEqual(1_300_000);
});

it('does not let a caller reduce the required five-minute freshness interval', async () => {
  let clock = 0;
  const checks: number[] = [];
  const result = await waitForRegistryReadiness({
    startedAt: 0, minFreshnessMs: 0, deadlineMs: 310_000,
    now: () => clock,
    sleep: async (ms: number) => { clock += ms; },
    check: async () => { checks.push(clock); return true; },
  });
  expect(result.ready).toBe(true);
  expect(checks[0]).toBeGreaterThanOrEqual(300_000);
});

it('refuses readiness that completes only after the bounded deadline', async () => {
  let clock = 300_000;
  const result = await waitForRegistryReadiness({
    startedAt: 0, deadlineMs: 310_000,
    now: () => clock,
    sleep: async (ms: number) => { clock += ms; },
    check: async () => { clock = 320_000; return true; },
  });
  expect(result.ready).toBe(false);
  expect(result.reason).toMatch(/deadline/i);
});

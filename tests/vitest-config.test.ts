import { describe, expect, it } from 'vitest';
import config from '../vitest.config';

describe('suite test timeout (2026-11-28 spec 11)', () => {
  it('[AC:spec-11-1] the default per-test timeout fits a full parallel gate run of the process-spawning tests', () => {
    expect(config.test?.testTimeout).toBe(20000);
  });
});

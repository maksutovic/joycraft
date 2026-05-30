import { describe, it, expect } from 'vitest';
import { rollDie } from './roll-die';

describe('rollDie', () => {
  it('returns a value in [1, 6] for rollDie(6)', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollDie(6);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('returns a value in [1, 20] for rollDie(20)', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollDie(20);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(20);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('always returns 1 for rollDie(1)', () => {
    expect(rollDie(1)).toBe(1);
    expect(rollDie(1)).toBe(1);
    expect(rollDie(1)).toBe(1);
  });

  it('throws for negative sides', () => {
    expect(() => rollDie(-1)).toThrow();
  });

  it('throws for zero sides', () => {
    expect(() => rollDie(0)).toThrow();
  });

  it('throws for non-integer sides', () => {
    expect(() => rollDie(3.5)).toThrow();
  });

  it('throws for NaN', () => {
    expect(() => rollDie(NaN)).toThrow();
  });

  it('throws for Infinity', () => {
    expect(() => rollDie(Infinity)).toThrow();
  });
});

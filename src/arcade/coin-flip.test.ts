import { describe, it, expect } from 'vitest';
import { flipCoin } from './coin-flip';

describe('flipCoin', () => {
  it('returns only "heads" or "tails"', () => {
    for (let i = 0; i < 100; i++) {
      const result = flipCoin();
      expect(result === 'heads' || result === 'tails').toBe(true);
    }
  });

  it('produces both outcomes over many flips', () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(flipCoin());
    }
    expect(results.has('heads')).toBe(true);
    expect(results.has('tails')).toBe(true);
  });

  it('requires no arguments', () => {
    expect(() => flipCoin()).not.toThrow();
  });
});

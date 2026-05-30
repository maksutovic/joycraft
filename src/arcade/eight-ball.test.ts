import { describe, it, expect, vi } from 'vitest';
import { shakeEightBall, RESPONSES } from './eight-ball';

describe('shakeEightBall', () => {
  it('returns a valid response from the 20-response set', () => {
    for (let i = 0; i < 100; i++) {
      const result = shakeEightBall();
      expect(RESPONSES).toContain(result);
    }
  });

  it('can return all 20 responses when Math.random() is mocked', () => {
    const seen = new Set<string>();
    for (let i = 0; i < RESPONSES.length; i++) {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(i / RESPONSES.length);
      seen.add(shakeEightBall());
      spy.mockRestore();
    }
    expect(seen.size).toBe(20);
  });

  it('produces different responses over many calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      seen.add(shakeEightBall());
    }
    expect(seen.size).toBeGreaterThanOrEqual(2);
  });
});

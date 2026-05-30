import { describe, it, expect } from 'vitest';
import { secretEmbed } from './secret-embed';

describe('secretEmbed', () => {
  it('returns exactly "The secret fruit is KIWI"', () => {
    expect(secretEmbed()).toBe('The secret fruit is KIWI');
  });

  it('returns the same string every time', () => {
    const first = secretEmbed();
    const second = secretEmbed();
    const third = secretEmbed();
    expect(first).toBe(second);
    expect(second).toBe(third);
  });
});

import { describe, it, expect } from 'vitest';
import { generateStartupIdea, ANALOGIES, MARKETS } from './phrase-generator';

describe('generateStartupIdea', () => {
  it('returns a string in the correct format', () => {
    const result = generateStartupIdea();
    expect(result).toMatch(/^It's like .+ for .+!$/);
  });

  it('uses an X from the known analogy list', () => {
    const result = generateStartupIdea();
    const match = result.match(/^It's like (.+) for (.+)!$/);
    expect(match).not.toBeNull();
    expect(ANALOGIES).toContain(match![1]);
  });

  it('uses a Y from the known market list', () => {
    const result = generateStartupIdea();
    const match = result.match(/^It's like (.+) for (.+)!$/);
    expect(match).not.toBeNull();
    expect(MARKETS).toContain(match![2]);
  });

  it('produces a variety of results over many calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      seen.add(generateStartupIdea());
    }
    expect(seen.size).toBeGreaterThanOrEqual(2);
  });
});

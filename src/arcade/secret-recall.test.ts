import { describe, it, expect } from 'vitest';
import { secretRecall } from './secret-recall';

describe('secretRecall', () => {
  it('returns KIWI from memory', () => {
    expect(secretRecall()).toBe('KIWI');
  });
});

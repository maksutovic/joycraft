import { describe, it, expect } from 'vitest';
import { isHaiku } from './haiku-validator';

describe('isHaiku', () => {
  it('returns true for a valid 5-7-5 haiku', () => {
    const text = 'An old silent pond\nA frog jumps into the pond—\nSplash! Silence again';
    expect(isHaiku(text)).toBe(true);
  });

  it('returns false for wrong syllable count (5-5-5)', () => {
    const text = 'An old silent pond\nA frog jumps into the\nSplash! Silence again';
    expect(isHaiku(text)).toBe(false);
  });

  it('returns false for too few lines', () => {
    expect(isHaiku('An old silent pond')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isHaiku('')).toBe(false);
  });

  it('ignores leading and trailing blank lines', () => {
    const text = '\n\nAn old silent pond\nA frog jumps into the pond—\nSplash! Silence again\n\n';
    expect(isHaiku(text)).toBe(true);
  });

  it('returns false for too many lines', () => {
    const text = 'An old silent pond\nA frog jumps into the pond—\nSplash! Silence again\nExtra line here';
    expect(isHaiku(text)).toBe(false);
  });

  it('handles mixed case', () => {
    const text = 'AN OLD SILENT POND\nA FROG JUMPS INTO THE POND—\nSPLASH! SILENCE AGAIN';
    expect(isHaiku(text)).toBe(true);
  });
});

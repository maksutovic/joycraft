import { describe, it, expect } from 'vitest';
import { isValidLuhn } from './luhn-validator';

describe('isValidLuhn', () => {
  it('returns true for a known valid Luhn number', () => {
    expect(isValidLuhn('4532015112830366')).toBe(true);
  });

  it('returns false for a known invalid Luhn number', () => {
    expect(isValidLuhn('4532015112830367')).toBe(false);
  });

  it('returns false for strings containing non-digit characters', () => {
    expect(isValidLuhn('4532-0151-1283-0366')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidLuhn('')).toBe(false);
  });

  it('returns true for single digit "0"', () => {
    expect(isValidLuhn('0')).toBe(true);
  });
});

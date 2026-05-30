import { describe, it, expect } from 'vitest';
import { toRoman } from './roman-numerals';

describe('toRoman', () => {
  it('converts 1 to "I"', () => {
    expect(toRoman(1)).toBe('I');
  });

  it('converts 4 to "IV"', () => {
    expect(toRoman(4)).toBe('IV');
  });

  it('converts 9 to "IX"', () => {
    expect(toRoman(9)).toBe('IX');
  });

  it('converts 2024 to "MMXXIV"', () => {
    expect(toRoman(2024)).toBe('MMXXIV');
  });

  it('returns empty string for 0', () => {
    expect(toRoman(0)).toBe('');
  });

  it('returns empty string for negative numbers', () => {
    expect(toRoman(-1)).toBe('');
  });

  it('converts all standard symbols', () => {
    expect(toRoman(1000)).toBe('M');
    expect(toRoman(500)).toBe('D');
    expect(toRoman(100)).toBe('C');
    expect(toRoman(50)).toBe('L');
    expect(toRoman(10)).toBe('X');
    expect(toRoman(5)).toBe('V');
    expect(toRoman(1)).toBe('I');
  });
});

import { describe, it, expect } from 'vitest';
import { isPalindrome } from './palindrome-check';

describe('isPalindrome', () => {
  it('returns true for simple palindromes', () => {
    expect(isPalindrome('radar')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isPalindrome('RaDaR')).toBe(true);
  });

  it('ignores spaces and punctuation', () => {
    expect(isPalindrome('A man, a plan, a canal: Panama')).toBe(true);
  });

  it('returns false for non-palindromes', () => {
    expect(isPalindrome('hello')).toBe(false);
  });

  it('returns true for empty string', () => {
    expect(isPalindrome('')).toBe(true);
  });

  it('returns true for single character', () => {
    expect(isPalindrome('a')).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { rot13 } from './rot13';

describe('rot13', () => {
  it('rotates lowercase letters by 13', () => {
    expect(rot13('abc')).toBe('nop');
  });

  it('rotates uppercase letters by 13', () => {
    expect(rot13('ABC')).toBe('NOP');
  });

  it('leaves non-alphabetic characters unchanged', () => {
    expect(rot13('123 !')).toBe('123 !');
  });

  it('is its own inverse (double-ROT13 returns original)', () => {
    expect(rot13(rot13('Hello'))).toBe('Hello');
  });

  it('handles mixed strings', () => {
    expect(rot13('Hello, World!')).toBe('Uryyb, Jbeyq!');
  });

  it('returns empty string for empty input', () => {
    expect(rot13('')).toBe('');
  });
});

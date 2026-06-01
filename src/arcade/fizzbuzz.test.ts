import { describe, it, expect } from 'vitest';
import { fizzBuzz } from './fizzbuzz';

describe('fizzBuzz', () => {
  it('returns array of length n', () => {
    expect(fizzBuzz(5)).toHaveLength(5);
  });

  it('first element is "1"', () => {
    expect(fizzBuzz(5)[0]).toBe('1');
  });

  it('multiples of 3 are "Fizz"', () => {
    expect(fizzBuzz(3)[2]).toBe('Fizz');
  });

  it('multiples of 5 are "Buzz"', () => {
    expect(fizzBuzz(5)[4]).toBe('Buzz');
  });

  it('multiples of 15 are "FizzBuzz"', () => {
    expect(fizzBuzz(15)[14]).toBe('FizzBuzz');
  });

  it('non-multiples are string numbers', () => {
    expect(fizzBuzz(2)[1]).toBe('2');
  });

  it('returns empty array for n = 0', () => {
    expect(fizzBuzz(0)).toEqual([]);
  });
});

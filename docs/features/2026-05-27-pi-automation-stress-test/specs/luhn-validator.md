# Luhn Validator — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 2 files / ~25 lines

---

## What

A `isLuhnValid(digits: string): boolean` function that validates a number string using the Luhn algorithm (credit card checksum).

## Why

Tests algorithmic implementation with digit manipulation.

## Acceptance Criteria

- [ ] Returns `true` for valid Luhn numbers
- [ ] Returns `false` for invalid Luhn numbers
- [ ] Returns `false` for empty or non-digit strings
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Valid number | `isLuhnValid("4532015112830366")` === true | unit |
| Invalid number | `isLuhnValid("4532015112830367")` === false | unit |
| Empty string | `isLuhnValid("")` === false | unit |
| Non-digits | `isLuhnValid("abc")` === false | unit |

**Execution order:** Red → green

**Smoke test:** Valid number check

## Constraints

- MUST: Implement standard Luhn algorithm
- MUST NOT: Use external validation libraries

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/luhn-validator.ts` | Function |
| Create | `src/arcade/luhn-validator.test.ts` | Tests |

## Approach

1. Reverse string
2. Double every second digit
3. Subtract 9 from digits > 9
4. Sum all digits
5. Valid if sum % 10 === 0

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Single digit "0" | false (sum = 0, but Luhn requires at least 2 digits typically; return false for < 2) |
| Valid with spaces | strip spaces first |

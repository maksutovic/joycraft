# Luhn Validator — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 1 file / ~20 lines

---

## What
Implement a function `isValidLuhn(number: string): boolean` that validates whether a string of digits passes the Luhn algorithm (used for credit card numbers).

## Why
Without this, no number-puzzle arcade modules can exist.

## Acceptance Criteria
- [ ] Returns `true` for known valid Luhn numbers
- [ ] Returns `false` for known invalid Luhn numbers
- [ ] Returns `false` for strings containing non-digit characters
- [ ] Returns `false` for empty strings
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Valid Luhn number | `isValidLuhn("4532015112830366") === true` | unit |
| Invalid Luhn number | `isValidLuhn("4532015112830367") === false` | unit |
| Non-digit chars | `isValidLuhn("4532-0151-1283-0366") === false` | unit |
| Empty string | `isValidLuhn("") === false` | unit |
| Single digit | `isValidLuhn("0") === true` | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `isValidLuhn("4532015112830366") === true` (runs in milliseconds)

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints
- MUST: Implement the full Luhn algorithm (double every second digit from right, subtract 9 if > 9, sum divisible by 10)
- MUST: Reject strings with non-digit characters
- MUST: Function exported from `src/arcade/luhn-validator.ts`
- MUST NOT: Touch any production code outside `src/arcade/`
- MUST NOT: Break existing tests

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/luhn-validator.ts` | New implementation |
| Create | `src/arcade/luhn-validator.test.ts` | New tests |

## Approach
1. Validate all chars are digits; if not, return `false`
2. Iterate digits from right to left
3. Double every second digit; if result > 9, subtract 9
4. Sum all digits; valid if sum % 10 === 0
Rejected alternative: reverse string first, then iterate left-to-right — equivalent but adds an allocation.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Empty string | Returns `false` |
| String with spaces | Returns `false` |
| All zeros | Returns `true` (0 is divisible by 10) |
| Valid number with even length | Handled correctly |
| Valid number with odd length | Handled correctly |

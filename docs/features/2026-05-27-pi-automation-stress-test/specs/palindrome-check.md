# Palindrome Check — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 2 files / ~15 lines

---

## What

An `isPalindrome(text: string): boolean` function that checks if a string reads the same forwards and backwards, ignoring case and non-alphanumeric characters.

## Why

Tests string normalization and comparison logic.

## Acceptance Criteria

- [ ] Returns `true` for valid palindromes (case-insensitive)
- [ ] Returns `false` for non-palindromes
- [ ] Ignores non-alphanumeric characters
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Simple palindrome | `isPalindrome("radar")` === true | unit |
| Case insensitive | `isPalindrome("Racecar")` === true | unit |
| With spaces/punctuation | `isPalindrome("A man, a plan, a canal: Panama")` === true | unit |
| Non-palindrome | `isPalindrome("hello")` === false | unit |

**Execution order:** Red → green

**Smoke test:** Simple palindrome

## Constraints

- MUST: Ignore case
- MUST: Strip non-alphanumeric before comparing
- MUST NOT: Use external libraries

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/palindrome-check.ts` | Function |
| Create | `src/arcade/palindrome-check.test.ts` | Tests |

## Approach

Normalize: lowercase, strip `/[^a-z0-9]/g`, compare to reversed string.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty string | true |
| Single char | true |
| Only punctuation | true (after stripping, empty === empty) |

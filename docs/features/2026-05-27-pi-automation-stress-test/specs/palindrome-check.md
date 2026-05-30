# Palindrome Check — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 1 file / ~10 lines

---

## What
Implement a function `isPalindrome(text: string): boolean` that returns `true` if the input reads the same forwards and backwards, ignoring case and non-alphanumeric characters.

## Why
Without this, no word-game arcade modules can exist.

## Acceptance Criteria
- [ ] Returns `true` for simple palindromes like `"radar"`
- [ ] Returns `true` for palindromes with spaces and punctuation like `"A man, a plan, a canal: Panama"`
- [ ] Returns `false` for non-palindromes
- [ ] Is case-insensitive
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Simple palindrome | `isPalindrome("radar") === true` | unit |
| Case-insensitive | `isPalindrome("RaDaR") === true` | unit |
| With punctuation | `isPalindrome("A man, a plan, a canal: Panama") === true` | unit |
| Non-palindrome | `isPalindrome("hello") === false` | unit |
| Empty string | `isPalindrome("") === true` | unit |
| Single char | `isPalindrome("a") === true` | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `isPalindrome("radar") === true` (runs in milliseconds)

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints
- MUST: Strip non-alphanumeric characters before comparing
- MUST: Compare case-insensitively
- MUST: Function exported from `src/arcade/palindrome-check.ts`
- MUST NOT: Touch any production code outside `src/arcade/`
- MUST NOT: Break existing tests

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/palindrome-check.ts` | New implementation |
| Create | `src/arcade/palindrome-check.test.ts` | New tests |

## Approach
Normalize: lowercase, remove non-alphanumeric chars, then compare string to its reverse. Rejected alternative: two-pointer iteration from both ends — correct but more code for no performance benefit at these string sizes.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Empty string | Returns `true` |
| Only non-alphanumeric chars | Returns `true` (empty normalized string is a palindrome) |
| Numbers | Treated as alphanumeric; `"12321"` returns `true` |
| Mixed alphanumeric | Handled correctly |

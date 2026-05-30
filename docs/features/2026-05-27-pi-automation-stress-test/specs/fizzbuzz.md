# FizzBuzz — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 1 file / ~15 lines

---

## What
Implement a function `fizzBuzz(n: number): string[]` that returns an array of length `n`, where multiples of 3 are `"Fizz"`, multiples of 5 are `"Buzz"`, multiples of both are `"FizzBuzz"`, and all others are the number as a string.

## Why
Without this, no classic programming puzzle arcade module can exist.

## Acceptance Criteria
- [ ] Returns array of length `n`
- [ ] Index 1 (first element) is `"1"`
- [ ] Multiples of 3 are `"Fizz"`
- [ ] Multiples of 5 are `"Buzz"`
- [ ] Multiples of 15 are `"FizzBuzz"`
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Correct length | `fizzBuzz(5).length === 5` | unit |
| First element is "1" | `fizzBuzz(5)[0] === "1"` | unit |
| Multiple of 3 | `fizzBuzz(3)[2] === "Fizz"` | unit |
| Multiple of 5 | `fizzBuzz(5)[4] === "Buzz"` | unit |
| Multiple of 15 | `fizzBuzz(15)[14] === "FizzBuzz"` | unit |
| Non-multiple is string number | `fizzBuzz(2)[1] === "2"` | unit |
| `n = 0` | Returns empty array | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `fizzBuzz(3)[2] === "Fizz"` (runs in milliseconds)

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints
- MUST: 1-indexed logic (first element corresponds to 1)
- MUST: Return strings, not numbers
- MUST: Function exported from `src/arcade/fizzbuzz.ts`
- MUST NOT: Touch any production code outside `src/arcade/`
- MUST NOT: Break existing tests

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/fizzbuzz.ts` | New implementation |
| Create | `src/arcade/fizzbuzz.test.ts` | New tests |

## Approach
Loop `i` from 1 to `n`. Build result array. Use modulo checks: 15 first, then 5, then 3, else `String(i)`. Rejected alternative: ternary chain `(i % 3 ? "" : "Fizz") + (i % 5 ? "" : "Buzz") || String(i)` — clever but less readable.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| `n = 0` | Returns `[]` |
| `n = 1` | Returns `["1"]` |
| Negative `n` | Returns `[]` or throws (either is acceptable) |

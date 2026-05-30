# Coin Flip — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 1 file / ~5 lines

---

## What
Implement a function `flipCoin(): "heads" | "tails"` that returns one of two string outcomes with equal probability.

## Why
Without this, no simple chance-based arcade games can exist.

## Acceptance Criteria
- [ ] Returns either `"heads"` or `"tails"` on each call
- [ ] Over many flips, both outcomes appear
- [ ] No arguments are required
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Returns valid string | `flipCoin()` repeated; assert every result is `"heads"` or `"tails"` | unit |
| Both outcomes appear | Run 100 times; assert at least one heads and one tails | unit |
| No arguments needed | Call `flipCoin()` with no args; no error | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `flipCoin()` returns `"heads"` or `"tails"` (runs in milliseconds)

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints
- MUST: Return type is the literal union `"heads" | "tails"`
- MUST: Function exported from `src/arcade/coin-flip.ts`
- MUST NOT: Touch any production code outside `src/arcade/`
- MUST NOT: Break existing tests

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/coin-flip.ts` | New implementation |
| Create | `src/arcade/coin-flip.test.ts` | New tests |

## Approach
Use `Math.random() < 0.5 ? "heads" : "tails"`. Rejected alternative: `Math.round(Math.random())` mapped to array index — more indirection, same result, less readable.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| `Math.random()` returns exactly `0` | Returns `"heads"` |
| `Math.random()` returns exactly `0.5` | Returns `"tails"` |

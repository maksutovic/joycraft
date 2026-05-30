# Eight Ball — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 1 file / ~25 lines

---

## What
Implement a function `shakeEightBall(): string` that returns a random response from a set of 20 classic Magic 8-Ball answers.

## Why
Without this, no fortune-telling arcade module can exist.

## Acceptance Criteria
- [ ] Returns one of exactly 20 predefined strings
- [ ] Every response comes from the canonical Magic 8-Ball set
- [ ] Over many calls, different responses appear
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Returns valid response | `shakeEightBall()`; assert result is in the 20-response set | unit |
| All 20 responses are possible | Mock `Math.random()` to return every index; assert each unique response | unit |
| Different responses over time | Run 100 times; assert at least 2 distinct responses | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `shakeEightBall()` returns a string from the known set (runs in milliseconds)

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints
- MUST: Include all 20 canonical Magic 8-Ball responses
- MUST: Function exported from `src/arcade/eight-ball.ts`
- MUST NOT: Touch any production code outside `src/arcade/`
- MUST NOT: Break existing tests

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/eight-ball.ts` | New implementation |
| Create | `src/arcade/eight-ball.test.ts` | New tests |

## Approach
Store 20 responses in a const array. Use `Math.floor(Math.random() * responses.length)` to pick one. Rejected alternative: hardcode 20 as the multiplier instead of `responses.length` — brittle if the list changes.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| `Math.random()` returns exactly `0` | Returns the first response |
| `Math.random()` returns exactly `0.999...` | Returns the last response |

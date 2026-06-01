# Roll Die — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 1 file / ~10 lines

---

## What
Implement a function `rollDie(sides: number): number` that returns a random integer between 1 and `sides` (inclusive).

## Why
Without this, no dice-based arcade games can exist.

## Acceptance Criteria
- [ ] `rollDie(6)` returns a value in `[1, 6]`
- [ ] `rollDie(20)` returns a value in `[1, 20]`
- [ ] `rollDie(1)` always returns `1`
- [ ] Invalid input (e.g., `sides <= 0`, non-integer) throws an error
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Returns value in valid range | `rollDie(6)` repeated many times; assert all in `[1, 6]` | unit |
| `rollDie(1)` is deterministic | assert `rollDie(1) === 1` | unit |
| Negative sides throws | assert `rollDie(-1)` throws | unit |
| Zero sides throws | assert `rollDie(0)` throws | unit |
| Non-integer sides throws | assert `rollDie(3.5)` throws | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `rollDie(1) === 1` (runs in milliseconds)

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints
- MUST: Use `Math.random()` for randomness (no crypto module)
- MUST: Function exported from `src/arcade/roll-die.ts`
- MUST NOT: Touch any production code outside `src/arcade/`
- MUST NOT: Break existing tests

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/roll-die.ts` | New implementation |
| Create | `src/arcade/roll-die.test.ts` | New tests |

## Approach
Use `Math.floor(Math.random() * sides) + 1` to produce the random integer. Validate input first and throw for bad values. Rejected alternative: `Math.ceil(Math.random() * sides)` — produces `0` when `Math.random()` returns exactly `0`.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| `sides = 1` | Always returns `1` |
| `sides = Number.MAX_SAFE_INTEGER` | Returns a very large integer (still valid) |
| `sides` is `NaN` | Throws error |
| `sides` is `Infinity` | Throws error |

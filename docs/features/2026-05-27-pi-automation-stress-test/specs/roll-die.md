# Roll Die — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 2 files / ~15 lines

---

## What

A `rollDie(sides: number): number` function that returns a random integer from 1 to `sides` inclusive.

## Why

We need a deterministic testable randomness primitive for the arcade.

## Acceptance Criteria

- [ ] `rollDie(6)` returns a number between 1 and 6
- [ ] `rollDie(20)` returns a number between 1 and 20
- [ ] `rollDie(1)` returns 1
- [ ] Throws on invalid input (sides < 1, non-integer, NaN)
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Returns valid range | `rollDie(6)` result is 1–6 | unit |
| Returns valid range (20) | `rollDie(20)` result is 1–20 | unit |
| Single side | `rollDie(1)` === 1 | unit |
| Invalid: zero | throws on `rollDie(0)` | unit |
| Invalid: negative | throws on `rollDie(-1)` | unit |
| Invalid: float | throws on `rollDie(6.5)` | unit |

**Execution order:**
1. Write all tests — they fail against stub
2. Confirm failures (red)
3. Implement until green

**Smoke test:** `rollDie(6)` range check (runs in < 10ms)

## Constraints

- MUST: Use `Math.random()`
- MUST NOT: Add dependencies

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/roll-die.ts` | Function implementation |
| Create | `src/arcade/roll-die.test.ts` | Tests |

## Approach

Use `Math.floor(Math.random() * sides) + 1`. Validate inputs upfront.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `sides = 1` | Always returns 1 |
| `sides = Infinity` | Throws (not a safe integer) |

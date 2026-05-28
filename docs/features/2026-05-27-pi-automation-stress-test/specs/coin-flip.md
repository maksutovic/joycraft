# Coin Flip — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 2 files / ~10 lines

---

## What

A `coinFlip(): "heads" | "tails"` function that returns one of two outcomes with roughly equal probability.

## Why

Simplest possible randomness primitive — tests the harness can handle trivial specs.

## Acceptance Criteria

- [ ] Returns only `"heads"` or `"tails"`
- [ ] Over many flips, distribution is roughly 50/50 (within statistical tolerance)
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Valid output | result is "heads" or "tails" | unit |
| Distribution | 1000 flips, each appears 400–600 times | unit |

**Execution order:**
1. Write tests — they fail
2. Implement
3. Green

**Smoke test:** Single flip output validation

## Constraints

- MUST: Return literal union type `"heads" | "tails"`
- MUST NOT: Accept parameters

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/coin-flip.ts` | Function |
| Create | `src/arcade/coin-flip.test.ts` | Tests |

## Approach

`Math.random() < 0.5 ? "heads" : "tails"`

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Determinism | Each call is independent |

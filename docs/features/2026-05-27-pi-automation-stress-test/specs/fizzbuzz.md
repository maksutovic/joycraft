# FizzBuzz — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 2 files / ~15 lines

---

## What

A `fizzbuzz(n: number): (number | "fizz" | "buzz" | "fizzbuzz")[]` function that returns the classic FizzBuzz sequence from 1 to n.

## Why

The canonical coding interview problem — perfect for a trivial harness validation.

## Acceptance Criteria

- [ ] Multiples of 3 → "fizz"
- [ ] Multiples of 5 → "buzz"
- [ ] Multiples of 15 → "fizzbuzz"
- [ ] Others → the number
- [ ] Returns array of length n
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| First 15 correct | snapshot or exact array check | unit |
| Length | `fizzbuzz(100).length === 100` | unit |
| fizzbuzz value | `fizzbuzz(15)[14] === "fizzbuzz"` | unit |
| Number preserved | `fizzbuzz(15)[0] === 1` | unit |

**Execution order:** Red → green

**Smoke test:** First 5 values

## Constraints

- MUST: Return union type array
- MUST NOT: Print to console

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/fizzbuzz.ts` | Function |
| Create | `src/arcade/fizzbuzz.test.ts` | Tests |

## Approach

Iterate 1..n. Push "fizzbuzz" if %15, "fizz" if %3, "buzz" if %5, else number.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `n = 0` | returns `[]` |
| `n = 1` | returns `[1]` |

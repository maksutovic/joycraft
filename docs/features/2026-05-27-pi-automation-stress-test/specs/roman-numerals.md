# Roman Numerals — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 2 files / ~25 lines

---

## What

A `toRoman(num: number): string` function that converts integers 1–3999 to Roman numerals.

## Why

Tests lookup-table-based conversion with subtractive notation.

## Acceptance Criteria

- [ ] Converts 1–3999 correctly
- [ ] Uses subtractive notation (IV, IX, XL, XC, CD, CM)
- [ ] Throws on out-of-range or invalid input
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Basic values | 1→"I", 5→"V", 10→"X" | unit |
| Subtractive | 4→"IV", 9→"IX", 40→"XL" | unit |
| Large number | 1994→"MCMXCIV", 3999→"MMMCMXCIX" | unit |
| Invalid: zero | throws on 0 | unit |
| Invalid: 4000 | throws on 4000 | unit |

**Execution order:** Red → green

**Smoke test:** Basic values

## Constraints

- MUST: Support 1–3999 only
- MUST: Use standard subtractive notation

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/roman-numerals.ts` | Function |
| Create | `src/arcade/roman-numerals.test.ts` | Tests |

## Approach

Use descending lookup table: `[{value:1000, numeral:"M"}, ...]`. Iterate and build string.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| 3 → "III" | repeated symbols |
| 3888 → "MMMDCCCLXXXVIII" | longest valid numeral |

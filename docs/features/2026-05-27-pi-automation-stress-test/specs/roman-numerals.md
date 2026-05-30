# Roman Numerals — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 1 file / ~20 lines

---

## What
Implement a function `toRoman(num: number): string` that converts a positive integer to its Roman numeral representation.

## Why
Without this, no number-conversion arcade modules can exist.

## Acceptance Criteria
- [ ] Converts 1 to `"I"`
- [ ] Converts 4 to `"IV"`
- [ ] Converts 9 to `"IX"`
- [ ] Converts 2024 to `"MMXXIV"`
- [ ] Returns empty string or throws for non-positive input
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Basic conversion | `toRoman(1) === "I"` | unit |
| Subtractive notation 4 | `toRoman(4) === "IV"` | unit |
| Subtractive notation 9 | `toRoman(9) === "IX"` | unit |
| Large number | `toRoman(2024) === "MMXXIV"` | unit |
| Zero or negative | `toRoman(0)` returns `""` or throws | unit |
| All standard symbols | Test 1000→"M", 500→"D", 100→"C", 50→"L", 10→"X", 5→"V" | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `toRoman(4) === "IV"` (runs in milliseconds)

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints
- MUST: Support values 1–3999 (standard Roman numeral range)
- MUST: Use subtractive notation (IV, IX, XL, XC, CD, CM)
- MUST: Function exported from `src/arcade/roman-numerals.ts`
- MUST NOT: Touch any production code outside `src/arcade/`
- MUST NOT: Break existing tests

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/roman-numerals.ts` | New implementation |
| Create | `src/arcade/roman-numerals.test.ts` | New tests |

## Approach
Use a descending lookup table of value→symbol pairs: `[1000, "M"], [900, "CM"], ... [1, "I"]`. Iterate and subtract/build result. Rejected alternative: recursive decomposition — harder to read and no benefit at this scale.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| `num = 0` | Returns `""` or throws |
| `num = 3999` | Returns `"MMMCMXCIX"` |
| Negative number | Returns `""` or throws |
| Non-integer | Returns `""` or throws |

# Haiku Validator — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 1 file / ~30 lines

---

## What
Implement a function `isHaiku(text: string): boolean` that checks whether a given string is a haiku — three lines with 5, 7, and 5 syllables respectively.

## Why
Without this, no poetry-based arcade modules can exist.

## Acceptance Criteria
- [ ] Returns `true` for a valid 5-7-5 haiku
- [ ] Returns `false` for non-haiku text
- [ ] Ignores empty lines at start/end
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Valid haiku passes | Pass a known 5-7-5 haiku; assert `true` | unit |
| Wrong syllable count fails | Pass 5-5-5 text; assert `false` | unit |
| Too few lines fails | Pass single line; assert `false` | unit |
| Empty string fails | Pass `""`; assert `false` | unit |
| Leading/trailing blank lines ignored | Pass `\n` + haiku + `\n`; assert `true` | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** Valid haiku returns `true` (runs in milliseconds)

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints
- MUST: Count syllables by vowel groups (a simple heuristic: count vowel sequences, subtract silent e at end)
- MUST: Split on `\n` to get lines
- MUST: Function exported from `src/arcade/haiku-validator.ts`
- MUST NOT: Touch any production code outside `src/arcade/`
- MUST NOT: Break existing tests

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/haiku-validator.ts` | New implementation |
| Create | `src/arcade/haiku-validator.test.ts` | New tests |

## Approach
For each line, count syllables using a vowel-group heuristic: match `[aeiouy]+` (case-insensitive), subtract 1 if the line ends with a silent "e". Trim whitespace and filter empty lines before counting. Rejected alternative: import a natural-language syllable library — adds a dependency, which is prohibited.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Extra whitespace between lines | Still counts as 3 lines |
| Mixed case input | Handled case-insensitively |
| Punctuation in words | Stripped or ignored before counting |
| Words with no vowels | Count as 0 syllables for that word |

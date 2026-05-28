# Haiku Validator — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 2 files / ~25 lines

---

## What

A `isHaiku(text: string): boolean` function that checks if a text has exactly 3 lines with syllable counts 5, 7, 5.

## Why

Tests multi-line string parsing and simple counting logic.

## Acceptance Criteria

- [ ] Returns `true` for a valid 5-7-5 haiku
- [ ] Returns `false` for wrong syllable counts
- [ ] Returns `false` for wrong number of lines
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Valid haiku | `isHaiku("An old silent pond...\nA frog jumps into the pond—\nSplash! Silence again.")` | unit |
| Wrong syllables | 5-7-6 returns false | unit |
| Too few lines | 2 lines returns false | unit |
| Too many lines | 4 lines returns false | unit |

**Execution order:** Red → green

**Smoke test:** Valid haiku test

## Constraints

- MUST: Count syllables by counting vowel groups (naive: `/[aeiouy]+/gi` per line)
- MUST: Split on `\n`
- MUST NOT: Use NLP libraries

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/haiku-validator.ts` | Function |
| Create | `src/arcade/haiku-validator.test.ts` | Tests |

## Approach

Split by newline. For each line, count vowel groups with regex. Check array is `[5, 7, 5]`.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty string | false |
| Extra whitespace | Trim lines before counting |

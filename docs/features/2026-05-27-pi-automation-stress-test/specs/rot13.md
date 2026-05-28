# ROT13 — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 2 files / ~15 lines

---

## What

A `rot13(text: string): string` function that applies the ROT13 cipher (Caesar shift of 13).

## Why

Tests character-by-character string transformation.

## Acceptance Criteria

- [ ] Correctly encodes/decodes alphabetic characters
- [ ] Leaves non-alphabetic characters unchanged
- [ ] Is self-inverse: `rot13(rot13(x)) === x`
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Basic encoding | `rot13("hello")` === "uryyb" | unit |
| Mixed case | `rot13("Hello")` === "Uryyb" | unit |
| Non-alpha preserved | `rot13("123 !")` === "123 !" | unit |
| Self-inverse | `rot13(rot13("abc"))` === "abc" | unit |

**Execution order:** Red → green

**Smoke test:** Basic encoding

## Constraints

- MUST: Handle both upper and lower case
- MUST NOT: Use external crypto libraries

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/rot13.ts` | Function |
| Create | `src/arcade/rot13.test.ts` | Tests |

## Approach

Map each char: if a–m or A–M, add 13; if n–z or N–Z, subtract 13; else unchanged.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty string | returns "" |
| Unicode letters | leave unchanged (only A-Z, a-z) |

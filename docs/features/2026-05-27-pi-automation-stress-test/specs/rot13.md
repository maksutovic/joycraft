# ROT13 — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 1 file / ~15 lines

---

## What
Implement a function `rot13(text: string): string` that encodes/decodes a string using the ROT13 Caesar cipher (shift letters by 13 places).

## Why
Without this, no cipher-based arcade modules can exist.

## Acceptance Criteria
- [ ] Lowercase letters are rotated by 13
- [ ] Uppercase letters are rotated by 13
- [ ] Non-alphabetic characters are unchanged
- [ ] Double-ROT13 returns the original string
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Lowercase rotation | `rot13("abc")` → `"nop"` | unit |
| Uppercase rotation | `rot13("ABC")` → `"NOP"` | unit |
| Non-alpha unchanged | `rot13("123 !")` → `"123 !"` | unit |
| Double-ROT13 identity | `rot13(rot13("Hello"))` → `"Hello"` | unit |
| Mixed string | `rot13("Hello, World!")` → expected result | unit |
| Empty string | `rot13("")` → `""` | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `rot13("abc") === "nop"` (runs in milliseconds)

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints
- MUST: Handle both `a-z` and `A-Z`
- MUST: Leave all other characters untouched
- MUST: Function exported from `src/arcade/rot13.ts`
- MUST NOT: Touch any production code outside `src/arcade/`
- MUST NOT: Break existing tests

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/rot13.ts` | New implementation |
| Create | `src/arcade/rot13.test.ts` | New tests |

## Approach
Iterate characters. For alphabetic chars, compute new char code: if in `a-m` or `A-M`, add 13; else subtract 13. Rejected alternative: `String.prototype.replace` with a regex and callback — concise but regex overhead is unnecessary for a simple shift.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Empty string | Returns empty string |
| String with no letters | Returns unchanged |
| `n` / `N` (the pivot) | Maps to `a` / `A` |
| Unicode beyond ASCII | Left unchanged |

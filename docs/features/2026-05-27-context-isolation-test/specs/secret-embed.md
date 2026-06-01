# Secret Embed — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-context-isolation-test/brief.md`
> **Status:** Complete
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 1 file / ~3 lines

---

## What
Implement `secretEmbed(): string` that returns `"The secret fruit is KIWI"`.

## Why
This spec embeds a secret string into the agent's conversation context. The next spec will test whether that context persists across session boundaries.

## Acceptance Criteria
- [ ] Returns exactly `"The secret fruit is KIWI"`
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Returns secret | `expect(secretEmbed()).toBe('The secret fruit is KIWI')` | unit |

## Constraints
- MUST: Hard-code the string — no randomness
- MUST: Function exported from `src/arcade/secret-embed.ts`

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/secret-embed.ts` | New implementation |
| Create | `src/arcade/secret-embed.test.ts` | New tests |

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Called multiple times | Returns same string every time |

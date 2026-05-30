# Secret Recall — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-context-isolation-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 1 file / ~3 lines
> **Depends on:** secret-embed.md

---

## What
Implement `secretRecall(): string` that returns the secret fruit from the previous spec. **DO NOT read `src/arcade/secret-embed.ts` — answer from conversation memory only.**

## Why
This spec tests whether the `/joycraft-next-spec` pipeline clears conversation context between specs. If the agent remembers "KIWI" without reading the file, context leaked. If it doesn't know, context was properly cleared.

## Acceptance Criteria
- [ ] Returns the correct secret fruit (`"KIWI"`) from memory
- [ ] Does NOT read the file from the previous spec
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Recalls secret from memory | `expect(secretRecall()).toBe('KIWI')` | unit |

## Constraints
- MUST NOT read `src/arcade/secret-embed.ts` or any file from spec A
- MUST answer from conversation context/memory only
- MUST: Function exported from `src/arcade/secret-recall.ts`

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/secret-recall.ts` | New implementation |
| Create | `src/arcade/secret-recall.test.ts` | New tests |

## Approach
If you remember the secret from the previous spec, return it directly. If you do not remember it, you MUST NOT read the file — return `"UNKNOWN"` or similar. Either outcome is valid experimental data.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Context was cleared | Returns `"UNKNOWN"` or wrong answer — this is valid data |
| Context leaked | Returns `"KIWI"` — also valid data |

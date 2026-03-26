# Harden Settings Merge — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-25-incremental-knowledge-capture.md`
> **Status:** Ready
> **Date:** 2026-03-25
> **Estimated scope:** 1 session / 3 files / ~60 lines

---

## What

Fix the `settings.json` merge logic in `init.ts` so that malformed JSON never causes existing config to be lost. Currently, if `settings.json` exists but is malformed, the catch block silently starts fresh — potentially losing the user's hooks, permissions, and other config.

## Why

Praful reported that after running `joycraft init`, Claude stopped using his existing tools correctly. While the merge logic is additive (append-only), the malformed-JSON fallback on line 124 of `init.ts` starts with an empty object, which means the subsequent write at line 143/167 overwrites the file with only Joycraft's config. Any existing hooks, permissions, or custom settings are lost.

## Acceptance Criteria

- [ ] If `settings.json` exists but is malformed JSON, init warns the user and does NOT overwrite
- [ ] If `settings.json` exists with valid JSON, all existing keys are preserved after merge
- [ ] New test: init with pre-existing `settings.json` containing custom hooks → custom hooks still present after init
- [ ] New test: init with malformed `settings.json` → warning emitted, file not modified
- [ ] New test: init with `settings.json` containing existing allow/deny rules → rules preserved, Joycraft rules appended
- [ ] Build passes
- [ ] All existing tests pass

## Constraints

- MUST NOT silently discard existing config under any circumstance
- MUST warn the user if their `settings.json` can't be parsed
- MUST preserve the original file content if parsing fails (don't write an empty/partial replacement)
- SHOULD suggest the user fix their settings.json manually if it's malformed

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/init.ts` | Fix catch blocks at lines ~124 and ~155 to warn instead of starting fresh |
| Modify | `tests/init.test.ts` | Add tests for malformed JSON, existing config preservation |

## Approach

Two changes in `init.ts`:

1. **Lines 119-125 (hook merge):** If `JSON.parse` fails, push a warning to `result.warnings` ("settings.json exists but is malformed — skipping hook registration. Fix the JSON and re-run init.") and `return` early from the settings merge — do NOT proceed with an empty object.

2. **Lines 150-156 (permissions merge):** Same pattern — if re-read fails, warn and skip permissions merge rather than using stale/empty object.

The key insight: it's better to skip Joycraft's additions than to risk losing the user's existing config. The user can re-run init after fixing their JSON.

Rejected alternative: Attempting to repair malformed JSON — too risky, could misinterpret the user's intent. Better to warn and skip.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| settings.json doesn't exist | Create normally (current behavior, no change needed) |
| settings.json is empty file | Treat as malformed, warn, skip |
| settings.json has valid JSON but unexpected structure | Merge normally — only add to hooks/permissions keys |
| settings.json has trailing comma (common JSON error) | Malformed — warn and skip |
| settings.json has BOM or encoding issues | Malformed — warn and skip |

---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-24
feature: 2026-09-23-opus-5-5-prompting
mode: checkpoint
---

# Swap the Old Profile Row on Update — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-23-opus-5-5-prompting/brief.md`
> **Status:** Ready
> **Date:** 2026-09-24
> **Estimated scope:** 1 session / 4 files / ~120 lines

---

## What

`npx joycraft update` replaces the old Fable 5.1 Context Map row in the selection's memory file (CLAUDE.md or AGENTS.md) with the new Claude-profile row, in place. The old row is this exact line, as shipped by 0.7.17:

```
| `docs/templates/reference/model-profile-claude-fable-5-1.md` | Working with Claude Fable 5.1 — finishing whole tasks, scope, progress updates, prose |
```

Rules for `insertModelProfilePointer` (`src/improve-claude-md.ts:314`):

1. A line that equals the old row exactly (ignoring only its line ending) and the file does **not** name the new path → replace that line with `MODEL_PROFILE_CONTEXT_MAP_ROW`, keeping the file's newline style.
2. A line that equals the old row exactly and the file **already** names the new path → delete that one line.
3. The file names the new path and has no exact old row → unchanged (today's early return).
4. The file names the old path but not as the exact row (hand-edited) → leave the file unchanged except for today's insert-if-missing behavior, and have `contextMapPointerPatch` (`src/update-inventory.ts:567`) push one diagnostic: `<memory file> still points at the retired Fable 5.1 model profile; update that line by hand.`
5. Neither path present → today's behavior (insert the new row).

Export the old row as `LEGACY_MODEL_PROFILE_CONTEXT_MAP_ROW` (and the old path as `LEGACY_MODEL_PROFILE_PATH`) from `src/model-profile.ts`. Update the D14 doc comments: the updater removes no row except the exact legacy profile row (decision D1).

Also prove the vendor-file retirement that already exists: an unmodified installed Fable doc tracked in the manifest is deleted by update, and an edited one is kept (orphan).

## Why

Without the swap, every existing install keeps a Context Map row that points at a deleted file, and gains a second row beside it.

## Acceptance Criteria

- [ ] Rules 1–5 above hold, with LF and CRLF files.
- [ ] Running the function twice gives the same output as running it once, for every rule.
- [ ] No byte outside the swapped or deleted line changes.
- [ ] Rule 4 produces exactly one diagnostic and no write for the old line.
- [ ] Integration: a temp project whose manifest tracks an unmodified `docs/templates/reference/model-profile-claude-fable-5-1.md` and whose memory file has the old row → after `update(root, { nonInteractive: true })`: the Fable doc is gone, `docs/templates/reference/model-profile-claude.md` exists, the row is swapped in place, and a second update reports no change to the memory file.
- [ ] Integration: same, but the Fable doc bytes are edited → the file is kept.
- [ ] Build passes; tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Rules 1–5, LF/CRLF | `tests/model-profile-pointer.test.ts`: one case per rule; CRLF variant of rules 1 and 2 | unit |
| Idempotent | Same file: apply twice, compare | unit |
| Other bytes unchanged | Diff input and output line by line; only the target line differs | unit |
| Rule 4 diagnostic | Call the inventory path that builds `contextMapPointerPatch` (see `tests/update-inventory.test.ts` for the entry point) and assert the diagnostic string | unit |
| Unmodified Fable doc deleted | New case in `tests/model-profile-pointer.test.ts` or `tests/update-inventory.test.ts`: fresh `update` into a temp dir, then add the Fable doc and a manifest entry for it built with the same helpers the manifest uses (`src/install-manifest.ts`), write the old row, run `update` again | integration |
| Edited Fable doc kept | Same setup, edit the doc bytes before the second update | integration |

**Execution order:**
1. Write all tests — red against the spec-1 tree.
2. Confirm the failures.
3. Implement until green.

**Smoke test:** `pnpm vitest run tests/model-profile-pointer.test.ts`

**Before implementing, verify your test harness:**
1. The rule tests must FAIL before the change
2. Tests call `insertModelProfilePointer` and `update` — not copies of their logic
3. The smoke test runs in seconds

## Constraints

- MUST: match the old row exactly; any other row is never removed (D14 still holds for everything else).
- MUST: keep the file's newline style and final-newline state.
- MUST: read the manifest-entry shape from `src/install-manifest.ts`; do not hand-roll hashes.
- MUST NOT: touch `AGENTS.md`, `CLAUDE.md`, or `docs/.joycraft/manifest.json` in this repo (spec 9).
- MUST NOT: change how the updater decides to delete or orphan vendor files; this spec only tests it.
- ASK FIRST boundary: this is CLAUDE.md merge logic. Decision D1 approves exactly rules 1–5; anything beyond them needs the human.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/model-profile.ts` | Legacy row and path exports |
| Modify | `src/improve-claude-md.ts` | Rules 1–5, doc comment |
| Modify | `src/update-inventory.ts` | Rule 4 diagnostic, doc comment |
| Modify | `tests/model-profile-pointer.test.ts` | Rule and integration cases |
| Modify | `tests/update-inventory.test.ts` | If the diagnostic or integration case fits better there |

## Approach

Scan `sourceLines(content)` for a line whose text equals the legacy row. Handle it before the existing `content.includes(MODEL_PROFILE_PATH)` early return, so rule 2 can run. Reuse `insertAfterLine`-style slicing to replace or drop exactly that line. For rule 4, `contextMapPointerPatch` checks `raw.includes(LEGACY_MODEL_PROFILE_PATH)` after the patch and pushes the diagnostic when the path survives.

Rejected alternative: rewrite every occurrence of the old path in the memory file. That edits user prose, which D14 and the ALWAYS/NEVER boundaries forbid.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Old row is the last line with no trailing newline | Replaced; the file stays unterminated |
| Old row appears twice | Rule 1 replaces the first; rule 2 then deletes the second on the same pass or the next run; result has one new row and no old row after at most two runs, and the second run of an already-clean file is a no-op |
| Old row sits outside `## Context Map` | Still an exact line match; swap it in place |
| Memory file absent | No write, no diagnostic (today's behavior) |
| Codex-only selection | No row logic runs (today's `selectsModelProfile` gate) |

---
status: todo
owner: Maximilian Maksutovic
created: 2026-05-31
feature: 2026-05-31-relocate-version-state
---

# Discoveries — version-state path has more readers than the spec listed

**Date:** 2026-05-31
**Spec:** `docs/features/2026-05-31-relocate-version-state/specs/relocate-version-state.md`

## Relocating the state file silently breaks three readers the Affected-Files table omitted
**Expected:** The spec's Affected Files table framed the change as `version.ts` (the writer/reader) + `init.ts`/`upgrade.ts` (callers) + tests. Read literally, that's the whole blast radius.
**Actual:** Three *other* sites read the old root path `.joycraft-version` directly, none in the table: `src/init-autofix.ts` (uses its existence as the "is-initialized" gate), `src/cli.ts` `check-version` (reads it for the installed version), and the `init`-generated `joycraft-version-check.mjs` hook (same, embedded as a string). Relocating the state turns all three into silent no-ops (their `existsSync`/`try-catch` swallow the now-missing file) — no crash, no test failure unless a test asserts the behavior, just a quietly dead feature.
**Impact:** The spec's own footnote — *"Re-grep at implement time (`grep -rln joycraft-version src tests`); do not trust this table as exhaustive"* — is what caught it. Lesson for future relocation/rename specs: **a path/constant is an implicit API; grep is the authoritative blast radius, not the hand-written Affected-Files table.** Fix applied: all three now read `STATE_PATH` with a `LEGACY_VERSION_FILE` fallback so un-upgraded projects don't regress. The generated hook embeds the path cross-platform via `STATE_PATH.split(/[\\/]/).join(...)`.

## `bundled-files.ts` hits were correctly left untouched
**Expected:** A blanket find-replace of `joycraft-version` might seem right.
**Actual:** `src/bundled-files.ts` also matches, but only inside skill *markdown bodies* (`joycraft-implement-level5.md` telling users "look for `.joycraft-version`"). Editing those is "ASK FIRST: changing skill content" per CLAUDE.md and out of scope for this spec.
**Impact:** Future cleanup could update that user-facing prose to point at the new location, but it's a separate, skill-content change — not a code correctness issue.

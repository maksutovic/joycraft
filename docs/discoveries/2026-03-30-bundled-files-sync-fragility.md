# Discoveries — Bundled Files Sync

**Date:** 2026-03-30
**Spec:** `docs/specs/2026-03-30-audit-instruction-budgets.md`

## bundled-files.ts requires manual sync after skill edits

**Expected:** Editing `src/skills/*.md` files would be sufficient — the build would pick up changes.

**Actual:** `src/bundled-files.ts` contains skill content as embedded template literals. Editing the `.md` files on disk has no effect on what gets installed — `bundled-files.ts` is the source of truth for the build. A manual sync step (node script to read `.md` files and replace template literals) is required after any skill content change.

**Impact:** Every skill edit requires a bundled-files sync. This is error-prone and easy to forget. A future spec should add a `prebuild` script that auto-generates `bundled-files.ts` from the `.md` files on disk, eliminating the manual step entirely.

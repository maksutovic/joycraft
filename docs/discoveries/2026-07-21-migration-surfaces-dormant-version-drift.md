---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
---

# Discoveries — state migration surfaces dormant version drift

**Date:** 2026-07-21
**Spec:** `docs/features/2026-07-21-living-harness/specs/create-harness-config.md`

## Moving state.json activated a silently-skipping test
**Expected:** Migrating `.claude/.joycraft/state.json` to `docs/.joycraft/state.json` would be behavior-neutral for the test suite.
**Actual:** `tests/version-sync.test.ts` had been silently skipping (no file at its `STATE_PATH`); the migration made it active, and it now fails on the preserved stale `version: 0.6.10` vs `package.json`'s `0.6.20`. The spec's own acceptance criterion required preserving the pre-move value, so the failure is the migration working as specified, not a regression.
**Impact:** The gitignored, machine-owned state file needs its version refreshed (what a real `joycraft upgrade` does) for the suite to go green; a test that never ran is a hidden liability when the file it watches starts existing.

---
status: todo
owner: Maximilian Maksutovic
created: 2026-08-11
feature: 2026-08-11-ste-human-output
---

# Discoveries — STE human output

**Date:** 2026-08-11
**Spec:** docs/features/2026-08-11-ste-human-output/specs/

## A doc that bans a word must be able to write the word
**Expected:** The fix-to-zero self-check applies to the style doc's full prose.
**Actual:** The doc quotes its own violations on purpose — the slop table, the banned-modal list, the Worked Example before-sample. The check works only with visible carve-outs: strip inline code spans, carve out the before-sample, the slop table, and quoted counter-examples. `tests/ste-lint.test.ts` holds the carve-out list in the extraction functions.
**Impact:** Any future lint of governed prose needs the same carve-outs. Keep them in the test, never in the linter — the linter stays vendored and unedited.

## Installed template copies are a manual cp, not part of sync-skills
**Expected:** `pnpm sync-skills` propagates `src/templates/` edits everywhere.
**Actual:** It regenerates `src/bundled-files.ts` (gitignored) but does NOT copy `src/templates/` into `docs/templates/`. The installed copy is a manual `cp`, and byte-parity tests (`tests/output-style-template.test.ts`, `tests/review-gate-template.test.ts`) are what catch the drift.
**Impact:** Template edits need the manual `cp` to `docs/templates/` in the same commit. Bundle parity rides on the checked-in installed copy.

## Two features can pin opposite test assertions on one file
**Expected:** Spec 4's AC "gate-contract.test.ts passes unchanged" holds.
**Actual:** Gate-contract group 7 (succinct-gates, 2026-07-29) pinned that no output-style citation sits under interview's playback heading — the exact citation D6 requires. The AC was unsatisfiable as written; the decompose used the test as a proxy for "caps unchanged" without seeing the placement pin.
**Impact:** Human-approved resolution: group 7 now permits a tone-only citation (one that keeps "volume and placement are fixed"), and style-pointer-placement's interview count went 2→3. When a spec claims a cross-feature test "passes unchanged", verify the test's assertions against the spec's edits at decompose time.

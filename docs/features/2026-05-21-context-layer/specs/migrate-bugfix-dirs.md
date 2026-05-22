---
status: shipped
owner: Maximilian Maksutovic
created: 2026-05-21
feature: context-layer
---

# Migrate Bugfix Dirs — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-21-context-layer/brief.md`
> **Status:** Complete
> **Date:** 2026-05-21
> **Estimated scope:** 1 session / ~2 files + tests / ~60 changed lines

---

## What
`npx joycraft upgrade` forcibly moves orphan spec directories `docs/specs/<area>/` → `docs/bugfixes/<area>/` as part of the existing forced migration — no interactive y/N gate. Today `migration.ts` classifies spec subdirs with no matching brief slug as `orphans.specsDirs` (`migration.ts:148-149`), and `upgrade.ts:134-140` prints them under "Left in place — area-level specs (e.g., bugfix areas)" and does NOT move them. This spec turns those orphans into planned `Move` entries: they are previewed under a "Migrating bugfix areas:" heading, applied through the same `applyMigration` path as the feature migration, with the existing skip-if-target-exists guard (never clobber an existing `docs/bugfixes/<area>/`) and the >50%-failure abort intact.

## Why
Without physically moving the directories, an upgraded project keeps its bugfixes at the now-deprecated `docs/specs/<area>/` while the shipped skills write new ones to `docs/bugfixes/<area>/` — splitting bugfixes across two locations.

## Acceptance Criteria
- [ ] Orphan spec dirs (`orphans.specsDirs`) are converted into planned `Move` entries targeting `docs/bugfixes/<area>/` instead of being "left in place."
- [ ] The migration is forced — no interactive confirmation prompt is added for these moves (matches the existing feature-migration UX; `askUser` is NOT invoked for them).
- [ ] If `docs/bugfixes/<area>/` already exists, that area's move is skipped (skip-if-target-exists guard preserved), not clobbered.
- [ ] The >50%-failure abort still triggers when more than half of planned moves fail.
- [ ] `printMigrationSummary`/banner output previews these moves under a clear "Migrating bugfix areas:" (or equivalent) heading, and the old "Left in place — area-level specs" string is removed/updated.
- [ ] `pnpm test --run && pnpm typecheck` pass, including new tests covering: a move happens, a skip happens when target exists, and the preview text appears.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Orphan dirs become planned moves | unit on the planner: given `docs/specs/auth/` with no matching brief, plan contains a `Move` to `docs/bugfixes/auth/` | unit (migration.test or new) |
| No interactive gate | the move applies in a non-interactive test run (no stdin) without hanging or prompting | integration |
| Skip-if-target-exists | seed both `docs/specs/auth/` and `docs/bugfixes/auth/`; assert the auth move is skipped and source left intact | integration |
| >50%-failure abort intact | simulate majority move failures; assert abort behavior unchanged | unit/integration (mirror existing abort test) |
| Preview text updated | capture summary output; assert "Migrating bugfix areas" present and "Left in place — area-level specs" absent | integration |
| Build green | `pnpm test --run && pnpm typecheck` | integration |

**Execution order:**
1. Write the planner unit test (orphan → Move) and the skip/preview integration tests — they FAIL (orphans are currently left in place).
2. Confirm red.
3. Reclassify orphans as moves, update preview strings, until green.

**Smoke test:** the planner unit test (orphan dir → `Move` to `docs/bugfixes/<area>/`) — runs in milliseconds, isolates the core behavior change from fs side effects.

**Before implementing, verify your test harness:**
1. Run the new tests — they must FAIL (current code leaves orphans in place, prints the old string).
2. Tests exercise the real `migration.ts` planner and `applyMigration`/upgrade flow, not a reimplementation; use temp dirs for fs assertions.
3. The planner unit test is the seconds-scale smoke test.

## Constraints
- MUST be forced (no y/N gate) — wire through the existing `runForcedMigration` path (`upgrade.ts:152-179`), do NOT introduce `askUser` for these moves (Decision 4 / design Section 4).
- MUST preserve the skip-if-target-exists guard (`migration.ts:183`) — never clobber an existing `docs/bugfixes/<area>/`.
- MUST preserve the >50%-failure abort (`upgrade.ts:163`).
- MUST reuse the existing `Move`/`MigrationPlan`/`applyMigration` structure and the `EXDEV` cross-device fallback in `moveFsItem` (`migration.ts:162-175`).
- MUST NOT change how feature-spec subdirs (those matching a brief slug) are migrated.

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Edit | `src/migration.ts` | classify `orphans.specsDirs` as `Move` entries to `docs/bugfixes/<area>/` (or expose them so upgrade adds the moves); keep skip-if-target-exists |
| Edit | `src/upgrade.ts` | stop printing "Left in place — area-level specs"; preview moves under "Migrating bugfix areas:"; ensure forced apply path includes them |
| Edit | `tests/upgrade.test.ts` (and/or a migration test) | add planner + skip + preview assertions |

## Approach
Decide where the orphan→move conversion lives: cleanest is to have the planner emit the bugfix moves directly (so `applyMigration` and the abort logic get them for free), and have `upgrade.ts` just relabel the preview. Verify whether `orphans.specsDirs` is consumed anywhere else before repurposing it; if it is, add a new `bugfixMoves` field rather than overloading the orphans bucket. Keep the change minimal — this is a reclassification plus a string change, riding existing apply/guard/abort machinery.

Rejected alternative: a y/N gate scoped to bugfix moves — mixed UX, extra stdin handling, unnecessary for this small known userbase (design Section 4, explicitly relaxes brief Decision 4's earlier "require gate" wording).

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| `docs/bugfixes/<area>/` already exists | Skip that area's move; leave source as-is (no clobber) |
| Cross-device move (EXDEV) | Existing `moveFsItem` fallback handles copy-then-delete |
| >50% of planned moves fail | Abort per existing logic; no partial-state surprise beyond what feature migration already does |
| A spec subdir matches a brief slug | Unchanged — still migrated into `docs/features/<slug>/specs/`, not treated as a bugfix area |
| No orphan spec dirs present | No bugfix moves planned; preview heading omitted or shows nothing to migrate |

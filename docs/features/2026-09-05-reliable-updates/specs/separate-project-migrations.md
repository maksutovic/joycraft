---
status: done
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
mode: checkpoint
---

# Separate Project Migrations — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Spec:** 8 of 15
> **Dependencies:** 7 — unify-update-command.md
> **Status:** Done
> **Date:** 2026-09-06
> **Estimated scope:** 1 session / 4 files / ~300 lines

---

## What

Move project-document reorganization into an explicit migration operation that plans and reports its work separately from routine bundle refresh, while using the safe update transaction boundary for any routine update writes.

## Why

Current upgrade behavior runs a forced flat-to-feature document migration and removes legacy skills during an ordinary update, widening a routine refresh into an unreviewed project reorganization.

## Acceptance Criteria

- [x] Routine refresh performs no implicit document reorganization and does not delete unowned generic legacy skills. [src: design §2]
- [x] Explicit migrations present their planned changes and preserve user files unless replacement was explicitly selected. [src: design §2]
- [x] Failures are reported as incomplete work rather than success based on a tolerated fraction of errors; routine updates continue to use the transaction boundary. [src: design §2]
- [x] CLAUDE.md merge/improve logic remains outside this work. [src: design §2]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Run routine update on a temporary project containing old flat documents and generic legacy skill names without verified ownership; assert no layout move or deletion occurs. | integration |
| AC2 | Call the exported migration planner and explicit apply path with user files, collisions, and explicit replacement selection; assert planned moves are presented and unselected user files are preserved. | integration |
| AC3 | Inject a migration failure and assert an incomplete outcome rather than a tolerated-success summary; run routine update and assert it calls the transaction boundary. | integration |
| AC4 | Run migration and routine-update regression cases with a customized `CLAUDE.md`; assert its bytes are unchanged and no improve/merge function is called. | integration |

**Execution order:**
1. Write tests against exported migration and update functions; they are expected to fail because current routine upgrade performs forced migration.
2. Run focused tests and confirm red results.
3. Implement to green, then run the existing suite and type check; existing tests must remain green.

**Smoke test:** AC1 routine-update preservation case.

**Before implementing, verify your test harness:**
1. Run all new tests before implementation and confirm failure.
2. Each test calls production migration/update functions against a real temporary filesystem, not a copied move algorithm.
3. Keep the smoke test under seconds for repeated feedback.

## Constraints

- MUST: Preserve user files, selections, unrelated config, and unknown state fields; missing state and `--yes` never grant blanket overwrite permission. [src: brief "Hard Constraints"]
- MUST: Use existing dependencies and Node facilities; do not add a runtime dependency without separate approval. [src: design §2]
- MUST: Keep shipped paths project-relative and honor the external validation boundary. [src: brief "Hard Constraints"]
- MUST: Use meaningful production-function tests and run the required build/test/type checks; never defer a red suite to a final sync step. [src: brief "Test Strategy"]
- MUST NOT: Treat `--yes`, missing state, or a matching legacy name as blanket authorization to overwrite local content. [src: brief "Hard Constraints"]
- MUST NOT: Change unrelated templates, skills, or CLAUDE.md merge/improve logic. [src: brief "Out of Scope"]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `src/migration.ts` | Keep pure migration planning, add explicit selection/reporting semantics, and return complete/incomplete results. |
| Modify | `src/update.ts` | Ensure routine refresh skips migration and invokes explicit migration only when requested. |
| Modify | `src/cli.ts` | Expose the deliberate migration entry and report its planned/incomplete outcomes. |
| Add | `tests/migration.test.ts` | Add production migration planning/application, preservation, and injected-failure coverage. |
| Modify | `tests/update-cli.test.ts` | Assert routine update does not reorganize documents and continues through the transaction boundary. |

## Approach

Retain the existing plan-then-apply migration shape, but put it behind an explicit user-selected command or option in the unified update surface. Classify each move by verified ownership and collision state, present the resulting plan, and make errors explicit rather than accepting a partial success threshold. Remove forced migration and generic legacy cleanup from the routine update path, which remains responsible only for the reviewed transaction plan. Reject the alternative of silently retaining forced migration behind `--yes`, since safe unattended flags cannot authorize document reorganization.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Legacy flat docs collide with existing feature documents | Report the collision and preserve both until explicit replacement is selected. |
| Generic directory has a legacy-looking name but unknown ownership | Leave it untouched during routine refresh and explicit migration unless ownership is established. |
| One selected move fails | Report incomplete work with applied/skipped/error detail; do not claim success. |
| No migration candidates exist | Return a successful no-op plan without touching documents. |
| Existing `CLAUDE.md` contains user text | Migration leaves it byte-for-byte unchanged. |

## Implementation Evidence

- Explicit `migrate` previews the same selected plan that `--apply` executes. Unowned directories and collisions remain preserved without their separate explicit selections.
- Migration errors report incomplete work; interrupted replacement content and original destination backups remain available with recovery paths. Routine updates do not invoke document migration or CLAUDE.md improvement.
- Focused migration, safety, legacy, and real CLI tests: 31 passing. Compiled-CLI smoke also preserved an unowned generic skill, flat documents, and customized policy bytes during routine update.
- Exact staged checkout: build passed, 3,187 tests passed (one skipped), and type checking passed.

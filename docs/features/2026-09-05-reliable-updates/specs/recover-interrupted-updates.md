---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
mode: isolated
---

# Recover Interrupted Updates — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Spec:** 6 of 15
> **Dependencies:** 5 — plan-safe-updates.md
> **Status:** Ready
> **Date:** 2026-09-06
> **Estimated scope:** 1 session / 3 files / ~500 lines

---

## What

Add a transaction layer that applies a reviewed update plan under a project lock, journals recoverable operations and preimages, validates staged writes, publishes the manifest last, and provides guarded recovery and rollback.

## Why

Managed updates currently write files independently, so an interruption or competing updater can leave a project in an unexplained partially updated state.

## Acceptance Criteria

- [ ] `applyUpdatePlan` atomically acquires a project lock; validates paths and outside-root symlink traversal; rechecks raw preconditions; stages and validates writes before publishing the manifest last. [src: design §2]
- [ ] The journal stores the complete plan and preimages before mutation; recovery uses manifest digests even after a crash between manifest rename and journal bookkeeping. [src: design §2]
- [ ] An old unchanged manifest causes rollback of incomplete writes; a matching new manifest causes verification and cleanup of the committed update. [src: design §2]
- [ ] Intervening user edits stop recovery/rollback with backups intact; another process lock is not silently removed. [src: design §2]
- [ ] The retained last successful backup supports explicit guarded rollback; tests inject filesystem failures and interruptions at transaction phases. [src: design §2]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Apply a real plan in a temporary project; assert atomic lock acquisition, rejected traversal/outside-root symlink path, raw-precondition recheck, staged validation, and manifest publication after file writes. | integration |
| AC2 | Inject failure after each journal/write/manifest phase; inspect the real journal and preimages, then recover the project including the manifest-rename-before-bookkeeping interval. | integration |
| AC3 | Seed interrupted transactions with respectively unchanged old and matching new manifests; call exported recovery and assert rollback versus verify-and-cleanup behavior. | integration |
| AC4 | Modify a planned file after interruption and hold a second process lock; assert recovery stops, leaves backup material intact, and never removes the other lock. | integration |
| AC5 | Inject filesystem failures at transaction phases, retain a successful backup, call explicit rollback with matching and mismatching preconditions, and assert guarded restoration only for the match. | integration |

**Execution order:**
1. Write injected-failure and competing-process tests against the exported transaction functions; they are expected to fail because the transaction layer does not exist.
2. Run focused tests and confirm red results.
3. Implement to green, then run the existing suite and type check; existing tests must remain green.

**Smoke test:** AC3 recovery of an unchanged old manifest.

**Before implementing, verify your test harness:**
1. Run all new transaction tests and confirm failure before implementation.
2. Each test calls the exported transaction/recovery functions against a temporary filesystem, never a test-local simulation of journal behavior.
3. Keep the smoke test under seconds and use it on each transaction change.

## Constraints

- MUST: Preserve user files, selections, unrelated config, and unknown state fields; missing state and `--yes` never grant blanket overwrite permission. [src: brief "Hard Constraints"]
- MUST: Use existing dependencies and Node facilities; do not add a runtime dependency without separate approval. [src: design §2]
- MUST: Keep shipped paths project-relative and honor the external validation boundary. [src: brief "Hard Constraints"]
- MUST: Use meaningful production-function tests and run the required build/test/type checks; never defer a red suite to a final sync step. [src: brief "Test Strategy"]
- MUST NOT: Perform a destructive Git operation, publish, promote a tag, or merge as part of this work. [src: brief "Hard Constraints"]
- MUST NOT: Change unrelated templates, skills, or CLAUDE.md merge/improve logic. [src: brief "Out of Scope"]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Add | `src/update-transaction.ts` | Export plan application, recovery, and guarded rollback using local lock, journal, staging, and backup paths. |
| Modify | `src/install-manifest.ts` | Provide manifest read/write and digest boundary needed to publish the manifest last and classify recovery. |
| Add | `tests/update-transaction.test.ts` | Exercise exported production transaction functions with real temporary filesystems, injected failures, and competing processes. |

## Approach

Persist a complete journal and preimages before the first mutation, stage writes on the target filesystem, then validate and rename them while retaining raw precondition evidence. Treat the manifest digest as the authoritative commit marker, publish it last, and use it during restart to distinguish rollback from committed-state cleanup. Keep locks, journals, and backups under the local Joycraft state area. Reject the alternative of best-effort reverse writes without a journal because it cannot safely distinguish a crash from an intervening user edit.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Lock exists for another updater | Return attention-needed outcome and leave the lock untouched. |
| A symlink points outside the project | Reject the planned path before staging or writing. |
| Process stops after manifest rename | Recover using manifest digest, verify committed bytes, then clean known residue. |
| Disk failure occurs after one staged write | Retain journal/preimages and restore only unchanged paths. |
| Explicit rollback encounters edited current bytes | Stop with backup and conflict information intact. |

---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
mode: checkpoint
---

# Reconcile Update Status — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Spec:** 2 of 15
> **Dependencies:** 1 — preserve-customization-baselines.md
> **Status:** Ready
> **Date:** 2026-09-06
> **Estimated scope:** 1 session / 4 files / ~160 lines

---

## What

Make update outcomes explicit and reconcile installed-version metadata even when every managed file already matches, while establishing the documented exit-status contract for the command boundary.

## Why

The current `changes.length === 0` early return in `upgrade()` leaves a stale recorded version, and its summary/prompt behavior cannot distinguish a preserved local-only edit from an unresolved vendor conflict.

## Acceptance Criteria

- [ ] Identical content with an older version stamp reconciles metadata without rewriting the files. [src: design §2]
- [ ] Applied/no-op, invalid/failure, unresolved conflict, and lock/recovery attention map to exits 0, 1, 2, and 3; later transaction integration supplies the lock/recovery producer. [src: design §2]
- [ ] Preserved local-only edits are distinct from pending vendor changes; no terminal prompt waits for input in unattended mode. [src: design §2]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Version-only reconciliation | Add an `upgrade()` temporary-filesystem test that changes only the persisted installed version, snapshots managed-file bytes/mtimes as appropriate, runs `upgrade()`, and asserts current package version is persisted with no managed-file rewrite. | integration |
| Exit-status mapping | Add focused production-boundary tests for the result/status-to-CLI mapping in `src/cli.ts` (or its extracted status helper): applied/no-op → 0, invalid/failure → 1, unresolved conflict → 2, recovery/lock attention → 3. Cover lock/recovery as input states until spec 6 creates them. | unit |
| Distinct preserved and pending outcomes/no TTY prompt | Add `upgrade()` tests with a local-only customization and with a vendor conflict under non-TTY/`--yes` execution; assert structured/printed outcomes differ and the noninteractive path completes without invoking `askUser()`. | integration |

**Execution order:**
1. Add the version-only, outcome-mapping, and noninteractive regressions and confirm the version-only test fails on current code.
2. Run the focused tests red.
3. Implement reconciliation/status mapping until all focused tests pass.

**Smoke test:** version-only `upgrade()` reconciliation on a temporary project.

**Before implementing, verify your test harness:**
1. Run all new focused tests — they must fail before the production change.
2. Exercise `upgrade()` and the command status boundary, never a test-only status reimplementation.
3. Keep the smoke test runnable in seconds.

## Constraints

- MUST: Preserve user files, selections, unrelated config, and unknown state fields; missing state and `--yes` never grant blanket overwrite permission. [src: brief "Hard Constraints"]
- MUST: Map applied/no-op, invalid/failure, unresolved conflict, and lock/recovery attention to exits 0, 1, 2, and 3 respectively. [src: design §2]
- MUST: Keep unattended operation non-blocking and distinguish preserved local-only edits from pending vendor changes. [src: design §2]
- MUST: Use existing dependencies and Node facilities; do not add a runtime dependency without separate approval. [src: design §2]
- MUST: Use meaningful production-function tests and run the required build/test/type checks; never defer a red suite to a final sync step. [src: brief "Test Strategy"]
- MUST NOT: Change unrelated templates, skills, or CLAUDE.md merge/improve logic. [src: brief "Out of Scope"]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `src/upgrade.ts` | Reconcile state on no-op and return explicit outcome information. |
| Modify | `src/version.ts` | Persist reconciled version/status metadata compatibly with preserved unknown fields. |
| Modify | `src/cli.ts` | Translate update outcomes to the documented process exit codes. |
| Modify | `tests/upgrade.test.ts` | Add version-only and unattended outcome regressions. |
| Modify | `tests/version.test.ts` | Verify reconciled metadata persistence. |

## Approach

Return structured outcome data from the update boundary and let the CLI own process exit assignment. Before the no-change return, reconcile version and relevant metadata without touching content. Classify a customization whose target has not changed as preserved-local-only, and a diverged target as a conflict. Rejected alternative: retain a single "already up to date" path, because it reports a stale version and conceals pending work.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| All managed bytes match but the recorded version is old | Persist the executing bundle version with no content rewrite. |
| No state is available | Report unsupported/invalid status through the safe public boundary; do not overwrite files. |
| `--yes` or non-TTY execution sees a customization | Preserve it and return the appropriate noninteractive outcome without a readline prompt. |
| Later transaction reports a held lock | CLI maps the supplied attention result to exit 3 without this spec implementing locking. |

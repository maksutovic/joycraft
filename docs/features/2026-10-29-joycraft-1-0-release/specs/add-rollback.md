---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 15
phase: 4
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Add Rollback — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 14
> **Date:** 2026-10-29
> **Estimated scope:** Small–medium
> **Phase:** 4 — Release vehicle
> **Where:** this repo, branch `release/1.0`

## What

`joycraft rollback [<timestamp>]` restores a migration backup byte for byte and removes the 1.0 files listed in the manifest. It prints a dry run first and needs `--yes` to apply.

## Why

Users should be able to try 1.0 without risk.

## Acceptance Criteria

- [ ] **AC1:** Migrate, then roll back: the tree hash equals the pre-migration hash, except for `.joycraft-backups/`, which is kept.
- [ ] **AC2:** With no `--yes`, nothing changes.
- [ ] **AC3:** Files edited after the migration are reported and kept unless `--force`.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Round-trip on each fixture. | Integration |
| AC2 | Tree hash. | Unit |
| AC3 | Edit after the migration, then roll back. | Integration |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT delete the backup.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Add | `src/rollback.ts` | Rollback |
| Modify | `src/cli.ts` | Command |

## Approach

Read the migration journal written by spec 14.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Several backups | List them; the newest is the default. |

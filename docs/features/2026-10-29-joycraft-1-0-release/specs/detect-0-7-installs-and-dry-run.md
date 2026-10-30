---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 13
phase: 4
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Detect 0.7 Installs and Show a Dry Run — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 12
> **Date:** 2026-10-29
> **Estimated scope:** Small–medium
> **Phase:** 4 — Release vehicle
> **Where:** this repo, branch `release/1.0`

## What

When `update` finds a 0.7 install (`docs/.joycraft/manifest.json`, 0.7 skill trees, or the 0.7 version-check hook) and `--migrate` is not passed, it prints the migration plan: files to archive, customized files found, files kept, files to install. Then it exits 1 with the command to migrate, the command to stay (`npx joycraft@0.7.17 update`) and a link to the migration guide.

## Why

When 1.0 is `latest`, every 0.7 user who runs `npx joycraft@latest update` runs the 1.0 CLI. Nothing may change without consent.

## Acceptance Criteria

- [ ] **AC1:** A 0.7.8, a 0.7.10, a 0.7.15 and a 0.7.17 fixture each get a dry run, exit 1, and no file changes (checked with a tree hash).
- [ ] **AC2:** The plan lists customized files by path.
- [ ] **AC3:** The messages name all three choices: migrate, stay, read the guide.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Tree hash before and after, per fixture. | Integration |
| AC2 | Fixture with one edited skill. | Integration |
| AC3 | Snapshot of the output. | Unit |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT write anything, including state or cache, without `--migrate`.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Add | `src/legacy-07.ts` | Detection + plan |
| Modify | `src/update.ts` | Guard |

## Approach

Reuse `stable-inventory.json` from the prototype, moved into `src/data/`. Spec 14 adds the npm tarball hashes later; until then, a file not in the git inventory counts as customized.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Partial 0.7 install (one harness only) | Detected; the plan covers only what exists. |

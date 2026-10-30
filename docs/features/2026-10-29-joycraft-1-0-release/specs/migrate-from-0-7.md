---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: isolated
local_id: 14
phase: 4
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Migrate From 0.7 — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 13
> **Date:** 2026-10-29
> **Estimated scope:** Large
> **Phase:** 4 — Release vehicle
> **Where:** this repo, branch `release/1.0`

## What

`update --migrate` archives the known 0.7 files to `.joycraft-backups/<timestamp>/`, keeps the customized files and asks keep-or-archive for each one (with `--keep-custom` and `--archive-custom` for non-interactive use), installs 1.0, and writes the manifest last, in one recoverable transaction. Extend the stable inventory with SHA-256 hashes from every published 0.7.x npm tarball, not only git history. Carry the project knowledge over: AGENTS.md and CLAUDE.md content, `docs/context/`, `docs/features/`, the decision log, the execution profile and `docs/.joycraft/local/replaced/`.

## Why

D1's condition: a safe, documented upgrade path for existing users.

## Acceptance Criteria

- [ ] **AC1:** Migration is clean on the 0.7.8, 0.7.10, 0.7.15 and 0.7.17 fixtures and on 2 real clones taken before the field install (G10).
- [ ] **AC2:** A customized skill survives: kept in place or archived, as chosen, and never lost.
- [ ] **AC3:** Known 0.7 files are moved (never deleted, never `git rm`), and `.joycraft-backups/` is added to `.gitignore`.
- [ ] **AC4:** 0.7 spec queues and frontmatter statuses are either converted to the 1.0 format or marked read-only history, as stated in the migration guide. Both outcomes are tested.
- [ ] **AC5:** An interrupted migration recovers to the pre-migration tree.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Fixture matrix + 2 clones; doctor passes. | Integration |
| AC2 | Edited skill, both choices. | Integration |
| AC3 | Tree diff: every removed path exists under the backups. | Integration |
| AC4 | Fixture with a 0.7 feature queue. | Integration |
| AC5 | Kill the process after half the moves, then re-run. | Integration |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT touch files with unknown bytes without a choice.
- MUST NOT edit user prose in AGENTS.md or CLAUDE.md beyond the 1.0 managed blocks.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Add | `src/migrate-07.ts` | Migration |
| Add | `scripts/build-tarball-inventory.mjs` | Hashes from npm tarballs |
| Add | `src/data/stable-inventory.json` | Inventory |
| Add | `tests/migrate-07.test.ts` | AC1–AC5 |

## Approach

Port `retire-stable.mjs` into TypeScript behind the transaction module.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Project on 0.6 or older | Refuse and point to `npx joycraft@0.7.17 update` first. |

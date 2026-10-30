---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: isolated
local_id: 10
phase: 3
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Rename the Install Directory to .joycraft — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 3, spec 4, spec 7, spec 8, spec 9
> **Date:** 2026-10-29
> **Estimated scope:** Medium; about 106 files reference the old path
> **Phase:** 3 — Rename
> **Where:** `joycraft-prototype` `field/1.0`

## What

Move the installed bundle from `.joycraft-prototype/` to `.joycraft/`. Bundle files go to `.joycraft/` (runtime, references, contracts, templates, assets). The existing runtime state stays in `.joycraft/local/` (gitignored), next to `state.json` and `preferences.json`. Update every reference in the skills, hooks, scripts, docs and tests. Field sync migrates the two field projects once, with a backup.

## Why

D3. A public package should not ship a directory named `prototype` into every user's repo.

## Acceptance Criteria

- [ ] **AC1:** `git grep .joycraft-prototype` finds only migration code, its tests and the CHANGELOG.
- [ ] **AC2:** The exporter installs into `.joycraft/` and never overwrites `.joycraft/local/`, `state.json` or `preferences.json`.
- [ ] **AC3:** Field sync moves an existing `.joycraft-prototype/` install to `.joycraft/`, rewrites hook and settings paths, keeps a backup, and is idempotent.
- [ ] **AC4:** agent-markets and private-schools are migrated, and one implement → review cycle passes in each afterwards.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | grep check in CI. | Unit |
| AC2 | Export over a fixture with `.joycraft/local` state; the state is byte-identical. | Integration |
| AC3 | Migrate a fixture twice; the second run changes nothing. | Integration |
| AC4 | Live cycle in each field project. | Live |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT touch 0.7's `docs/.joycraft/` (spec 14 owns it).
- MUST NOT break the field capture hooks (`joycraft-field` joins on paths).

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `all files referencing .joycraft-prototype` | Rename |
| Modify | `scripts/field-sync.mjs` | One-time move |
| Modify | `joycraft-field/bin/*` | Path joins |

## Approach

Do it in one mechanical commit with a codemod, then a second commit for the migration logic.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Both directories exist | Refuse and list both; never merge silently. |

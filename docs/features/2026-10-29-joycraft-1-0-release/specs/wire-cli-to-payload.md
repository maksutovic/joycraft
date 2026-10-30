---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: isolated
local_id: 12
phase: 4
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Wire the CLI to the Payload — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 11
> **Date:** 2026-10-29
> **Estimated scope:** Medium–large
> **Phase:** 4 — Release vehicle
> **Where:** this repo, branch `release/1.0`

## What

`joycraft init` and `joycraft update` install the payload for the selected hosts (the interactive multi-select of all six, or `--harness`), with Jev hooks off. They write a 1.0 install manifest last, inside the existing transaction (`src/update-transaction.ts`). The 0.7 skill generation path is retired for 1.0 installs.

## Why

A colleague must get the field build from `npx joycraft@latest init`.

## Acceptance Criteria

- [ ] **AC1:** `init` on an empty fixture of each stack type (Node, Python, Rust, Go) installs the payload for the chosen hosts, and `doctor` passes.
- [ ] **AC2:** `update` on a 1.0 install changes only files whose bytes match an earlier payload manifest, and backs up edited Joycraft-owned files (the 0.7.17 keep-and-replace rule).
- [ ] **AC3:** Host selection is persisted and reused.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Init per stack fixture, then doctor. | Integration |
| AC2 | Edit a skill, update, check the backup and the new bytes. | Integration |
| AC3 | Second update without flags reuses the hosts. | Unit |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST keep `CLAUDE.md`, `AGENTS.md`, settings and `deny-patterns.txt` user-owned.
- No new runtime dependencies.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `src/update.ts, src/update-plan.ts, src/init.ts, src/install-manifest.ts` | Payload install |
| Add | `src/payload.ts` | Read PIN + manifest |

## Approach

Treat the payload as a new bundle source behind the existing planner, so the transaction and recovery code are reused.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Interrupted install | The existing recovery restores the previous state. |

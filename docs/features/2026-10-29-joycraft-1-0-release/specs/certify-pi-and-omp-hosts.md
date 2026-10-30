---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 8
phase: 2
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Certify the Pi and OMP Hosts — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 6
> **Date:** 2026-10-29
> **Estimated scope:** Medium
> **Phase:** 2 — Host support
> **Where:** `joycraft-prototype` `field/1.0`

## What

Make Pi and OMP pass the smoke harness live. This includes an independent reviewer: run the reviewer as a separate `pi -p` (or `omp`) process with only the review packet, because the in-process adapter cannot create an isolated reviewer.

## Why

harnesses.md says that Pi has no Joycraft-created isolated reviewer and that OMP has stub-event fixtures only.

## Acceptance Criteria

- [ ] **AC1:** The Pi and OMP extensions receive live tool events in the smoke run, and the evidence records them.
- [ ] **AC2:** The reviewer runs as a separate process with a distinct session id, and the spec reaches done only after its verdict.
- [ ] **AC3:** Both hosts pass the smoke harness, and the evidence is committed.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1–AC3 | Live smoke on each host. | Live |
| AC2 | Unit test of the reviewer process launcher with a fake CLI. | Unit |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT claim isolation when the reviewer runs in the same process.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `.pi/extensions/joycraft-jev-hooks.ts → rename to joycraft-hooks.ts` | Live events, no Jev |
| Modify | `.omp/extensions/…` | Same |
| Add | `.joycraft-prototype/runtime/review-process.mjs` | Separate-process reviewer |

## Approach

Reuse the process-loop pattern verified in the Pi pivot (single-shot `pi -p` per spec gives isolation through the process boundary).

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Pi version without an extension API change | Pin the minimum version in the docs. |

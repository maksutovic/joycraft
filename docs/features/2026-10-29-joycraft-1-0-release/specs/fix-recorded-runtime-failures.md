---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 3
phase: 1
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Fix Recorded Runtime Failures — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 2
> **Date:** 2026-10-29
> **Estimated scope:** Medium; depends on the evidence
> **Phase:** 1 — Gate fixes
> **Where:** `joycraft-prototype` `field/1.0`

## What

After at least 2 field days with spec 2 installed, fix each `error`-class runtime failure, starting with `scope-bound` (17 since `field-1`) and `dispatch-start` (7 runtime and about 8 reviewer-start failures). Each fixed cause gets a regression test.

## Why

G4 requires at most 1 harness failure per 10 specs, and week 2 no worse than week 1. Week 1 was about 64 failures over 123 specs.

## Acceptance Criteria

- [ ] **AC1:** Each distinct `error` signature in `failures.jsonl` from the collection window is either fixed with a regression test that reproduces it, or documented in the spec report as an external cause with evidence.
- [ ] **AC2:** Reviewer dispatch-start failures since `field-1` have a root cause and a fix. A reviewer start that fails is retried once, then reported with detail. It never fails silently.
- [ ] **AC3:** `refusal`-class records are counted, but they are not "fixed" by weakening the check.
- [ ] **AC4:** `## Decision needed` (D6): ask Max whether `refusal` records count as G4 harness failures. Until he decides, the digest reports both counts.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | One regression test per fixed signature, built from the recorded stderr and arguments. | Unit/Integration |
| AC2 | Simulate a transient dispatch-start failure; assert one retry, then a detailed report. | Integration |
| AC3 | Existing refusal tests stay green and unchanged. | Unit |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT loosen evidence or scope checks to reduce the failure count.
- MUST NOT change GATES.md.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `.joycraft-prototype/runtime/scope-bound*.mjs, dispatch*.mjs` | Fixes, chosen by the evidence |
| Add | `tests/runtime-failures-*.test.mjs` | Regression tests |

## Approach

Group the records by signature. Fix the largest group first. Re-run the field for 2 days and confirm a downward trend in the digest.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| No new failures in the window | Close with the evidence. Do not invent fixes. |

---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 7
phase: 2
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Certify the Codex and Claude Hosts — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 6
> **Date:** 2026-10-29
> **Estimated scope:** Small
> **Phase:** 2 — Host support
> **Where:** `joycraft-prototype` `field/1.0`

## What

Run the smoke harness on Codex and Claude Code, fix what fails, and commit the evidence files.

## Why

These are the two hosts with native hooks and existing coverage. They set the baseline for the other four.

## Acceptance Criteria

- [ ] **AC1:** Both hosts pass the smoke harness, and the evidence is committed under `docs/host-evidence/`.
- [ ] **AC2:** Any fix has a regression test.
- [ ] **AC3:** `docs/harnesses.md` evidence column links the evidence files.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Live smoke on each host. | Live |
| AC2 | Regression tests for fixes. | Unit |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST record the host CLI version.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Add | `docs/host-evidence/codex.json, claude.json` | Evidence |
| Modify | `docs/harnesses.md` | Links |

## Approach

Run, fix, re-run.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Host update mid-run | Record both versions; re-run on the newer one. |

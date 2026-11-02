---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 9
phase: 2
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Certify the Copilot CLI and OpenCode Hosts — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 6
> **Date:** 2026-10-29
> **Estimated scope:** Medium
> **Phase:** 2 — Host support
> **Where:** `joycraft-prototype` `field/1.0`

## What

Make GitHub Copilot CLI and OpenCode pass the smoke harness live. Copilot: verify `.github/hooks/joycraft.json` against a live run, with the reviewer in a distinct context. OpenCode: replace the portable fallback with a project plugin that maps its tool-execution events to the Joycraft hook runtime, if OpenCode's plugin API supports it. If not, document the fallback as the supported mode, with the limits listed.

## Why

Both hosts have fixtures only (Copilot) or no native hooks (OpenCode).

## Acceptance Criteria

- [ ] **AC1:** Copilot passes the smoke harness, with hook events recorded.
- [ ] **AC2:** OpenCode passes the smoke harness, with native events or with the documented fallback; the evidence file states which.
- [ ] **AC3:** The README host matrix shows the exact mode for each host.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1–AC2 | Live smoke. | Live |
| AC2 | Plugin unit tests with stub events, if a plugin is built. | Unit |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST check the current host documentation before building; do not rely on memory of the APIs.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `.github/hooks/joycraft.json generator` | Live-verified |
| Add | `.opencode/plugin/joycraft.(ts|js) generator` | If supported |

## Approach

Read the host docs first, then build the thinnest adapter.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Host requires repository trust | Mark `needs-trust` in the evidence and in the install docs. |

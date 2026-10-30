---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: isolated
local_id: 6
phase: 2
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Build the Live Host Smoke Harness — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 1
> **Date:** 2026-10-29
> **Estimated scope:** Medium; harness + fixture
> **Phase:** 2 — Host support
> **Where:** `joycraft-prototype` `field/1.0`

## What

A script, `scripts/host-smoke.mjs --host <name>`, that installs the bundle into a throwaway copy of a small fixture project, runs the host CLI non-interactively through entry → one tiny spec → implement → a separate reviewer → done, and writes an evidence file: host version, hook events observed, reviewer context id, test result and elapsed time.

## Why

D2 requires a live run for every host. Today only Codex and Claude have live coverage. Pi has an offline load smoke; OMP, Copilot and OpenCode have fixtures only.

## Acceptance Criteria

- [ ] **AC1:** With `--host claude`, the harness completes on a real Claude Code install and records at least one PreToolUse event and one independent reviewer context.
- [ ] **AC2:** The evidence file has a fixed schema, and a missing host CLI ends with status `skipped` and the reason, never `pass`.
- [ ] **AC3:** Each run uses a fresh temp directory and never touches the user's global config.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Run live on Claude; check the evidence file. | Live, manual gate |
| AC2 | Run with a missing CLI → skipped. | Unit |
| AC3 | Assert no writes outside the temp directory (filesystem diff). | Integration |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT use API keys; it uses the host's own subscription login.
- MUST NOT publish evidence outside the repo.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Add | `scripts/host-smoke.mjs` | Harness |
| Add | `fixtures/host-smoke/` | Tiny project with one spec |
| Add | `docs/host-evidence/README.md` | Evidence schema |

## Approach

One adapter per host for the non-interactive command line (`claude -p`, `codex exec`, `pi -p`, and so on). Assert on hook-written stamps, not on model text.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Host prompts for trust | Pre-seed the trust in the temp config if the host supports it; otherwise mark `needs-trust` and stop. |

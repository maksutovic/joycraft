---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 4
phase: 1
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Guard Foreground Wait Loops — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 1
> **Date:** 2026-10-29
> **Estimated scope:** Small–medium; hook + tests per host
> **Phase:** 1 — Gate fixes
> **Where:** `joycraft-prototype` `field/1.0`

## What

Add a pre-tool hook that blocks foreground shell wait loops (`until … sleep`, `while … sleep`, `timeout N bash -c "until …"`, `for … sleep` with N ≥ 120 or no bound). The block message tells the agent to use the host's background mechanism (for example Claude Code `run_in_background` plus Monitor, or a Codex background task) and to stop and report after 5 minutes on a busy lock.

## Why

G5 any-long-wait is 18% of implementer runs (limit 15%). Most of the 120 non-runner long waits are foreground `until grep …` loops on project logs, which the field-1 instruction rule did not stop.

## Acceptance Criteria

- [ ] **AC1:** The hook blocks the loop shapes above, with exit 2 and the guidance message, on each host that has pre-tool hooks (Claude, Codex, Copilot, Pi, OMP, and OpenCode once spec 9 lands).
- [ ] **AC2:** Short bounded waits (total under 120 s, for example `sleep 5`) and commands that are not loops pass.
- [ ] **AC3:** Users can turn it off per project with one line in `.joycraft/local/preferences.json`, and the setting is documented.
- [ ] **AC4:** A replay of the 130 long-wait commands since `field-1` in `waits.cmd` shows that at least 90% of the `poll` and `other` loop shapes are blocked and no `runner` test command is blocked.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Table test of 20 loop strings (from the ledger, anonymized) → exit 2. | Unit |
| AC2 | Table test of 20 allowed commands → exit 0. | Unit |
| AC3 | Preference off → every case exits 0. | Unit |
| AC4 | Replay script over an exported `waits` fixture; assert the block rate and zero runner blocks. | Integration |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT block background commands that the host marks as background.
- MUST stay under 20 ms per call.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Add | `.joycraft-prototype/hooks/wait-guard.mjs` | Matcher + message |
| Modify | `scripts/install-hooks.mjs` | Register per host |
| Add | `tests/wait-guard.test.mjs` | AC1–AC4 |

## Approach

Use a regex matcher on the command string with a small parser for `timeout N` and `sleep N`. Share it with the deny-pattern hook infrastructure from spec 1.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Loop inside a script file | Not detected. The background-wait rule in the skill still applies; report this as a limit. |
| Heredoc containing the word until | No block unless the loop shape matches. |

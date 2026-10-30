---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 2
phase: 1
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Record Runtime Failure Detail — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready
> **Date:** 2026-10-29
> **Estimated scope:** Small–medium; 4–6 files
> **Phase:** 1 — Gate fixes
> **Where:** `joycraft-prototype` `field/1.0` and `joycraft-field`

## What

When a Joycraft runtime command fails (`joycraft:scope-bound`, `dispatch-start`, `dispatch-preflight`, `joycraft:accept`, `joycraft:snapshot`), write a failure record with the command name, arguments, exit code, the last 40 lines of stderr, the spec id and a classification: `refusal` (a by-design stop such as "Dispatch stopped: …") or `error`. The field ingest reads these records into `flags.detail`.

## Why

Most of the 45 runtime-failure flags since `field-1` say only "error" or "exit N". The causes cannot be fixed without this detail. The nightly digest already asked for it on Oct 19.

## Acceptance Criteria

- [ ] **AC1:** Each listed runtime command writes one JSON line to `.joycraft/local/failures.jsonl` on a non-zero exit, with the fields above.
- [ ] **AC2:** Each "Dispatch stopped: …" exit is classified `refusal`; any other non-zero exit is classified `error`.
- [ ] **AC3:** `bin/ingest.py` stores the command, classification and stderr excerpt in the flag detail, and the digest groups by command and classification.
- [ ] **AC4:** No record is written on success, and a failure to write the record never changes the command's own exit code.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Force each command to fail in a fixture; assert one record with all fields. | Unit |
| AC2 | Feed a known refusal message and a thrown error; assert the classification. | Unit |
| AC3 | Ingest a fixture `failures.jsonl`; assert the flag detail and the digest grouping. | Unit, Python |
| AC4 | Make the log path read-only; the command's exit code is unchanged. | Unit |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT log environment variables or file contents beyond the stderr excerpt.
- MUST keep the record local (gitignored).

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `.joycraft-prototype/runtime/*.mjs (the listed commands)` | Shared failure recorder |
| Add | `.joycraft-prototype/runtime/failure-record.mjs` | Recorder |
| Modify | `joycraft-field/bin/ingest.py` | Read records |
| Modify | `joycraft-field/bin/digest.py` | Group by command and classification |

## Approach

Add one wrapper around each command's entry point. Write the record in a `finally` path that catches its own errors.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Command killed by a signal | Record exit 128+N with an empty stderr excerpt. |
| Very long stderr | Keep only the last 40 lines. |

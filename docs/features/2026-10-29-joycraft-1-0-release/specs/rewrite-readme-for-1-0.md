---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 18
phase: 5
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Rewrite the README for 1.0 — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 12
> **Date:** 2026-10-29
> **Estimated scope:** Medium
> **Phase:** 5 — Docs
> **Where:** this repo, branch `release/1.0`

## What

Rewrite `README.md`. Cover: what Joycraft is now (the core loop: entry → context → decompose → implement → independent review → session end), install in one command, the first 10 minutes, the six-host matrix with each host's evidence mode, an "Upgrading from 0.7" box near the top, and the honest status of each host and feature.

## Why

Colleagues start from the README. The current one describes 0.7.

## Acceptance Criteria

- [ ] **AC1:** The README states only what the payload and the host evidence support. Each claim maps to a file or an evidence entry.
- [ ] **AC2:** The install and upgrade commands in it are run, as written, against the packed tarball in CI or the release gates.
- [ ] **AC3:** No Jev, no `prototype`, no absolute paths.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC2 | Extract the code blocks and run them in the release-gates job. | CI |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- Human-readable and decision-first; long detail goes to `docs/`.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `README.md` | Rewrite |

## Approach

Draft from the prototype docs (`start.md`, `harnesses.md`, `distribution.md`), cut to what a newcomer needs.

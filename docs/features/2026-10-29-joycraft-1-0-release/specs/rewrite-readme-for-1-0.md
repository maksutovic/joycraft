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
> **Status:** Ready after spec 12, spec 21, spec 22
> **Date:** 2026-10-29
> **Estimated scope:** Medium
> **Phase:** 5 — Docs
> **Where:** this repo, branch `release/1.0`

## What

Rewrite `README.md`. Cover: what Joycraft is now (the core loop: entry → context → decompose → implement → independent review → session end), install in one command, the first 10 minutes, the six-host matrix with each host's evidence mode, an "Upgrading from 0.7" box near the top, and the honest status of each host and feature.

## Why

Colleagues start from the README. The current one describes 0.7.

## Acceptance Criteria

- [ ] **AC1:** The top of the README is a single **paste-this-into-your-agent** install prompt. The user never types an npm command. The agent runs `npx joycraft@latest init` itself (with `--plan --json` first), shows the plan, asks the user for the choices, applies, then runs first-use setup (spec 22 for a new project) and the review-loop setup (spec 21). A manual command section exists further down for people who want it.
- [ ] **AC2:** The README states only what the payload and the host evidence support. Each claim maps to a file or an evidence entry.
- [ ] **AC3:** The install and upgrade commands in it are run, as written, against the packed tarball in CI or the release gates.
- [ ] **AC4:** No Jev, no `prototype`, no absolute paths.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Live: paste the prompt into each certified host on an empty folder and on a 0.7 fixture; the agent completes the install without the user typing a command. | Live |
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

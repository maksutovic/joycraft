---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 16
phase: 4
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Release Gate Tests in CI — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 14, spec 15
> **Date:** 2026-10-29
> **Estimated scope:** Small–medium
> **Phase:** 4 — Release vehicle
> **Where:** this repo, branch `release/1.0`

## What

A CI job on `release/1.0` that runs the G10 checks: `test.yml` green, the migrate and rollback fixture matrix, the customized-skill fixture, the payload G11 grep, and `npm pack` plus `npx <tarball> init` in a clean container for each stack type.

## Why

G10 must be green before Max merges to `main`.

## Acceptance Criteria

- [ ] **AC1:** The job fails on any G10 failure, with the failing check named.
- [ ] **AC2:** It runs from the packed tarball, not from the source tree.
- [ ] **AC3:** The job result is linked in the release PR.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Break one fixture on purpose; the job fails. | CI |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT publish.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Add | `.github/workflows/release-gates.yml` | Job |
| Add | `scripts/release-gates.mjs` | Checks |

## Approach

Reuse `scripts/release-verification.mjs` for the tarball consumer checks.

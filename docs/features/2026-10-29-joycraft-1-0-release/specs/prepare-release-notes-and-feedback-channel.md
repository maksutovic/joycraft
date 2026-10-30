---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 20
phase: 5
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Prepare the Release Notes and the Feedback Channel — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 16, spec 18, spec 19, spec 23
> **Date:** 2026-10-29
> **Estimated scope:** Small
> **Phase:** 5 — Docs
> **Where:** this repo, branch `release/1.0`

## What

Write the CHANGELOG 1.0.0 entry with a Breaking section, a GitHub issue template "1.0 feedback" (host, version, what happened, transcript excerpt optional), and the colleague message: new-project install, 0.7 migrate, how to stay, how to send feedback. Open the release PR `release/1.0` → `main` for Max.

## Why

Feedback from real use is the reason for releasing now.

## Acceptance Criteria

- [ ] **AC1:** The CHANGELOG entry satisfies `scripts/check-docs-sync.mjs`.
- [ ] **AC2:** The issue template renders on GitHub.
- [ ] **AC3:** The release PR links the G10 job, the PIN, the host evidence and the gate numbers. It is not merged (Max merges).

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Docs-sync check. | CI |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT merge or publish.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `CHANGELOG.md` | 1.0.0 |
| Add | `.github/ISSUE_TEMPLATE/1-0-feedback.yml` | Template |
| Add | `docs/announcements/1.0.md` | Colleague message |

## Approach

Last step before Max's review.

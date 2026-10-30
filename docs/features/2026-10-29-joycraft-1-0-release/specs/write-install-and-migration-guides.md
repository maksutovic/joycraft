---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 19
phase: 5
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Write the Install and Migration Guides and Paste Prompts — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 14, spec 15, spec 21
> **Date:** 2026-10-29
> **Estimated scope:** Medium
> **Phase:** 5 — Docs
> **Where:** this repo, branch `release/1.0`

## What

Add `docs/install.md` (new project, per-host setup and trust steps, uninstall), `docs/migrating-from-0.7.md` (what changes, what stays, the dry run, `--migrate`, customized files, backups, rollback, how to stay on 0.7), and `docs/prompts.md` with three paste-to-agent prompts: install, upgrade from 0.7, and send feedback.

## Why

D1's condition: existing users must know exactly what the upgrade does.

## Acceptance Criteria

- [ ] **AC1:** Every command in the guides is run in the release-gates job.
- [ ] **AC2:** Each prompt tells the agent to run the dry run first and to report before applying.
- [ ] **AC3:** The install guide and the install and upgrade prompts include the review-loop setup step from spec 21: the agent detects the project type, lists the verification tools the review loop needs, shows what is present and missing, and asks before installing anything.
- [ ] **AC4:** The migration guide's "what stays" list matches spec 14's carry-over list exactly.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Code-block extraction in CI. | CI |
| AC3 | Review checklist. | Manual |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- Prompts MUST NOT ask for API keys or tell the agent to publish or commit.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Add | `docs/install.md` | Guide |
| Add | `docs/migrating-from-0.7.md` | Guide |
| Add | `docs/prompts.md` | Paste prompts |

## Approach

Write after specs 14 and 15 so the text matches the real behavior.

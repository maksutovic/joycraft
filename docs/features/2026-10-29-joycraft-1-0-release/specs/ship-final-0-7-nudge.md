---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 17
phase: 4
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Ship the Final 0.7 Update Notice — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 13
> **Date:** 2026-10-29
> **Estimated scope:** Small
> **Phase:** 4 — Release vehicle
> **Where:** this repo, from `main` (0.7.18)

## What

Release 0.7.18. Its version-check notice says that 1.0 is a migration, not an update, and links the migration guide. It never auto-applies a major version, even with the `auto-safe` policy. The 1.0 release descriptor sets `autoSafeEligible: false`.

## Why

0.7 users see a "new version available" notice. For a major version, that notice must not suggest a silent update.

## Acceptance Criteria

- [ ] **AC1:** With 1.0 as `latest`, the 0.7.18 checker shows the migration notice.
- [ ] **AC2:** `auto-safe` never applies a different major version (unit test against `compareStableVersions`).
- [ ] **AC3:** Merging this to `main` publishes 0.7.18. This step needs Max's approval (ASK FIRST).

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Stub the registry with latest=1.0.0. | Unit |
| AC2 | Eligibility test across a major-version boundary. | Unit |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST stub `fetch` in the tests (the live-registry lesson from 2026-06-11).

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `src/update-check.ts, src/auto-safe-update.ts` | Major-version notice |
| Modify | `CHANGELOG.md` | 0.7.18 |

## Approach

Ship before 1.0, so 0.7 users have the notice when 1.0 lands.

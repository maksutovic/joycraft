---
status: in-review
owner: Eval Fixture
created: 2026-07-20
feature: eval-fixture-b-done-widget-export
mode: checkpoint
---

# Add CSV Export — Atomic Spec (EVAL FIXTURE — DO NOT IMPLEMENT)

> **Parent Brief:** `docs/features/2026-07-21-living-harness/evals-fixtures/fixture-b-done-feature/brief.md`
> **Status:** Ready
> **Date:** 2026-07-20
> **Estimated scope:** fixture only — not a real spec

## What

Add a CSV export button to the widget list view, serializing the current list to
`widgets.csv` via a client-side download.

## Why

Users currently have to screenshot the widget list to share it.

## Acceptance Criteria

- [ ] Export button renders on the widget list view [src: brief "What"]
- [ ] CSV format is the default per D1 [src: D1]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Export button renders | fixture-only, not executed | unit |
| CSV default | fixture-only, not executed | unit |

**Execution order:** fixture only — this spec is never actually implemented; it exists so the fixture feature has a realistic queue entry for the session-end graduation eval.

**Smoke test:** n/a (fixture).

**Before implementing, verify your test harness:** n/a (fixture — this spec must never actually be implemented).

## Constraints

- MUST NOT: this spec is a fixture; do not implement it for real [src: INVENTED]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| N/A | N/A | fixture only |

## Approach

Fixture only — no real implementation.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| N/A | fixture only |

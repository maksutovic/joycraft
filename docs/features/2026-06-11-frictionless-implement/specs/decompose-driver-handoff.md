---
status: done
owner: Maximilian Maksutovic
created: 2026-06-11
feature: 2026-06-11-frictionless-implement
mode: batch
---

# Decompose Driver Handoff — Atomic Spec

> **Parent Brief:** `docs/features/2026-06-11-frictionless-implement/brief.md`
> **Status:** Ready
> **Date:** 2026-06-11
> **Estimated scope:** 1 session / 3 files / ~30 lines of skill text

---

## What

`joycraft-decompose`'s hand-off recommends the whole-queue driver (`joycraft-implement-feature docs/features/<slug>/`) as the primary next step, with per-spec `joycraft-implement` as the manual alternative. The specs README template's wave plan gains a parallel-safety marker per wave (derived from disjoint Affected Files across the wave's specs), so the README + queue JSON together are a complete run plan: exact order, dependencies, and what may run in parallel.

## Why

Decompose already writes the queue and wave plan, but its hand-off sends the user into the per-spec manual flow; and waves say "parallel" without saying whether parallel is *safe*.

## Acceptance Criteria

- [ ] All three decompose variants' hand-off blocks recommend `joycraft-implement-feature` first (harness vocabulary respected), `joycraft-implement` as the alternative
- [ ] README template's "Execution waves" section includes a parallel-safety note per wave, with the rule stated: parallel-safe = the wave's specs' Affected Files tables are disjoint
- [ ] "How to use this file" section mentions both the driver and the per-spec flow
- [ ] Build passes, tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Handoff updated ×3 | grep variants for `implement-feature` in the handoff block | content |
| Template updated ×3 | grep for parallel-safe in the README template | content |

**Smoke test:** `pnpm vitest run tests/codex-skill-parity.test.ts`

## Constraints

- MUST keep the existing queue JSON schema unchanged (consumers: Pi scripts, implement Step 1)
- MUST keep the brief-vs-README audience split (reviewers vs implementers)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/claude-skills/joycraft-decompose.md` | handoff + README template |
| Modify | `src/codex-skills/joycraft-decompose.md` | handoff + README template |
| Modify | `src/pi-skills/joycraft-decompose.md` | handoff + README template |

## Approach

Template-only changes; the parallel-safety rule lives in prose the decomposing agent applies when it writes each feature's README. Rejected alternative: a machine-checked `parallel_safe` field in the queue JSON — premature until the driver actually consumes it; the README note serves humans and the driver's opt-in check today without a schema change.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Wave with one spec | No parallel-safety note needed ("sequential") |
| Specs with overlapping Affected Files in the same wave | Wave marked NOT parallel-safe with the overlapping files named |

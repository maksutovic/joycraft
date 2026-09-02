---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
mode: batch
---

# Add Positioning README — Atomic Spec

> **Parent Brief:** `docs/research/2026-08-30-curated-harness-brief.md` (design: `docs/features/2026-08-30-curated-harness/design.md`)
> **Status:** Ready
> **Date:** 2026-09-01
> **Estimated scope:** 1 session / 1 file / ~40 lines

---

## What

README.md gains (1) the positioning stance — Joycraft is a "curated harness, not a memory system": everything it writes is in-repo, reviewed, and reaped, with the Reaper as the differentiator — and (2) an Acknowledgments section crediting the thinking that shaped this direction.

## Why

The anti-memory discourse is favorable ground for Joycraft, but only if the README states the stance plainly and credits its sources.

## Acceptance Criteria

- [ ] README states the "curated harness, not a memory system" stance: in-repo, reviewed, reaped [src: brief "5. Positioning + acknowledgments"]
- [ ] An Acknowledgments section credits: Mario Zechner (Pi) & Armin Ronacher — "code is truth", minimal-harness; Theo Browne — the memory audit and directional AGENTS.md practice; Lauren (Cursor) — the intervention-elimination hierarchy; Robert C. Martin — values-not-disciplines [src: brief "5. Positioning + acknowledgments"]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Stance present | grep README for the stance phrase | manual |
| All five credits present | grep README for the four credit lines (five names) | manual |
| Suite unaffected | `pnpm test && pnpm typecheck` green | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

(For this doc-only spec, "red" is the greps finding nothing before the edit.)

**Smoke test:** the stance grep.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: frame the auto-memory relationship as "a Joycraft project supersedes it", not "memory bad" [src: brief "6. Recommend disabling"]
- MUST: keep attribution accurate per the brief's attribution note [src: brief "Attribution note"]
- MUST NOT: include methodology research or personal notes in the tool's README [src: brief "Non-goals" / AGENTS.md NEVER]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `README.md` | Stance paragraph near the top; Acknowledgments section near the bottom |

## Approach

Two short additions: a stance paragraph in the existing what-is-Joycraft framing, and a five-name Acknowledgments list. This spec rides any release PR (design §2 sequencing) — implement it on whichever branch releases next rather than as its own PR. Rejected alternative: a standalone docs PR — process overhead for 40 lines the design says should ride a release.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| README restructured before this lands | Place by role (intro stance, footer credits), not by line number |

---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-24
feature: 2026-09-23-opus-5-5-prompting
mode: checkpoint
---

# Cite the Unattended Block in the Queue Loops — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-23-opus-5-5-prompting/brief.md`
> **Status:** Ready
> **Date:** 2026-09-24
> **Estimated scope:** 1 session / 2 skill files + regen / ~20 lines

---

## What

The two skills that drive a spec queue without a human answering cite the `Keep Working in Unattended Runs` block of `docs/templates/reference/model-profile-claude.md`, next to their existing `Finish the Whole Task` citations. Each citation also names the stops that stay wanted.

- `src/skills/joycraft-implement-feature.md`: in the claude variant block (the `<!-- harness:claude -->` region that holds Steps 1–4) and in the `<!-- harness:codex|copilot|omp -->` region that drives the queue inline, add one sentence where the queue loop starts (Step 2 intro) and extend the Step 4 citation line. The sentence says: while the queue runs, follow the "Keep Working in Unattended Runs" block; a finished spec is not a place to report and stop; the stops that stay are fail-fast (Step 3), a spec whose execution mode pauses for approval, and an ask-first boundary. Do not add it to the `<!-- harness:pi -->` region; the Pi loop gets the instruction from its script (spec 5).
- `src/skills/joycraft-implement.md`: extend the existing citation line above `### 6a. Per-spec wrap-up` (today it cites only "Finish the Whole Task") to cite both blocks.

Cite by path plus heading in double quotes, the pattern `tests/model-profile-citations.test.ts` parses. Never copy block prose.

## Why

Decision D3: the human must not type "continue" while an autonomous queue runs, and Opus 5.5 can end a turn between specs with a progress note.

## Acceptance Criteria

- [ ] implement-feature's claude variant and its codex|copilot|omp variant cite "Keep Working in Unattended Runs" in the queue loop, with the three wanted stops named. [src: D3]
- [ ] implement's continue-the-queue citation names both "Finish the Whole Task" and "Keep Working in Unattended Runs". [src: brief "Decomposition"]
- [ ] `joycraft-interview`, `joycraft-new-feature`, `joycraft-decide`, `joycraft-design`, and `joycraft-decompose` (source and generated variants) do not contain "Keep Working in Unattended Runs". [src: D3]
- [ ] Generated variants and installed trees are regenerated in the same commit. [src: brief "Hard Constraints"]
- [ ] Build passes; tests pass. [src: brief "Success Criteria"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| implement-feature cites the block | `tests/model-profile-citations.test.ts`: new case reading `src/claude-skills/joycraft-implement-feature.md` and `src/omp-skills/joycraft-implement-feature.md` for the heading on a line that also carries the profile path | unit |
| Wanted stops named | Same test: the citing paragraph mentions "fail-fast" and "ask-first" | unit |
| implement cites both | New case on `src/claude-skills/joycraft-implement.md` | unit |
| Gate skills never cite it | New case: for the five gate skills, source and every generated variant, assert the heading string is absent | unit |
| Pi variant untouched | Assert `src/pi-skills/joycraft-implement-feature.md` does not contain the heading | unit |

**Execution order:**
1. Write the tests — red.
2. Confirm.
3. Edit the two source skills, run `pnpm sync-skills`, until green.

**Smoke test:** `pnpm vitest run tests/model-profile-citations.test.ts`

**Before implementing, verify your test harness:**
1. The new tests must FAIL first
2. They read generated variants, not only sources
3. Seconds to run

## Constraints

- MUST: run `pnpm sync-skills` and commit generated variants and the installed trees in the same commit. [src: brief "Hard Constraints"]
- MUST: keep existing citations; add, do not replace. [src: brief "Decomposition"]
- MUST NOT: cite the block from any gate skill (D3). [src: D3]
- MUST NOT: change loop behavior, fail-fast rules, or execution-mode pauses; this is a citation only. [src: brief "Hard Constraints"]
- ASK FIRST boundary: skill content. The approved brief (D3) names this change. [src: D3]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-implement-feature.md` | Two harness regions |
| Modify | `src/skills/joycraft-implement.md` | Citation line before 6a |
| Regenerate | `src/*-skills/`, `src/bundled-files.ts`, installed trees | `pnpm sync-skills` |
| Modify | `tests/model-profile-citations.test.ts` | New cases |

## Approach

Two small text edits plus regeneration. Put the new sentence at the top of implement-feature's Step 2 list so it frames the whole loop.

Rejected alternative: cite the block in session-end too. Session-end runs once at the end and hands back to the human for push and PR, so it is not an unattended loop.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| A Fable 5.1 user runs implement-feature | The block's `Applies to: Opus 5.5` tag tells the model to skip it; Finish the Whole Task still applies |
| Codex generated variant carries the citation | Allowed; the doc is absent on Codex and the existing citations already reach it |

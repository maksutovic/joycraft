---
status: todo
owner: Maximilian Maksutovic
created: 2026-06-14
feature: 2026-06-11-single-source-skills
mode: batch
---

# Brief Reconciliation Step — Atomic Spec

> **Parent Brief:** `docs/features/2026-06-11-single-source-skills/brief.md`
> **Status:** Ready
> **Date:** 2026-06-14
> **Estimated scope:** 1 session / 2 canonical files / ~30 lines added to each

---

## What

Add a "Reconcile brief with findings" step to both `/joycraft-design` and `/joycraft-research` skills. After the skill writes its primary artifact (`design.md` or `research.md`), it must re-read the parent brief (`docs/features/<slug>/brief.md`) and check whether the new findings invalidate or refine any of: **Vision, Hard Constraints, Out of Scope, Decomposition, Test Strategy, Success Criteria**. The step then either edits the brief in place (for trivial refinements) or presents a diff and STOPS for user approval (for non-trivial changes).

Lives in canonical `src/skills/joycraft-design.md` and `src/skills/joycraft-research.md` (which exist after spec 4 lands).

## Why

This very feature surfaced the gap: the brief drifted from the design until the user explicitly asked "is brief in lockstep with design?" Without a reconciliation step in the skills, the gap recurs silently every time research or design produces new constraints or scope changes. Closing it inside the skills (not just human discipline) means the next feature can't fail the same way.

## Acceptance Criteria

- [ ] `src/skills/joycraft-design.md` contains a new step (after the design.md write step) titled e.g. "Reconcile design with brief" that:
  - Tells the skill to re-read `docs/features/<slug>/brief.md`.
  - Tells it to check each of {Vision, Hard Constraints, Out of Scope, Decomposition, Test Strategy, Success Criteria} for invalidation or refinement.
  - Tells it to either edit the brief in place (for trivial refinements like a single hard-constraint addition) or present a diff and STOP for user approval (for non-trivial scope/decomposition changes).
- [ ] `src/skills/joycraft-research.md` contains the same step (after the research.md write step), wording adapted to research findings.
- [ ] Both regenerate cleanly via `pnpm build`; per-harness variants (`src/<harness>-skills/joycraft-design.md` and `joycraft-research.md`) pick up the new step.
- [ ] All sync tests pass.
- [ ] `pnpm test --run && pnpm typecheck` pass.
- [ ] Manual smoke: read `src/claude-skills/joycraft-design.md` post-regen; the new reconciliation step is present and reads coherently.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Reconciliation step present in canonical design | `grep "Reconcile" src/skills/joycraft-design.md` returns ≥1 line | manual |
| Reconciliation step present in canonical research | same for research | manual |
| Per-harness variants include the step | After `pnpm build`, grep all three `src/<harness>-skills/joycraft-design.md` and `joycraft-research.md` for "Reconcile" | manual |
| Step enumerates the 6 brief sections | `grep -E "Vision\|Hard Constraints\|Out of Scope\|Decomposition\|Test Strategy\|Success Criteria"` in canonical design + research returns all six | manual |
| Step tells skill to STOP for non-trivial changes | grep canonical for "STOP" or "stop" in the reconciliation step's body | manual |
| Sync tests pass | `pnpm test --run tests/bundled-files-sync.test.ts tests/generate-bundled-files.test.ts` | integration |
| No regression | `pnpm test --run && pnpm typecheck` pass | integration |

**Execution order:**
1. Read current `src/skills/joycraft-design.md` and `src/skills/joycraft-research.md` (post-spec-4).
2. Draft the reconciliation step text (one canonical version, reused with minor wording adaptation in the other skill).
3. Insert at the appropriate point in each skill (after the artifact is written, before the handoff/recommendation).
4. Run `pnpm build`; verify per-harness output.
5. Run full test suite.

**Smoke test:** `pnpm build && pnpm test --run tests/bundled-files-sync.test.ts`.

**Before implementing, verify your test harness:**
1. Spec 4 has landed — `src/skills/joycraft-design.md` and `src/skills/joycraft-research.md` exist.
2. The new step doesn't change skill *behavior* in a way the existing parity tests would flag — it's pure prose addition.
3. Wording matches the brief's success criterion verbatim where possible ("Vision / Hard Constraints / Out of Scope / Decomposition / Test Strategy / Success Criteria").

## Constraints

- MUST: list all six brief sections (Vision, Hard Constraints, Out of Scope, Decomposition, Test Strategy, Success Criteria) by name in the step body.
- MUST: differentiate "trivial refinement → edit in place" from "non-trivial change → present diff and STOP for user approval".
- MUST: live in canonical `src/skills/` files (this spec runs after migration is complete).
- MUST NOT: introduce a new template variable or conditional block — the step is harness-agnostic prose.
- MUST NOT: add a programmatic "diff" generator (this is instruction to the skill-running agent, not a script).
- MUST NOT: turn this into a multi-step phase. One named step, clearly worded.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `src/skills/joycraft-design.md` | Insert "Reconcile design with brief" step after the design.md write step. |
| Modify | `src/skills/joycraft-research.md` | Insert equivalent step (wording adapted to research findings) after the research.md write step. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-design.md` | Regenerated by `pnpm build`. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-research.md` | Regenerated by `pnpm build`. |
| Modify | `src/bundled-files.ts` | Regenerated. |

## Approach

**Step body (single canonical version, lightly adapted between design and research):**

```markdown
## Step N: Reconcile {design,research} with brief

After writing {design.md / research.md}, re-read `docs/features/<slug>/brief.md`.
For each of the following brief sections, ask: do the new findings invalidate or
refine it?

- **Vision** — does the new finding change what the feature *is*?
- **Hard Constraints** — did the {design/research} surface a new MUST or MUST NOT?
- **Out of Scope** — did something move into or out of scope?
- **Decomposition** — does the spec table need rows added/removed/resized?
- **Test Strategy** — did a new test type or harness need surface?
- **Success Criteria** — should any criterion be added, removed, or tightened?

For trivial refinements (e.g. adding one MUST to Hard Constraints, fixing a
spec name), edit the brief in place and note the edit in your handoff.

For non-trivial changes (scope shift, decomposition restructure, new spec, new
success criterion), present a diff of the proposed brief change and **STOP for
user approval** before continuing the handoff. Do not silently leave the brief
out of sync.
```

**Insertion point:**
- `joycraft-design.md`: after the design.md is written and before the handoff/recommendation step.
- `joycraft-research.md`: after the research.md is written and before the handoff/recommendation step.

**Rejected alternative:** make this a separate skill (`/joycraft-reconcile`). Adds another step the human must remember; embedding it in the existing skills means it happens by default.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| The skill is invoked without a parent brief | No reconciliation needed — the step has no brief to reconcile against. The step body should note "if no parent brief exists, skip this step." |
| The brief is the same file as the {design/research} (no separate brief, inline feature) | Skip — there's nothing to reconcile. |
| The user objects to any in-place brief edit | Honor the objection. Skill should not insist; present the diff and let the user decide. |
| Multiple findings invalidate multiple sections | Present them all at once in one diff; don't fragment into per-section approvals. |
| New finding contradicts an existing brief assertion (rather than refining) | Treat as non-trivial — STOP for user approval. Conflict resolution is a human decision. |

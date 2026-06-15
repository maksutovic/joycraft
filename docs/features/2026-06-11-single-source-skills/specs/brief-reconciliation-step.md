---
status: done
owner: Maximilian Maksutovic
created: 2026-06-14
feature: 2026-06-11-single-source-skills
mode: batch
---

# Brief Reconciliation Step — Atomic Spec

> **Parent Brief:** `docs/features/2026-06-11-single-source-skills/brief.md`
> **Status:** Ready
> **Date:** 2026-06-14
> **Estimated scope:** <1 session / 2 canonical skills edited, 6 per-harness files regenerated / ~80 new lines

---

## What

Add a **"Reconcile brief with findings"** step to the canonical `joycraft-design` and `joycraft-research` skills (`src/skills/joycraft-design.md` and `src/skills/joycraft-research.md` — these will exist after spec 5 lands). The step instructs the skill, immediately after writing its output artifact (design.md or research.md), to re-read the parent brief and check each of these sections for invalidation or refinement:

- Vision
- Hard Constraints
- Out of Scope
- Decomposition
- Test Strategy
- Success Criteria

For each: either **edit the brief in place** (small, mechanical updates — clarifications, line-number corrections, additions consistent with brief intent) or **present a diff and stop for user approval** (non-trivial changes — counts flipping, decomposition restructure, scope changes).

The step lives ONCE in each canonical file. The generator emits per-harness variants normally.

## Why

This is the exact silent-drift gap that caused the spec 3 re-decomposition for THIS feature: the brief said "11 clean / 9 dirty"; the research.md re-audit (after spec 3's POC failed) said "2 clean / 18 dirty + pervasive Cat D drift"; the brief stayed out of sync until the user manually noticed and forced a re-decomposition. Without this step, future briefs will keep drifting from their research/design artifacts — and downstream decompositions will be sized against the stale brief, repeating the same failure mode.

By baking reconciliation into the design + research skills themselves, the loop closes: any future design or research session leaves the brief consistent with its own findings, or surfaces the inconsistency to the user before continuing.

## Acceptance Criteria

- [ ] `src/skills/joycraft-design.md` contains a "Reconcile brief with findings" step, positioned after the design.md is written and before final hand-off.
- [ ] `src/skills/joycraft-research.md` contains the same step, positioned after research.md is written and before final hand-off.
- [ ] In both skills, the step enumerates the 6 brief sections to check (Vision, Hard Constraints, Out of Scope, Decomposition, Test Strategy, Success Criteria) and gives explicit "edit in place" vs "diff + stop" criteria.
- [ ] The step references THIS feature's brief drift incident as the canonical example (one-line, motivational).
- [ ] `pnpm build` regenerates `src/{claude,codex,pi}-skills/joycraft-design.md` and `src/{claude,codex,pi}-skills/joycraft-research.md` to include the new step (it's universal — outside any conditional block).
- [ ] All existing sync tests pass.
- [ ] Residue assertions pass.
- [ ] `pnpm test --run && pnpm typecheck` pass.
- [ ] Bundle regeneration commit: `src/skills/joycraft-{design,research}.md`, 6 per-harness files, and `src/bundled-files.ts` all in the same commit.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Step exists in canonical design skill | `git grep -n 'Reconcile brief with findings' src/skills/joycraft-design.md` matches | scripted grep |
| Step exists in canonical research skill | `git grep -n 'Reconcile brief with findings' src/skills/joycraft-research.md` matches | scripted grep |
| All 6 sections enumerated in design skill | `git grep -nE '(Vision\|Hard Constraints\|Out of Scope\|Decomposition\|Test Strategy\|Success Criteria)' src/skills/joycraft-design.md` returns 6+ matches inside the new step | scripted grep + manual |
| All 6 sections enumerated in research skill | analogous grep | scripted grep |
| Step generated into per-harness variants | `git grep -n 'Reconcile brief with findings' src/{claude,codex,pi}-skills/joycraft-design.md src/{claude,codex,pi}-skills/joycraft-research.md` returns 6 matches (3 harnesses × 2 skills) | scripted grep |
| No conditional-block wrapping (universal) | `git grep -B2 'Reconcile brief with findings' src/skills/joycraft-design.md src/skills/joycraft-research.md` shows no `<!-- harness:` marker immediately before | manual |
| Bundle in lockstep | `pnpm test --run tests/bundled-files-sync.test.ts` passes | integration |
| Residue OK | `pnpm test --run tests/generate-bundled-files.test.ts` passes | integration |
| Codex parity OK | `pnpm test --run tests/codex-skill-parity.test.ts` passes | integration |
| Pi content OK | `pnpm test --run tests/pi-skill-content.test.ts` passes (expectations may need updating to include the new step) | integration |

**Execution order:**
1. Confirm `src/skills/joycraft-design.md` and `src/skills/joycraft-research.md` exist (spec 5 must have landed).
2. Draft the reconciliation step content (~30-40 lines per skill). The step is universal — same content in both canonicals, adjusted for the artifact name (design.md vs research.md) and the workflow position.
3. Insert the step into each canonical at the right position (after artifact write, before hand-off).
4. Run `pnpm build`.
5. Run test suite; update parity/content test expectations if they exclude the new step.
6. Commit all changed files together.

**Smoke test:** the grep checks above run in <1s.

**Before implementing, verify your test harness:**
1. Confirm spec 5 has landed (`src/skills/joycraft-design.md` and `src/skills/joycraft-research.md` exist).
2. Confirm spec 2's generator handles content additions to canonical files correctly (it does, by design — this is just exercising the path).
3. Run `pnpm test --run` on baseline.

## Constraints

- MUST: add the step to BOTH `joycraft-design` and `joycraft-research`. Skipping one defeats the closed-loop intent.
- MUST: place the step OUTSIDE any conditional block — reconciliation applies regardless of harness.
- MUST: enumerate the 6 sections explicitly. Vague guidance like "check the brief" won't pull its weight under time pressure.
- MUST: include the "edit in place" vs "diff + stop" criterion. Without it, the step defaults to either silent edits (bad) or always-stopping (annoying).
- MUST: regenerate per-harness dirs + `bundled-files.ts` in same commit.
- MUST NOT: add the step to any other skill. The reconciliation hook belongs at the points where new findings are produced (design + research); other skills don't produce findings that invalidate briefs.
- MUST NOT: invent a new template variable for the brief path. Skills already know where they are in the feature folder.
- MUST NOT: silently update `pi-skill-content.test.ts` if it excludes the step. Update expectation explicitly and note in PR.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `src/skills/joycraft-design.md` | Insert "Reconcile brief with findings" step (~30 lines) after design.md write, before hand-off. Universal — outside any harness block. |
| Modify | `src/skills/joycraft-research.md` | Insert same step (~30 lines, adjusted for research artifact) at analogous position. |
| Modify | `src/claude-skills/joycraft-design.md` | Regenerated by `pnpm build` — gains the step |
| Modify | `src/codex-skills/joycraft-design.md` | Regenerated; gains the step |
| Modify | `src/pi-skills/joycraft-design.md` | Regenerated; gains the step |
| Modify | `src/claude-skills/joycraft-research.md` | Regenerated; gains the step |
| Modify | `src/codex-skills/joycraft-research.md` | Regenerated; gains the step |
| Modify | `src/pi-skills/joycraft-research.md` | Regenerated; gains the step |
| Modify | `src/bundled-files.ts` | Regenerated by `pnpm build` |
| Modify (possible) | `tests/pi-skill-content.test.ts` | Update any expectation that excluded the new step — documented in PR |

## Approach

**Step content (draft — refine during implementation):**

```markdown
## Step N: Reconcile Brief with Findings

You've just written {design.md|research.md}. Before hand-off, the parent brief at `docs/features/<slug>/brief.md` may now disagree with what you discovered. Re-read it and check each of these sections:

| Brief section | What to look for |
|---|---|
| Vision | Did your findings refine or contradict the framing? |
| Hard Constraints | Are any constraints now obsolete, missing, or refined? |
| Out of Scope | Did your findings push something in or out of scope? |
| Decomposition | Are spec counts, names, or dependencies still accurate? |
| Test Strategy | Do your findings change what or how to test? |
| Success Criteria | Are the criteria still observable and still match the goal? |

**For each section, choose one:**

- **Edit in place** — small, mechanical updates: line-number corrections, clarifications, additions consistent with brief intent. No user approval needed.
- **Diff + stop** — non-trivial changes: counts flipping, decomposition restructure, scope changes, contradiction with original brief intent. Present a diff of the proposed change, STOP, and wait for user approval before continuing.

If you make changes, note them at the bottom of {design.md|research.md} under a "Brief updates" subsection.

**Why this step exists:** the silent-drift gap. Without reconciliation, the brief and downstream artifacts diverge — and later decomposition is sized against the stale brief. This feature ("single-source-skills") hit exactly this: brief said "11 clean / 9 dirty" until the research re-audit forced a re-decomposition. Don't let it happen again.
```

**Insertion position:**
- In `joycraft-design.md`: after the design.md write step (current Step 4 or wherever the artifact write happens), before any "present and STOP" or hand-off step.
- In `joycraft-research.md`: after the research.md write step, before hand-off.

**Rejected alternative:** put the reconciliation step in `joycraft-decompose` instead. Wrong location — decomposition reads the brief but doesn't produce new findings that invalidate it. Findings come from research and design. Catching drift AT THE SOURCE (research/design) is what the closed loop requires.

**Rejected alternative:** make the step a separate `joycraft-reconcile-brief` skill that the user invokes manually. Same problem — under time pressure, manual reconciliation gets skipped. Baking it into the producing skill is what makes the loop close automatically.

**Rejected alternative:** make the step always "diff + stop." Adds friction to small mechanical updates (line-number corrections, typos). The two-tier rule (edit small / stop on large) keeps signal high.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| The brief is already in sync — no changes needed | Note in the design.md/research.md "Brief updates" subsection: "Reconciliation checked, no changes required." Continue to hand-off. |
| Findings invalidate a Hard Constraint | This is "diff + stop" — Hard Constraints are load-bearing for downstream decomposition. Present the diff and wait. |
| Findings flip a count in Decomposition (e.g. "11 clean → 2 clean") | "Diff + stop." This is the EXACT drift this step exists to catch. Present the diff with the new count and the evidence, wait for approval. |
| The brief doesn't exist (feature was described inline) | Skip the step — note in design.md/research.md that no parent brief existed. The reconciliation hook only fires when there's a brief to reconcile against. |
| The user's brief is in a non-standard location | Use `docs/features/<slug>/brief.md` as the standard path; if not present, skip with a note. Don't search the repo for "any brief". |
| Pi parity test fails because pi expected the old skill content | Update the expectation. Note in PR. |
| Some other skill (e.g. `joycraft-decompose`) seems to also need the reconciliation step | Surface to user. Spec scope says design + research only. Expanding the hook requires a design decision. |

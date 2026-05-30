---
status: done
owner: Maximilian Maksutovic
created: 2026-05-21
feature: context-layer
---

# Wire tune to Context Layer — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-21-context-layer/brief.md`
> **Status:** Complete
> **Date:** 2026-05-21
> **Estimated scope:** 1 session / 2 files / ~40 changed lines

---

## What
Update `/joycraft-tune` (Claude `src/claude-skills/joycraft-tune.md` + Codex mirror) so it understands and exercises the context layer:

1. **First-run gather.** Replace tune's narrow Step-5 risk-only interview with an invocation of `/joycraft-gather-context` on first run (Codex mirror invokes `$joycraft-gather-context`). Gather owns the read-then-offer onboarding pass; tune no longer runs its own all-or-nothing risk interview.
2. **Recognize the context layer in assessment.** Tune's Step 1/Step 3 7-dimension scoring recognizes `docs/context/reference/` (not just the flat `docs/context/*.md` fact-docs) as part of the harness when scoring.
3. **Documentation dimension flags monoliths.** The `Documentation` scoring dimension rewards a lean + pointered CLAUDE.md and flags a CLAUDE.md exceeding ~200 lines with a specific recommendation to extract sections into `docs/context/reference/` + `## Context Map` pointers — advisory only, never auto-edits.

## Why
Tune is the assessment + first-run entry point but is currently blind to the context layer: its Step-5 interview is narrow and skips entirely when `docs/context/` has any content, and its scoring neither sees `reference/` docs nor flags a bloated CLAUDE.md — so the feature's lean-docs thesis has no enforcer.

## Acceptance Criteria
- [ ] Tune's first-run path invokes `/joycraft-gather-context` (Codex: `$joycraft-gather-context`) in place of the old narrow Step-5 risk interview; the old all-or-nothing risk-interview text is removed.
- [ ] Tune's Step 1/Step 3 assessment recognizes `docs/context/reference/` as part of the context layer when scoring (not only the flat fact-docs).
- [ ] The `Documentation` dimension flags a CLAUDE.md >~200 lines with a recommendation to extract into `docs/context/reference/` + `## Context Map` pointers; lean+pointered scores high. The recommendation is advisory (the skill never auto-edits CLAUDE.md).
- [ ] `src/codex-skills/joycraft-tune.md` mirrors all of the above with `$` sigil, `.agents/`, "deny patterns configuration", no `instructions:` field — content-identical otherwise.
- [ ] Both files use project-relative paths only.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| First-run invokes gather | assert Claude body invokes `/joycraft-gather-context` and the old narrow risk-interview text is gone | integration (content) |
| Codex invokes `$gather-context` | assert Codex body invokes `$joycraft-gather-context`, no `/joycraft-` | integration (grep) |
| Recognizes reference/ in scoring | assert body's assessment step references `docs/context/reference/` | integration (content) |
| Documentation dimension flags >200 lines | assert body's Documentation dimension mentions the ~200-line threshold + extract-to-reference + Context-Map recommendation, advisory only | integration (content) |
| No auto-edit | assert body states the recommendation is advisory / never auto-edits CLAUDE.md | integration (content) |
| Codex mirror parity | diff Claude vs Codex body; only platform lines differ | integration (diff) |
| Build green | `pnpm test --run && pnpm typecheck` | integration |

**Execution order:**
1. Write the content/grep assertions reading both tune files — they FAIL (current tune has the old Step 5, no reference/ recognition, no monolith flag).
2. Confirm red.
3. Edit both files until green.

**Smoke test:** the grep asserting `/joycraft-gather-context` appears and the old risk-interview phrase is gone — sub-second.

**Before implementing, verify your test harness:**
1. Run the assertions — they must FAIL against the current tune files.
2. Assertions read the real `src/claude-skills/joycraft-tune.md` / Codex mirror that get bundled.
3. The gather-invocation grep is the seconds-scale smoke test.

## Constraints
- MUST keep tune lean (it is the leanest skill at ~15 instructions) — invoke gather, do NOT inline gather's flow.
- MUST replace the narrow Step-5 risk interview with the gather invocation, not stack a second interview on top.
- MUST keep the Documentation flag advisory — tune NEVER auto-edits CLAUDE.md (Decision 5).
- Codex mirror MUST invoke `$joycraft-gather-context` and otherwise be content-identical with documented platform swaps; no `instructions:` field.
- MUST use project-relative paths only.

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Edit | `src/claude-skills/joycraft-tune.md` | Step 5 → invoke `/joycraft-gather-context` on first run; Step 1/3 recognize `reference/`; Documentation dimension flags >~200-line CLAUDE.md |
| Edit | `src/codex-skills/joycraft-tune.md` | mirror the above; invoke `$joycraft-gather-context` |

## Approach
Edit the Claude file first. In Step 5, swap the narrow risk-interview block for a short "on first run, invoke `/joycraft-gather-context`" instruction (gather owns read-then-offer). In Step 1/3, extend the dirs/dimensions it inspects to include `docs/context/reference/`. In the Documentation dimension, add the ~200-line monolith flag + the specific "extract to reference/ + Context Map" recommendation, marked advisory. Then mirror to Codex with the documented swaps and `$joycraft-gather-context`. Note this spec also touches the same `tune.md` files the `update-stale-skill-paths` spec edits for path placeholders — keep changes orthogonal (paths there, logic here); if both are in flight, sequence path edits first to avoid conflicts (see README waves). Do NOT regenerate `bundled-files.ts` here.

Depends on `add-gather-context-skill` so the invoked skill actually exists when tune routes to it.

Rejected alternative: inlining gather's read-then-offer flow into tune — bloats tune's lean budget and duplicates the gather skill (brief Part C).

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| First run, no harness yet | Tune routes to `/joycraft-gather-context` for the onboarding pass |
| Recurring run on a tuned project | Tune assesses normally; gather is the first-run path, not forced every time |
| CLAUDE.md is exactly ~200 lines | Borderline — flag advisory; wording uses "~200" so no hard cliff |
| `docs/context/reference/` empty or absent | Scoring still works; absence simply isn't rewarded, not penalized as an error |
| Path-placeholder edits from the other spec overlap | Keep logic edits here independent of path-string edits there |

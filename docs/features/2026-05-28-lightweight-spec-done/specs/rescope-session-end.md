---
status: in-review
owner: Maximilian Maksutovic
created: 2026-05-28
feature: 2026-05-28-lightweight-spec-done
mode: checkpoint
---

# Rescope Session-End — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-28-lightweight-spec-done/brief.md`
> **Status:** Ready
> **Date:** 2026-05-28
> **Estimated scope:** 1 session / session-end skill × 3 variants + 1 test

---

## What
Re-scope `joycraft-session-end` from a per-session wrap-up into a **once-per-feature finisher**. Its responsibilities become: (1) run full validation (`pnpm test && pnpm build` or the project's equivalent) — now the ONLY validation gate in the loop; (2) consolidate/curate discoveries and do the context-doc sweep (the expensive cognition, done once); (3) graduate every `in-review` spec in the feature to `done` in BOTH queue JSON (`mark-done <id> --to done`) and frontmatter; (4) push and open the PR. The skill's status step changes from setting `shipped` to graduating `in-review → done`. Ships in all three variants + this repo's installed copies.

## Why
With `joycraft-spec-done` (spec 5) now handling per-spec commit + status, session-end no longer runs after every spec. It must become the feature-level bookend the north star describes — the single mandatory validation + push + PR. Its old status vocabulary (`shipped` / body `Complete`) must move to the unified `done`.

## Acceptance Criteria
- [ ] The session-end SKILL.md (all 3 variants) graduates specs `in-review → done` (not `→ shipped`), in BOTH queue JSON (via `mark-done --to done`) and frontmatter
- [ ] The skill frames itself as a once-per-feature finisher (text reflects "feature complete", not "session complete after each spec")
- [ ] The skill keeps full validation as a mandatory gate and states it is the ONLY validation gate (spec-done does not validate)
- [ ] The skill keeps the consolidate-discoveries + context-sweep step (curation of stubs left by spec-done)
- [ ] The skill keeps push + PR
- [ ] The frontmatter/discovery example status word is `done` (not `active`/`shipped`)
- [ ] All 3 variants carry the changes; this repo's installed copies are synced
- [ ] Tests pass
- [ ] Build passes (`pnpm build`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Graduates in-review→done | `tests/session-end-rescope.test.ts`: read each of 3 source skill files; assert text references `in-review` → `done` and `mark-done` with `--to done` | unit |
| No longer sets shipped | Assert skill text does NOT instruct setting `status: shipped` for completion | unit |
| Validation still mandatory | Assert skill retains the validation step and labels it the (only) gate | unit |
| Consolidate-discoveries kept | Assert skill retains discovery-consolidation + context-sweep language | unit |
| Push + PR kept | Assert skill retains push and PR steps | unit |
| 3-variant parity | Assert all three variants reflect the rescope | unit |

**Execution order:**
1. Write tests over the 3 source skill files — MUST fail (current skill says `shipped`, frames per-session)
2. Confirm red
3. Edit the 3 sources + sync installed copies until green

**Smoke test:** `pnpm vitest run tests/session-end-rescope.test.ts`.

**Before implementing, verify your test harness:**
1. Tests read real SKILL source files (`src/{claude-skills,codex-skills,pi-skills}/joycraft-session-end.md`)
2. Prose ⇒ assert required tokens/steps, not exact wording
3. Single test file = smoke test

## Constraints
- MUST: edit all three source variants — `src/claude-skills/joycraft-session-end.md`, `src/codex-skills/joycraft-session-end.md`, `src/pi-skills/joycraft-session-end.md` (these are FLAT `.md` files, not `<dir>/SKILL.md`) — and sync this repo's installed copies at `.claude/skills/joycraft-session-end/SKILL.md`, `.agents/skills/joycraft-session-end/SKILL.md`, `.pi/skills/joycraft-session-end/SKILL.md` (installed layout IS the `<dir>/SKILL.md` form)
- MUST: use `joycraft-mark-done <id> --to done` (spec 3) for the queue graduation, plus the frontmatter edit — keep both systems in sync
- MUST: keep validation mandatory — the brief states session-end "stays mandatory — it's the only validation gate"
- MUST: graduate ALL of the feature's `in-review` specs to `done` (it runs once at the end; multiple specs may be waiting)
- MUST NOT: track "merged/shipped" as a spec status — that's a git/PR fact (brief invariant)
- MUST NOT: regenerate bundled-files here — spec 9
- ASK FIRST (CLAUDE.md): skill content — authorized by the brief

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/claude-skills/joycraft-session-end.md` | status step → `in-review→done`; reframe as feature finisher; keep validation/consolidate/push/PR |
| Modify | `src/codex-skills/joycraft-session-end.md` | same |
| Modify | `src/pi-skills/joycraft-session-end.md` | same |
| Modify | `.claude/skills/joycraft-session-end/SKILL.md` | sync installed copy |
| Modify | `.agents/skills/joycraft-session-end/SKILL.md` | sync installed copy |
| Modify | `.pi/skills/joycraft-session-end/SKILL.md` | sync installed copy |
| Create | `tests/session-end-rescope.test.ts` | Skill-content assertions |

## Approach
**Known current state (from reading the source):** Step 3 "Update Spec Status" currently says "update the spec's frontmatter `status:` to reflect completion (e.g., `shipped`) and the body's Status field to `Complete`" (line ~95) and "leave `status: active`" for partial. Rewrite Step 3 to: graduate each `in-review` spec to `done` in both systems; if a spec is still `todo` (never started) note it as remaining. Update the discovery frontmatter example (`status: active`) to align with the new vocabulary where it refers to spec status. Adjust the Step 6 report block from "Session complete" framing toward "Feature complete" (validation, discoveries consolidated, specs graduated, pushed, PR).

Cross-reference the two-tier split explicitly so a reader understands session-end is the heavy bookend and `joycraft-spec-done` is the light per-spec step.

**Rejected alternative:** Leaving session-end unchanged and adding the graduation logic only to a new feature-finisher skill. Rejected — the brief re-scopes the *existing* session-end (it's already the mandatory wrap-up users know); forking a parallel skill would fragment the wrap-up surface and confuse the handoff chain.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Some specs still `todo` at session-end | Validate + graduate the `in-review` ones; report remaining `todo` specs; PR only if the whole feature is complete |
| A discovery stub from spec-done exists | Consolidate/expand it into a proper discovery doc during the sweep |
| No discoveries this feature | Skip the discovery file (a clean feature) |
| Validation fails | Stop and surface failures — do NOT graduate or push (matches the existing "fix failures before proceeding") |
| Run after a single checkpoint spec mid-feature | Still valid — it graduates whatever is `in-review`; but the intended cadence is once at feature end |

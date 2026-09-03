---
status: done
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
mode: checkpoint
---

# Add Discovery Staleness Lifecycle — Atomic Spec

> **Parent Brief:** `docs/research/2026-08-30-curated-harness-brief.md` (design: `docs/features/2026-08-30-curated-harness/design.md`)
> **Status:** Ready
> **Date:** 2026-09-01
> **Estimated scope:** 1 session / lifecycle doc + template twin + 2 skill sources + copies / ~40 lines total

---

## What

The 7-day staleness rule (D1) lands exactly once: a new section in `docs/reference/knowledge-lifecycle.md` and its shipped template twin `docs/templates/reference/knowledge-lifecycle.md` (canonical source under `src/templates/`). The rule: a discovery or fact row whose `created:` is more than 7 days old, whose `status:` is not terminal, and — when telemetry exists — with zero voluntary reads, is flagged as an advisory stale list, never auto-deleted. `joycraft-session-end` and `joycraft-optimize` invoke the rule by citation, adding at most a one-line pointer each. The section also records the D1 validation rule and the panel's honest-residue caveat.

## Why

Point-in-time state currently sits forever — the knowledge layer's only trigger is size-based rotation; D1's graduate-or-die lifecycle needs one home before consumers can cite it.

## Acceptance Criteria

- [ ] `docs/reference/knowledge-lifecycle.md` gains a staleness section stating the D1 rule: >7 days from `created`, non-terminal `status`, advisory only [src: D1]
- [ ] The rule adds the telemetry condition when counts exist: zero voluntary reads [src: design §2 WS2]
- [ ] The section names the graduation targets: shipped ledger for "this happened", AGENTS.md/harden for "this is always true", deletion for "this was a moment" [src: brief "2. Lifecycle"]
- [ ] The section records the D1 validation rule: when more than half of 7-day flags fire on discoveries subsequently read, the threshold moves [src: design §2 WS2]
- [ ] The section states the honest-residue caveat: situational must-read content has no good home in the tier model; the checkable subset converts via harden, the worst of the rest promotes to L1, the remainder is documented accepted risk [src: design §2 WS2]
- [ ] The shipped template twin under `src/templates/` carries the same section; bundle regenerated [src: design §4]
- [ ] session-end and optimize cite the rule (one line each, "defined once, invoked by citation"), with net growth paid for [src: design §4]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Rule in one home | content test: staleness rule text exists in the lifecycle doc and template twin, and NOT restated in either skill body | unit |
| Skill citations | content test: session-end and optimize each contain a citation line pointing at the lifecycle doc | unit |
| Template registration | bundle-regen test green after `node scripts/generate-bundled-files.mjs` (recursive walk picks up the template edit) | integration |
| Copies in sync | sync tests green after `pnpm sync-skills` | integration |
| Parity pins | `tests/session-end-rescope.test.ts` green (updated same-commit if regions shift) | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the one-home content test.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: define the rule once in `knowledge-lifecycle.md` (+ template twin) and have both skills invoke it by citation — the rotation-procedure precedent verbatim [src: design §4]
- MUST: keep the rule advisory — flag lists only, never auto-delete [src: D1]
- MUST: use the 7-day window from `created:` [src: D1]
- MUST: pay for skill-side lines same-commit (session-end 211, optimize 266, both over budget) [src: design §4]
- MUST NOT: restate the rule body in session-end or optimize [src: design §4]
- MUST NOT: imply the dangerous-assumptions doc delivers a read guarantee it cannot make [src: design §2 WS2]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `docs/reference/knowledge-lifecycle.md` | New staleness section (rule, targets, validation rule, honest-residue caveat) |
| Modify | `src/templates/reference/knowledge-lifecycle.md` | Same section in the shipped twin |
| Modify | `src/skills/joycraft-session-end.md` | One-line citation in the discovery-consolidation step |
| Modify | `src/skills/joycraft-optimize.md` | One-line citation in the Reaper pass |
| Modify | generated + installed copies (both skills, template) | Regenerated + synced |
| Modify | `tests/session-end-rescope.test.ts` | Pins if regions shift |

## Approach

Write the staleness section as a sibling of the rotation procedure, reusing its "defined once here and invoked from…" contract sentence so the one-home rule is self-enforcing. session-end's citation lands in Step 1 (discovery consolidation): flag stale candidates while consolidating. optimize's citation lands in the Reaper pass beside the telemetry thresholds (spec 5), so stale-and-never-read discoveries surface in one report. Rejected alternative: restating the rule in both skills — two homes and added lines in over-budget files (design §4's rejected option).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Discovery graduated into AGENTS.md but file left in place | Terminal-equivalent — graduation noted, not flagged as stale forever |
| No telemetry store | Rule still fires on age + status alone; telemetry condition is additive |
| `created:` missing from old frontmatter | Skip the row, note it — never guess an age |
| Discovery exactly 7 days old | Not flagged — the rule is "more than 7 days" |

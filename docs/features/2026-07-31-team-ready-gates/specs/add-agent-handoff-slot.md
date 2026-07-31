---
status: in-review
owner: Maximilian Maksutovic
created: 2026-07-31
feature: 2026-07-31-team-ready-gates
mode: batch
---

# Add Agent Handoff Slot — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-31-team-ready-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-31
> **Estimated scope:** 1 session / 2–3 canonical skills + template slot guidance / ~60 lines

---

## What

Brief/PRD output from the interview and new-feature gates gains a "Prompt for the implementing agent" section: a fenced, copy-pasteable prompt block (the same briefing shape the existing handoff blocks use — context, decisions stamped, start point, hazard, done-when) that a PM can hand to an engineer to paste straight into Claude Code. The section renders in the md artifact and as a section in the gate HTML. When a custom output template (from `support-custom-output-templates`) is in play, the handoff section is appended after the custom structure like the other machine sections.

## Why

Praful builds this paste-into-Claude-Code prompt by hand for every PRD today — the one part of his six-project flow Joycraft doesn't generate.

## Acceptance Criteria

- [ ] Briefs produced by interview and new-feature end with a "Prompt for the implementing agent" section containing a fenced, self-contained briefing block `[src: D4]`
- [ ] The block follows the existing briefing shape: picking-up line, stamped decisions, start point, hazard, done-when — fillable by a cold agent without re-deriving context `[src: brief "What \"Done\" Looks Like"]`
- [ ] The gate HTML renders the handoff prompt as its own section using existing skeleton blocks `[src: D4]`
- [ ] With a custom output template present, the handoff section is appended after the custom structure `[src: D3]`
- [ ] `pnpm sync-skills` run; regenerated + installed copies committed in the same commit `[src: brief "Hard Constraints"]`
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Handoff section instruction in both skills | `tests/gate-contract.test.ts`: assert "Prompt for the implementing agent" appears in interview + new-feature claude variants | unit |
| Briefing shape enumerated | assert the section's instruction lists the five briefing lines (picking-up, decisions, start, hazard, done-when) | unit |
| Generated trees in sync | existing bundle-drift check | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `pnpm test tests/gate-contract.test.ts` — seconds.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: keep the prompt block fenced and self-contained — a cold agent must be able to act on it alone `[src: brief "What \"Done\" Looks Like"]`
- MUST: keep the gate HTML skeleton byte-identical outside slots `[src: brief "Hard Constraints"]`
- MUST: run `pnpm sync-skills` and commit regenerated + installed copies in this spec's own commit `[src: brief "Hard Constraints"]`
- MUST NOT: reference absolute paths inside the generated prompt — project-relative only, it will be pasted in the user's project `[src: brief "Hard Constraints"]`

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-interview.md` | handoff-prompt section in the draft/summary output |
| Modify | `src/skills/joycraft-new-feature.md` | handoff-prompt section in the brief structure |
| Modify | `src/templates/REVIEW_GATE_TEMPLATE.html` | slot-comment guidance only, if a hint is needed; no structure/CSS change |
| Modify | `tests/gate-contract.test.ts` | section-presence assertions |
| Modify | generated trees + installed copies | regenerated via `pnpm sync-skills` |

## Approach

Reuse the briefing grammar the skills already emit at their own handoffs (the fenced `/joycraft-…` blocks) but retargeted at the user's implementing engineer: the prompt names the doc, the stamped decisions, where to start, the known hazard, and done-when. Generated at brief-writing time and kept current on each gate re-run. Rejected alternative: a separate `handoff.md` artifact — one more file to track across six projects; the prompt belongs inside the doc the engineer already receives.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Brief still has open/assigned questions | The prompt block says so explicitly ("Do not start until Qn is answered") rather than pretending readiness |
| The user's project has no Joycraft installed (engineer's side) | The prompt degrades to plain instructions — it must not require Joycraft skills to be actionable |
| Interview draft (not yet formalized) | Draft gets the slot too, marked as draft-stage |

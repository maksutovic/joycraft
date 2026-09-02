---
status: done
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
mode: checkpoint
---

# Reorder Add-Fact Harden-First — Atomic Spec

> **Parent Brief:** `docs/research/2026-08-30-curated-harness-brief.md` (design: `docs/features/2026-08-30-curated-harness/design.md`)
> **Status:** Ready
> **Date:** 2026-09-01
> **Estimated scope:** 1 session / 2 skill sources + copies + tests / ~0 net lines (reorder + fold)

---

## What

`joycraft-add-fact`'s capture question reorders to Lauren's intervention-elimination hierarchy: a new early step asks "can this be architecture? A deny pattern or a CI check?" and routes eligible facts to `{{skill_prefix}}harden` *before* doc classification. Today's Step 6 (last, optional `{{boundary_file}}` consideration) folds into that early step — one home for the escalation question. `joycraft-session-end` Step 1b gains the same escalation gate as a single line.

## Why

Routing currently asks "which doc" first and considers boundaries last — the inverse of the hierarchy; prose should be the residue after checks fail, not the default destination.

## Acceptance Criteria

- [ ] add-fact asks the escalation question (architecture / deny pattern / CI check → `{{skill_prefix}}harden`) before doc classification [src: design §4]
- [ ] The old Step 6 boundary-prose consideration is absorbed into the early step — the escalation question has exactly one home in the skill [src: design §4]
- [ ] session-end Step 1b gains a one-line escalation gate before routing prose to context docs [src: design §2 WS3]
- [ ] No new skill or user-facing door is added — routing targets the existing `joycraft-harden` [src: design §4]
- [ ] `tests/session-end-rescope.test.ts` and add-fact content tests update in the same commit [src: design §2 WS3]
- [ ] Net line change ≈ 0 via the Step-6 fold; any remainder paid same-commit (add-fact 207, session-end 211, both over budget) [src: design §4]
- [ ] Generated + installed copies regenerated and synced same-commit [src: design §2 WS3]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Escalation-first order | content test: escalation step appears before the classification step in add-fact; no Step-6 boundary block remains | unit |
| One home | content test: exactly one escalation-question block in add-fact | unit |
| session-end gate | content test: Step 1b contains the escalation line; `tests/session-end-rescope.test.ts` parity green | unit |
| Copies in sync | bundle-regen + sync tests green | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `pnpm test tests/session-end-rescope.test.ts`.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: implement as a reorder inside add-fact absorbing Step 6 — not a new skill, not a parallel check [src: design §4]
- MUST: route to the existing `{{skill_prefix}}harden` (`entry: agent` — costs no door under the ≤9 human-door budget) [src: design §4]
- MUST: land after specs 6 and 7 settle add-fact and session-end — this spec edits both files on top of their changes [src: design §2 WS3]
- MUST: update the pinned tests in the same commit [src: design §2 WS3]
- MUST NOT: leave a second escalation-question home anywhere in add-fact [src: design §4]
- MUST NOT: make harden routing mandatory-blocking — capture continues when the human declines escalation [src: design §1 — tune/add-fact advisory posture]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-add-fact.md` | New early escalation step; Step 6 removed/folded; renumbering |
| Modify | `src/skills/joycraft-session-end.md` | One-line escalation gate in Step 1b |
| Modify | `src/{claude,codex,pi,copilot}-skills/` (both skills) | Regenerated |
| Modify | `.claude/.agents/.pi/.github skill trees (both skills)` | Synced |
| Modify | `tests/session-end-rescope.test.ts` | Updated pins |
| Modify | add-fact content tests (incl. spec 7's) | Updated for new ordering |

## Approach

Move Step 6's substance into a new Step 1.5-style gate phrased as the hierarchy: "Before choosing a doc: can this be enforced as architecture, a deny pattern, or a CI check? If yes, invoke `{{skill_prefix}}harden` and stop — prose is the residue." The decay bans (spec 7) stay in Step 2; escalation precedes them. session-end's gate is one sentence in Step 1b with the same shape. Rejected alternative: keeping Step 6 last and adding a parallel early check — two homes for the escalation question (design §4's rejected option).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Fact is check-eligible but harden is not installed | Note it and fall through to doc classification |
| Fact is both check-eligible and worth a prose rationale | Harden the check; the *why* can still land in the decision log per existing rubric |
| Escalation declined by human | Continue to classification — advisory, never blocking |

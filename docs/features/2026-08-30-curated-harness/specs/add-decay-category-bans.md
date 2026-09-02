---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
mode: batch
---

# Add Decay Category Bans — Atomic Spec

> **Parent Brief:** `docs/research/2026-08-30-curated-harness-brief.md` (design: `docs/features/2026-08-30-curated-harness/design.md`)
> **Status:** Ready
> **Date:** 2026-09-01
> **Estimated scope:** 1 session / skill source + copies + tests / ~10 net lines

---

## What

`joycraft-add-fact`'s Step 2 classification rubric gains three reject-signals evaluated *before* a fact is classified into any context doc: (1) redundant-with-`{{boundary_file}}` — the fact restates what AGENTS.md/CLAUDE.md already says; (2) expired shipped-state — the fact describes a state the shipped ledger already supersedes; (3) point-in-time hazard — PR numbers, "currently broken", live URLs to unshipped work. A fact matching a ban is rejected from capture with a one-line reason (and, where applicable, pointed at its correct existing home).

## Why

The three decay categories are how a curated layer rots into the auto-memory profile the critique demonstrated (redundant / expired / point-in-time); banning them at capture is cheaper than reaping them later.

## Acceptance Criteria

- [ ] Step 2 evaluates the three decay-category bans as reject-signals before classification [src: design §2 WS2]
- [ ] The three categories are exactly: redundant-with-`{{boundary_file}}`, expired shipped-state, point-in-time hazard (PR numbers, "currently broken", live URLs to unshipped work) [src: brief "2. Lifecycle"]
- [ ] A rejected fact gets a one-line reason, not silent dropping [src: design §2 WS2]
- [ ] Net growth in add-fact (207 lines, over budget) is paid for with same-commit trims [src: design §4]
- [ ] Generated + installed copies regenerated and synced same-commit [src: design §2 WS3]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Bans present and ordered | content test: the three ban names appear in the canonical source before the classification table/list | unit |
| Category wording | content test: point-in-time examples (PR numbers, "currently broken") present | unit |
| Copies in sync | bundle-regen + sync tests green | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the bans-present content test.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: place the bans before classification — reject-signals, not a post-hoc filter [src: design §2 WS2]
- MUST: use the `{{boundary_file}}` placeholder, not a literal filename — the skill ships to multiple harnesses [src: design §1]
- MUST: pay for added lines same-commit [src: design §4]
- MUST NOT: auto-delete or rewrite existing facts — the bans govern new capture only [src: D1]
- MUST NOT: change Step 6 or the escalation ordering — that is spec `reorder-add-fact-harden-first` [src: design §2 WS3]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-add-fact.md` | Three reject-signals at the top of Step 2 + paying trims |
| Modify | `src/{claude,codex,pi,copilot}-skills/joycraft-add-fact.md` | Regenerated |
| Modify | `.claude/.agents/.pi/.github skill trees (add-fact)` | Synced |
| Modify | add-fact content tests (existing file, or create `tests/add-fact-decay-bans.test.ts`) | Assertions per Test Plan |

## Approach

Prepend a compact "Reject before you route" block to Step 2: three bullet bans with one example each, and the instruction to state the rejection reason in one line. Exact wording is implementation judgment (the design anchors the structure at 75, wording free). Keep disjoint from spec 8's escalation reorder so the two add-fact edits merge cleanly in sequence. Rejected alternative: a separate ban-check step number — renumbers the skill and collides with spec 8's reorder for no benefit.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Fact is point-in-time but also a real hazard | Reject as a fact row; route the durable kernel via the escalation/harden path or dangerous-assumptions per existing rubric |
| Fact duplicates a decision-log row, not the boundary file | Existing Step 2b overlap-grep still handles doc-level duplicates — bans do not replace it |
| User insists on capturing a banned fact | Advisory skill — record it with the ban noted, human overrides |

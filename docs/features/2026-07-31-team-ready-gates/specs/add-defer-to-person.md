---
status: in-review
owner: Maximilian Maksutovic
created: 2026-07-31
feature: 2026-07-31-team-ready-gates
mode: batch
---

# Add Defer-to-Person — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-31-team-ready-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-31
> **Estimated scope:** 1 session / 6 canonical skills + gate template slot guidance / ~120 lines

---

## What

"Defer to <name>" becomes a first-class answer at every gate question: when the user answers a question with a person's name instead of a choice, the skill records the question as assigned rather than open. The produced markdown artifact (brief/design/dossier) ends with an "Open Questions — Assigned" section (question, assignee, date, context link), and the gate HTML renders each assigned question as an assignee-tagged card (using the existing `.q` card and `.qnum` span — e.g. "Q2 · assigned: Sam") ready to paste into Notion for the named person to answer. Every deferral is confirmed visibly in one chat line.

## Why

Praful's team flow assigns questions to support/product/engineering people who aren't in the session; today a question can only be answered or parked, so assignment lives in his head and questions get lost across six parallel projects.

## Acceptance Criteria

- [ ] At any gate question in interview, new-feature, tune, design, bugfix, or decide, the answer "defer to <name>" (typed via the free-text row) records the question as assigned to that person `[src: D2]`
- [ ] The gate's markdown artifact ends with an "Open Questions — Assigned" section listing question, assignee, and date `[src: D2]`
- [ ] The gate HTML renders one assignee-tagged question card per assigned question, using only existing template classes `[src: D2]`
- [ ] Every deferral prints a one-line visible confirmation: who, which question, where it was recorded `[src: D11]`
- [ ] An artifact with assigned questions is not treated as blocked: the decompose decision gate treats `assigned` like `backlogged` (non-blocking) only when the human explicitly proceeds; by default assigned questions surface at the gate `[src: brief "What Done" — "collects answers from people on other teams"]`
- [ ] `pnpm sync-skills` run; regenerated + installed copies committed in the same commit `[src: brief "Hard Constraints"]`
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Defer instruction present in all 6 skills | `tests/gate-contract.test.ts`: assert the defer-to-person block ("defer to" + assigned-section name) appears in each claude-variant skill | unit |
| Visible confirmation specified | assert the skill text mandates the one-line confirmation (who/question/where) | unit |
| HTML card guidance uses existing classes | assert the skills' render instructions reference `.q`/`.qnum` and do not introduce new class names | unit |
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

- MUST: confirm every deferral visibly in one line — silent file mutation on a conversational shortcut is the known failure mode `[src: D11]`
- MUST: keep the gate HTML skeleton byte-identical outside slot regions — assignee tags ride existing classes (`.q`, `.qnum`), no new CSS `[src: brief "Hard Constraints"]`
- MUST: route the defer answer through the question directive's free-text row (Pattern B mechanics) `[src: D10]`
- MUST: run `pnpm sync-skills` and commit regenerated + installed copies in this spec's own commit `[src: brief "Hard Constraints"]`
- MUST NOT: auto-write assigned questions to `docs/backlog/` — assignment is not backlogging `[src: brief "Hard Constraints"]`

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-interview.md`, `joycraft-new-feature.md`, `joycraft-tune.md`, `joycraft-design.md`, `joycraft-bugfix.md`, `joycraft-decide.md` | defer-to-person answer handling + assigned section + card render guidance |
| Modify | `src/templates/REVIEW_GATE_TEMPLATE.html` | slot-comment guidance only (assignee tag in `.qnum`), no structure/CSS change |
| Modify | `tests/gate-contract.test.ts` | defer-block assertions |
| Modify | generated trees + installed copies | regenerated via `pnpm sync-skills` |

## Approach

Extend each gate skill's question handling: a free-text answer matching "defer to <name>" (or "<name> knows this") terminates the question as `assigned` instead of looping. The md section is the canonical record; the HTML card is its render. In `joycraft-decide`, `assigned` joins the termination vocabulary (clarified / backlogged / discarded / assigned) — assigned questions don't block presentation but are surfaced at the decompose gate until answered. Rejected alternative: a separate per-person questions file (`docs/questions/<name>.md`) — scatters state; the artifact the person will read in Notion is the one place the question already lives.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Defer with no name ("someone else knows") | Ask once for the name; without one, the question stays open — never an anonymous assignment |
| Same question deferred twice to different people | Latest assignment wins; the confirmation line notes the reassignment |
| Assigned question later answered in-session | Remove it from the assigned section, stamp the decision normally, confirm in one line |
| Gate has zero assigned questions | No "Open Questions — Assigned" section, no empty HTML cards |

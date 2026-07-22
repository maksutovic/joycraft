---
status: in-review
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
mode: checkpoint
---

# Add Retrieval Pass — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-21-living-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-07-21
> **Estimated scope:** 1 session / 3 files / ~90 lines

---

## What

`joycraft-research`, `joycraft-design`, and `joycraft-decompose` each gain an opening "Retrieve Before You Reason" step (S3): a bounded grep-first retrieval pass over the durable knowledge layer — `docs/context/*.md` (including `decision-log.md` and `shipped.md`), `docs/discoveries/` — before producing anything, with reused prior knowledge cited in the output.

## Why

Past decisions are currently never retrieved before new ones are made (unanimous CE gap #2 — the missing read half), so agents re-decide settled questions differently across sessions.

## Acceptance Criteria

- [ ] Each of the three skills opens with a PROTOCOL-labeled retrieval step, before any authoring/decomposition work
- [ ] The step is **bounded**: derive 3–6 search terms from the feature's nouns/verbs; grep the knowledge layer (`docs/context/`, `docs/discoveries/`); read at most the matching rows/files (≤5 file reads); no unbounded browsing
- [ ] The step's output contract requires a visible **"Prior knowledge reused"** list in the skill's deliverable — each entry citing doc + row date/heading — or an explicit "retrieval ran (terms: …), nothing relevant found" line; silent skipping is not compliant (RF-KILL-3: silence must be earned)
- [ ] Retrieved decisions that contradict the current feature's direction are surfaced to the human, not silently overridden
- [ ] All three edits carry the PILOT divergence marker
- [ ] Build passes (`pnpm typecheck`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Step present + first | `grep -n 'Retrieve Before You Reason'` in each SKILL.md; step number precedes existing Step 1 content | structural |
| Bounded contract | grep each skill for the term-count and read-cap language (`3–6`/`3-6`, `≤5`/`<= 5`) | structural |
| Citation contract | grep each skill for `Prior knowledge reused` | structural |
| PILOT markers | `grep -l 'PILOT' ` on the three files | structural |
| Behavioral (deferred) | Fresh-subagent eval of retrieval-before-authoring is covered by spec `run-gate-evals` | integration |
| Suite green | `pnpm test --run && pnpm typecheck` | unit |

**Execution order:** write the grep assertions, confirm they fail (red), edit the three skills until green.

**Smoke test:** `grep -l 'Retrieve Before You Reason' .claude/skills/joycraft-{research,design,decompose}/SKILL.md` → 3 files.

**Before implementing, verify your test harness:**
1. Run all checks — they must FAIL against the current skills
2. Checks inspect the actual installed skill files under `.claude/skills/`
3. Smoke test runs in seconds

## Constraints

- MUST: label the step PROTOCOL per `docs/reference/skill-authoring.md` (from spec `scaffold-knowledge-substrate`)
- MUST: keep the pass grep-first — search rows/headings, then read only matches (brief: durable docs are built for retrieval, not reading)
- MUST: keep skills self-contained — inline the retrieval instructions in each SKILL.md; no cross-skill imports (Gotcha #3)
- MUST NOT: touch `src/` or `templates/` (pilot pattern)
- MUST NOT: let retrieval expand into an unbounded context dump — the caps are the feature

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `.claude/skills/joycraft-research/SKILL.md` | Add retrieval opening step |
| Edit | `.claude/skills/joycraft-design/SKILL.md` | Add retrieval opening step |
| Edit | `.claude/skills/joycraft-decompose/SKILL.md` | Add retrieval opening step |

## Approach

One shared step text, adapted per skill (research cites into research.md, design into design.md §1 Current State, decompose into the decomposition table's context). Grep targets in priority order: decision-log (why), shipped.md (what/where), discoveries (negative knowledge), remaining context docs. Rejected alternative: a standalone `joycraft-retrieve` internal skill the three invoke — skills can't import skills reliably mid-flow, and three inline copies of ~15 lines beat an invocation hop (Gotcha #3).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Knowledge layer empty/missing (fresh project) | Step reports "nothing to retrieve" in one line and proceeds — never blocks |
| Grep terms match dozens of rows | Read the newest matches within the ≤5-file cap; say the result was truncated |
| Retrieved decision directly contradicts the new feature | Surface it as an explicit conflict for the human; do not silently pick a side |

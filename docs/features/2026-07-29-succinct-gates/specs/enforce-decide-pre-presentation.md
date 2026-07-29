---
status: in-review
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
mode: batch
---

# Enforce Decide Pre-Presentation — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-29-succinct-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-29
> **Estimated scope:** 1 session / 5 files edited / ~5-10 lines each

---

## What

Make the decide gate fire **before** presentation, unconditionally, in every
gate skill whose artifact can carry open questions: `joycraft-new-feature`,
`joycraft-design`, `joycraft-decompose`, `joycraft-research`,
`joycraft-bugfix`. The rule, stated inline at each gate step (placed with the
spec-2/spec-3 blocks):

> If the artifact contains any open question, or any load-bearing claim
> anchored ≤50, invoke `/joycraft-decide` on it NOW — before presenting.
> The Block Rule (docs/context/anchors.md) fires pre-approval, every time;
> presenting an artifact with open questions asks the human to approve an
> incomplete artifact.

Specifically fix the documented root cause in `joycraft-design`: Step 4
("Present and STOP — Pre-Approval Hold") precedes Step 5 where the decide
invocation lives, so a literal reading presents five unresolved questions for
approval. Move the decide trigger into Step 4's entry condition.

## Why

Observed live 2026-07-27 (recorded in
`docs/backlog/2026-07-27-decide-gate-mandatory.md`, absorbed here): design
presented an artifact with five open questions and an `anchor: 50`
load-bearing claim without invoking decide. The decompose gate is supposed to
stay closed while any decision is `open`; today that depends on an agent
remembering a cross-step instruction.

## Acceptance Criteria

- [ ] All five skills carry the pre-presentation decide rule inline at their
  gate step.
- [ ] `joycraft-design`'s Step 4/Step 5 ordering ambiguity is resolved —
  decide is an entry condition of the presentation, not a post-approval step.
- [ ] `joycraft-decompose`'s existing decision gate explicitly covers ≤50
  load-bearing claims, not just `decisions:` frontmatter rows.
- [ ] Build passes.
- [ ] Tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Rule present in all 5 skills | spec 5 content test; here `rg -c "before presenting" src/skills/` covers the five | manual → unit in spec 5 |
| Design ordering fixed | read Step 4 — decide invocation precedes "Present"; no decide reference remains gated on "once the human approves" | manual |
| Decompose gate covers ≤50 claims | grep decompose for the Block Rule reference at its gate | manual → unit in spec 5 |

**Execution order:**
1. Mechanical oracle lands in spec 5; here, edit + grep-verify
2. `pnpm test` before and after — identical results expected
3. Edit `src/skills/` only

**Smoke test:** `rg -c "before presenting" src/skills/` — instant.

**Before implementing, verify your test harness:**
1. `pnpm test` green before editing
2. Same windowed-test hazard as specs 2–3 (design, decompose, research,
   new-feature are all windowed files); note `percentage` is banned file-wide
   in design/new-feature/decide — the anchor rule text must say "≤50", never
   spell the banned word
3. Smoke test above runs instantly

## Constraints

- MUST: the rule text references `docs/context/anchors.md` as the one home of
  the Block Rule — do not restate anchor definitions inline.
- MUST: place edits with the spec-2/3 blocks, clear of windowed regions.
- MUST NOT: use the word banned by `tests/confidence-scoring-skill.test.ts`
  in design/new-feature/decide.
- MUST NOT: regenerate bundles or sync installed copies — spec 6 owns both.
- MUST NOT: change `joycraft-decide` itself.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `src/skills/joycraft-new-feature.md` | pre-presentation decide rule at Phase 2 gate |
| Edit | `src/skills/joycraft-design.md` | rule + Step 4/5 ordering fix |
| Edit | `src/skills/joycraft-decompose.md` | rule; extend existing gate to ≤50 claims |
| Edit | `src/skills/joycraft-research.md` | rule at Present gates |
| Edit | `src/skills/joycraft-bugfix.md` | rule at the spec presentation |

## Approach

One short inline rule per skill plus the design ordering surgery. The rule is
three sentences; the design fix moves one instruction across a step boundary
and rewords the Step 5 gate to "decisions already terminated in Step 4."

Rejected alternative: enforcing via a standalone "gatekeeper" skill invoked
between steps — rejected because it adds a door and reintroduces the
cross-step memory dependence this spec removes.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Human answers questions directly in conversation (as on 2026-07-29) | counts as decide's termination — stamp `decisions:` frontmatter and proceed; no dossier required |
| Artifact has zero open questions and no ≤50 load-bearing claims | gate passes silently — decide not invoked |
| Question surfaces after presentation (human raises it) | normal decide flow; the rule governs pre-presentation state only |

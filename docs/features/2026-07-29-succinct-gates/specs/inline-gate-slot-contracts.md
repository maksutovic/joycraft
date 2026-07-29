---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
mode: isolated
---

# Inline Gate Slot Contracts — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-29-succinct-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-29
> **Estimated scope:** 1 session / 7 files edited / ~15-20 lines added each

---

## What

At the human-review gate step of seven canonical skills in `src/skills/` —
`joycraft-new-feature`, `joycraft-design`, `joycraft-decompose`,
`joycraft-research`, `joycraft-decide`, `joycraft-tune`, `joycraft-optimize`
— replace the one-line output-style pointer *at that step* with an inline
fixed-slot chat template (decision D2). The style-doc pointer stays wherever
it governs non-gate output; only the gate moment gets the stronger inline
mechanism.

The inline block each skill carries (adapted to its gate's nouns):

```markdown
At this gate, your chat message is EXACTLY this template — nothing outside it.
The content lives in the artifact, not the chat.

**<Gate name>: <outcome in one line>**            ← 1 line
Artifact: <absolute path> (opened) · canonical: <md path>   ← 1 line
Decisions needed: <N> — <ids/titles, comma-separated>       ← 1-2 lines
<one-line summary per decision, only if N ≤ 4>              ← ≤4 lines
Next: <the single next action>                              ← 1 line

Ten lines maximum. If you are about to write an eleventh line, the content
belongs in the artifact — move it there.
```

Rationale line to include verbatim in each skill (one sentence, so future
editors don't "helpfully" revert to a pointer): inline placement is
load-bearing — referenced docs get partially read or skipped at output time
(Anthropic skill-authoring guidance; observed live 2026-07-29).

## Why

Thirteen skills already cite the output-style doc and a decompose review
still shipped as a multi-page chat wall on 2026-07-29. A pointer governs tone
at best; the slot template physically removes the space where yapping lives.

## Acceptance Criteria

- [ ] All seven skills contain the fixed-slot template inline at their gate
  step, adapted to the gate's nouns, including the ten-line cap sentence.
- [ ] The template block sits under the skill's report/present heading,
  anchored to a preceding heading (matches the pointer test's placement
  idiom).
- [ ] No skill's gate step relies solely on the style-doc pointer anymore.
- [ ] The position-fragile windowed tests are untouched and green after spec
  6 syncs (see Constraints).
- [ ] Build passes.
- [ ] Tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Template present in all 7 skills | spec 5 adds the content test; this spec verifies by grep during implementation (`rg "Ten lines maximum" src/skills | wc -l` = 7) | manual → unit in spec 5 |
| Placement under gate heading | manual heading-anchor check per file during edit | manual → unit in spec 5 |
| Windowed tests unaffected | run `pnpm test` (they read installed copies — stay green now; real exposure at spec 6) | integration |

**Execution order:**
1. This spec's mechanical oracle lands in spec 5; here, edit + grep-verify
2. Run `pnpm test` before and after — identical results expected (installed
   copies are stale until spec 6)
3. Implement all seven edits in `src/skills/` only

**Smoke test:** `rg -c "Ten lines maximum" src/skills/` — instant.

**Before implementing, verify your test harness:**
1. Confirm `pnpm test` is green before editing
2. Confirm the windowed tests read installed copies (`.claude/skills/`), so a
   placement mistake here surfaces at spec 6 — position edits away from the
   1500-char windows sliced from the `Retrieve Before You Reason` heading
   (research, design, decompose) and the spec-body-structure fences (design,
   new-feature)
3. Smoke test above runs instantly

## Constraints

- MUST: edit `src/skills/` only — canonical sources.
- MUST: keep each skill's existing style-doc pointer for non-gate output
  moments; delete it only where the slot template directly replaces it.
- MUST: avoid the windowed test regions (`tests/retrieval-pass-skill.test.ts`
  slices 1500 chars from `Retrieve Before You Reason` in research/design/
  decompose; `tests/confidence-scoring-skill.test.ts` slices between fences
  from `Use this structure for each spec body:` in design/new-feature and
  bans the word `percentage` file-wide in design/new-feature/decide).
- MUST NOT: regenerate bundles or sync installed copies — spec 6 owns both.
- MUST NOT: restate style-doc rules inline — the slot template is structure,
  not tone; tone still defers to the doc.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `src/skills/joycraft-new-feature.md` | slot template at Phase 2 presentation + Phase 4 handoff |
| Edit | `src/skills/joycraft-design.md` | slot template at Step 4 present-and-stop |
| Edit | `src/skills/joycraft-decompose.md` | slot template at the review presentation |
| Edit | `src/skills/joycraft-research.md` | slot template at both Present gates |
| Edit | `src/skills/joycraft-decide.md` | slot template at the dossier presentation |
| Edit | `src/skills/joycraft-tune.md` | slot template at the assessment report |
| Edit | `src/skills/joycraft-optimize.md` | slot template at the overhead report |

## Approach

One edit per skill, identical skeleton, gate-specific nouns. Work through the
files in the Affected Files order, running the smoke grep after each. Keep
each block ~15 lines including the fence and the rationale sentence.

Rejected alternative: a shared template in the style doc that skills cite —
rejected because it recreates the exact failure being fixed (referenced docs
get skimmed at output time).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Gate with zero decisions needed | "Decisions needed: 0" line kept — the slot renders, the per-decision lines drop |
| More than 4 decisions | per-decision summaries move to the artifact; chat carries count + ids only |
| Codex/Pi/Copilot variants | generated from these sources by spec 6 — no hand edits to generated trees |

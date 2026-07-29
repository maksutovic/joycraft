---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
mode: batch
---

# Handoff Briefing Prompts — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-29-succinct-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-29
> **Estimated scope:** 1 session / ~8 files edited / ~15 lines each

---

## What

Replace the bare "run `/clear`, then `/joycraft-<next> <path>`" handoff at
the end of every skill that hands off to a fresh session with a fenced,
copy-pasteable **briefing prompt** (decision D5). The block the human pastes
after `/clear` carries five parts, in order:

1. The command line: `/joycraft-<next> <path>`
2. **Pickup sentence** — what was just produced and when ("You are picking
   up feature <slug>, decomposed <date>.")
3. **Decided / don't-reopen** — stamped decisions by id, with the explicit
   instruction not to reopen them
4. **Start / order** — the first concrete unit (spec file + mode) and where
   the ordering lives (specs/README.md)
5. **Hazard + Done-when** — the one known trap and the mechanical completion
   check

The template each skill carries inline (adapted nouns per gate):

````markdown
End with this handoff block — a prompt the human pastes into the fresh
session after `/clear`. Fill every line; a cold agent must be able to act
on this block alone without re-deriving context.

```
/joycraft-<next-skill> <path>

You are picking up <artifact> for <feature-slug>, <verbed> <date>.
Decisions <ids> are stamped in <where> — do not reopen them.
Start: <first unit + mode>. Order: <where the ordering lives>.
Hazard: <the one known trap, or "none known">.
Done when: <mechanical check>.
```
````

Skills that hand off (verify the full list during implementation via
`rg -l "/clear" src/skills/`): `joycraft-new-feature`, `joycraft-interview`,
`joycraft-decompose`, `joycraft-design`, `joycraft-research`,
`joycraft-decide`, `joycraft-bugfix`, `joycraft-session-end`. Skills that
continue in-session (`implement`, `implement-feature`, `spec-done`) keep
their existing flow.

## Why

The human has been hand-writing these briefings because the bare command
loses everything the gate just established — a cold agent re-derives context,
re-opens settled decisions, and misses known hazards (D5, stamped
2026-07-29). The fresh-session pattern is core to Joycraft; its handoff
should carry the context forward, not discard it.

## Acceptance Criteria

- [ ] Every handoff-emitting skill instructs the five-part briefing block
  with a filled, gate-specific example — no skill ends at a bare command.
- [ ] The block is fenced and copy-pasteable: command first, prompt body
  after a blank line.
- [ ] Each briefing stays within ~8 lines (it is itself a gate output — the
  D2 discipline applies).
- [ ] Build passes.
- [ ] Tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Briefing present per handoff skill | spec 5 adds assertion group 5 (marker: `Done when:` inside a fenced block near the handoff heading); here grep `rg -c "Done when:" src/skills/` | manual → unit in spec 5 |
| No bare-command handoffs remain | grep each edited skill's handoff section for a `/clear`-then-command instruction without a following briefing fence | manual |

**Execution order:**
1. Mechanical oracle lands in spec 5; here, edit + grep-verify
2. `pnpm test` before and after — identical results expected (installed
   copies stale until spec 6)
3. Edit `src/skills/` only

**Smoke test:** `rg -c "Done when:" src/skills/` — instant.

**Before implementing, verify your test harness:**
1. `pnpm test` green before editing
2. Same windowed-test hazard as specs 2–4 — handoff sections are usually at
   file end, far from the sliced windows, but verify per file
3. Smoke test above runs instantly

## Constraints

- MUST: keep the `/clear` instruction — the briefing replaces what follows
  it, not the fresh-session pattern itself.
- MUST: the briefing is the final element of the skill's output — nothing
  after it.
- MUST: coexist with the spec-2 slot template — at gates that have one, the
  briefing block IS the "Next:" slot's expanded form; do not emit both a
  `Next:` line and a separate briefing.
- MUST NOT: exceed ~8 lines per briefing — a handoff that needs more is
  hiding artifact content in the prompt.
- MUST NOT: regenerate bundles or sync installed copies — spec 6 owns both.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `src/skills/joycraft-new-feature.md` | briefing block in Phase 4 handoff + Recommended Next Steps |
| Edit | `src/skills/joycraft-interview.md` | briefing block at draft handoff |
| Edit | `src/skills/joycraft-decompose.md` | briefing block at the implement handoff |
| Edit | `src/skills/joycraft-design.md` | briefing block at Step 5 post-approval handoff |
| Edit | `src/skills/joycraft-research.md` | briefing block at the design/decompose handoff |
| Edit | `src/skills/joycraft-decide.md` | briefing block at the post-dossier handoff |
| Edit | `src/skills/joycraft-bugfix.md` | briefing block at the implement handoff |
| Edit | `src/skills/joycraft-session-end.md` | briefing block at the next-session handoff |

## Approach

One inline template + one filled example per skill, nouns adapted (decompose
hands to implement-feature; design hands to decompose; research hands to
design; session-end hands to the next feature session). The filled example
is mandatory — the prose research behind the prior feature found concrete
examples beat abstract instructions (D6 precedent).

Rejected alternative: a shared briefing template in a referenced doc —
rejected for the same reason as spec 2: referenced docs get skimmed at
output time; the mechanism only works inline.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No known hazard for the next step | the Hazard line reads "none known" — the slot renders, never drops |
| Handoff target takes no path argument | command line stands alone; briefing body unchanged |
| Human continues in-session instead of clearing | briefing still printed — it costs nothing and documents state |

---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
mode: isolated
---

# Interview Joins the Gate Set — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-29-succinct-gates/brief.md`
> **Status:** Ready (follow-on — specs 1–9 shipped in 0.7.6; do not reopen them)
> **Date:** 2026-07-29
> **Estimated scope:** 1 session / 2 files edited

---

## What

Add `joycraft-interview` as the 8th gate skill on the already-shipped
succinct-gates rails. It was skipped by specs 2/3 (which covered 7 skills) —
`tests/gate-contract.test.ts` already lists interview in `HANDOFF_SKILLS`
but not `SLOT_TEMPLATE_SKILLS` or `RENDER_SKILLS`, so this is a coverage
gap, not a scoping decision. Field-verified 2026-07-29 on the diligent-cwt
project: the human had to ask "where's my artifact to review the brief?" and
got an improvised 213-line bespoke page instead of the installed D1 template.

In `src/skills/joycraft-interview.md`:

1. **Step 4 gains the five-step render flow** (decide's Step 4 pattern,
   identical wording skeleton to spec 3): after writing `brief.md`, fill ONLY
   the `<!-- SLOT:… -->` regions of `docs/templates/REVIEW_GATE_TEMPLATE.html`
   — open questions rendered as question cards, ordered by the skill's own
   priority call; write to `docs/features/<slug>/brief.html`; `open` /
   `xdg-open` before asking anything; if both fail, print the absolute path
   and continue; offer — don't push — a hosted artifact. Markdown stays
   canonical per D4; the HTML never carries content absent from the md.
2. **The free-form post-write chat is replaced by the D2 ~10-line slot
   template** inline at that step (outcome / artifact paths / open-question
   count / next action), followed by the existing D5 fenced briefing. Add the
   explicit line: "Do not summarize the brief after writing it — the artifact
   is the summary."
3. **One new Guidelines bullet** stating the two-channel rule: `brief.md` and
   its HTML render carry the content; chat carries decisions and the slot
   template; never restate in chat what the brief says — point at it.

In `tests/gate-contract.test.ts`: add `joycraft-interview` to
`SLOT_TEMPLATE_SKILLS` and `RENDER_SKILLS`.

## Why

Root cause of the "not yapless" verdict from the 2026-07-29 adversarial
review panel, and a direct maintainer directive: interview is a gate-ending
skill (it produces the draft brief the human must review) still running on
the pointer mechanism succinct-gates was built to kill. The brief's content
hit the human channel three times in one turn (playback → file → recap).
`.gitattributes` guidance already covers `docs/features/**/*.html` via spec 3
— verify, don't re-add.

## Acceptance Criteria

- [ ] `src/skills/joycraft-interview.md` Step 4 instructs the five-step
  render flow, including headless no-op and offer-don't-push hosted option.
- [ ] D4 canonical-md sentence present near the render step.
- [ ] D2 slot template inline at the post-write step, with the
  "artifact is the summary" ban.
- [ ] Two-channel Guidelines bullet present.
- [ ] `joycraft-interview` in `SLOT_TEMPLATE_SKILLS` and `RENDER_SKILLS`;
  `pnpm test` green.
- [ ] Bundles regenerated + installed copies synced (`pnpm sync-skills`) in
  the same commit.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Render step present | `rg -c "REVIEW_GATE_TEMPLATE.html" src/skills/joycraft-interview.md` ≥ 1 | smoke → gate-contract |
| Headless no-op wording | grep "print the absolute path and continue" | smoke → gate-contract |
| Slot template + roster entries | `tests/gate-contract.test.ts` extended rosters pass | unit |
| No regression | `pnpm test && pnpm typecheck` green | integration |

**Before implementing:** `pnpm test` green first; the windowed-test hazard
(confidence-scoring window slices `new-feature`, not interview — but verify)
applies to placement; run the smoke greps after editing.

## Constraints

- MUST: copy decide/spec-3's graceful degradation exactly — headless is a
  no-op, never a gate failure.
- MUST: markdown remains canonical (D4); slot-fill only, never freeform HTML.
- MUST: `pnpm sync-skills` + regenerated bundles in the same commit
  (AGENTS.md ALWAYS — the 0.7.3 lesson).
- MUST NOT: reopen or edit specs 1–9 or their shipped skill text in the
  other 7 gate skills.
- MUST NOT: change interview's exploratory character (Steps 1–3 untouched by
  this spec — the playback contract is the companion spec).

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `src/skills/joycraft-interview.md` | render flow + D2 slot template + Guidelines bullet at Step 4/6 |
| Edit | `tests/gate-contract.test.ts` | interview added to `SLOT_TEMPLATE_SKILLS`, `RENDER_SKILLS` |
| Regen | `src/{claude,codex,pi,copilot}-skills/`, installed trees | `pnpm sync-skills` |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Headless / CI / Pi isolated | print path, continue |
| Re-run interview on same slug | overwrite `brief.html` — it is a render, the md is the record |
| Hosted artifact declined | local file stands; no retry |

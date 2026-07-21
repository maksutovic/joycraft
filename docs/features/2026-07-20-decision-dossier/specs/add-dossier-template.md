---
status: done
owner: Maximilian Maksutovic
created: 2026-07-20
feature: 2026-07-20-decision-dossier
mode: batch
---

# Add Dossier Template — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-20-decision-dossier/brief.md`
> **Status:** Ready
> **Date:** 2026-07-20
> **Estimated scope:** 1 session / 1 new file (~250 lines HTML)

---

## What

A fixed HTML skeleton at `docs/templates/DECISION_DOSSIER_TEMPLATE.html`
that the joycraft-decide skill fills with content. Structure is locked
(header + locked-decisions strip, repeatable decision section with option
cards / blast-radius chips / optional flow diagram, assumptions manifest
with VERIFIED/UNVERIFIED chips, how-to-answer box, footer); the agent fills
content slots only. Derived from the two live dossiers produced 2026-07-20
(decision-dossier D1–D3 and model-tiering D1–D3 artifacts).

## Why

Freeform per-feature HTML would make every dossier a fresh persuasive
artifact; a fixed skeleton keeps dossiers consistent and narrows the
persuasion surface to content, where the manifest polices it.

## Acceptance Criteria

- [ ] `docs/templates/DECISION_DOSSIER_TEMPLATE.html` exists, self-contained
      (zero external requests: no CDN, fonts, or remote images)
- [ ] Light and dark themes both render via token-level CSS custom
      properties (`prefers-color-scheme` + `data-theme` overrides)
- [ ] Every content slot is an HTML comment (`<!-- SLOT:name — guidance -->`)
      with filling guidance; a header comment documents the fixed-structure
      contract (agent MUST NOT alter structure/CSS, only fill slots)
- [ ] The manifest section's row markup includes both VERIFIED and
      UNVERIFIED chip variants; the header comment states UNVERIFIED
      labeling is mandatory for unchecked claims (RF-5)
- [ ] The decision section block is repeatable (copy-per-decision) and the
      how-to-answer box names the reject-framing escape
- [ ] Opened locally with placeholder slot content, the page renders without
      layout breakage, horizontal body scroll, or overlapping elements

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Self-contained | Grep template for `http`/`//` external refs → none (except in slot guidance comments) | unit (grep) |
| Both themes render | Open with placeholder content; toggle OS dark mode; visually verify | manual/e2e |
| Slots documented | Grep for `SLOT:` comments; every fillable region has one | unit (grep) |
| Renders cleanly | `open` the file with placeholders; check layout | manual/e2e |

**Execution order:** write the template with placeholder content in slots,
verify rendering, then strip placeholders back to slot comments.

**Smoke test:** `open docs/templates/DECISION_DOSSIER_TEMPLATE.html` (~5s).

**Before implementing, verify your test harness:** the render check must use
a copy with placeholders filled — an empty-slot template renders trivially
and verifies nothing.

## Constraints

- MUST: structure derived from the two shipped dossiers (proven layout)
- MUST: keep the fixed-structure contract in a header comment
- MUST NOT: place the template in `src/templates/` or `templates/` — pilot
  is repo-local per brief decision #7; promotion is a post-pilot PR
- MUST NOT: JavaScript beyond theme handling — the dossier is display-only
  by architecture (capture happens in the question UI)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| create | `docs/templates/DECISION_DOSSIER_TEMPLATE.html` | the fixed skeleton |

## Approach

Port the shared CSS token system and section markup from the two live
dossiers into one parameterized skeleton; replace all content with SLOT
comments. Rejected alternative: inlining the skeleton in the skill markdown —
rejected because ~250 lines of HTML would dominate the skill's instruction
budget and skills already support sibling files in the feature's repo-local
pilot (the template lives in docs/templates/, an existing installed surface).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Feature with 1 decision | Single decision block; locked strip may be empty — header copes |
| Decision with 2 options (binary) | Option grid renders 2 cards without stretching |
| No unverified assumptions | Manifest renders with all-VERIFIED rows; section never omitted |
| Very long option tradeoffs | Cards grow vertically; grid stays aligned via equal-height columns |

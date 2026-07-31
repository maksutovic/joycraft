---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-31
feature: 2026-07-31-team-ready-gates
---

# Discoveries — stamp-gate-artifacts

**Date:** 2026-07-31
**Spec:** docs/features/2026-07-31-team-ready-gates/specs/stamp-gate-artifacts.md

## The spec's Affected Files roster overshot by one skill and undershot the existing plumbing
**Expected:** Seven skills (including bugfix) needed stamp + autoOpen edits, and init/upgrade needed new code to ship `REVIEW_GATE_TEMPLATE.html` to `docs/templates/`.
**Actual:** bugfix has no render/open step at all — the six stamped gates are interview, new-feature, tune, design, decide, decompose. And init/upgrade already shipped the template via the bundled TEMPLATES record; the only missing piece was the tracked repo copy at `docs/templates/` (the dossier template already followed that convention).
**Impact:** Decompose should verify a skill actually has the step a spec targets before rostering it; template-shipping ACs should check the TEMPLATES record first.

## Render-flow growth collides with character-window adjacency guards
**Expected:** Adding two steps (stamp, autoOpen check) to the render blocks would be a local, test-neutral edit.
**Actual:** `tests/artifact-render-steps.test.ts` (render-to-cap distance < 2000) and `tests/gate-slot-contract-placement.test.ts` (heading-to-cap distance < 2500) both tripped — the new steps sit inside those windows by design. Thresholds widened to 3200/3600 with comments citing this spec.
**Impact:** Any future growth of the render flow will hit the same two windows; they are the remaining character-offset guards the gate-contract suite deliberately avoids.

---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
---

# Discoveries — handoff briefings: the `/clear` grep undercounts, and decide had no handoff

**Date:** 2026-07-29
**Spec:** docs/features/2026-07-29-succinct-gates/specs/handoff-briefing-prompts.md

## `rg -l "/clear" src/skills/` finds 3 of 8 handoff skills
**Expected:** Grepping for `/clear` enumerates every skill that emits a handoff.
**Actual:** Only 3 files match — the other handoffs render `/clear` through the `{{clear}}` placeholder, so the real roster comes from `## Recommended Next Steps` sections. Separately, `joycraft-decide` had no handoff section at all and needed one added (gated on the decompose gate being open).
**Impact:** Enumerate handoff sites by the `## Recommended Next Steps` heading, never by literal `/clear`. (The spec's no-sync constraint also failed here — see `2026-07-29-test-suite-regenerates-bundles.md`, which is the one home for that discovery.)

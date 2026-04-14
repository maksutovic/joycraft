# Discoveries — Clear Nudge Code Fence Placement

**Date:** 2026-04-14
**Spec:** `docs/specs/skills/bugfix-clear-nudge-outside-handoff-block.md`

## Original spec rejected the correct approach
**Expected:** The original `add-clear-nudges` spec (token-discipline) would produce deterministic nudge output
**Actual:** The spec explicitly rejected putting the nudge inside code fences ("Adding the nudge as a comment/annotation inside the handoff code block... is less flexible and harder to maintain"), choosing `**Tip:**` lines outside instead. This turned out to be the root cause of non-deterministic output.
**Impact:** When designing skill output, anything the model MUST say should be inside the code-fenced template block. Prose outside code fences is treated as optional guidance. This is a general principle for skill authoring — not just this specific fix.

## Two implement/level5 skills still have outside-fence Tip lines
**Expected:** Only the 5 targeted skills had the pattern
**Actual:** `joycraft-implement` and `joycraft-implement-level5` also have `**Tip:**` lines outside code fences
**Impact:** These should be fixed in a follow-up if deterministic clear nudges matter for those skills too

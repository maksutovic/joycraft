---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
---

# Discoveries — pilot pattern vs. src/ parity test

**Date:** 2026-07-21
**Spec:** `docs/features/2026-07-21-living-harness/specs/build-ledger-lifecycle.md`

## PILOT "never touch src/" collides with `session-end-rescope.test.ts`
**Expected:** Editing only `.claude/skills/joycraft-session-end/SKILL.md` (like spec 1 did for `joycraft-add-fact`, which has no such test) would satisfy the pilot pattern.
**Actual:** `tests/session-end-rescope.test.ts` asserts byte-for-byte equality between `.claude/skills/joycraft-session-end/SKILL.md` and `src/claude-skills/joycraft-session-end.md`; editing only the installed copy broke it. Applied the identical PILOT-marked change to the `src/claude-skills/` variant (Claude-only, not codex/pi variants) to keep parity green.
**Impact:** Future PILOT specs touching a skill should check for a `*-rescope.test.ts`/sync test before assuming "installed copy only" is safe — some skills (like session-end) have a hard sync invariant with their `src/claude-skills/` source that pilot edits must also satisfy.

---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
---

# Discoveries — taxonomy sweep vs. "MUST NOT touch src/"

**Date:** 2026-07-21
**Spec:** `docs/features/2026-07-21-living-harness/specs/upgrade-optimize-v2.md`

## The spec's own constraint collided with 4 skills' byte-parity tests
**Expected:** The spec's Constraints said "MUST NOT: touch `src/` or `templates/`," so the taxonomy sweep (`entry:` frontmatter on all 22 skills) would edit only `.claude/skills/`.
**Actual:** `joycraft-decompose`, `joycraft-implement`, `joycraft-spec-done`, and `joycraft-session-end` each have a test (`decompose-modes.test.ts`, `implement-mode-handoff.test.ts`, `spec-done-skill.test.ts`, `session-end-rescope.test.ts`) enforcing installed-copy parity against `src/claude-skills/`. Editing only the installed copy would have broken 3 of the 4 (only decompose's test has the PILOT-marker subsequence escape hatch). Followed the precedent from `2026-07-21-pilot-src-touch-forced-by-parity-test.md`: edited `src/skills/<name>.md` with a `<!-- harness:claude -->`-scoped `entry:` line, regenerated via `scripts/generate-bundled-files.mjs`, then synced the installed copy. The other 18 skills (no parity test) were edited installed-copy-only per the spec's constraint as written.
**Impact:** "MUST NOT touch src/" needs a standing exception for any skill with a `*-rescope`/`*-modes`/`*-handoff`/`*-skill` byte-parity test — check for one before assuming an installed-copy-only edit is safe, same lesson as the earlier discovery but now confirmed to apply beyond session-end.

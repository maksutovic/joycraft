---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
---

# Discoveries — word-boundary regex unreliable when read from a pattern file

**Date:** 2026-07-21
**Spec:** `docs/features/2026-07-21-living-harness/specs/create-harden-skill.md`

## `\b` fails when the pattern comes from deny-patterns.txt via `while read`
**Expected:** `\b(main|master)\b` would match identically whether typed literally or read from `.claude/hooks/joycraft/deny-patterns.txt` into a shell variable.
**Actual:** This environment's `grep` (shadowed by `ugrep`) unreliably matches `\b` escapes when the pattern arrives via `while read`, though the identical pattern typed literally matches fine.
**Impact:** Deny patterns must use explicit boundary forms — `(main|master)($|\s)` — never `\b`. Verified against block-cases and false-positive cases (`main-docs`, `feature/main-thing`, `maintenance`).

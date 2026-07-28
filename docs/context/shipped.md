---
last_updated: 2026-07-27
last_updated_by: Maximilian Maksutovic
---

# Shipped Ledger

> One row per feature that has been extracted (merged + folded into decision-log/discoveries) and reaped. Newest-first, prepend-only, 200-line budget — when this file crosses the budget, the oldest rows rotate to a numbered shard (`shipped-001.md`, …) with a pointer-only manifest.

| Date | Feature | What shipped | Where (paths) | PR | Owner |
|------|---------|--------------|----------------|----|-------|
| 2026-07-27 | 2026-07-27-human-readable-output-style | House style contract for human-facing output: bundled reference doc (8 positive rules + worked example), pointers in 11 skills, presence tests, repo-local path-asymmetry note | `src/templates/reference/output-style.md`, `src/skills/`, `tests/output-style-*.test.ts`, `docs/reference/skill-authoring.md` | #62 | Maximilian Maksutovic |
| 2026-07-21 | 2026-07-21-living-harness | Provenance/confidence/retrieval gates, knowledge substrate + shipped ledger, joycraft-harden, optimize v2 six-disposition audit + Reaper, skill taxonomy, N=3 gate evals | `.claude/skills/`, `src/skills/`, `docs/context/`, `docs/reference/`, `docs/features/2026-07-21-living-harness/` | #55 | Maximilian Maksutovic |

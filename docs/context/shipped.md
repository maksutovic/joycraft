---
last_updated: 2026-07-31
last_updated_by: Maximilian Maksutovic
---

# Shipped Ledger

> One row per feature that has been extracted (merged + folded into decision-log/discoveries) and reaped. Newest-first, prepend-only, 200-line budget — when this file crosses the budget, the oldest rows rotate to a numbered shard (`shipped-001.md`, …) with a pointer-only manifest.

| Date | Feature | What shipped | Where (paths) | PR | Owner |
|------|---------|--------------|----------------|----|-------|
| 2026-07-31 | 2026-07-31-team-ready-gates | Native question UI directive in all gate skills, defer-to-person (`assigned` state + tagged cards), custom output templates (docs/templates/output/), implementing-agent handoff prompt in briefs, timestamp+revision stamps + persisted autoOpen, install-first README + SECURITY.md | `src/skills/`, `src/templates/REVIEW_GATE_TEMPLATE.html`, `src/version.ts`, `docs/templates/`, `README.md`, `SECURITY.md`, `tests/gate-contract.test.ts` | #67 | Maximilian Maksutovic |
| 2026-07-29 | 2026-07-29-succinct-gates | Slot-capped gate chat messages + auto-opened HTML gate artifacts (one generic template), pre-presentation decide rule, fenced briefing handoffs in 8 skills, AGENTS.md Execution Profile (init/upgrade/tune) injected into briefings, gate-contract tests | `src/templates/REVIEW_GATE_TEMPLATE.html`, `src/skills/`, `src/execution-profile.ts`, `tests/gate-contract.test.ts` | #65 | Maximilian Maksutovic |
| 2026-07-27 | 2026-07-27-human-readable-output-style | House style contract for human-facing output: bundled reference doc (8 positive rules + worked example), pointers in 11 skills, presence tests, repo-local path-asymmetry note | `src/templates/reference/output-style.md`, `src/skills/`, `tests/output-style-*.test.ts`, `docs/reference/skill-authoring.md` | #62 | Maximilian Maksutovic |
| 2026-07-21 | 2026-07-21-living-harness | Provenance/confidence/retrieval gates, knowledge substrate + shipped ledger, joycraft-harden, optimize v2 six-disposition audit + Reaper, skill taxonomy, N=3 gate evals | `.claude/skills/`, `src/skills/`, `docs/context/`, `docs/reference/`, `docs/features/2026-07-21-living-harness/` | #55 | Maximilian Maksutovic |

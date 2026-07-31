# Team-Ready Gates — Feature Specs

> **Parent Brief:** `docs/features/2026-07-31-team-ready-gates/brief.md`
> **Decomposition:** `docs/features/2026-07-31-team-ready-gates/decompose.md`
> **Status:** Decomposed 2026-07-31, ready for implementation

## What this feature does

Makes the gates the team surface: every gate question arrives through the AskUserQuestion picker (with codex/pi structured-chat fallback), any question can be deferred to a named person with assignee-tagged output, users can supply their own PRD/output templates, briefs carry a paste-into-Claude-Code agent-handoff prompt, gate HTML gets timestamp + revision tracking with a persisted auto-open setting, and the public docs (README, SECURITY.md) reach what enterprise adopters expect. Decisions D1–D13 are stamped in the brief's frontmatter.

## Specs

| # | Spec | Depends On | Mode | Notes |
|---|------|-----------|------|-------|
| 1 | [harden-question-directive.md](harden-question-directive.md) | — | batch | AskUserQuestion directive (≥2 options, Pattern B) in the five gate skills, codex/pi fallback |
| 2 | [fix-model-question-skip.md](fix-model-question-skip.md) | 1 | batch | Split model/effort out of the bundled execution-profile block; route through the directive |
| 3 | [add-defer-to-person.md](add-defer-to-person.md) | 1 | batch | "Defer to <name>" first-class answer, assigned section in md, assignee-tagged HTML cards, visible confirmation |
| 4 | [support-custom-output-templates.md](support-custom-output-templates.md) | — | batch | docs/templates/output/ lookup before bundled defaults; init/upgrade scaffold the dir |
| 5 | [add-agent-handoff-slot.md](add-agent-handoff-slot.md) | 4 | batch | "Prompt for the implementing agent" section in brief/PRD output |
| 6 | [stamp-gate-artifacts.md](stamp-gate-artifacts.md) | 1 | batch | Timestamp + revision banner, persisted autoOpen in state.json, ship template to docs/templates/, zero-drift check |
| 7 | [restructure-public-docs.md](restructure-public-docs.md) | — | batch | Install-first README + TOC; thin SECURITY.md |

All specs run in `batch` mode (human-approved 2026-07-31): implement the whole queue in one conversation, wrap once at the end with a single `joycraft-session-end`.

## Execution waves

- Wave 1: specs 1, 7 — parallel-safe (Affected Files disjoint: gate skills vs README/SECURITY.md)
- Wave 2 (after wave 1): specs 2, 4 — parallel-safe (Affected Files disjoint: joycraft-tune.md + execution-profile.ts vs the other gate skills' output steps)
- Wave 3 (after wave 2): specs 3 → 5 → 6 — NOT parallel-safe (overlap: `src/templates/REVIEW_GATE_TEMPLATE.html` slot-comment guidance and the same gate-skill render steps); sequential, in that order

Parallel-safe = the wave's specs touch disjoint Affected Files, so they may run as
concurrent subagents/worktrees. Waves without the marker run sequentially.

Cross-cutting hazard: every spec that edits `src/skills/` must run `pnpm sync-skills` and commit regenerated + installed copies in the same commit (the 0.7.3 stale-tree incident); spec 6 ends with a zero-drift verification of the generators.

## How to use this file

Run the whole queue with `/joycraft-implement-feature docs/features/2026-07-31-team-ready-gates/` — it executes the specs in wave order (parallel-safe waves may run as concurrent subagents; everything else runs sequentially in the driving conversation) and finishes with session-end. Or run one spec at a time with `/joycraft-implement <spec-path>`; the implement skill reads this README first so it understands the spec's position in the wave plan, and continues through the queue itself. Each spec is self-contained for the actual implementation; this README provides ordering context only.

# Decision Dossier — Feature Specs

> **Parent Brief:** `docs/features/2026-07-20-decision-dossier/brief.md`
> **Research:** `docs/research/2026-07-20-reading-fatigue-panel.md`
> **Status:** Decomposed 2026-07-20, ready for implementation

## What this feature does

Replaces reading-as-review with deciding-as-review at the design bookend:
after a brief/design is produced, the human gets an auto-opened HTML decision
dossier (context brought TO the decision) and answers ≤5 forced-choice
questions via the native question UI — choice + one-sentence rationale, with
a reject-framing escape. Every open question terminates as clarified,
backlogged, or discarded; decompose hard-gates on unresolved decisions.
**Pilot is repo-local**: skills/templates in this repo only, `src/` untouched
(brief decision #7); promotion to product is a post-pilot PR.

## Specs

| # | Spec | Depends On | Mode | Notes |
|---|------|-----------|------|-------|
| 1 | [verify-question-capture.md](verify-question-capture.md) | — | batch | Spike: prove UI fires from an installed skill + pick the rationale-capture pattern (fail-fast gate for 3–4) |
| 2 | [add-dossier-template.md](add-dossier-template.md) | — | batch | Fixed HTML skeleton at docs/templates/, agent fills SLOT comments only |
| 3 | [add-decide-skill.md](add-decide-skill.md) | 1, 2 | checkpoint | Repo-local joycraft-decide: derive questions, render + open dossier, capture, stamp, enforce terminal states |
| 4 | [wire-routing-and-gate.md](wire-routing-and-gate.md) | 3 | checkpoint | design/new-feature route to decide; decompose gates on open frontmatter decisions |

## Execution waves

- Wave 1: specs 1, 2 — parallel-safe (Affected Files disjoint: scratch
  project + discovery doc vs. one template file)
- Wave 2 (after wave 1): spec 3 — sequential. **Fail-fast:** if spec 1 ends
  in a RED EXCEPTION (question UI doesn't fire from installed skills), stop —
  specs 3–4 need re-architecture (chat-box capture) before proceeding.
- Wave 3 (after wave 2): spec 4 — sequential

Parallel-safe = the wave's specs touch disjoint Affected Files, so they may
run as concurrent subagents/worktrees. Waves without the marker run
sequentially.

Note: no `.gitattributes` spec — `docs/features/** linguist-generated=true`
(core-loop-refocus) already covers generated `dossier.html` files.

## How to use this file

Run the whole queue with
`/joycraft-implement-feature docs/features/2026-07-20-decision-dossier/` —
it executes the specs in wave order (parallel-safe waves may run as
concurrent subagents; everything else runs sequentially in the driving
conversation) and finishes with session-end. Or run one spec at a time with
`/joycraft-implement <spec-path>`; the implement skill reads this README
first so it understands the spec's position in the wave plan, and continues
through the queue itself. Each spec is self-contained for the actual
implementation; this README provides ordering context only.

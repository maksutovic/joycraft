# Living Harness — Feature Specs

> **Parent Brief:** `docs/features/2026-07-21-living-harness/brief.md`
> **Design:** `docs/features/2026-07-21-living-harness/design.md`
> **Status:** Decomposed 2026-07-21, ready for implementation

## What this feature does

Converges the compound-engineering track and the living-harness audit loop into one sprint: Half A kills silent variance before it propagates (provenance-cited specs, confidence-anchored claims, retrieval before decisions, one-home knowledge, distill-then-delete exhaust), Half B keeps the installed harness true (prose boundaries hardened into machine checks, rule provenance + probation, a six-disposition self-audit with a Reaper, session-fed harness growth behind human approval, and an N≥3 eval bar on the gates). All changes are repo-local `.claude/skills/` + `docs/` behind PILOT markers; `src/` propagation waits for pilot survival.

## Specs

| # | Spec | Depends On | Mode | Notes |
|---|------|-----------|------|-------|
| 1 | [scaffold-knowledge-substrate.md](scaffold-knowledge-substrate.md) | — | checkpoint | anchors.md + shipped.md + authoring rule; decision-log flips newest-first (D7) |
| 2 | [create-harness-config.md](create-harness-config.md) | — | checkpoint | Committed `docs/.joycraft/config.json` (tiers/maps/ladder, D4) + legacy state migration |
| 3 | [add-retrieval-pass.md](add-retrieval-pass.md) | 1 | checkpoint | Grep-first "retrieve before you reason" in research/design/decompose (S3) |
| 4 | [add-provenance-gate.md](add-provenance-gate.md) | 3* | checkpoint | `[src: …]` cites + INVENTED flagging in decompose; verify oracle re-pointed (S1) |
| 5 | [add-confidence-scoring.md](add-confidence-scoring.md) | 1, 3* | checkpoint | Anchor self-scoring + decide audit + ≤50 block (S2, D5); vocab + reconcile riders |
| 6 | [build-ledger-lifecycle.md](build-ledger-lifecycle.md) | 1 | isolated | Session-end ledger row + reap marker (D1); overlap check; rotation/shards (S4, S5, D2) |
| 7 | [create-harden-skill.md](create-harden-skill.md) | — | isolated | New `joycraft-harden` (entry: agent, D3); ≥1 boundary converted; tune declared/verified (S6, S7) |
| 8 | [upgrade-optimize-v2.md](upgrade-optimize-v2.md) | 4, 5, 6, 7* | isolated | Six dispositions + evidence labels + budgets; skill taxonomy sweep (S8, D3) |
| 9 | [add-reaper-pass.md](add-reaper-pass.md) | 6, 8 | checkpoint | gh-verified delete of shipped folders; archive-move undead (D1, D6) |
| 10 | [run-gate-evals.md](run-gate-evals.md) | 4, 6, 9 | checkpoint | N≥3 fresh-subagent evals of the three gates, timeline-graded (S10) |

\* Starred dependencies are file-serialization only (shared SKILL.md files), not logical: 4 follows 3 (both edit decompose), and 8's taxonomy sweep touches every skill file so it must follow all skill-editing specs.

## Execution waves

- Wave 1: specs 1, 2, 7 — parallel-safe (Affected Files disjoint: context/reference docs vs `docs/.joycraft` vs harden/tune/AGENTS.md/hooks)
- Wave 2 (after 1): specs 3, 6 — parallel-safe (research/design/decompose vs session-end/add-fact/knowledge-lifecycle)
- Wave 3 (after 3): specs 4, 5 — parallel-safe (decompose/verify vs design/new-feature/decide)
- Wave 4 (after 4, 5, 6, 7): spec 8 — sequential (sweeps all skill files)
- Wave 5 (after 8): spec 9 — sequential (same file as 8)
- Wave 6 (after 9): spec 10 — sequential (evals run against the finished gates)

Parallel-safe = the wave's specs touch disjoint Affected Files, so they may run as
concurrent subagents/worktrees. Waves without the marker run sequentially.

Mode mix is intentional: checkpoint for the medium doc/skill specs (atomic commit each), isolated for the three heavy specs (6, 7, 8) whose scope would pollute a shared context.

## How to use this file

Run the whole queue with `/joycraft-implement-feature docs/features/2026-07-21-living-harness/` — it executes the specs in wave order (parallel-safe waves may run as concurrent subagents; everything else runs sequentially in the driving conversation) and finishes with session-end. Or run one spec at a time with `/joycraft-implement <spec-path>`; the implement skill reads this README first so it understands the spec's position in the wave plan, and continues through the queue itself. Each spec is self-contained for the actual implementation; this README provides ordering context only.

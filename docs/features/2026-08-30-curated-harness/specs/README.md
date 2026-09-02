# Curated Harness — Feature Specs

> **Parent Brief:** `docs/research/2026-08-30-curated-harness-brief.md`
> **Design:** `docs/features/2026-08-30-curated-harness/design.md`
> **Research:** `docs/research/2026-08-30-curated-harness-research.md` · Panel: `docs/research/2026-09-01-context-map-panel-verdict.md`
> **Status:** Decomposed 2026-09-01, ready for implementation

## What this feature does

Incorporates the memory-systems critique into Joycraft as six workstreams: read-telemetry for the knowledge layer (a `joycraft telemetry` scanner whose voluntary-read counts make Reaper RETIRE dispositions defensible), a graduate-or-die discovery lifecycle (D1's 7-day advisory rule, one home), harden-first capture routing, elicit-first directional `## Product Identity` content plus a check-shaped folder map in the generated L1 files, README positioning, and a per-project auto-memory-disable recommendation. Decisions D1–D6 are stamped — do not reopen them.

## Specs

| # | Spec | Depends On | Mode | Notes |
|---|------|-----------|------|-------|
| 1 | [add-telemetry-scanner-core.md](add-telemetry-scanner-core.md) | — | isolated | Pure scanner module: Claude + Pi transcript parsing, mandated/voluntary tagging |
| 2 | [add-codex-telemetry-parser.md](add-codex-telemetry-parser.md) | 1 | batch | Best-effort Codex `exec_command` parser behind the same interface, labeled degraded |
| 3 | [add-telemetry-cli-and-store.md](add-telemetry-cli-and-store.md) | 1 | checkpoint | `joycraft telemetry` subcommand + gitignored `docs/.joycraft/telemetry.json` with session dedupe |
| 4 | [wire-session-end-telemetry.md](wire-session-end-telemetry.md) | 3 | batch | session-end invokes via npx, graceful skip (`INACCESSIBLE`) |
| 5 | [add-optimize-telemetry-evidence.md](add-optimize-telemetry-evidence.md) | 3 | checkpoint | Exactly-seven evidence labels; Reaper cites counts under pre-committed thresholds |
| 6 | [add-discovery-staleness-lifecycle.md](add-discovery-staleness-lifecycle.md) | 4, 5 | checkpoint | 7-day rule lands once in knowledge-lifecycle.md; skills cite it |
| 7 | [add-decay-category-bans.md](add-decay-category-bans.md) | — | batch | Three decay-category reject-signals before add-fact classification |
| 8 | [reorder-add-fact-harden-first.md](reorder-add-fact-harden-first.md) | 6, 7 | checkpoint | Escalation question first, Step 6 folded; session-end 1b gate |
| 9 | [add-product-identity-generators.md](add-product-identity-generators.md) | — | checkpoint | Regex-guarded `## Product Identity` section in both generators, elicit-first |
| 10 | [add-identity-elicitation.md](add-identity-elicitation.md) | 9 | batch | gather-context questions + D5 conditions; interview gets a pointer |
| 11 | [add-folder-map-check.md](add-folder-map-check.md) | 9* | checkpoint | Check-shaped folder map, tune drift-diff, own AGENTS.md tree trimmed |
| 12 | [add-positioning-readme.md](add-positioning-readme.md) | — | batch | Stance + Acknowledgments; rides any release PR |
| 13 | [add-init-auto-memory-offer.md](add-init-auto-memory-offer.md) | — | batch | Interactive guarded `autoMemoryEnabled: false` offer, project scope only |
| 14 | [add-tune-auto-memory-finding.md](add-tune-auto-memory-finding.md) | — | batch | Advisory finding + graduate-then-archive; spares `joycraft-owner.txt` |

\* Spec 11's dependency on 9 is file-overlap ordering (both edit `src/improve-claude-md.ts` and `src/agents-md.ts`), not a logical dependency.

## Execution waves

- Wave 1: specs 1, 7, 9, 12, 13, 14 — parallel-safe (Affected Files disjoint; specs 7 and 14 edit different skill files, so their regenerated/installed trees do not collide)
- Wave 2 (after wave 1): specs 2, 3, 10, 11 — NOT parallel-safe (overlap: `src/telemetry.ts` between specs 2 and 3) — sequential
- Wave 3 (after 3): specs 4, 5 — parallel-safe (session-end vs optimize; disjoint skill files and tests)
- Wave 4 (after 4, 5): spec 6 — sequential
- Wave 5 (after 6, 7): spec 8 — sequential

Parallel-safe = the wave's specs touch disjoint Affected Files, so they may run as
concurrent subagents/worktrees. Waves without the marker run sequentially.

Feature-queue mapping (design §2): specs 1–7 = `earn-your-keep` (WS1+WS2); specs 8–11 = harden-first + directional content (WS3+WS4); spec 12 rides a release PR (WS5); specs 13–14 ship independently (WS6). Modes are mixed (isolated/checkpoint/batch) per the size heuristic — recorded per-spec in frontmatter and the queue manifest.

Cross-cutting rules every spec honors: skill edits happen in `src/skills/` only, with bundles regenerated and installed trees synced in the same commit (no terminal sync spec — see the 2026-05-21 discovery); additions to the five over-budget skills are paid for with same-commit trims or citations; never commit `src/bundled-files.ts` or `docs/.joycraft/telemetry.json` (both gitignored).

## How to use this file

Run the whole queue with `/joycraft-implement-feature docs/features/2026-08-30-curated-harness/` — it executes the specs in wave order (parallel-safe waves may run as concurrent subagents; everything else runs sequentially in the driving conversation) and finishes with session-end. Or run one spec at a time with `/joycraft-implement <spec-path>`; the implement skill reads this README first so it understands the spec's position in the wave plan, and continues through the queue itself. Each spec is self-contained for the actual implementation; this README provides ordering context only.

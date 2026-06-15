# Single-Source Skill Generation — Feature Specs

> **Parent Brief:** `docs/features/2026-06-11-single-source-skills/brief.md`
> **Design:** `docs/features/2026-06-11-single-source-skills/design.md`
> **Research:** `docs/features/2026-06-11-single-source-skills/research.md`
> **Status:** Decomposed 2026-06-14, ready for implementation

## What this feature does

Replaces 60 hand-synced skill files (20 skills × 3 harness variants) with **one canonical skill per file** in `src/skills/`, plus a build-time transform that generates the three per-harness dirs (`src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`) deterministically. Editing one canonical file now propagates to all three harnesses via `pnpm build`. The three generated dirs stay committed so PR diffs show canonical + all three outputs. User-facing install (`npx joycraft init`) is unchanged.

## Specs

| # | Spec | Depends On | Mode | Notes |
|---|------|-----------|------|-------|
| 1 | [substitution-engine.md](substitution-engine.md) | — | checkpoint | Pure `applyTemplate(source, harness)` in `scripts/lib/skill-template.mjs` + unit tests. |
| 2 | [wire-generator-pipeline.md](wire-generator-pipeline.md) | 1 | checkpoint | Wire `applyTemplate` into `scripts/generate-bundled-files.mjs`; add residue assertions. |
| 3 | [migrate-clean-skills.md](migrate-clean-skills.md) | 2 | isolated | Move 11 skills with no out-of-category deltas. `add-context` as POC first. |
| 4 | [migrate-dirty-skills.md](migrate-dirty-skills.md) | 3 | isolated | Move 9 out-of-category skills (4 with conditional blocks, 5 unify on claude). |
| 5 | [update-contributor-docs.md](update-contributor-docs.md) | 4 | batch | Update `docs/guides/agent-compatibility.md`; fix `CONTRIBUTING.md` regen snippet. |
| 6 | [brief-reconciliation-step.md](brief-reconciliation-step.md) | 4 | batch | Add reconcile-brief step to canonical `joycraft-design` and `joycraft-research`. |

## Execution waves

- **Wave 1:** spec 1 — sequential (foundational, no dependencies).
- **Wave 2 (after 1):** spec 2 — sequential (depends on `applyTemplate`).
- **Wave 3 (after 2):** spec 3 — sequential (POC validates the engine end-to-end on real content).
- **Wave 4 (after 3):** spec 4 — sequential (depends on the 11 clean skills landing; dirty skills are higher-risk, want clean foundation underneath).
- **Wave 5 (after 4):** specs 5 + 6 — **parallel-safe** (Affected Files disjoint: spec 5 touches `docs/guides/agent-compatibility.md` + `CONTRIBUTING.md`; spec 6 touches `src/skills/joycraft-design.md` + `src/skills/joycraft-research.md`; both regenerate `src/bundled-files.ts` and the per-harness dirs but only spec 6 actually changes them — sequence-on-merge handles the bundle).

Parallel-safe = the wave's specs touch disjoint Affected Files, so they may run as
concurrent subagents/worktrees. Waves without the marker run sequentially.

**Note on Wave 5 parallel execution:** when both specs run in worktrees, the per-harness regenerated files and `src/bundled-files.ts` will conflict on merge (spec 6 changes them, spec 5 doesn't). Merge spec 5 first (docs-only, no regen needed), then spec 6 — that ordering avoids the conflict.

## How to use this file

Run the whole queue with `/joycraft-implement-feature docs/features/2026-06-11-single-source-skills/` — it executes the specs in wave order (fresh-context subagent per spec) and finishes with session-end. Or run one spec at a time with `/joycraft-implement docs/features/2026-06-11-single-source-skills/specs/substitution-engine.md`; the implement skill reads this README first so it understands the spec's position in the wave plan, and continues through the queue itself. Each spec is self-contained for the actual implementation; this README provides ordering context only.

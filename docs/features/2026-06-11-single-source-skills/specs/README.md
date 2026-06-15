# Single-Source Skill Generation — Feature Specs

> **Parent Brief:** `docs/features/2026-06-11-single-source-skills/brief.md`
> **Design:** `docs/features/2026-06-11-single-source-skills/design.md`
> **Research:** `docs/features/2026-06-11-single-source-skills/research.md`
> **Status:** Re-decomposed 2026-06-14 after research.md Q3 RE-AUDIT, ready for implementation from spec 3 onward

## What this feature does

Replaces 60 hand-synced skill files (20 skills × 3 harness variants) with **one canonical skill per file** in `src/skills/`, plus a build-time transform that generates the three per-harness dirs (`src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`) deterministically. Editing one canonical file now propagates to all three harnesses via `pnpm build`. The three generated dirs stay committed so PR diffs show canonical + all three outputs. User-facing install (`npx joycraft init`) is unchanged.

## Specs

| # | Spec | Depends On | Mode | Notes |
|---|------|-----------|------|-------|
| 1 | [substitution-engine.md](substitution-engine.md) | — | checkpoint | Pure `applyTemplate(source, harness)` in `scripts/lib/skill-template.mjs` + unit tests. ✓ in-review. |
| 2 | [wire-generator-pipeline.md](wire-generator-pipeline.md) | 1 | checkpoint | Wire `applyTemplate` into `scripts/generate-bundled-files.mjs`; add residue assertions. ✓ in-review. |
| 3 | [canonicalize-boundary-forms.md](canonicalize-boundary-forms.md) | 2 | checkpoint | Sweep all 20 × 3 per-harness files to one Cat D form (`CLAUDE.md` / `AGENTS.md`); 5 in-the-wild drift forms → 1. No `src/skills/` files yet. |
| 4 | [migrate-clean-skills.md](migrate-clean-skills.md) | 3 | checkpoint | **RETIRED 2026-06-14.** Audit's "strictly clean" classification was wrong (`joycraft-collaborative-setup` has out-of-allowlist drift). POC value covered by spec 3's 60-file sweep; `joycraft-setup` + `joycraft-collaborative-setup` fold into specs 5/6. |
| 5 | [migrate-dirty-unify.md](migrate-dirty-unify.md) | 3 | isolated | Migrate the unify-friendly skills (now ~15 incl. `joycraft-setup`) via unify-on-claude. No conditional blocks. May split into 2–3 PRs by drift bucket. |
| 6 | [migrate-dirty-conditional.md](migrate-dirty-conditional.md) | 5 | isolated | Migrate skills needing `<!-- harness:NAME -->` blocks (now ~5 incl. `joycraft-collaborative-setup`). |
| 7 | [update-contributor-docs.md](update-contributor-docs.md) | 6 | batch | Update `docs/guides/agent-compatibility.md` with canonical format; fix outdated `CONTRIBUTING.md:91-128` regen snippet. |
| 8 | [brief-reconciliation-step.md](brief-reconciliation-step.md) | 6 | batch | Add reconcile-brief step to canonical `joycraft-design` and `joycraft-research`. Closes the silent-drift gap that caused this re-decomposition. |

## Execution waves

- **Wave 1:** spec 1 — sequential (foundational, no dependencies). ✓ in-review.
- **Wave 2 (after 1):** spec 2 — sequential. ✓ in-review.
- **Wave 3 (after 2):** spec 3 — sequential (sweep before any per-skill migration to reduce drift surface).
- **Wave 4 (after 3):** ~~spec 4~~ — **retired 2026-06-14**. POC value already paid by spec 3's 60-file sweep; the audit's "strictly clean" bucket turned out to be one skill, not two. See `migrate-clean-skills.md` header for the full reasoning.
- **Wave 5 (after 3):** spec 5 — sequential (~15-skill unify; isolated mode = fresh context, may land in 2–3 PRs by drift bucket). Now also covers `joycraft-setup` (truly clean, slots into unify trivially).
- **Wave 6 (after 5):** spec 6 — sequential (~5-skill conditional-block authoring; highest judgment, on clean foundation). Now also covers `joycraft-collaborative-setup` (needs one conditional block for the `tells Claude` / `tells the agent` wording rewrite).
- **Wave 7 (after 6):** specs 7 + 8 — **parallel-safe** (Affected Files disjoint: spec 7 touches `docs/guides/agent-compatibility.md` + `CONTRIBUTING.md`; spec 8 touches `src/skills/joycraft-design.md` + `src/skills/joycraft-research.md`).

Parallel-safe = the wave's specs touch disjoint Affected Files, so they may run as
concurrent subagents/worktrees. Waves without the marker run sequentially.

**Note on Wave 7 parallel execution:** when both specs run in worktrees, the per-harness regenerated files and `src/bundled-files.ts` will conflict on merge (spec 8 changes them, spec 7 doesn't). Merge spec 7 first (docs-only, no regen), then spec 8 — that ordering avoids the conflict.

## Re-decomposition note (2026-06-14)

Specs 1 and 2 (`substitution-engine`, `wire-generator-pipeline`) are unchanged and already `in-review`. Specs 3–8 were re-decomposed after research.md Q3 RE-AUDIT flipped the "clean vs dirty" partition: original brief said 11 clean / 9 dirty, but spec 3's POC on `joycraft-add-context` revealed only 2 skills are strictly clean (by the strict allowlist). The re-decomposition also added a Cat D boundary-form sweep (new spec 3) ahead of per-skill migration, per research.md's "Implications" recommendation. The brief and this README now reflect the corrected partition.

## How to use this file

Run the whole queue with `/joycraft-implement-feature docs/features/2026-06-11-single-source-skills/` — it executes the specs in wave order (fresh-context subagent per spec) and finishes with session-end. Or run one spec at a time with `/joycraft-implement docs/features/2026-06-11-single-source-skills/specs/canonicalize-boundary-forms.md`; the implement skill reads this README first so it understands the spec's position in the wave plan, and continues through the queue itself. Each spec is self-contained for the actual implementation; this README provides ordering context only.

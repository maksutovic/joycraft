# Collaborative Mode — Feature Specs

> **Parent Brief:** `docs/briefs/2026-05-09-collaborative-mode-draft.md`
> **Design:** `docs/designs/2026-05-09-collaborative-mode.md`
> **Research:** `docs/research/2026-05-09-collaborative-mode.md`
> **Status:** Decomposed 2026-05-09, ready for implementation

---

## What this feature does

Migrates Joycraft's docs/ structure from flat folders (`docs/briefs/`, `docs/research/`, `docs/designs/`, `docs/specs/<feature>/`) to per-feature folders (`docs/features/<slug>/{brief.md, research.md, design.md, specs/}`). Adds YAML frontmatter to artifacts, a backlog convention, a team-only `docs/areas/` setup, a standardized Handoff line across skills, and fixes the version-detection bug along the way. Solo users get the new defaults transparently; teams get a `/joycraft-collaborative-setup` skill for the team-only pieces.

## Specs

| # | Spec | Depends On | Notes |
|---|------|-----------|-------|
| 1 | [`fix-version-detection.md`](fix-version-detection.md) | — | Extract `getPackageVersion()` to shared module; kill the two `'0.1.0'` literals. |
| 2 | [`add-frontmatter-module.md`](add-frontmatter-module.md) | — | `src/frontmatter.ts` — emit/parse the 3 schemas + `resolveOwner()` resolution chain. |
| 3 | [`update-init-layout.md`](update-init-layout.md) | 1 | Trim `npx joycraft init`'s preemptive directory list. |
| 4 | [`add-migration-module.md`](add-migration-module.md) | — | `src/migration.ts` — plan/apply split; matches `docs/specs/<feature>/` to brief slugs. |
| 5 | [`wire-forced-migration-in-upgrade.md`](wire-forced-migration-in-upgrade.md) | 4 | Forced migration in `npx joycraft upgrade` + README section. |
| 6 | [`update-doc-producing-skills.md`](update-doc-producing-skills.md) | 2, 3 | The big one: 8 skills + `improve-claude-md.ts` + 2 templates; folds in backlog convention and CLAUDE.md areas pointer. |
| 7 | [`add-collaborative-setup-skill.md`](add-collaborative-setup-skill.md) | 4, 6 | New `joycraft-collaborative-setup` skill. |

## Execution waves

- **Wave 1 (parallel — separate worktrees):** specs 1, 2, 4 — independent foundations.
- **Wave 2 (parallel after wave 1):** spec 3 (after 1), spec 5 (after 4).
- **Wave 3 (single worktree, large):** spec 6 — touches 8 skills + `improve-claude-md.ts` + 2 templates.
- **Wave 4 (parallel after wave 3):** spec 7.

**Estimated total:** 7 sessions; ~3-4 wall-clock units with parallelism.

## How to use this file

If you're running `/joycraft-implement <spec-path>`, the implement skill will read this README first to understand the spec's position in the wave plan. You don't need to open the brief unless you need broader context — each spec is self-contained.

If a spec's dependencies aren't yet complete (per the table above), the implement skill should warn you before proceeding.

## Status tracking

Mark specs as complete by updating the `Status` field in the spec's own frontmatter (`Ready` → `In Progress` → `Complete`). The wave plan above is the source of truth for ordering; spec status fields are the source of truth for progress.

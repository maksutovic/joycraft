# Context Layer + Onboarding + Bugfix Rename — Feature Specs

> **Parent Brief:** `docs/features/2026-05-21-context-layer/brief.md`
> **Design:** `docs/features/2026-05-21-context-layer/design.md`
> **Status:** Shipped 2026-05-21 — all 9 specs implemented (branch `feat/bugfix-clarity`)

## What this feature does

Four related improvements to how Joycraft organizes project knowledge and onboards a first-time user, landing together because they touch the same surfaces (shipped skills, `docs/context/`, CLAUDE.md as a light pointer index): (A) rename bugfix specs from `docs/specs/<area>/` to `docs/bugfixes/<area>/` and physically migrate existing dirs on upgrade; (B) a context layer for long-form reference docs under `docs/context/reference/`, surfaced via a lightweight `## Context Map` pointer table in CLAUDE.md; (C) a first-run read-then-offer onboarding pass (`/joycraft-gather-context`) plus a single-doc primitive (`/joycraft-add-context`); (D) a discoverable `/joycraft-setup` alias and the init/CLAUDE.md surfaces that lead a newcomer to it.

## Specs

| # | Spec | Depends On | Notes |
|---|------|-----------|-------|
| 1 | [update-stale-skill-paths.md](update-stale-skill-paths.md) | — | Remove all `docs/specs/` from shipped skills; bring stale Codex `decompose`/`bugfix`/`new-feature` mirrors to per-feature/bugfix layout parity |
| 2 | [add-reference-templates.md](add-reference-templates.md) | — | Five long-form templates under `src/templates/context/reference/` |
| 3 | [add-context-map-section.md](add-context-map-section.md) | — | `## Context Map` stub in init + improve-claude-md; Getting-Started table + init next-steps lead with `/joycraft-setup` |
| 4 | [migrate-bugfix-dirs.md](migrate-bugfix-dirs.md) | — | Forced upgrade move `docs/specs/<area>/` → `docs/bugfixes/<area>/`, preview + skip-if-exists + >50% abort |
| 5 | [add-add-context-skill.md](add-add-context-skill.md) | 2 | New `/joycraft-add-context` (Claude + Codex): scaffold one reference doc + idempotent Context Map row, write-immediately |
| 6 | [add-gather-context-skill.md](add-gather-context-skill.md) | 5 | New `/joycraft-gather-context` (Claude + Codex): read-then-offer onboarding pass, batch-write |
| 7 | [add-setup-alias-skill.md](add-setup-alias-skill.md) | — | New `/joycraft-setup` thin alias (Claude + Codex) routing to tune |
| 8 | [wire-tune-context-layer.md](wire-tune-context-layer.md) | 6 | Tune invokes gather on first run, recognizes `reference/`, flags >~200-line CLAUDE.md |
| 9 | [regenerate-bundled-files.md](regenerate-bundled-files.md) | 1,2,3,5,6,7,8 | Regenerate `@generated` `src/bundled-files.ts`; full `pnpm test --run && pnpm typecheck` green |

## Execution waves

- **Wave 1 (parallel):** specs 1, 2, 3, 4, 7 — fully independent. (1) skill-path cleanup, (2) templates, (3) Context Map + setup surfaces, (4) the migrator, (7) the setup alias skill. Best run in separate worktrees; they touch disjoint files except that 1 and 8 both edit `tune.md` (path strings vs. logic) — 8 is in a later wave, so no conflict within wave 1.
- **Wave 2 (after 2):** spec 5 (`add-context` scaffolds from the templates spec 2 ships).
- **Wave 3 (after 5):** spec 6 (`gather-context` composes `add-context`'s conventions inline).
- **Wave 4 (after 6):** spec 8 (`tune` invokes the gather skill spec 6 ships). Sequence after spec 1's `tune.md` path edits to avoid touching the same file twice in flight.
- **Wave 5 (last, after 1,2,3,5,6,7,8):** spec 9 — regenerate bundled files and run the feature-wide green build. This is the only spec that writes the `@generated` artifact.

Critical path: 2 → 5 → 6 → 8 → 9.

## How to use this file

If you're running `/joycraft-implement <spec-path>`, the implement skill reads this README first so it understands the spec's position in the wave plan. Each spec is self-contained for the actual implementation; this README provides ordering context only. Do NOT regenerate `src/bundled-files.ts` inside individual content specs — spec 9 owns that to avoid churning the `@generated` file across waves.

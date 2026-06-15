# Single-Source Skill Generation — DRAFT Brief

> **Date:** 2026-06-11
> **Project:** joycraft
> **Status:** DRAFT — context capture from the 2026-06-11 DX session; finalize with Max before decomposing
> **Origin:** Max: "the biggest code smell is the fact we need copies of each skill for each .claude .agents .pi"

---

## TL;DR

Replace the three hand-maintained skill source dirs (`src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/` — 20 skills × 3 = 60 files, ~450KB) with **one canonical source per skill plus a build-time transform** in the generator. The differences between variants are almost entirely mechanical; making them data kills the N×3 maintenance cost and the drift that has already accumulated. User repos still receive three installed dirs (that's what the harnesses require) — this is a **dev-side** fix to joycraft's build, invisible to users except via more consistent skills.

## Evidence (gathered 2026-06-11)

- Generator: `scripts/generate-bundled-files.mjs` reads the three dirs into `SKILLS` / `CODEX_SKILLS` / `PI_SKILLS` constants in `src/bundled-files.ts`. No shared-source mechanism exists.
- The variant differences are mechanical and enumerable:
  1. **Invocation syntax:** `/joycraft-*` (claude) vs `$joycraft-*` (codex) vs `/skill:joycraft-*` (pi)
  2. **Context-clear verb:** `/clear` vs `/new`
  3. **Installed-skill path prefix:** `.claude/skills/` vs `.agents/skills/` vs `.pi/skills/`
  4. **Frontmatter:** `instructions:` field is claude-only
  5. **Harness-specific paragraphs:** Pi loop notes in implement/spec-done/implement-feature; codex "context honesty" note; claude subagent instructions
- **Drift is real:** codex variants are condensed relative to claude (e.g. session-end's discovery frontmatter schema explanation missing); codex/pi decompose lack the README-template step and codex/pi implement lack the "read sibling README" step that claude has. Some of this may be intentional condensation — needs a decision (see open questions).
- Per-harness hashes in state.json already differ per variant — installed-file tracking needs no change.
- Same-commit constraint: any skill edit requires bundle regeneration + repo installed-copy sync + count assertions in the same commit (`docs/discoveries/2026-06-11-bundle-regen-per-commit.md`).

## Proposed shape (strawman — validate at finalization)

- New canonical dir, e.g. `src/skills/`, one `.md` per skill with:
  - **Template variables:** `{{invoke joycraft-x}}`, `{{clear}}`, `{{skills_dir}}` — substituted per harness by the generator
  - **Conditional blocks:** `<!-- harness:pi -->…<!-- /harness -->` (and `claude`/`codex`) for the genuinely different paragraphs
  - **Frontmatter rules:** generator strips/keeps per-harness fields (`instructions:`)
- Generator emits the three variants (either to the existing three dirs as build artifacts, or directly into `bundled-files.ts` — decide; emitting files keeps diffs reviewable and the existing sync tests meaningful)
- Migration: start from the claude variants as canonical (they're the most complete), fold in pi/codex-specific blocks, then diff generated-vs-current for all 60 files and review the deltas — the diffs ARE the drift inventory.
- Tests: parity tests largely become generator tests; add one test asserting no `{{` survives in emitted output.

## Why now

Every skill edit currently costs 3 hand-synced files (this week's frictionless-implement feature touched 4 skills × 3 variants = 12 hand-edited files). Drift compounds; a 4th harness would make it N×4.

## Open questions for finalization

1. **Codex condensation:** intentional design (smaller context budget?) or just drift? If intentional, the canonical format needs a `condensed`/`full` knob; if drift, codex gets the fuller text — decide before migration.
2. **Emit files or emit bundle only?** Keeping the three dirs as *generated* artifacts (gitignored? committed?) vs. generating `bundled-files.ts` straight from canonical.
3. Custom DSL vs. existing templating (the repo has zero runtime deps and a no-new-deps boundary — hand-rolled ~50-line substitution in the .mjs script is probably right).
4. Do the harness docs (`docs/guides/agent-compatibility.md`) need updating to describe the canonical format for contributors?

## Out of scope

- Changing what gets installed into user repos (3 dirs stay; that's the harnesses' contract)
- Plugin distribution for Claude Code (separate thread — would remove `.claude/skills/` from user repos entirely; draft exists at `docs/features/2026-03-26-plugin-migration-draft`)
- Skill content changes beyond resolving the drift inventory

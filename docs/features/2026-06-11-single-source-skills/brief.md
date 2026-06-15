---
status: active
owner: Maximilian Maksutovic
created: 2026-06-11
feature: 2026-06-11-single-source-skills
---

# Single-Source Skill Generation — Feature Brief

> **Date:** 2026-06-11 (formalized 2026-06-14)
> **Project:** joycraft
> **Research:** docs/features/2026-06-11-single-source-skills/research.md
> **Design:** docs/features/2026-06-11-single-source-skills/design.md
> **Origin:** Max: "the biggest code smell is the fact we need copies of each skill for each .claude .agents .pi"

---

## Vision

Today, joycraft maintains 20 skills × 3 harness variants (`src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`) = 60 hand-synced markdown files (~450KB). Every skill edit costs three files; this week's frictionless-implement feature touched 12 files for 4 logical skills. Drift between variants has already accumulated and is invisible until someone reads side-by-side.

We replace the three source dirs with **one canonical skill per file** in `src/skills/` (filenames keep the `joycraft-` prefix), plus a **build-time transform** extracted to `scripts/lib/skill-template.mjs` and orchestrated from `scripts/generate-bundled-files.mjs`. The transform uses three primitives: `{{var}}` substitution from a fixed 4-variable lookup (`skill_prefix`, `clear`, `skills_dir`, `boundary_file`), `<!-- harness:NAME -->` conditional blocks (pipe-lists like `claude|codex` allowed), and per-harness frontmatter field stripping. Initial research surfaced 9 of 20 skills with out-of-category deltas; a strict re-audit (after spec 3's POC failed) revised that to **2 strictly-clean / 18 dirty** and surfaced a pervasive Cat D boundary-form drift (5 different in-the-wild forms across the codebase). Of the 18 dirty skills, 4 (`research`, `verify`, `lockdown`, `implement-feature`) need real conditional blocks; the remaining 14 are drift to unify on claude-fullness. Sweeping Cat D first across all 20 skills × 3 harnesses reduces drift surface before any per-skill migration. Making it data eliminates the N×3 edit cost and gives us a single place to land changes.

The generator continues to emit the three `src/*-skills/` dirs and they stay committed — PR diffs show canonical + all three generated outputs so deltas are reviewable at merge time. This is invisible to users: `npx joycraft init` still installs three dirs into user repos; only joycraft's own build pipeline changes. A 4th harness (or future plugin variant) becomes a generator change, not 20 new files.

## User Stories

- As a joycraft maintainer, I want to edit one canonical skill file and have all three variants regenerate automatically, so I stop spending 3× effort per edit.
- As a joycraft maintainer, I want PR diffs to show both the canonical change AND the three generated outputs, so I can review per-variant deltas at merge time.
- As a contributor reading the repo, I want `docs/guides/agent-compatibility.md` to explain the canonical format, so I know which file to edit.
- As a user of joycraft, I want the installed skills in my project (`.claude/skills/`, `.agents/skills/`, `.pi/skills/`) to be unchanged in shape and content — this is purely an internal dev fix.

## Hard Constraints

- **MUST NOT** change what gets installed into user repos. The three installed dirs and their contents (modulo drift resolution) remain the harness contract.
- **MUST NOT** introduce any new runtime dependencies. `scripts/generate-bundled-files.mjs` stays zero-dep; substitution is hand-rolled regex/string ops.
- **MUST** keep the three `src/*-skills/` dirs as generated, committed artifacts. PR diffs show canonical + all 3 outputs.
- **MUST** regenerate `src/bundled-files.ts` and the installed `src/*-skills/` dirs in the **same commit** as any canonical change. The frictionless-implement discovery (`docs/discoveries/2026-06-11-bundle-regen-per-commit.md`) applies unchanged.
- **MUST** treat codex variants as drift — canonical = full claude-style fullness; codex inherits the same content. No `condensed`/`full` knob.
- **MUST** include a generator test asserting no `{{var}}` or unclosed `<!-- harness:x -->` block survives in emitted output.
- **MUST** fail the build fast on unknown `{{x}}` variables — generator throws `Error("unknown template variable: {{x}} in <file>")`. Residue test is a backstop, not the primary defense.
- **MUST** keep the `joycraft-` prefix in canonical filenames (e.g. `src/skills/joycraft-add-context.md`). Grep parity with the existing per-harness dirs.
- **MUST** extract the pure substitution function to `scripts/lib/skill-template.mjs` as `applyTemplate(source, harness)`. The orchestrator (`generate-bundled-files.mjs`) stays I/O + glue only.
- **MUST** update `docs/guides/agent-compatibility.md` to describe the canonical format for contributors.
- **MUST** expand `{{clear}}` for the codex harness as a multi-surface sentence covering both CLI (`/clear`) and desktop/IDE (`Cmd+N`). Web research 2026-06-14 confirmed `/clear` does NOT exist in the Codex desktop app (the most-used surface); see [Codex CLI commands](https://developers.openai.com/codex/cli/slash-commands), [Codex desktop commands](https://developers.openai.com/codex/app/commands), [Codex IDE commands](https://developers.openai.com/codex/ide/commands). Existing codex variants today say "run /clear" literally — this is a silent failure for desktop users and the migration must fix it.

## Out of Scope

- **NOT:** Changing the harness contract — `npx joycraft init` still installs three dirs into user repos.
- **NOT:** Plugin distribution for Claude Code (would remove `.claude/skills/` from user repos entirely; tracked separately at `docs/features/2026-03-26-plugin-migration-draft/`).
- **NOT:** Skill content changes beyond (a) resolving the existing codex/pi drift inventory, and (b) the brief-reconciliation step added to `/joycraft-design` and `/joycraft-research` (see spec 6). We are not redesigning any other skill's behavior.
- **NOT:** A `condensed`/`full` toggle for codex. We're treating codex condensation as drift, not a feature.
- **NOT:** Introducing a templating library (mustache, eta, etc.). Hand-rolled substitution only.
- **NOT:** Authoring a drift-resolution discovery doc. Drift theory in agentic engineering is an open research area; joycraft's job is to be useful, not to opine on drift. Audit trail for which deltas were unified vs. preserved lives in PR descriptions only. `git log -S` is sufficient archaeology if the question resurfaces.

## Test Strategy

- **Existing setup:** vitest (`pnpm test --run`), tsc (`pnpm typecheck`), plus existing sync tests that compare bundled-files.ts against `src/*-skills/` on disk.
- **User expertise:** comfortable.
- **Test types:**
  - Unit tests for the substitution functions (variable replacement, conditional-block stripping/keeping per harness, frontmatter rules).
  - Generator-level test that the three emitted dirs match a small fixture canonical input byte-for-byte.
  - Sanity test: no `{{` survives in any emitted file; no unclosed `<!-- harness:` block.
  - Existing sync tests (`src/bundled-files.ts` matches disk) keep running unchanged — they now verify the generator's output stayed in lockstep with the bundle.
- **Smoke test budget:** the substitution unit tests should run in <1s. Full suite stays within the existing budget.
- **Lockdown mode:** no. Generator work touches `scripts/`, `src/skills/`, `src/*-skills/`, `src/bundled-files.ts`, and `docs/guides/agent-compatibility.md` — too broad for lockdown.

## Decomposition

> **Re-decomposed 2026-06-14** after spec 3's POC on `joycraft-add-context` failed against the original "11 clean / 9 dirty" split. The strict Q3 re-audit in research.md re-bucketed skills as 2 clean / 18 dirty and surfaced pervasive Cat D boundary-form drift (5 in-the-wild forms across the codebase). Specs 1 & 2 were left untouched (engine + pipeline are correct and `in-review`); specs 3–8 below replace the old specs 3–6.

| # | Spec Name | Description | Dependencies | Est. Size | Status |
|---|-----------|-------------|--------------|-----------|--------|
| 1 | substitution-engine | Implement `applyTemplate(source, harness)` in `scripts/lib/skill-template.mjs` as a pure function. Three primitives: `{{var}}` from fixed lookup, `<!-- harness:NAME -->` conditional blocks (pipe-list NAME), per-harness frontmatter field strip. Throws on unknown variable. Unit tests for each transform in `tests/skill-template.test.ts`. | None | M | in-review |
| 2 | wire-generator-pipeline | Update `scripts/generate-bundled-files.mjs` to read `src/skills/` → apply transforms per harness → write `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/` → re-read those dirs → emit `src/bundled-files.ts` exactly as today. Add residue assertions (no `{{`, no unclosed `<!-- harness:` block) to `tests/generate-bundled-files.test.ts`. | 1 | M | in-review |
| 3 | canonicalize-boundary-forms | Sweep all 20 skills × 3 harnesses to one canonical Cat D form. Per research.md "Substitution-category inconsistencies": 5 in-the-wild boundary forms exist (`the project boundary file`, `CLAUDE.md and/or AGENTS.md`, `CLAUDE.md or AGENTS.md`, `CLAUDE.md/AGENTS.md`, bare `AGENTS.md`); pick the allowlisted form and unify. No `src/skills/` work yet — just clean up per-harness dirs so downstream migrations have less drift to fight. Bundle regen in same commit. | 2 | M | todo |
| 4 | migrate-clean-skills (strict) | Migrate the 2 strictly-clean skills (`joycraft-collaborative-setup`, `joycraft-setup`) to `src/skills/`. POC + small batch, proves the engine against real content with zero policy decisions. Generated variants must diff cleanly against `main`. | 3 | S | todo |
| 5 | migrate-dirty-unify | Migrate the ~14 dirty skills whose deltas are "claude has X, codex/pi don't" — unify on claude-fullness, no conditional blocks. May land in batches by drift bucket (Recommended Next Steps + Handoff, YAML frontmatter, backlog sections). PR description is the audit trail; no discovery doc per design.md Section 4. | 4 | L | todo |
| 6 | migrate-dirty-conditional | Migrate the 4 skills with genuinely harness-specific machinery using `<!-- harness:NAME -->` blocks: `joycraft-research`, `joycraft-verify`, `joycraft-lockdown`, `joycraft-implement-feature`. Also handles the inter-variant divergences (research.md "Inter-variant divergence" — pi-specific `subagent` invocation, codex/pi-divergent `implement-feature` mechanics, etc.). | 5 | L | todo |
| 7 | update-contributor-docs | Update `docs/guides/agent-compatibility.md` with the canonical format, variable reference, harness-block syntax, canonical Cat D form, and "edit canonical, not the per-harness dirs" guidance. Fix the outdated manual-regen snippet in `CONTRIBUTING.md:91-128` (point at `pnpm build`). | 6 | S | todo |
| 8 | brief-reconciliation-step | Add a "Reconcile brief with findings" step to canonical `joycraft-design` and `joycraft-research`. The step instructs: after writing design.md/research.md, re-read the parent brief; for each of {Vision, Hard Constraints, Out of Scope, Decomposition, Test Strategy, Success Criteria}, check whether findings invalidate or refine it; either edit the brief in place or present a diff and stop for user approval. Closes the silent-drift gap that caused this very re-decomposition. Lives in canonical `src/skills/joycraft-design.md` and `src/skills/joycraft-research.md` (post-migration). | 6 | S | todo |

## Execution Strategy

- [ ] Sequential (specs have chain dependencies)
- [ ] Parallel worktrees
- [x] **Mixed** (linear chain through wave 6, then parallel-safe wave 7)

**Waves** (see `specs/README.md` for the detailed table):

- **Wave 1:** spec 1 (substitution-engine) — sequential. ✓ in-review.
- **Wave 2:** spec 2 (wire-generator-pipeline) — sequential, depends on 1. ✓ in-review.
- **Wave 3:** spec 3 (canonicalize-boundary-forms) — sequential, depends on 2. Sweep precedes per-skill migration to reduce drift.
- **Wave 4:** spec 4 (migrate-clean-skills strict) — sequential, depends on 3. 2-skill POC validates the engine end-to-end against real content.
- **Wave 5:** spec 5 (migrate-dirty-unify) — sequential, depends on 4. May land in 2–3 PRs by drift bucket.
- **Wave 6:** spec 6 (migrate-dirty-conditional) — sequential, depends on 5. Highest-judgment work last, on a clean foundation.
- **Wave 7:** specs 7 (update-contributor-docs) + 8 (brief-reconciliation-step) — **parallel-safe** (Affected Files disjoint). Merge order: spec 7 first (docs-only, no regen), then spec 8 (regenerates bundle) to avoid bundle merge conflict.

**Mode assignments:** specs 1, 2, 3 = `checkpoint`; spec 4 = `checkpoint` (small batch, low risk); specs 5, 6 = `isolated`; specs 7, 8 = `batch`. Project default is `batch` (no `**Default execution mode:**` in CLAUDE.md); larger/judgment-heavier specs were upgraded per the size→mode heuristic.

## Success Criteria

- [ ] Editing one file in `src/skills/joycraft-<name>.md` regenerates all three variants via `pnpm build` (existing hook — `package.json:15` already runs the generator).
- [ ] All three `src/*-skills/` dirs remain committed and match generator output byte-for-byte (existing sync tests in `tests/bundled-files-sync.test.ts` keep passing unchanged).
- [ ] `pnpm test --run && pnpm typecheck` passes.
- [ ] User-facing install (`npx joycraft init`) produces the same three dirs in user repos as before (modulo drift unifications, which are visible in PR descriptions).
- [ ] `docs/guides/agent-compatibility.md` describes the canonical format and points contributors to `src/skills/`; `CONTRIBUTING.md` regen snippet fixed.
- [ ] No regression in existing skills' behavior — `joycraft-implement`, `joycraft-decompose`, `joycraft-session-end`, etc. all still work in their respective harnesses.
- [ ] Generator throws fast on unknown `{{x}}` variables.
- [ ] `/joycraft-design` and `/joycraft-research` skills include a reconciliation step that updates the parent brief when findings invalidate Vision / Hard Constraints / Out of Scope / Decomposition / Test Strategy / Success Criteria. The very gap we hit on this feature (brief said 11 clean / 9 dirty; spec 3's POC revealed only 2 are strictly clean; brief stayed out of sync until manual re-decomposition) cannot silently recur.
- [ ] After spec 3 lands, all 20 × 3 = 60 per-harness skill files use a single canonical Cat D boundary form. After specs 4–6 land, `src/skills/` contains all 20 canonical files and the per-harness dirs are fully derived.

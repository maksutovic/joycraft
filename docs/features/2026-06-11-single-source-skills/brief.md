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

We replace the three source dirs with **one canonical skill per file** in `src/skills/` (filenames keep the `joycraft-` prefix), plus a **build-time transform** extracted to `scripts/lib/skill-template.mjs` and orchestrated from `scripts/generate-bundled-files.mjs`. The transform uses three primitives: `{{var}}` substitution from a fixed 4-variable lookup (`skill_prefix`, `clear`, `skills_dir`, `boundary_file`), `<!-- harness:NAME -->` conditional blocks (pipe-lists like `claude|codex` allowed), and per-harness frontmatter field stripping. Research surfaced 9 of 20 skills with out-of-category structural deltas; design resolved 4 of them (`research`, `verify`, `lockdown`, `implement-feature`) as needing real conditional blocks and the other 5 as drift to unify on claude-fullness. Making it data eliminates the N×3 edit cost and gives us a single place to land changes.

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

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | substitution-engine | Implement `applyTemplate(source, harness)` in `scripts/lib/skill-template.mjs` as a pure function. Three primitives: `{{var}}` from fixed lookup, `<!-- harness:NAME -->` conditional blocks (pipe-list NAME), per-harness frontmatter field strip. Throws on unknown variable. Unit tests for each transform in `tests/skill-template.test.ts`. | None | M |
| 2 | wire-generator-pipeline | Update `scripts/generate-bundled-files.mjs` to read `src/skills/` → apply transforms per harness → write `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/` → re-read those dirs → emit `src/bundled-files.ts` exactly as today. Add residue assertions (no `{{`, no unclosed `<!-- harness:` block) to `tests/generate-bundled-files.test.ts`. | 1 | M |
| 3 | migrate-clean-skills | Move the 11 skills with NO out-of-category deltas (per research.md Q3) to `src/skills/` as canonical sources. Start with `joycraft-add-context` as proof-of-concept; verify generated variants `diff` cleanly against existing committed variants; then the other 10 alphabetically. Bundle regen + count assertions in same commit. | 2 | L |
| 4 | migrate-dirty-skills | Move the 9 out-of-category skills to `src/skills/`. For 4 (`research`, `verify`, `lockdown`, `implement-feature`) use `<!-- harness:NAME -->` conditional blocks; for the other 5 (`add-fact`, `decompose`, `design`, `implement`, `new-feature`) unify on claude-fullness. Per-skill PR review with rationale in PR description (no separate discovery doc). | 3 | L |
| 5 | update-contributor-docs | Update `docs/guides/agent-compatibility.md` with the canonical format, variable reference, harness-block syntax, and "edit canonical, not the per-harness dirs" guidance. Fix the outdated manual-regen snippet in `CONTRIBUTING.md:91-128` (just point at `pnpm build`). | 4 | S |
| 6 | brief-reconciliation-step | Add a "Reconcile brief with findings" step to both `/joycraft-design` and `/joycraft-research` skills. The step instructs: after writing design.md/research.md, re-read the parent brief; for each of {Vision, Hard Constraints, Out of Scope, Decomposition, Test Strategy, Success Criteria}, check whether findings invalidate or refine it; either edit the brief in place or present a diff and stop for user approval if changes are non-trivial. Closes the silent-drift gap we hit on this very feature. Lives in canonical `src/skills/joycraft-design.md` and `src/skills/joycraft-research.md` (post-migration). | 4 | S |

## Execution Strategy

- [ ] Sequential (specs have chain dependencies)
- [ ] Parallel worktrees
- [x] **Mixed** (linear chain through wave 4, then parallel-safe wave 5)

**Waves** (see `specs/README.md` for the detailed table):

- **Wave 1:** spec 1 (substitution-engine) — sequential.
- **Wave 2:** spec 2 (wire-generator-pipeline) — sequential, depends on 1.
- **Wave 3:** spec 3 (migrate-clean-skills) — sequential, depends on 2; `joycraft-add-context` is the POC, the other 10 follow alphabetically.
- **Wave 4:** spec 4 (migrate-dirty-skills) — sequential, depends on 3; may land in multiple PRs (4-conditional-block PR + 5-unify PR is a reasonable split).
- **Wave 5:** specs 5 (update-contributor-docs) + 6 (brief-reconciliation-step) — **parallel-safe** (Affected Files disjoint). Merge order: spec 5 first (docs-only, no regen), then spec 6 (regenerates bundle) to avoid bundle merge conflict.

**Mode assignments:** specs 1, 2 = `checkpoint`; specs 3, 4 = `isolated`; specs 5, 6 = `batch`. Project default is `batch` (no `**Default execution mode:**` in CLAUDE.md); larger specs were upgraded to checkpoint/isolated per the size→mode heuristic in `joycraft-decompose`.

## Success Criteria

- [ ] Editing one file in `src/skills/joycraft-<name>.md` regenerates all three variants via `pnpm build` (existing hook — `package.json:15` already runs the generator).
- [ ] All three `src/*-skills/` dirs remain committed and match generator output byte-for-byte (existing sync tests in `tests/bundled-files-sync.test.ts` keep passing unchanged).
- [ ] `pnpm test --run && pnpm typecheck` passes.
- [ ] User-facing install (`npx joycraft init`) produces the same three dirs in user repos as before (modulo drift unifications, which are visible in PR descriptions).
- [ ] `docs/guides/agent-compatibility.md` describes the canonical format and points contributors to `src/skills/`; `CONTRIBUTING.md` regen snippet fixed.
- [ ] No regression in existing skills' behavior — `joycraft-implement`, `joycraft-decompose`, `joycraft-session-end`, etc. all still work in their respective harnesses.
- [ ] Generator throws fast on unknown `{{x}}` variables.
- [ ] `/joycraft-design` and `/joycraft-research` skills include a reconciliation step that updates the parent brief when findings invalidate Vision / Hard Constraints / Out of Scope / Decomposition / Test Strategy / Success Criteria. The very gap we hit on this feature (brief drifted from design until the user asked "is brief in lockstep with design?") cannot silently recur.

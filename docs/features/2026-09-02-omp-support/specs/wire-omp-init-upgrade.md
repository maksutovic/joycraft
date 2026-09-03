---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-03
feature: 2026-09-02-omp-support
mode: checkpoint
---

# Wire omp into Init and Upgrade — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-02-omp-support/brief.md`
> **Status:** Ready
> **Date:** 2026-09-03
> **Estimated scope:** 1 session / 3 source files + 3 test files / ~80 lines

---

## What

Make `omp` a real install target. In `src/init.ts`: install `OMP_SKILLS` to `.omp/skills/<name>/SKILL.md` behind a `wants('omp')` gate, record those paths in `fileHashes` so upgrade can manage them, add `omp` to the `multiTool` expression so an omp-only install writes the `@AGENTS.md` pointer CLAUDE.md plus a full AGENTS.md, and print an omp line in the summary. In `src/upgrade.ts`: add the `wants('omp')` branch to the managed-files map so hand-edited `.omp/skills` files are rewritten. In `src/gitignore.ts`: add `.omp/` to `PRIVATE_PROFILE_IGNORES`.

## Why

Without this, spec 1's `OMP_SKILLS` record is dead code: selecting omp at init writes nothing, upgrade never manages the tree, and the private profile leaks `.omp/` into commits.

## Acceptance Criteria

- [ ] `init` with `--harnesses omp` writes `.omp/skills/<name>/SKILL.md` for every entry in `OMP_SKILLS` [src: brief "Success Criteria"]
- [ ] That same run creates **no** `.claude/`, `.agents/`, `.pi/`, or `.github/skills/` tree [src: brief "Success Criteria"]
- [ ] That same run writes a pointer CLAUDE.md (`@AGENTS.md`) and a full AGENTS.md — i.e. `omp` is in the `multiTool` expression [src: brief "Hard Constraints"]
- [ ] `init` records a `fileHashes` entry for every installed `.omp/skills/<name>/SKILL.md` [src: brief "Hard Constraints"]
- [ ] `init` does **not** create `.omp/AGENTS.md`, `.omp/RULES.md`, `.omp/config.yml`, `.omp/extensions/`, `.omp/agents/`, or `.omp/scripts/` [src: D1, D2]
- [ ] `upgrade` on a project whose state lists `omp` rewrites a hand-edited `.omp/skills` file back to bundled content [src: brief "Success Criteria"]
- [ ] `upgrade` leaves user files (CLAUDE.md, AGENTS.md, `docs/`) alone [src: brief "Success Criteria"]
- [ ] `PRIVATE_PROFILE_IGNORES` contains `.omp/`, and the private profile writes it to `.gitignore` [src: brief "Hard Constraints"]
- [ ] A project with **pre-selection state** (no recorded `harnesses`) gains `.omp/skills` on the next upgrade via the legacy all-harnesses fallback [src: D5]
- [ ] The init summary prints an omp line naming `.omp/skills/` and `/skill:joycraft-*` [src: brief "Hard Constraints"]
- [ ] `pnpm test` and `pnpm typecheck` pass [src: brief "Success Criteria"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| omp-only init writes the tree | `tests/init.test.ts` — init into a temp dir with `harnesses: ['omp']`, assert `.omp/skills/joycraft-decompose/SKILL.md` exists | integration |
| no other harness trees | Same test — assert `.claude/`, `.agents/`, `.pi/`, `.github/skills/` all absent | integration |
| pointer CLAUDE.md + full AGENTS.md | Same test — CLAUDE.md contains `@AGENTS.md`; AGENTS.md contains the boundaries heading | integration |
| fileHashes recorded | `tests/init.test.ts` — read `docs/.joycraft/state.json`, assert a key for each `.omp/skills/<name>/SKILL.md` | integration |
| no forbidden .omp files | Same test — assert `.omp/AGENTS.md`, `.omp/RULES.md`, `.omp/config.yml`, `.omp/extensions`, `.omp/agents`, `.omp/scripts` all absent | integration |
| upgrade rewrites hand-edits | `tests/upgrade.test.ts` — init with omp, overwrite a skill file with junk, upgrade, assert bundled content restored | integration |
| upgrade spares user files | Same test — a modified CLAUDE.md survives upgrade byte-identical | integration |
| private profile ignores .omp/ | `tests/gitignore-profiles.test.ts` — assert `PRIVATE_PROFILE_IGNORES` includes `.omp/` and the written `.gitignore` contains it | unit |
| legacy fallback adds omp | `tests/upgrade.test.ts` — state.json with no `harnesses` key, upgrade, assert `.omp/skills` appears | integration |
| summary prints omp | `tests/init.test.ts` — capture stdout, assert it names `.omp/skills/` | integration |

**Execution order:**
1. Write all tests above — they should fail against current code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `pnpm test tests/gitignore-profiles.test.ts` — seconds. Note this suite historically hit the live npm registry; keep the established fetch-stub pattern intact.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes

## Constraints

- MUST: gate every omp install step on `wants('omp')` [src: brief "Hard Constraints"]
- MUST: include `omp` in the `multiTool` expression at `src/init.ts:246` [src: brief "Hard Constraints"]
- MUST: record a `fileHashes` entry per installed omp skill so upgrade manages the tree [src: brief "Hard Constraints"]
- MUST: add the `wants('omp')` branch to upgrade's managed-files map [src: brief "Hard Constraints"]
- MUST: add `.omp/` to `PRIVATE_PROFILE_IGNORES` [src: brief "Hard Constraints"]
- MUST: let omp join the legacy "all harnesses" fallback for pre-selection state, exactly as Copilot did in 0.7.5 [src: D5]
- MUST NOT: write `.omp/AGENTS.md`, `.omp/RULES.md`, `.omp/config.yml`, `.omp/extensions/`, `.omp/agents/`, or `.omp/scripts/` [src: D1, D2]
- MUST NOT: add omp to the tsconfig-exclude logic — that exists only because Pi installs a `.ts` extension, and omp installs no runtime [src: D1]
- MUST NOT: edit any file in `src/skills/` or the generated skill trees — spec 3 owns those [src: brief "Decomposition"]
- MUST NOT: add a runtime dependency [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `src/init.ts` | Import `OMP_SKILLS`; `wants('omp')` install block after the Copilot block (§2h); `wants('omp')` fileHashes block; `omp` added to `multiTool`; omp summary line; the "select at least one harness" message lists omp |
| Modify | `src/upgrade.ts` | Import `OMP_SKILLS`; `wants('omp')` branch adding `.omp/skills/<name>/SKILL.md` to the managed map |
| Modify | `src/gitignore.ts` | `.omp/` in `PRIVATE_PROFILE_IGNORES`; doc comment updated |
| Modify | `tests/init.test.ts` | omp-only install, isolation, hashes, forbidden-files, summary cases |
| Modify | `tests/upgrade.test.ts` | omp managed-file rewrite, user-file preservation, legacy-fallback cases |
| Modify | `tests/gitignore-profiles.test.ts` | `.omp/` private-profile cases |

## Approach

Every change mirrors Copilot, which is the closest analogue: skills-only, no runtime, reads AGENTS.md directly. Copy the shape of the `wants('copilot')` blocks in all three files and substitute `.omp/skills` for `.github/skills`.

Two places diverge from a blind Copilot copy, and both matter:

**The gitignore entry is `.omp/`, not a `joycraft-*` glob.** Copilot's entry is deliberately narrow — `.github/skills/joycraft-*/` — because `.github/` also holds Actions workflows and issue templates that must stay tracked. `.omp/` has no such shared tenancy: Joycraft is the only thing writing there under D1/D2. So the whole directory is ignored, matching `.claude/`, `.agents/`, and `.pi/`. Do not narrow it to a glob out of misplaced symmetry.

**`.omp/` becomes non-empty the moment skills land.** The brief flags this: omp's project settings layer activates when `.omp/` is non-empty. Installing skills alone activates it with no settings file, so the layer is empty and inert — but the specs must not assume `.omp/` is inert generally. Concretely this means: do not add a "clean up empty `.omp/`" step, and do not treat the directory's existence as a signal that a config file should follow.

For `multiTool`, append `|| wants('omp')` to the existing expression. The semantics are exactly right: omp reads AGENTS.md natively and Claude Code does not read it at all, so an omp-only install wants the pointer-CLAUDE.md shape that codex/pi/copilot already get.

**Rejected alternative:** deriving both the init install blocks and the upgrade managed map from a single table of `{harness, record, installedPath}` so the two files can't drift. This is the *right* eventual refactor — the 0.7.3 incident was exactly a drift failure — but Pi's four extra record types (scripts, extensions, agents, plus chmod and tsconfig side effects) don't fit the table, so the table would cover four harnesses and leave Pi hand-written, which is the drift risk it was meant to remove. Add the branches; log the refactor as backlog if it keeps recurring.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| `init` with `--harnesses omp,claude` | Both trees written; CLAUDE.md is the pointer form (multiTool true because omp is selected) |
| Existing `.omp/skills/joycraft-decompose/SKILL.md` without `--force` | Skipped and reported in `result.skipped`, same as every other harness |
| `--force` over an existing omp tree | Overwritten and reported as modified |
| Pre-selection state.json (no `harnesses` key) | Legacy fallback selects all five harnesses; `.omp/skills` appears on upgrade — the D5 side effect the CHANGELOG must call out |
| State lists a harness that no longer exists | `sanitizeHarnesses` drops it; unrelated to omp but must not regress |
| `private` profile with `.omp/` already tracked in git | Gitignore is append-only and cannot untrack; the existing advisory `git rm -r --cached` guidance covers it (tune's copy is spec 3's concern) |
| omp selected, `.omp/` exists but empty | Skills install normally; no settings file is created |
| Upgrade on a project that selected omp then deselected it | The tree stops being managed; existing files are left in place (matches current behavior for other harnesses — no deletion) |

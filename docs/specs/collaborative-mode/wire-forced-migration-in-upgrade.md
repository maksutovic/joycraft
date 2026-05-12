# Wire Forced Migration in Upgrade — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-05-09-collaborative-mode-draft.md`
> **Status:** Complete
> **Date:** 2026-05-09
> **Estimated scope:** 1 session / 3 files / ~80 lines diff
> **Depends on:** `add-migration-module.md`

---

## What

Wire `npx joycraft upgrade` to invoke `planMigration` + `applyMigration` (from `src/migration.ts`) unconditionally on any project still using the flat layout. Print a clear summary of what was moved before doing it, do it without prompting (forced — per design decision Q6), then continue with the existing managed-file diff loop. Update the project README with a section explaining the restructure so existing users are not surprised when their first post-upgrade run shuffles their docs around. Add a banner-style stdout note explaining what just happened, including a tip on using `git status` to inspect the moves.

## Why

Design decision Q6 chose forced migration over opt-in to avoid forcing 8+ skills to handle dual layouts (research Q5 enumerates the affected skills). The brief calls this in-scope. Without this spec, projects on existing flat layouts cannot benefit from the per-feature folder structure that all updated skills (spec 6) will assume — they'd get errors or write to the wrong place.

## Acceptance Criteria

- [ ] `src/upgrade.ts` imports `planMigration`, `applyMigration` from `./migration.js`.
- [ ] On `npx joycraft upgrade`, before the existing managed-file diff loop, the upgrade flow checks if flat layout exists (any of `docs/briefs/`, `docs/research/`, `docs/designs/`, or `docs/specs/<subdir>/` matching a brief slug). If yes, runs migration.
- [ ] Migration runs WITHOUT a Y/N prompt — forced.
- [ ] Before applying, prints a summary block to stdout listing each move (`docs/briefs/X.md → docs/features/X/brief.md`). Group by feature slug for readability.
- [ ] Lists orphan spec dirs in the summary as "left in place — area-level specs (e.g., bugfix areas)".
- [ ] After applying, prints a banner explaining what just happened, pointing at the README section for context, and suggesting `git status` if the project uses git.
- [ ] If migration is a no-op (no flat layout detected — already migrated, or fresh project), the upgrade proceeds normally with no migration output.
- [ ] If migration encounters errors (collisions, EXDEV failures), they are reported but upgrade continues.
- [ ] `README.md` (the joycraft repo's own README) gains a clearly-labeled section titled `## Migration: Flat → Per-Feature Layout (v0.X+)` describing what changed, why, what users will see on their first post-upgrade run, and how to recover (it's all `git mv`-able if they want different organization).
- [ ] Build, typecheck, tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Upgrade detects flat layout and runs migration | `tests/upgrade.test.ts` — pre-create flat layout, run upgrade, assert post-upgrade dir structure has `docs/features/<slug>/` | integration |
| Upgrade is no-op for already-migrated projects | Same — pre-create per-feature layout (no flat dirs), run upgrade, assert no migration banner in stdout | integration |
| Forced — no prompt | Same — capture stdout/stderr during upgrade with no stdin input, assert it does NOT hang or prompt | integration |
| Summary lists each move | Same — capture stdout, assert lines like `docs/briefs/X.md → docs/features/X/brief.md` appear | integration |
| Orphan spec dirs listed | Same — pre-create an orphan spec dir, assert summary mentions it under a "left in place" group | integration |
| Banner refers to README and git status | Same — assert banner mentions the README and `git status` | integration |
| Errors reported but non-blocking | Pre-create a collision (target file already exists), run upgrade, assert error is logged but exit code is 0 | integration |
| README has the migration section | `tests/readme.test.ts` (new) — read README, assert it contains the section header `## Migration: Flat → Per-Feature Layout` | unit |
| Existing managed-file diff still runs after migration | Same upgrade test — also assert the existing skill-update path runs (e.g., a customized skill prompt would still appear if applicable) | integration |

**Execution order:**
1. Write all tests; the migration-related ones fail (no wiring), the README test fails (no section).
2. Confirm red.
3. Wire migration into `upgrade.ts`, add the README section, until green.

**Smoke test:** `pnpm test --run tests/upgrade.test.ts` — usually <5s.

**Before implementing, verify your test harness:**
1. The upgrade tests must run the real `upgrade` export (or call the bundled `dist/cli.js upgrade`), not a stub.
2. tmp-dir setup uses `mkdtempSync` and afterEach cleanup.
3. Stdout capture uses a real stream; tests fail with mismatched expectations.

## Constraints

- MUST: Run migration BEFORE the managed-file diff loop, so any new managed files (spec 6 will add a new skill) end up correctly placed in an already-migrated tree.
- MUST: Skip migration silently when no flat layout is present (don't even print "no migration needed" — keep upgrade output clean for users on the new layout).
- MUST: Use the same `askUser()` pattern from upgrade.ts only for the existing managed-file diff loop — not for the migration. Migration is forced.
- MUST: Banner output goes to stdout, not stderr (it's informational, not an error).
- MUST NOT: Prompt the user about the migration. Design Q6 is explicit.
- MUST NOT: Add a `--no-migrate` or `--skip-migration` CLI flag. Forced means forced.
- MUST NOT: Touch `tests/migration.test.ts` — that's spec 4's territory; this spec only tests the wiring.
- MUST NOT: Ship a buggy migration — if `applyMigration` returns errors for >50% of moves, abort the upgrade with a clear error rather than half-migrate. (The 50% threshold is a heuristic to prevent disasters; under that, treat individual errors as warnings.)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/upgrade.ts` | Add migration import; insert plan+apply step before managed-file diff loop; print summary + banner. |
| Modify | `README.md` | Add `## Migration: Flat → Per-Feature Layout (v0.X+)` section explaining the restructure. |
| Modify | `tests/upgrade.test.ts` | Add the integration assertions above. |
| Create | `tests/readme.test.ts` | Unit assertion that README has the migration section. |

## Approach

**Strategy:** Insert migration as a discrete pre-step in upgrade. Plan → print summary → apply → print banner → proceed with managed-file diff. Each step is small enough to fit in ~30 LOC of new wiring.

**Data flow:**
```
upgrade(projectDir)
  → existing version-read step
  → NEW: plan = planMigration(projectDir)
  → NEW: if plan.moves.length > 0:
            printSummary(plan)
            result = applyMigration(plan)
            printBanner(result)
            (don't gate on result.errors — collected, reported)
  → existing managed-file diff loop
  → existing writeVersion at end
```

**Key decisions:**
- Migration runs even if version is already up-to-date with the latest npm-registry version. The "I'm on the latest version but still have flat layout" case is real for users who upgraded the CLI and now run upgrade again — they should still get their docs migrated.
- Banner mentions `git status` rather than running it ourselves. Some users gitignore docs (design Q3); we don't assume.
- Forced means forced — but errors are non-fatal for individual moves (we report and continue). The only abort case is the >50% failure threshold, which suggests something is fundamentally wrong (filesystem permissions, etc.).

**Rejected alternative:** Run migration in a transaction (move all-or-nothing). Rejected — `node:fs` doesn't offer atomicity across multiple renames. Best-effort with skip-existing on re-run is the practical floor.

**Rejected alternative:** Make migration a separate `npx joycraft migrate` command. Rejected — design Q6 explicitly says it should run as part of `upgrade` for the small user base. Adding a separate command splits documentation and adds a step users might miss.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Project has flat layout but is not a git repo | Migration runs; banner omits the `git status` line or prints it anyway — pick one and document. (Suggest: print it anyway. `git status` outside a repo is a clear no-op for the user.) |
| Project has an unusual flat layout (only `docs/research/` populated, no `docs/briefs/`) | Migration still runs — research files get their own feature folders by their own slugs. |
| User has `docs/features/` from a prior partial run | planMigration is idempotent; applyMigration skips collisions. Banner still prints because there were moves to do (even if some skipped). |
| User has a brief at `docs/briefs/X.md` but their git working tree is dirty | Migration moves files anyway; user gets unstaged moves in their working tree. Their problem to commit/discard. (Document this in the README section.) |
| Migration runs against a Joycraft-internal repo that uses `docs/specs/<flat-slug>.md` files at the top level | Per spec 4 constraint, top-level loose .md files are NOT moved. They stay as area-level specs. The integration test should include a fixture covering this. |
| Upgrade is run twice in a row | First run migrates; second run sees no flat layout, runs no migration, prints nothing about migration. |
| Filesystem is read-only | Migration errors out on first move; if errors >50%, upgrade aborts with a clear message. |

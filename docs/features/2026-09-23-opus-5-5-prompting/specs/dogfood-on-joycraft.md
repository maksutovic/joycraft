---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-24
feature: 2026-09-23-opus-5-5-prompting
mode: checkpoint
---

# Dogfood the Opus 5.5 Changes on Joycraft — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-23-opus-5-5-prompting/brief.md`
> **Status:** Ready
> **Date:** 2026-09-24
> **Estimated scope:** 1 session / installer output + 3 hand edits / ~60 lines by hand

---

## What

After specs 1–8 are `in-review`, run the built updater on this repo and finish the repo-local changes:

1. `pnpm build`, then `node dist/cli.js update .` (non-interactive where supported). Expected result: `docs/templates/reference/model-profile-claude.md` is tracked in `docs/.joycraft/manifest.json`; `docs/templates/reference/model-profile-claude-fable-5-1.md` is deleted and gone from the manifest; the memory file's Context Map row is swapped in place (spec 3); `.pi/scripts/joycraft/joycraft-implement-loop`, `docs/templates/workflows/autofix.yml`, and `docs/intent/README.md` match their sources.
2. Edit this repo's `AGENTS.md` Execution Profile, inside the `joycraft:execution-profile` sentinels, from `- claude: Swarms: decompose yes · implement yes · model opus 5.5 · effort high` to `... · effort medium` (decision D7). Change nothing else in the region.
3. Run optimize's Step 2c by hand against `AGENTS.md` and `CLAUDE.md`: grep for think-harder and write-out-your-reasoning rules, and record the rows (expected: none) in the commit message body.
4. Update `tests/dogfood-update.test.ts`: the "Fable-native harness artifacts" case expects `docs/templates/reference/model-profile-claude.md` in the checked-in manifest and asserts the Fable path is absent.
5. Add a CHANGELOG.md entry under the unreleased section: one Claude model profile tagged by model, four Opus 5.5 blocks, the row swap on update, the Pi loop and autofix standing instruction, autofix reading the CI log from a file, the optimize thinking-rule class, and the intent README tag rule.

## Why

The brief's success criteria require this repo to run the shipped result, and D7 changes this repo's effort setting.

## Acceptance Criteria

- [ ] The manifest tracks `docs/templates/reference/model-profile-claude.md` and not the Fable path; the Fable file is gone from disk.
- [ ] `AGENTS.md` has exactly one Context Map row for the profile, the new one, at the old row's position; `git diff AGENTS.md` shows only that row and the effort change.
- [ ] `AGENTS.md` Execution Profile claude row ends `effort medium`.
- [ ] `.pi/scripts/joycraft/joycraft-implement-loop` is byte-identical to `src/templates/pi-scripts/joycraft-implement-loop`.
- [ ] `docs/templates/workflows/autofix.yml` and `docs/intent/README.md` are byte-identical to their sources.
- [ ] `tests/dogfood-update.test.ts` expects the new path and passes.
- [ ] CHANGELOG.md has the entry.
- [ ] `pnpm test && pnpm typecheck` pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Manifest and files | `tests/dogfood-update.test.ts` updated case: new path in manifest and on disk; Fable path in neither | integration |
| One profile row | New case in the same file: `AGENTS.md` contains the new row once and not the legacy row | integration |
| Effort medium | New case: the execution-profile region's claude line ends with `effort medium` | integration |
| Byte-identical installs | New case: compare the three installed files to their `src/templates/` sources | integration |
| Whole suite | `pnpm test && pnpm typecheck` | integration |

**Execution order:**
1. Update `tests/dogfood-update.test.ts` first — red against the un-updated repo.
2. Confirm.
3. Run the updater, make the hand edits, until green.

**Smoke test:** `pnpm vitest run tests/dogfood-update.test.ts`

**Before implementing, verify your test harness:**
1. The updated dogfood cases must FAIL before the updater runs
2. They read the real repo files
3. Seconds to run

## Constraints

- MUST: run only after specs 1–8 are `in-review`.
- MUST: review the updater's plan output before applying; stop and report if it plans to replace or delete anything other than the files named above, the regenerated skill trees, and the row.
- MUST: keep every other byte of `AGENTS.md` and `CLAUDE.md`.
- MUST: run `/release-docs-sync` before opening the PR (AGENTS.md ALWAYS rule); the CHANGELOG entry satisfies the docs gate.
- MUST NOT: apply any optimize row by hand beyond reporting it.
- MUST NOT: change the codex or pi Execution Profile rows.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Installer | `docs/templates/reference/*`, `docs/.joycraft/manifest.json`, `.pi/scripts/joycraft/*`, `docs/templates/workflows/autofix.yml`, `docs/intent/README.md`, installed skill trees | `node dist/cli.js update .` |
| Installer | `AGENTS.md` (or the memory file the selection names) | Row swap |
| Modify | `AGENTS.md` | Execution Profile effort |
| Modify | `tests/dogfood-update.test.ts` | New path, new cases |
| Modify | `CHANGELOG.md` | Entry |

## Approach

Build, preview the update plan, apply, then hand-edit the effort value and tests. The fable-native dogfood spec (`docs/features/2026-09-22-fable-native-sdlc-harness/specs/dogfood-update-and-cleanup-on-joycraft.md`) is the pattern to follow for the updater invocation.

Rejected alternative: copy files by hand instead of running the updater. That skips the manifest update and the row swap, which are what this spec proves.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Git status already shows `M docs/.joycraft/manifest.json` before you start | Inspect it first; commit or restore it deliberately before running the updater, and say which in the commit message |
| The updater reports the Fable doc as customized | Stop and report; the checked-in copy should be unmodified |
| The row lives in CLAUDE.md instead of AGENTS.md for this selection | Assert on whichever file the updater wrote; the test reads both |

---
id: 26
status: todo
---
# Release proof: the new paths run end to end here, and 1.9.0 carries its release fields

Parent: [brief](../brief.md), section Scope and limits. All 13 decisions are answered; they are quoted by ID.

Brief `Scope and limits`: "Not yet run end to end: the `CI=1` path, `--patch`, and the three saved faults. These are the release proof." This spec runs what this repository can run; the field project's parts are deferred. The release ships with drift-tidy as 1.9.0.

## acceptance

- A real test of this repository runs through the payload runtime with both markers and a footer: `node payload/.joycraft/runtime/evidence.mjs run --receipt docs/features/2026-11-21-test-release/specs/receipts/proof-ci.log -- pnpm test tests/runtime-config-tests.test.ts` exits 0, and the receipt footer shows `exitCode: 0`, `cores` and `loaded`. Check: that command and its receipt.
- `--patch` runs end to end in a linked worktree of this repository with installed dependencies: a saved fault patch that breaks `payload/.joycraft/runtime/config.mjs`'s `gateRuns` check makes `pnpm test tests/runtime-config-tests.test.ts` fail through `evidence.mjs run --patch`, and the worktree is byte-identical after. Check: the command's result (`exitCode: 1`, `restored: true`) and an empty `git status --porcelain`.
- An installed project gets the new parts: `pnpm build` then `node dist/cli.js init <tmp> --yes` installs `.joycraft/references/testing-page.md`, `.joycraft/runtime/test-changes.mjs` and the template `tests:` section. Check: the three files exist in `<tmp>`.
- The release fields say 1.9.0: `package.json` `version` and `joycraft.release`, `joycraft.summary`, `src/joycraft-release.json` `releaseVersion`, and a `## 1.9.0` CHANGELOG heading covering drift-tidy and this release, with the update note "test commands now also get `JOYCRAFT_EVIDENCE=1`; a local limit that reads `CI` should check it too" (ruling section 5). Check: `pnpm test tests/release-preparation.test.ts tests/payload-guard.test.ts` passes and the CHANGELOG holds the note.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `package.json`, `src/joycraft-release.json`, `CHANGELOG.md`.
- Tests: `tests/release-preparation.test.ts`, `tests/payload-guard.test.ts`, `tests/runtime-config-tests.test.ts`. Tag each new test `[AC:spec-26-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- This spec edits release files outside `payload/` (`package.json`, `src/joycraft-release.json`, `CHANGELOG.md`); AGENTS.md makes the release fields the implementer's job. Run `/release-docs-sync` before the PR.
- Keep the proof receipts in the feature folder so the reviewer can rehash them.

## Deferred until deploy

- In the field project: run one test through `evidence.mjs` before and after its own `local-run.mjs` line-34 change, to show its worker cap, nice level and slot come back under `JOYCRAFT_EVIDENCE` (nobody has run the `CI=1` defect end to end).
- In the field project: replay the fault proof (ruling rows 3 to 5) on the 10 test files of PRs #69 and #70, with the first saved faults from the reversed fixes `373c20991`, `296938119` and `d49c6441d`.
- In the field project: run `--patch` in a worker worktree under the Codex sandbox.
- Next field report: gate runs per spec and the run facts (load, cores, wall time) across a parallel queue; kill criterion for ruling row 6 is start load above 2 x cores in more than a quarter of runs.

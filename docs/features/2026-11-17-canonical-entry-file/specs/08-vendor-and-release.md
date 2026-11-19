---
id: 8
status: todo
---
# Outcome

Joycraft 1.6.0 ships the entry check, the one-pass cleanup and the artifact
engine's document pages: the payload is the new field build, it has no more
words than the last one, and the docs tell a user how to ask for a cleanup and
what it does. Brief: [one-pass](../brief.md#one-pass),
[scope](../brief.md#scope-and-limits). The owner said go on 2026-11-18, after a
confirmation run of the cleanup. Spec 12 did not run every measure; its
"Result" section has each one, and the owner accepted that proof by name on
2026-11-18.

## acceptance

- The payload is the new field build. Check: `payload/PIN` names the field tag
  that carries specs 1 to 11 and the document pages of the artifact engine;
  `payload/.joycraft/runtime/entry-check.mjs` exists; no shipped file is or
  names `now.md`, and no shipped file names `entry.tidy`;
  `pnpm test && pnpm typecheck` pass (`[AC:vendored-field-build]`).
- The payload did not grow. Check: `tests/payload-guard.test.ts` has a
  `FIELD_24_WORDS` constant, counted with the guard's own counter on the
  field-24 payload, and fails when the shipped skills, agent files and
  references have more words than that (`[AC:payload-words-not-up]`).
- A user can find it. Check: the README has a section "Keeping AGENTS.md
  current" that says in plain words: that a cleanup covers the entry file and
  the pages behind its map in one pass; that it asks at most eight questions,
  each about one policy, on one page; that it shows a permission ledger before
  the commit and changes no permission without an answer or a recommendation
  that the owner can veto; that it gives each finding a final status and can
  check again on request; that session end only reports and makes mechanical
  fixes; the prompt "Clean up my AGENTS.md and context pages"; and the CI line
  `node .joycraft/runtime/entry-check.mjs --ci`. The README also says that
  each page for a person comes from the artifact engine, and that a document
  page shows images and Mermaid diagrams. `docs/prompts.md` has the prompt.
  `scripts/ste-lint.py` passes on the new prose (`[AC:readme-entry-section]`).
- The release fields move together. Check: `package.json` `version` and
  `joycraft.release` are 1.6.0, `joycraft.summary` describes this release,
  `src/joycraft-release.json` has `releaseVersion` 1.6.0, the CHANGELOG has an
  entry for it, and `docs/context/shipped.md` has its row
  (`[AC:release-fields]`).
- Vendor guidance is re-read at release time. Check: `docs/guides/releasing.md`
  has one checklist line: read the Claude Code memory docs and the Codex
  `AGENTS.md` docs again, and change the managed block or a check when they
  changed (`[AC:release-checklist-line]`).
- The brief's fixture goals hold on the vendored payload. Check: on a fixture
  project with a dead path in `AGENTS.md`, `entry-check.mjs --ci` exits 2; on a
  clean fixture it prints nothing; a block with one changed word gives one
  `managed-block` advisory and `--ci` exits 0; `entry-check.mjs block` prints
  Joycraft's lines (`tests/payload-entry-check.test.ts`,
  `[AC:payload-entry-check]`).

## Not covered

Running `entry-check.mjs --ci` on this repository's own `AGENTS.md` in CI: this
repository is tidied with the released version first, as a later change.

## Implementation and verification scope

This repository: `payload/` (vendored with `scripts/vendor-payload.mjs` from
the new field tag), `tests/payload-guard.test.ts`, new
`tests/payload-entry-check.test.ts`, `README.md`, `docs/prompts.md`,
`CHANGELOG.md`, `package.json`, `src/joycraft-release.json`,
`docs/context/shipped.md`, `docs/guides/releasing.md`. Run
`pnpm install && pnpm build` before `pnpm test` in a fresh worktree. Run
`/release-docs-sync` before `gh pr create`. The owner merges; a merge to `main`
publishes to npm.

## Deferred until deploy

The owner or an attended session checks these with the published version. Spec
12 has the result of each measure before the release:

- A cleanup result passes the own test gate of a field project. Not run before
  the release.
- A worker does no worse with the cleaned files than with the old files, on
  three harnesses, on a task that needs a moved rule. Not run before the
  release.
- The final skill text, on a small second repository, gives an entry file
  that is not longer and asks at most 3 questions. An earlier text failed this
  measure, and the final text was not run.
- A document page with a Mermaid diagram renders inside a live Claude
  artifact. Not checked before the release.
- An update from 1.5.4 leaves no old Joycraft line beside the block. This
  passed in one run before the release.
- Each question of a cleanup can be answered from its page. In the last run
  the owner could not answer one of 8 from the page.

## State, 2026-11-18

The work of this spec is in the release pull request: payload `field-25`, the
tests, the docs and the release fields. `pnpm test` and `pnpm typecheck` pass.
The status stays `todo`: `completion.mjs submit` refuses this spec while spec 12
is not done, spec 12 cannot be submitted while spec 11 is not done, and no
review of specs 1 to 11 is on record.

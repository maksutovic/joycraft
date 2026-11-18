---
id: 8
status: todo
---
# Outcome

Joycraft 1.6.0 ships the canonical entry file and the one-pass cleanup: the payload is
the new field build, it has no more words than the last one, and the docs tell
a user how to ask for a cleanup and what it does. Brief:
[one-pass](../brief.md#one-pass), [scope](../brief.md#scope-and-limits). It starts only
after spec 12 passes and the owner says go.

## acceptance

- The payload is the new field build. Check: `payload/PIN` names the field tag
  that carries specs 1 to 11; `payload/.joycraft/runtime/entry-check.mjs`
  exists and `payload/.joycraft/templates/now.md` does not; `pnpm test && pnpm typecheck`
  pass (`[AC:vendored-field-build]`).
- The payload did not grow. Check: `tests/payload-guard.test.ts` has a
  `FIELD_24_WORDS` constant, counted with the guard's own counter on the
  field-24 payload, and fails when the shipped skills, agent files and
  references have more words than that (`[AC:payload-words-not-up]`).
- A user can find it. Check: the README has a section "Keeping AGENTS.md
  current" that says in plain words: that a cleanup covers the entry file and
  the pages behind its map in one pass; what it asks the owner (permissions,
  holds, deleting his material) and that it changes no rule without his
  answer; the prompt "Clean up my AGENTS.md and context pages"; and the CI
  line `node .joycraft/runtime/entry-check.mjs --ci`. `docs/prompts.md` has
  the prompt. `scripts/ste-lint.py` passes on the new prose
  (`[AC:readme-entry-section]`).
- The release fields move together. Check: `package.json` `version` and
  `joycraft.release` are 1.6.0, the CHANGELOG has an entry
  for it with the release summary, and `docs/context/shipped.md` has its row
  (`[AC:release-fields]`).
- Vendor guidance is re-read at release time. Check: `docs/guides/releasing.md`
  has one checklist line: read the Claude Code memory docs and the Codex
  `AGENTS.md` docs again, and change the managed block or a check when they
  changed (`[AC:release-checklist-line]`).
- The brief's fixture goals hold on the vendored payload. Check: on a fixture
  project with a dead path in `AGENTS.md`, `entry-check.mjs --ci` exits 2; on a
  clean fixture it prints nothing; a block with one changed word fails and the
  rest of the file is not named (`tests/payload-entry-check.test.ts`,
  `[AC:payload-entry-check]`).

## Not covered

Running `entry-check.mjs --ci` on this repository's own `AGENTS.md` in CI: this
repository is tidied with the released version first, as a later change.

## Implementation and verification scope

This repository: `payload/` (vendored, with a new pin exported as
`docs/context/traps.md` in joycraft-prototype says), `tests/payload-guard.test.ts`,
new `tests/payload-entry-check.test.ts`, `README.md`, `docs/prompts.md`,
`CHANGELOG.md`, `package.json`, `docs/context/shipped.md`,
`docs/guides/releasing.md`. Run `pnpm install && pnpm build` before `pnpm test`
in a fresh worktree. Run `/release-docs-sync` before `gh pr create`. The owner
merges; a merge to `main` publishes to npm.

## Deferred until deploy

The field run needs the published version in the field project. The owner or
an attended session checks these after the release, against the
[pre-committed measurements](../../../research/2026-11-17-entry-file-sota-panel-verdict.md#pre-committed-measurements):

- A cleanup run on the field file asks at most 2 questions (baseline 9), and
  none is about shape, placement, duplicates, map wording or unmapped pages.
- The rules list is shown one time; after the yes, no date, status or dated
  link remains in the entry file outside a code span, and its rows to dated
  briefs and handoffs are `now.md` entries behind one row.
- A session end that closes the last open item leaves `now.md` with its two
  headings and no entry.
- Over 10 runs: median questions at most 1; owner reverts of tidy commits at
  most 1; no hold missed by a session or a queue. A lost or changed safety rule
  returns the tidy default to `review`.

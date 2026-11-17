---
id: 1
status: in-review
---
# Outcome

One command tells a project whether its entry files need work. It is silent when
they are clean, it has a CI mode, and it does not depend on the update policy.
Brief: [entry-check](../brief.md#entry-check).

## acceptance

- A clean project is silent. Check: fixture `fixtures/entry-check/clean/` (an
  `AGENTS.md` whose paths and links all exist); run
  `node .joycraft/runtime/entry-check.mjs --root <fixture>`; exit code 0, stdout
  and stderr empty (`tests/cleanup/entry-check.test.mjs`,
  `[AC:entry-clean-silent]`).
- A dead path in an entry file is a gate finding. Check: fixture `dead-path/`,
  whose `AGENTS.md` names `docs/context/gone.md` and links a file that does not
  exist; the command prints JSON with one `missing-path` and one `broken-link`
  finding for `AGENTS.md`, each with its line, and exits 2. A dead path in a
  context page that no entry file names is not in the output
  (`[AC:entry-dead-path]`).
- CI mode prints lines, not JSON. Check: the same fixture with `--ci`; stdout has
  one line for each gate finding in the form `AGENTS.md:<line> <check> <detail>`,
  exit code 2. An advisory finding alone (a context page with no map row) prints
  nothing with `--ci` and exits 0 (`[AC:entry-ci-mode]`).
- The update policy does not hide it. Check: the `dead-path/` fixture with
  `.joycraft/local/preferences.json` set to `update.policy: off`; the command
  still exits 2 (`[AC:entry-policy-independent]`).
- A linked worktree is checked like the main tree. Check: a Git fixture with a
  linked worktree made by `git worktree add`; the command run with
  `--root <linked tree>` gives the same findings and the same exit code 2 as
  in the main tree (`[AC:entry-linked-worktree]`). Owner, 2026-11-17: "why
  would worktrees matter?" The first form of this criterion said that a linked
  worktree checks nothing.

## Not covered

New checks (spec 2), holds and old `now.md` entries (spec 5), the rules pin
(spec 6), the managed block (spec 7). A SessionStart hook: the first-action line
is the trigger on every host.

## Implementation and verification scope

Implemented in joycraft-prototype (the payload is vendored; never edit
`payload/` here). New `.joycraft/runtime/entry-check.mjs` with a pure export
`entryReport({ root })` that filters `cleanupReport` from
`.joycraft/runtime/cleanup.mjs` to findings whose `path` is `AGENTS.md` or
`CLAUDE.md`, plus `unmapped` and `orphan`. Gate checks: `missing-path`,
`broken-link`. Every other check is advisory. `cleanup.mjs`
output and exit codes do not change. An unexpected error exits 1, not 2.
`tests/cleanup/entry-check.test.mjs`; fixtures under `fixtures/entry-check/`.

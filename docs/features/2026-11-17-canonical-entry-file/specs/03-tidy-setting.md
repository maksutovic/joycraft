---
id: 3
status: done
---
# Withdrawn by spec 9

This spec is withdrawn. It built the `entry.tidy` setting and the default for
each user. Spec 9 removed that, on the owner's decision of 2026-11-18 (brief,
section `one-pass`, "Cut from the first design"). joycraft-prototype commit
`a35170a` added it and `c586d0d` removed it. No released version had it.

The status `done` on this spec means that it is retired. It does not mean that
the original outcome below was built or verified. A review of this spec checks
one thing: that nothing it built ships.

## acceptance

- Nothing that this spec built ships. Check: `node
  .joycraft/runtime/config.mjs` reports no `entry` key and has no `user`
  command; an `entry:` key in `joycraft.yaml` is an unknown key; no shipped
  file names `entry.tidy` (spec 9, `[AC:no-tidy-setting]`,
  `tests/config/config.test.mjs` and `tests/cleanup/cleanup-text.test.mjs` in
  joycraft-prototype) (`[AC:withdrawn-tidy-setting]`).

# Original spec, kept as a record

The text below is the spec as it was. Its checks are not criteria.

## Original outcome

`entry.tidy` is a setting with a default for each user. A user who sets `auto`
one time is never asked about tidying in any project. A user with no default is
asked one question, one time for each project. Brief:
[tidy](../brief.md#tidy). Ruling `tidy-consent` note (owner): "could we have
this user tunable? So like for me i want do not ask at all".

## Original acceptance

- The project setting is read and checked. Check: a project whose
  `joycraft.yaml` has `entry:\n  tidy: auto`; `node .joycraft/runtime/config.mjs`
  prints `entry.tidy` as `auto` with source `project`. The value `sometimes`
  stops the command with a message that names `entry.tidy` and the three values
  (`tests/config/config.test.mjs`, `[AC:tidy-project-setting]`).
- The user default applies when the project has none. Check: `JOYCRAFT_HOME`
  points at a fixture folder whose `preferences.json` is
  `{ "entry": { "tidy": "auto" } }`, and the project has no `entry.tidy`;
  `config.mjs` prints `auto` with source `user`. With the project set to
  `review`, it prints `review` with source `project`. With neither, it prints
  `ask-once` with source `default`. Without `JOYCRAFT_HOME`, the folder is
  `~/.joycraft` (`[AC:tidy-user-default]`).
- One command writes the user default. Check:
  `node .joycraft/runtime/config.mjs user --set entry.tidy=auto` with
  `JOYCRAFT_HOME` at an empty temporary folder creates `preferences.json` with
  that value and keeps other keys on a second run with `entry.tidy=review`. A
  bad value writes nothing and exits 1 (`[AC:tidy-user-write]`).
- Settings by request covers it. Check: the table in
  `.joycraft/references/settings.md` maps "Tidy AGENTS.md without asking me" to
  `entry.tidy`, and one sentence says that "in all my projects" means
  `config.mjs user --set` (`[AC:tidy-settings-row]`).
- Setup asks the one question, and only when it must. Check:
  `.joycraft/references/setup.md` step 2 says: when `config.mjs` reports
  `entry.tidy` from source `default`, ask one question with three answers (tidy
  without asking in this project; the same in all my projects; show me each
  tidy first) and record the answer in `joycraft.yaml` or with
  `config.mjs user --set`; with source `project` or `user`, do not ask
  (`[AC:tidy-setup-question]`).

## Original not covered

What a tidy does under each value (spec 4). The one-time rules list, which every
value shows (spec 6). An update that asks the question: the first attended tidy
asks it (spec 4).

## Original implementation and verification scope

Implemented in joycraft-prototype. `.joycraft/runtime/config.mjs` (`defaults`,
`known`, `readConfig`, `main`; the new `user` command),
`.joycraft/templates/joycraft.yaml` (a commented `entry.tidy` line),
`.joycraft/references/settings.md`, `.joycraft/references/setup.md`,
`tests/config/config.test.mjs`. `joycraft.yaml` stays the user's file:
`config.mjs` reads it and never writes it; the agent edits it as
`settings.md` says. The user file is the first Joycraft file outside a project;
it holds preferences only, never project state. Tests must set `JOYCRAFT_HOME`
so that no test reads or writes the real home folder.

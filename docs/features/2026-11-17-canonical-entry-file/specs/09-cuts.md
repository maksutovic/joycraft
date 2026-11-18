---
id: 9
status: todo
---
# Outcome

The bundle no longer has `now.md`, the rules markers and byte pin, or the
`entry.tidy` setting. The date check and the managed-block check are
advisories. Brief: [one-pass](../brief.md#one-pass). This spec removes what
specs 3, 5 and 6 added.

## acceptance

- No now page. Check: no file under `.agents/skills/`, `.claude/agents/`,
  `.joycraft/references/`, `.joycraft/runtime/` or `.joycraft/templates/`
  names `now.md`; `entry-check.mjs start` is a usage error;
  `update-check.mjs check` and `coordinator.mjs claim` print no `Hold:` line;
  archive leaves no trace of a now page in its plan
  (`tests/cleanup/cleanup-text.test.mjs`, `[AC:no-now-page]`).
- No markers and no pin. Check: `entry-check.mjs rules` and
  `entry-check.mjs pin --record` are usage errors; no shipped file names
  `joycraft:rules` or `entry-pin`; `entry-size` counts every word of the file
  (`tests/cleanup/entry-check.test.mjs`, `[AC:no-pin]`).
- No tidy setting. Check: `config.mjs` reports no `entry` key and has no
  `user` command; a `joycraft.yaml` with an `entry:` key still loads, and the
  key is ignored, so a project that set it does not break; no shipped file
  names `entry.tidy` (`tests/config/config.test.mjs`, `[AC:no-tidy-setting]`).
- The date check is an advisory that names records. Check: a date or a dated
  pointer in an entry file gives one `temporal` advisory whose `fix` names the
  decision log, a log page and the backlog, and not a now page; `--ci` exits 0
  for it (`tests/cleanup/cleanup.test.mjs`, `[AC:temporal-names-records]`).
- A block that differs is an advisory. Check: a fixture with one changed word
  in the block gives one `managed-block` advisory and `--ci` exits 0
  (`tests/cleanup/entry-check.test.mjs`, `[AC:block-advisory]`).

## Not covered

The cleanup skill and reference text (spec 11). Removing a `now.md` that a
project already has: no released version created one.

## Implementation and verification scope

joycraft-prototype: `.joycraft/runtime/` (`entry-check.mjs`, `cleanup.mjs`,
`config.mjs`, `update-check.mjs`, `coordinator.mjs`, `archive.mjs`),
`.joycraft/templates/`, the references and skills that name the cut parts,
fixtures under `fixtures/entry-check/`, tests as named.

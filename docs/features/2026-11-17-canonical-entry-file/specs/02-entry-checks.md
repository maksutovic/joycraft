---
id: 2
status: in-review
---
# Outcome

The cleanup report finds the entry-file faults that the vendors name: temporal
text, a command that does not exist, a Codex chain that is too large and an
import that is not portable. The size budget counts every word of the file.
Brief: [entry-check](../brief.md#entry-check),
[map-rows](../brief.md#map-rows).

## acceptance

- Temporal text is advisory. Check: fixture `fixtures/entry-check/temporal/`,
  whose `AGENTS.md` has a sentence with `2026-10-21`, a map row that links
  `docs/features/2026-10-12-example/brief.md`, and the folder name
  `docs/features/2026-10-12-example/` inside a code span on another line;
  `cleanupReport` gives two `temporal` findings (the sentence and the row) and
  none for the code span. `entry-check.mjs --ci` exits 0
  (`tests/cleanup/cleanup.test.mjs`, `[AC:temporal-advisory]`).
- A command that no manifest defines is a gate finding. Check: fixture
  `script-name/` with a `package.json` that defines `test` and `check`, and an
  `AGENTS.md` that names `` `pnpm verify` ``, `` `pnpm test` `` and
  `` `npm run check` ``; one `script-name` finding, for `verify`. A project with
  no manifest gives no finding and one `skipped` entry
  (`[AC:script-name-gate]`).
- The Codex chain limit is a gate finding. Check: fixture `codex-bytes/` with a
  root `AGENTS.md` of 20,000 bytes and `packages/a/AGENTS.md` of 13,000 bytes;
  one `codex-bytes` finding for `packages/a/AGENTS.md` that states 33,000 and
  32,768. With the nested file at 12,000 bytes there is no finding
  (`[AC:codex-bytes-gate]`).
- A non-portable import is a gate finding. Check: fixture `imports/` with a
  line `@docs/context/extra.md` in `AGENTS.md`, an `AGENTS.override.md` file,
  and a `CLAUDE.md` whose only import is `@AGENTS.md`; two `import` findings
  (the line and the override file) and none for `CLAUDE.md`
  (`[AC:import-gate]`).
- `entry-size` counts every word of the file. Check: an `AGENTS.md` of 1,200
  words, 898 of them between `<!-- joycraft:rules -->` markers, gives one
  `entry-size` finding at the default `cleanup.entryWords` of 1000, and its
  detail starts "1200 words; the budget is 1000". The markers exempt nothing
  (`tests/cleanup/cleanup.test.mjs`, the test tagged `[AC:no-pin]`;
  `[AC:entry-size-whole-file]`).
- The reference names each new check. Check: the table in
  `.joycraft/references/cleanup.md` has one row each for `temporal`,
  `script-name`, `codex-bytes`, `import` and `entry-size`
  (`[AC:cleanup-reference-rows]`).

## Not covered

Checks for one stack: `script-name` reads script names from `package.json`
only. A word list for rule text, a per-project word baseline, a check for a
nested `CLAUDE.md` (all dropped in the brief). `now.md` is exempt from
`temporal` and `working-link` in spec 5.

## Implementation and verification scope

Implemented in joycraft-prototype. `.joycraft/runtime/cleanup.mjs`
(`cleanupReport`, `references`), `.joycraft/runtime/entry-check.mjs` (gate list
gains `script-name`, `codex-bytes`, `import`), `.joycraft/references/cleanup.md`,
`tests/cleanup/cleanup.test.mjs`, fixtures under `fixtures/entry-check/`.
`temporal` matches an ISO date (`YYYY-MM-DD`) outside a code span, and a link or backticked path whose file or folder name
starts with an ISO date. Match narrowly: no month names, no version numbers.
The words this spec adds to `cleanup.md` are part of the budget in spec 8.

## Amended, 2026-11-18

Spec 9 removed the rules markers (owner's decision of 2026-11-18, brief section
`one-pass`; joycraft-prototype commit `c586d0d`). Two checks of this spec named
them, and they now have their current form:

- `[AC:entry-size-outside-rules]` said that `entry-size` counts only words
  outside the rules markers. It is now `[AC:entry-size-whole-file]`: the check
  counts every word, as spec 9 `[AC:no-pin]` says.
- `[AC:cleanup-reference-rows]` said that the `entry-size` row has the words
  "outside the rules markers". The row no longer has them.

The outcome and the `temporal` sentence in the scope section lost the same
words. "Not covered" names spec 5, which spec 9 withdrew.

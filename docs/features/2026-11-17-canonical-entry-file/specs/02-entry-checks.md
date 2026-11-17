---
id: 2
status: todo
---
# Outcome

The cleanup report finds the entry-file faults that the vendors name: temporal
text, a command that does not exist, a Codex chain that is too large and an
import that is not portable. The size budget counts only text that is not a
rule. Brief: [entry-check](../brief.md#entry-check),
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
- `entry-size` counts only words outside the rules markers. Check: fixture
  `size/` whose `AGENTS.md` has 300 words outside and 900 words between
  `<!-- joycraft:rules -->` and `<!-- /joycraft:rules -->`; no `entry-size`
  finding at the default `cleanup.entryWords` of 1000. With 1,100 words outside
  there is one, and its detail states the count outside the markers. A file with
  no markers is counted whole, as today (`[AC:entry-size-outside-rules]`).
- The reference names each new check. Check: the table in
  `.joycraft/references/cleanup.md` has one row each for `temporal`,
  `script-name`, `codex-bytes` and `import`, and the `entry-size` row says
  "outside the rules markers" (`[AC:cleanup-reference-rows]`).

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
`temporal` matches an ISO date (`YYYY-MM-DD`) outside a code span and outside
the rules markers, and a link or backticked path whose file or folder name
starts with an ISO date. Match narrowly: no month names, no version numbers.
The words this spec adds to `cleanup.md` are part of the budget in spec 8.

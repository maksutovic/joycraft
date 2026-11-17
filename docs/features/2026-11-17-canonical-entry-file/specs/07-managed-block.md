---
id: 7
status: in-review
---
# Outcome

Joycraft's own lines in `AGENTS.md` are one block between markers. The runtime
prints the block and checks it; the agent places it. A release that changes
Joycraft's lines changes only that block. A new `AGENTS.md` gets the canonical
shape. Brief: [entry-check](../brief.md#entry-check). The earlier ruling
`writer` (`docs/features/2026-11-02-install-entry-files/brief.md`: the agent
writes Joycraft's lines, not the CLI) stays in force.

## acceptance

- The runtime prints the block. Check:
  `node .joycraft/runtime/entry-check.mjs block` prints the text between
  `<!-- joycraft:managed -->` and `<!-- /joycraft:managed -->`, markers
  included: the first-action line, the show-documents line, and "When a path,
  command or description here disagrees with the code, trust the code and
  report it. Rules hold even when the code breaks them." The output is the same
  for every project (`tests/cleanup/entry-check.test.mjs`,
  `[AC:block-printed]`).
- A different block is a gate finding. Check: a fixture whose block has one
  changed word gives one `managed-block` finding whose `fix` names
  `entry-check.mjs block`, and `--ci` exits 2. A fixture with the exact block
  gives none. A fixture with no markers and the two older loose Joycraft lines
  gives one `managed-block` finding that says to replace those lines with the
  block (`[AC:block-gate]`).
- Wiring accepts the block. Check: `node .joycraft/runtime/wiring.mjs` exits 0
  for a project whose `AGENTS.md` has the block and no loose Joycraft line, and
  still exits 0 for a project with the loose lines
  (`tests/runtime/wiring.test.mjs`, `[AC:wiring-accepts-block]`).
- Setup places the block and does not carry its text. Check:
  `.joycraft/references/setup.md` step 3 says to put the output of
  `entry-check.mjs block` in `AGENTS.md` when it is missing, and no longer
  quotes the two Joycraft lines. `.joycraft/references/update.md` says: after
  an update, when the check reports `managed-block`, replace the block; this is
  the one entry-file edit an unattended run makes besides a uniquely renamed
  path (`tests/cleanup/cleanup-text.test.mjs`, `[AC:setup-places-block]`).
- A new file gets the canonical shape. Check: `setup.md` says that an
  `AGENTS.md` it creates has, in this order: identity, commands, rules, the
  managed block, and the map as `| Read when | Document |`. For an existing
  file it says: keep the headings and the column order of the user's map, and
  add rows in that order (`[AC:canonical-shape]`).
- `setup.md` is shorter. Check: its word count is below its field-24 budget in
  `tests/payload-budget.json` (3,115), because the quoted lines moved to the
  runtime (`[AC:setup-words-cut]`).

## Not covered

The execution-profile block, which already has its own markers. A migration of
any user text when vendor guidance changes: Joycraft changes only its block.
Re-reading vendor guidance is a release checklist line (spec 8).

## Implementation and verification scope

Implemented in joycraft-prototype. `.joycraft/runtime/entry-check.mjs`
(`block`, the `managed-block` check), `.joycraft/runtime/wiring.mjs`
(`checkWiring`), `.joycraft/references/setup.md`,
`.joycraft/references/update.md`, tests as named, fixtures under
`fixtures/entry-check/block/`. Seam: `wiring.mjs` and `entry-check.mjs` both
decide whether Joycraft's lines are present; they must read one definition of
the block. Scenario: a project that has the block and no loose line passes
both; a project with one changed word in the block passes wiring (the lines
exist) and fails the entry check.

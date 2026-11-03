---
id: 4
status: todo
---
# After every install, the agent interviews and builds the map

Goals: [map-setup](../brief.md#map-setup), [claude-import](../brief.md#claude-import).
Decisions: `writer` = custom ("the agent DOES ... after an interview with the
user after they paste the installation prompt"), `map` = rows-into-existing,
`claude` = import-line, `audit-on-setup` = during-setup ("anytime after
installation from a prompt, the user should go through some sort of interview").
Built in joycraft-prototype, branch `field/1.1.2` (from `field/1.2-custom-answer`).

## acceptance

`joycraft-entry` and `setup.md`:
- Start of any Joycraft work runs `wiring.mjs`; findings lead to setup before
  other work. Check: skill-evaluation case `unwired-feature-request` shows setup
  first.
- Setup reads entry docs and their pointers, gives each doc a role, runs the
  doc audit's report phase (spec 03), then interviews for what the repo cannot
  tell. On a large repo it goes area by area and says what it has not read.
- It writes or extends AGENTS.md: the Joycraft lines, a `## Context Map` whose
  rows point at real homes with a read-when, new rows below the user's rows. It
  creates a home only when it has content. With Claude Code, CLAUDE.md imports
  `@AGENTS.md` (created as `@AGENTS.md` + `## Claude Code` when missing; import
  added as line 1 when absent; nothing when present).
- It shows the AGENTS.md and CLAUDE.md diff on a rendered page and writes only
  on the user's yes.
- Live run on fixture `fixtures/setup/existing-docs` (README, `docs/` with three
  docs, AGENTS.md without a map, CLAUDE.md without the import), Claude Code,
  scripted answers: afterwards `wiring.mjs` exits 0, `cleanup.mjs` reports no
  `missing-path` or `unmapped`, every original AGENTS.md and CLAUDE.md line is
  still present, and every map row targets an existing file. Check:
  `scripts/host-smoke.mjs` case `setup-existing-docs` plus those three commands.
- Same with a fixture that already has a map: the user's rows are byte-identical
  afterwards. Check: host-smoke case `setup-existing-map`.
- A second run with nothing new changes no file and asks no question. Check:
  host-smoke case reruns and diffs.

## Not covered

The CLI writing any of this (scope limit in the brief). Codex live run is
covered at release (spec 11).

## Implementation and verification scope

`.agents/skills/joycraft-entry/SKILL.md`, `.joycraft/references/setup.md`
("Small shared entry point", "Knowledge grows with the work"),
`fixtures/setup/`, `fixtures/skill-evaluation/`, `scripts/host-smoke.mjs`.
Depends on 01 and 03.

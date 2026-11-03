---
id: 1
status: done
---
# A runtime check says whether a project is wired up

Goal: [wiring-detection](../brief.md#wiring-detection), decision `writer`
("the agent should very easily be able to see if joycraft instructions are
embedded into AGENTS.md"). Built in joycraft-prototype, branch `field/1.1.2` (from `field/1.2-custom-answer`).

## acceptance

`node .joycraft/runtime/wiring.mjs --root .` prints JSON with a `findings` list
and exits 0 when wired, 2 when not. It never edits a file. Findings:
`no-agents-md`, `no-joycraft-lines` (no update-check line), `no-context-map` (no
`## Context Map` heading), `empty-context-map` (the map has no row that points
outside `.joycraft/`), `no-claude-import` (Claude Code host recorded in
`.joycraft/installation.json` and CLAUDE.md missing or without `@AGENTS.md`).

- A bare fixture with only `# App` in AGENTS.md reports `no-joycraft-lines` and
  `no-context-map`, exit 2. Check: `tests/runtime/wiring.test.mjs` "bare".
- A wired fixture (lines, a map with a `docs/context/project.md` row, CLAUDE.md
  `@AGENTS.md`) reports nothing, exit 0. Check: same test, "wired".
- A map whose only row is `.joycraft/references/artifacts.md` reports
  `empty-context-map`. Check: same test, "joycraft-only map".
- A codex-only install does not report `no-claude-import`. Check: same test.
- The file bytes are unchanged after a run. Check: same test hashes the fixture
  before and after.

## Not covered

Judging whether the rows are good. That is the agent's work (spec 04) and
cleanup's (spec 02).

## Implementation and verification scope

New `.joycraft/runtime/wiring.mjs`; `tests/runtime/wiring.test.mjs`; fixtures
under `fixtures/wiring/`. The CLI reuses this module (spec 10); keep its export
`checkWiring(root)` pure.

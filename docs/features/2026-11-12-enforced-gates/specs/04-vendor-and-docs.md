---
id: 4
status: todo
---
# Outcome

Joycraft 1.4.0 ships the gate check and the on-request Stop hook, and the
README tells a user why and how. Brief: [docs goal](../brief.md#goals). Ruling
`activation` note (Max): "make sure this is clearly documented in the github
README with a prompt/instructions, why you would want this etc..."

## acceptance

- The payload is the new field build. Check: `payload/PIN` names the tag that
  carries specs 1, 2, 3 and 5; `payload/.joycraft/runtime/gate.mjs` and
  `payload/.joycraft/references/gates.md` exist; `pnpm test && pnpm typecheck`
  pass, including the payload link test and the payload terms test
  (`[AC:vendored-field-19]`).
- The README has a gates section. Check: under "The review loop", a section
  that says in plain words what the gate stops (a spec marked done with no
  PASS), why you would want it (long or unattended sessions; a prompt is not a
  guarantee), what it does not do (no CI; the hook is Claude Code only for now,
  and on the other harnesses the check runs at session end), that a fourth
  review of one spec is refused, the prompt
  "Turn on Joycraft's gates" and the prompt that turns them off.
  `docs/prompts.md` has both prompts. `scripts/ste-lint.py` passes on the new
  prose (`[AC:readme-gates-section]`).
- The release fields move together. Check: `package.json` `version` and
  `joycraft.release` are `1.4.0`, the CHANGELOG has a `1.4.0` entry with the
  payload tag, the update summary names the gates in one line, and
  `docs/context/decision-log.md` has a row that revisits Fable-native harness
  D4 (`tests/release-*.test.ts`, `[AC:release-fields]`).

## Not covered

Publishing and the merge to main (Max). CI gate (backlogged).

## Implementation and verification scope

This repository: `node scripts/vendor-payload.mjs --tag <field-N>`, `README.md`,
`docs/prompts.md`, `CHANGELOG.md`, `package.json`, `docs/context/decision-log.md`,
`docs/context/shipped.md`, the update summary source. Run `/release-docs-sync`
before the pull request.

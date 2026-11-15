---
id: 6
status: todo
---
# Outcome

Joycraft ships the four commands, and the docs say what changed for a person
who runs queues while away. Brief: [goals](../brief.md#goals).

## acceptance

- The payload is the new field build. Check: `payload/PIN` names the tag that
  carries specs 1 to 5; `completion.mjs submit`, `evidence.mjs run` and
  `queue-check.mjs` exist in `payload/.joycraft/runtime/`;
  `pnpm test && pnpm typecheck` pass (`[AC:vendored-runtime-owned-steps]`).
- The README says what a user sees. Check: under "The review loop", in plain
  words: questions are asked before a queue starts; a queue stops only for a
  mandatory answer or a broken project; other open points come as a list of
  follow-up questions at session end, each with the assumption the reviewer
  made. No command is given for the user to run. `scripts/ste-lint.py` passes
  on the new prose (`[AC:readme-away-from-keyboard]`).
- The release fields move together. Check: `package.json` `version` and
  `joycraft.release` are the next minor version, the CHANGELOG has its entry
  with the payload tag, the update summary names the change in one line, and
  `docs/context/decision-log.md` has a row for `report-contract` and
  `decision-needed-effect` with Max's note (`tests/release-*.test.ts`,
  `[AC:release-fields]`).

## Not covered

Publishing and the merge to main (Max). The test-sensitivity check, the
scorecard and the escape rate (backlog).

## Implementation and verification scope

This repository: `node scripts/vendor-payload.mjs --tag <field-N>`,
`README.md`, `docs/prompts.md` if a prompt changes, `CHANGELOG.md`,
`package.json`, `docs/context/decision-log.md`, `docs/context/shipped.md`, the
update summary source. Depends on specs 1 to 5. Assumes enforced-gates (1.4.0)
has shipped, so this is 1.5.0 on `field-20`; use the real next numbers if that
changes. Run `/release-docs-sync` before the pull request.

---
id: 10
status: done
---
# init, update and doctor report an unwired project

Goal: [wiring-detection](../brief.md#wiring-detection). Built in this repo
after vendoring the field tag that holds specs 01–09.

## acceptance

- `scripts/vendor-payload.mjs --tag field-11` brings in specs 01–09. Check:
  `payload/PIN` names field-11; `pnpm test` passes.
- `init` and `update` end with the wiring findings in plain words and the
  sentence to give the agent ("Set up Joycraft's context map"), only when
  `wiring.mjs` reports findings. They never write AGENTS.md or CLAUDE.md. Check:
  `tests/install-v1.test.ts` on a bare fixture: output contains the sentence,
  AGENTS.md and CLAUDE.md bytes unchanged; on a wired fixture: no sentence.
- `doctor` lists each wiring finding and exits non-zero only for install
  problems, not wiring (wiring is advice). Check: same test file.
- `--plan --json` includes a `wiring` field. Check: same test file.

## Implementation and verification scope

`src/install-v1.ts`, `src/cli.ts`, `tests/install-v1.test.ts`, `payload/`
(vendored, never edited by hand). Depends on 01–09.

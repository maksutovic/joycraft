---
id: 3
status: done
---
# A handled follow-up, recorded in follow-ups.json, is no longer a question

Parent: [brief](../brief.md), section `close-clears`. Settled: decision `resolution-record` = `ledger`.

## acceptance

- Ledger: a feature folder may hold `follow-ups.json`: `{ "schemaVersion": 1, "entries": [{ "spec": <spec id>, "finding": "<finding id>", "outcome": "fixed" | "decided" | "dismissed", "by": "<spec id or decision id>", "reason": "<text>" }] }`. `fixed` needs `by` = a spec id of the same queue; `decided` needs `by` = a brief decision id; `dismissed` needs a nonempty `reason`. A `follow-ups.mjs` runtime command adds one entry (`--queue <q> --spec <id> --finding <id> --fixed <spec> | --decided <decision> | --dismissed <reason>`) and refuses a spec or finding that the spec's accepted report does not have. Check: `tests/runtime-follow-ups-ledger.test.ts` `[AC:spec-3-1]`.
- Status: `projectStatus` lists no question for a follow-up whose entry is `fixed` by a `done` spec, `decided` by a brief decision that is not `open` or `assigned`, or `dismissed` with a reason. It still lists the question when the fixing spec is not `done` or the decision is still open. A malformed `follow-ups.json` is a `problems` entry naming the file, and every follow-up stays a question. Check: `tests/runtime-follow-ups-ledger.test.ts` `[AC:spec-3-2]`, one case each.
- Close: `close.mjs --feature` passes the question step on a feature whose follow-ups are all handled, and archives with `follow-ups.json` moved into the archived feature folder. Its "Status question" line names the `follow-ups.mjs` command to record the answer. Check: `tests/runtime-follow-ups-ledger.test.ts` `[AC:spec-3-3]`.
- Old features: a feature whose accepted reports hold follow-ups from 1.10.0 closes after each is `dismissed` with a reason, with no report bytes changed. Check: `tests/runtime-follow-ups-ledger.test.ts` `[AC:spec-3-4]`.
- Session end text: `payload/.agents/skills/joycraft-session-end/SKILL.md` asks only the questions status still lists, and records each answer with `follow-ups.mjs` (a decision in the brief, then `--decided`; a requested change in a new spec, then `--fixed` once it is done; a "no" as `--dismissed` with the user's words). Check: `tests/runtime-follow-ups-ledger.test.ts` `[AC:spec-3-5]` reads the payload text.

## Test changes

- `tests/runtime-follow-ups-ledger.test.ts` class 1: new file.

## Not covered

Anything in the brief's Scope and limits. When the implementer writes entries during a queue (spec 5). Specs other than this one.

## Implementation and verification scope

- Owning source: `payload/.joycraft/runtime/status.mjs` (`followUps`, `projectStatus`). Coupled readers: `payload/.joycraft/runtime/close.mjs` (question step), `payload/.joycraft/runtime/archive.mjs` (moves feature files), `payload/.joycraft/runtime/kickoff.mjs` and `payload/.joycraft/runtime/wiring.mjs` (also read `questions`). Discriminating scenario: one accepted report with two follow-ups, one handled and one not; status lists exactly the second, and close refuses on exactly that one.
- Files: those above, new `payload/.joycraft/runtime/follow-ups.mjs`, `payload/.agents/skills/joycraft-session-end/SKILL.md`, `payload/.joycraft/references/completion.md` or `workflow.md` if either names follow-up questions, `tests/runtime-follow-ups-ledger.test.ts`. Reuse fixture helpers from `tests/runtime-close-feature.test.ts`. Edit `payload/`, then run `node scripts/pin-payload.mjs`; a new runtime file must be in the install manifest the way other runtime files are.
- Tests: `tests/runtime-follow-ups-ledger.test.ts`. Run the recorded gate once, before review.

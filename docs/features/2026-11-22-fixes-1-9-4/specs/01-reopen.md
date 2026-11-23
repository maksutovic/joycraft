---
id: 1
status: done
---
# Reopen a done spec whose accepted input changed

Parent: [brief](../brief.md), section `reopen`.

## acceptance

- Reopen: `completion.mjs reopen --queue <q> --spec <id> --reason <text>` moves a `done` spec with an `acceptedReport` whose accepted report binds a `code`, `check` or `fixture` input whose bytes differ now, to `in-review` in the queue and the frontmatter (one journaled write). It removes `acceptedReport` and appends `{ at, reason, report, changed }` to `reopened`. A new PASS report is then accepted by `finalize-review`, and `reopened` stays. Check: `tests/runtime-reopen.test.ts` `[AC:spec-1-1]`.
- Refusals: a spec that is not `done`, a spec with no changed input, and a call without `--reason` are refused, and the queue is unchanged. Check: `[AC:spec-1-2]`.
- Warning: `submit` of another spec returns `acceptedInputsChanged: [{ specId, paths, next }]`, where `next` is the reopen command, and prints a warning line for each; with nothing changed the list is empty and nothing is printed. Check: `[AC:spec-1-3]`.
- Rounds and report path: after a reopen, reviewer startup counts only reports created after the last reopen (`reviewRound: 1` even with two earlier FAIL reports and the old PASS). A reviewer startup whose default report path already exists gets `review-<id>-r<n>.report.json`, the first free one, so an earlier report is never overwritten. Check: `[AC:spec-1-4]`.

## Test changes

- `tests/runtime-reopen.test.ts` class 1: new file. No existing file builds a done spec with a changed accepted input.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Files: `payload/.joycraft/runtime/completion.mjs` (`reopen`, `changedAcceptedInputs`, `acceptedInputsChanged`, `writeCompletion` `remove`, CLI), `payload/.joycraft/runtime/identity.mjs` (`reopened` validation and binding), `payload/.joycraft/runtime/dispatch-start.mjs` (`earlierReviews`), `payload/.joycraft/runtime/dispatch-preflight.mjs` (report destination), `tests/runtime-reopen.test.ts`.
- Tests: `tests/runtime-reopen.test.ts`. Run the recorded gate once, before review.

---
id: 5
status: done
---
# Reopen and submit say when an accepted report is missing; report paths skip the coordinator's reports

Parent: [brief](../brief.md), section `followups-1-10-3`. Review follow-ups: spec 1 `f2`, `f3`.

## acceptance

- Missing report: for a done spec accepted by a PASS review whose `acceptedReport.path` is missing or not valid JSON, `reopen` exits 2 with a message that names that path and says the accepted report is missing or unreadable and to restore it from Git, not "No code, check or fixture input ... changed". `submit` of another spec warns about it in the same list as changed inputs, naming the spec and the report path. Check: `tests/runtime-reopen.test.ts` `[AC:spec-5-1]`.
- Coordinator reports: reviewer startup in a worker root whose recorded coordinator root differs skips a report path that exists in either root: with `review-<id>.report.json` only in the coordinator root, startup prints `review-<id>-r2.report.json`. Check: `tests/runtime-reopen.test.ts` `[AC:spec-5-2]`.

## Test changes

- `tests/runtime-reopen.test.ts` class 1: the acceptance bullets add two tests; existing tests are unchanged.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Files: `payload/.joycraft/runtime/completion.mjs` (`changedAcceptedInputs`, `acceptedInputsChanged`, `reopen`), `payload/.joycraft/runtime/dispatch-preflight.mjs` (report destination), `tests/runtime-reopen.test.ts`.
- Tests: `tests/runtime-reopen.test.ts`. Run the recorded gate once, before review.

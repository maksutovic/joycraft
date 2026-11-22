---
id: 2
status: todo
---
# The report gate check reads runner aliases, and a done spec's re-check does not refuse its old report

Parent: [brief](../brief.md), section `completion`. Source: [1.9.0 review follow-ups](../../../backlog/2026-11-21-1-9-0-review-followups.md), section Dispatch and evidence (test-release/6/f2, 6/f4).

## acceptance

- Runner aliases [test-release/6/f2]: before the compare in `refuseGateRuns`, both the observation's command (after `ranCommand` unwraps it) and each recorded `tests.gate`/`tests.full` command drop a leading `npx`, a leading `pnpm exec` or `npm exec`, and the `run` word of a leading `pnpm run`, `npm run` or `yarn run`. So with `tests.gate: vitest run`, a report that ran `npx vitest run` or `pnpm exec vitest run` is refused; with `tests.gate: pnpm verify`, a report that ran `pnpm run verify` is refused; with `tests.gate: pnpm run verify`, a report that ran `pnpm verify` is refused. A report that ran `npx vitest run tests/a.test.ts` (a focused run) still passes. Check: `tests/runtime-report-gate.test.ts` `[AC:spec-2-1]`: the four refused cases exit 2 naming `tests.gate`, and the focused case is accepted.
- Unchanged done path [test-release/6/f4]: `complete`/`finalize-review` on a spec that is already `done`, with the same accepted report, returns `{ status: 'done', unchanged: true }` without running the gate-run check, so a report accepted before `tests.gate` was recorded, which ran that gate, is not refused later. An in-review spec with a report that ran the gate is still refused. Check: `tests/runtime-report-gate.test.ts` `[AC:spec-2-2]`: accept a report that ran `pnpm verify` with no `tests.gate`, then record `tests.gate: pnpm verify`; re-running `finalize-review` with the same report exits 0 with `unchanged: true`; a second in-review spec with the same kind of report exits 2.

## Test changes

- `tests/runtime-report-gate.test.ts` class 1: acceptance bullets 1 and 2 add the alias and re-check cases.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

- Other runners' aliases (`bunx`, `yarn dlx`, `pnpm dlx`) and a gate given through a script file stay unmatched.
- The other checks of the done path (report hash, subject freshness) are unchanged.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; run the recorded gate once, before review.
- Files: `payload/.joycraft/runtime/completion.mjs` (`ranCommand` or a new normalizer used by `refuseGateRuns`, `complete`, `checkReport`), `tests/runtime-report-gate.test.ts`.
- Tests: `tests/runtime-report-gate.test.ts`. Tag each new test `[AC:spec-2-<n>]`.

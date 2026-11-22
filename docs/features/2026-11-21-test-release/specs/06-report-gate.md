---
id: 6
status: done
---
# check-report rejects a review report that ran the gate

Parent: [brief](../brief.md), section `spec-tier`. All 13 decisions are answered; they are quoted by ID.

Brief `spec-tier`: "`checkReport` rejects a review report that ran the gate." Done when: "A report that ran the gate is rejected."

## acceptance

- With `tests.gate` or `tests.full` recorded, `checkReport` refuses (exit 2) a report with an observation whose `command.argv` is that command, and names the observation and the command. A shell form (`sh -c "<command>"` or `bash -c`) counts as the same command. Check: a fixture report with `argv: ["pnpm", "verify"]` and `tests.gate: pnpm verify` is refused by `node payload/.joycraft/runtime/dispatch-preflight.mjs check-report`.
- A report that ran only focused commands still passes, and a project with no recorded gate is not checked. Check: the same fixture with `argv: ["pnpm", "test", "tests/a.test.ts"]` passes check-report, and the gate fixture without `tests:` passes.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Parallel seam: this spec owns only the files listed here. `payload/PIN` is generated, so on integration regenerate it with `node scripts/pin-payload.mjs` instead of merging it.
- Files: `payload/.joycraft/runtime/completion.mjs`, `tests/runtime-report-gate.test.ts`.
- Tests: `tests/runtime-report-gate.test.ts`. Tag each new test `[AC:spec-6-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Put the check in `validatePassingReport` so `finalize-review` refuses the same report; a FAIL or UNVERIFIED report is not checked.
- Compare whitespace-normalized command text, as spec 4 does.

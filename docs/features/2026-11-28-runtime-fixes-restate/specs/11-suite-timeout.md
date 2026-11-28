---
id: 11
status: in-review
---
# The suite's default test timeout fits a full parallel gate run

Parent: [brief](../brief.md), section `gate-timeouts`.

## acceptance

- Default: `vitest.config.ts` sets `test.testTimeout` to 20000. Check: `tests/vitest-config.test.ts` `[AC:spec-11-1]` imports the config and reads the value.
- Why: three different process-spawning tests (`runtime-archive-named-files` `[AC:spec-9-1]`, `runtime-close-feature` `[AC:sl3-05-same-checks]`, `runtime-report-gate` `[AC:spec-1-1]`) each timed out at the 5000 ms default in full gate runs on this branch and passed alone. Check: `tests/vitest-config.test.ts` `[AC:spec-11-1]`.

## Test changes

- `tests/vitest-config.test.ts` class 1: new file.

## Not covered

Anything in the brief's Scope and limits. Making the slow tests faster.

## Implementation and verification scope

- Files: `vitest.config.ts`, `tests/vitest-config.test.ts`.
- Tests: `tests/vitest-config.test.ts`. Run the recorded gate once, before review.

---
id: 10
status: done
---
# Two process-spawning tests get a timeout that fits a full parallel gate run

Parent: [brief](../brief.md), section `gate-timeouts`.

## acceptance

- Timeouts: `tests/runtime-close-feature.test.ts` `[AC:sl3-05-same-checks]` and `tests/runtime-report-gate.test.ts` `[AC:spec-1-1]` (1.9.2 spec 1) each pass an explicit per-test timeout of 20000 ms. No assertion, setup or other test changes. Check: `tests/runtime-close-feature.test.ts` and `tests/runtime-report-gate.test.ts` pass `[AC:spec-10-1]` (tag added to both test titles).

## Test changes

- `tests/runtime-close-feature.test.ts` class 2: same claim, a timeout argument added; fault proof: the test still fails when `close.mjs --feature` archive output changes (revert one byte of the archive writer in a scratch copy).
- `tests/runtime-report-gate.test.ts` class 2: same claim, a timeout argument added; fault proof: the test still fails when the chained-gate refusal is removed in a scratch copy.

## Not covered

Anything in the brief's Scope and limits. The global `testTimeout`; other slow tests.

## Implementation and verification scope

- Files: `tests/runtime-close-feature.test.ts`, `tests/runtime-report-gate.test.ts`.
- Both tests passed at 10–13 s per file in the spec-2 gate and timed out at 5 s per test in the two spec-3 gate runs, with no change to their code: they spawn several Node processes each.

---
id: 21
status: done
---
# The test review becomes the cleanup path for an existing suite

Parent: [brief](../brief.md), sections `test-review-cleanup`, `sota-page`. All 13 decisions are answered; they are quoted by ID.

Brief `test-review-cleanup`: measure once and note the load; rank by what every run pays; find controls keyed on `CI` and nested test runners; write each approved change as a test-only spec. "A time limit or a result cache is offered only 'after a measurement'." Decision `speed-work-in-queue` = `in-queue`.

## acceptance

- `testing-review.md` "Measure first" runs the full suite once through `evidence.mjs` and reports its run facts (load and cores); "Find" ranks by what every run pays, then by the slowest file, and adds a control keyed on `CI` and a test that starts a nested test runner. Check: `tests/text-test-review.test.ts` finds "every run", `CI` and "nested" in testing-review.md.
- "Apply" writes each approved change as a test-only spec (`#test-only-specs`) for the queue, a deletion names the claim the test protected and the owner's yes, and the suite time before and after is reported; the line "Unattended cleanup never asks, and never edits or deletes a test" keeps its meaning for the review itself. Check: the test finds `#test-only-specs` and "before and after".
- `artifacts.md`, where decision options are written (lines 44-53), says a time limit or a result cache is offered only as "after a measurement". Check: the test finds "after a measurement" in artifacts.md.
- Every-spec words (the guard's every-spec count, printed by `pnpm test tests/payload-guard.test.ts`) grow by at most 8 in this spec; on-demand files stay inside their budget. Pay for new every-spec text by rewriting the sentence it replaces; prefer printed runtime output to prose. If the text cannot fit, report `spec gap: every-spec words` instead of cutting other guidance. Check: `pnpm test tests/payload-guard.test.ts` passes and its printed every-spec count is at most 8 above the count before this spec.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.joycraft/references/testing-review.md`, `payload/.joycraft/references/artifacts.md`, `tests/text-test-review.test.ts`.
- Tests: `tests/text-test-review.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-21-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Mutation scores, coverage targets and growth budgets stay out (sota-evidence seat).

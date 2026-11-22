---
id: 19
status: todo
---
# Each parallel run gets a worker cap, shared test tooling takes one lane, and setup explains load

Parent: [brief](../brief.md), sections `lane-cap`, `load-guidance`, `evidence-marker`. All 13 decisions are answered; they are quoted by ID.

Decision `worker-cap-home` = `dispatch-and-offer`; decision `test-only-lane` = `shared-only`; decision `machine-slot` = `project-owned` with Max's note ("we *must* give guidance and explain this practice and the benefits"). Brief `load-guidance`: "run less, then cap workers per run, then a slot"; setup explains it in an attended step; agents get config, not prose.

## acceptance

- `testing.md:46-48` replaces "rerun once, alone" with: when N workers share the machine, give each test run at most cores ÷ N workers with the runner's own flag; a second timeout is reported with both receipts. `testing.md:38` names `JOYCRAFT_EVIDENCE=1` next to `CI=1`. Check: `tests/text-lane-cap.test.ts` finds "cores" and `JOYCRAFT_EVIDENCE` in testing.md and no "rerun once, alone".
- `setup.md` offers, when several agents will test on the machine, a worker cap in the project's own runner config keyed on `JOYCRAFT_EVIDENCE`, never on `CI`, and explains in the same attended step why: an overloaded machine makes slow and flaky runs that agents rerun; the order is run less, then cap workers per run, then a project-owned slot. Check: the test finds `JOYCRAFT_EVIDENCE`, "never on `CI`" and the three-step order in setup.md.
- `testing-review.md#test-changes` says which specs take the one serial lane (`execution.parallel: false`): specs that delete tests or change shared test tooling (runner config, guards, selection lists); other test-only specs may run in parallel. Check: the test finds "runner config, guards, selection lists" in testing-review.md.
- Every-spec words (the guard's every-spec count, printed by `pnpm test tests/payload-guard.test.ts`) grow by at most 15 in this spec; on-demand files stay inside their budget. Pay for new every-spec text by rewriting the sentence it replaces; prefer printed runtime output to prose. If the text cannot fit, report `spec gap: every-spec words` instead of cutting other guidance. Check: `pnpm test tests/payload-guard.test.ts` passes and its printed every-spec count is at most 15 above the count before this spec.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.joycraft/references/testing.md`, `payload/.joycraft/references/setup.md`, `payload/.joycraft/references/testing-review.md`, `tests/text-lane-cap.test.ts`.
- Tests: `tests/text-lane-cap.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-19-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- N = 1 changes nothing, so a solo user never slows down (ruling row 6).
- The queue-end load line itself is runtime output (spec 10), not prose.

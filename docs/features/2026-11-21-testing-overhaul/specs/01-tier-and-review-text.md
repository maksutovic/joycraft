---
id: 1
status: todo
---
# Outcome

Shipped guidance runs tests in three tiers and reviews test edits. Brief: [ruling 1–3, 7, 8](../panel-ruling.md). Decisions: `queue-rhythm` (spec-gate-queue-pr), `record-commits` (sentence), `receipt-depth` (field).

## acceptance

- `testing.md` "Running tests" names three tiers: focused tests while working; the project gate one time on a spec's final commit; the full suite one time on the final integrated revision, in CI when the project has CI, else locally before the push.
- A review fix runs focused tests only. The reviewer does not run the gate again.
- The reviewer reads the diff of existing test files. A removed assertion, a new skip or a changed expected value with no reason in the spec is a blocking finding. A test that looks wrong is reported as a spec gap, never edited to pass.
- A pass on a rerun is FLAKY, not PASS: record a follow-up and continue, unless the test covers this spec's criterion.
- A commit that changes only Joycraft records needs no test run.
- Implement pushes after each accepted spec, opens one PR when no spec can start, reads CI one time, and stops after a second red CI run. The project's `AGENTS.md` overrides this.
- "verify slot", "receipt bound to the same revision" and the leaked project phrase in `delivery.md` are gone.
- `payload-guard.test.ts` passes (shipped words do not exceed the cap).

---
id: 9
status: todo
---
# The reviewer checks that each added test can fail, and the benchmark passes again

Parent: [brief](../brief.md), section `reviewer-notes`. Fix spec for spec 1's review follow-up f1 (`review-1.report.json`): the verify skill edit changes the reviewer text, so the benchmark must be re-recorded. The re-record (2026-11-28) failed one rule. The reviewer missed the seeded test that cannot fail in 4 of 4 runs. Main's text also missed it 3 of 3 times, so the 2026-11-23 PASS was luck, not a guarantee.

## acceptance

- Each added test: `payload/.agents/skills/joycraft-verify/SKILL.md`'s "Can the test fail?" check covers the key criterion and each added test, and still says a test that stays green is `blocking`. It adds that correct code does not excuse it, and that a test which expects a refusal (null, 400, an error) must go red when that one check is removed. Check: `tests/text-reviewer-can-fail.test.ts` `[AC:spec-9-1]`.
- Benchmark: `scripts/trial/reviewer-bench.json` records a full run of this tree's reviewer text with verdict `PASS`. Check: `tests/trial-reviewer-bench.test.ts` `[AC:sl3-07-bench-current]` passes unchanged.
- Caps: the verify skill stays under its cap in `tests/text-worker-commands.test.ts` `[AC:sl3-07-words]`, and `tests/payload-guard.test.ts` passes. Check: both pass unchanged.

## Test changes

- `tests/text-reviewer-can-fail.test.ts` class 1: new file.

## Not covered

Anything in the brief's Scope and limits. A benchmark subject other than the four groups the benchmark already runs.

## Implementation and verification scope

- Files: `payload/.agents/skills/joycraft-verify/SKILL.md`, `payload/PIN`, `scripts/trial/reviewer-bench.json`, `CHANGELOG.md` (the 1.10.2 entry's line for this change), `tests/text-reviewer-can-fail.test.ts`, `tests/trial-reviewer-bench.test.ts`, `tests/text-worker-commands.test.ts`, `tests/payload-guard.test.ts`. Edit `payload/`, then run `node scripts/pin-payload.mjs`.
- Tests: those four test files. Run the recorded gate once, before review.

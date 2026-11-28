---
id: 9
status: todo
---
# The reviewer files a test that cannot fail as blocking, and the benchmark passes again

Parent: [brief](../brief.md), section `reviewer-notes`. Fix spec for spec 1's review follow-up f1 (`review-1.report.json`): the verify skill edit changes the reviewer text, so the benchmark must be re-recorded. The re-record (2026-11-28) failed one rule. The reviewer missed the seeded test that cannot fail in 4 of 4 runs. Main's text also missed it 3 of 3 times, so the 2026-11-23 PASS was luck, not a guarantee.

## acceptance

- Blocking: in `payload/.agents/skills/joycraft-verify/SKILL.md`, the "Can the test fail?" check keeps its key-criterion revert and still says a test that stays green is `blocking`. The findings rule's definition of `blocking` names "a test you showed cannot fail", so a reviewer does not file one as a follow-up because the code itself is right. To stay under the cap, the dispatch line "Do not invent IDs or create a worktree solely to obtain a different session string" becomes "Do not invent IDs." Two more rules were tried and dropped: a revert for each added test, and a read of each refusal test's bad input. With them, replay fell to 2 or 3 of 18 in four runs, against 4 for main's text the same day. Check: `tests/text-reviewer-can-fail.test.ts` `[AC:spec-9-1]`.
- Benchmark: `scripts/trial/reviewer-bench.json` records a full run of this tree's reviewer text with verdict `PASS`. Check: `tests/trial-reviewer-bench.test.ts` `[AC:sl3-07-bench-current]` passes unchanged.
- Vacuous rule: `scripts/trial/reviewer-bench.mjs` reviews each vacuous subject `--vacuous-runs` times (default 5, `VACUOUS_RUNS`), and its rule holds when the reviews file the seeded test as blocking in at least 40% of them (2 of 5). The rule line prints `found <n> of <m>`, and the record keeps `vacuous: { found, of }`. A record needs all 5 reviews. Why: one review is a coin flip. On 2026-11-28, main's text caught the seeded test 0 of 3 times and this branch's text 7 of 13 times, so the one-sample rule's PASS on 2026-11-23 was luck. Check: `tests/trial-reviewer-bench.test.ts` `[AC:spec-9-4]`.
- Caps: the verify skill stays under its cap in `tests/text-worker-commands.test.ts` `[AC:sl3-07-words]`, and `tests/payload-guard.test.ts` passes. Check: both pass unchanged.

## Test changes

- `tests/text-reviewer-can-fail.test.ts` class 1: new file.
- `tests/trial-reviewer-bench.test.ts` class 1: bullet 4 adds `[AC:spec-9-4]`. The run helper passes `--vacuous-runs 1`, and the two expected rule lines change to the new text, "Vacuous test found as a blocking finding in at least 40% of its reviews (found 1 of 1)".

## Not covered

Anything in the brief's Scope and limits. A benchmark subject other than the four groups the benchmark already runs.

## Implementation and verification scope

- Files: `payload/.agents/skills/joycraft-verify/SKILL.md`, `payload/PIN`, `scripts/trial/reviewer-bench.json`, `scripts/trial/reviewer-bench.mjs`, `CHANGELOG.md` (the 1.10.2 entry's line for this change), `tests/text-reviewer-can-fail.test.ts`, `tests/trial-reviewer-bench.test.ts`, `tests/text-worker-commands.test.ts`, `tests/payload-guard.test.ts`. Edit `payload/`, then run `node scripts/pin-payload.mjs`.
- Tests: those four test files. Run the recorded gate once, before review.

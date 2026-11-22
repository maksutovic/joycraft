---
id: 18
status: todo
---
# A test-only spec proves each changed test file with saved faults

Parent: [brief](../brief.md), section `fault-proof`. All 13 decisions are answered; they are quoted by ID.

Brief `fault-proof`, ruling rows 3 to 5. Decision `fault-run-location` = `in-place-checked`; decision `test-only-product-code` = `none`: "The test-only spec changes tests, fixtures and test lists only. Any product change is an ordinary spec that leaves the tests untouched." Decision `speed-work-in-queue` = `in-queue`.

## acceptance

- `testing-review.md` gains `## Test-only specs`: faults are saved as patch files before a test file is edited, and a fault counts only when the old file fails on it through `evidence.mjs run --patch`; afterwards the new file, or a named kept test, fails on each; a timeout or a build error is not a fail; the spec changes tests, fixtures and test lists only (`git diff --name-only`), and a seam or fix goes first in its own spec. Check: `tests/text-fault-proof.test.ts` finds `--patch`, "timeout", and "git diff --name-only" in that section.
- The same section gives the reviewer step: rerun one saved fault and one of its own, in a tree it may change and restore; block only when the old file catches a fault that the new file misses; any other survivor is a finding; the verdict states the proof's limit in one line ("the chosen faults are still caught; this does not show the test is as strong as before"). Check: the test finds "one of its own" and the limit sentence.
- `testing.md:15-17` no longer requires an isolated temporary copy: a fault runs in place only through `evidence.mjs run --patch`. `joycraft-verify`, `joycraft-reviewer.md` and `joycraft-implementer.md` each carry one pointer to `testing-review.md#test-only-specs`. Check: the test finds no "isolated temporary copy" in testing.md and finds the anchor in the three files.
- Every-spec words (the guard's every-spec count, printed by `pnpm test tests/payload-guard.test.ts`) grow by at most 20 in this spec; on-demand files stay inside their budget. Pay for new every-spec text by rewriting the sentence it replaces; prefer printed runtime output to prose. If the text cannot fit, report `spec gap: every-spec words` instead of cutting other guidance. Check: `pnpm test tests/payload-guard.test.ts` passes and its printed every-spec count is at most 20 above the count before this spec.

## Test changes

none

- Fault patch files and the receipts of a fault run live in a git-ignored path (for example `.joycraft/local/`) or are committed first, because `evidence.mjs run --patch` refuses a dirty tree, untracked files included (lane B spec gap). Check: `testing-review.md` says where fault patches and their receipts go.

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.joycraft/references/testing-review.md`, `payload/.joycraft/references/testing.md`, `payload/.agents/skills/joycraft-verify/SKILL.md`, `payload/.claude/agents/joycraft-reviewer.md`, `payload/.claude/agents/joycraft-implementer.md`, `tests/text-fault-proof.test.ts`.
- Tests: `tests/text-fault-proof.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-18-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Ruling section 9: a reviewer that shares the coordinator's tree must not run a fault there; it reads the saved receipts and states that as a limit.
- The rows-3-to-5 replay on real field files is deferred to the release proof (spec 26).

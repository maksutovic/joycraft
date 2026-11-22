---
id: 22
status: done
---
# Joycraft asks for fewer, sharper tests

Parent: [brief](../brief.md), section `fewer-better-tests`. All 13 decisions are answered; they are quoted by ID.

Brief `fewer-better-tests`: one test may cover several checks and extending an existing file is preferred; each user-flow check names the real boundary it crosses or lists the mocked boundary under "Not covered"; a new acceptance test must fail before the code exists (receipts show the order); a rule against a special case for a test's input; a new skip "in a file or a list" counts as a removal. Decision `cap-raise`: "the implement skill cannot grow".

## acceptance

- `joycraft-implement/SKILL.md:59` and `joycraft-implementer.md:25` replace "one focused test per acceptance `Check:`" with: one test may cover several checks; extend the module's existing test file before adding one; a new acceptance test runs once and fails before the code exists, and its receipt comes first. The duplicate acceptance-test sentence in the implement skill is cut here. Check: `tests/text-fewer-tests.test.ts` finds no "one focused test per acceptance" in either file and finds "existing test file" and "fails before" in both.
- `templates/spec.md` asks each user-flow `Check:` to name the real boundary it crosses or list the mocked boundary under "Not covered". Check: the test finds "real boundary" in the template.
- `testing.md:34` adds "or a special case for a test's input" to the never-list, and `testing-review.md#test-changes` counts a new skip "in a file or a list" and a test that leaves the gate as a removal (class 3). Check: the test finds both phrases.
- The implement skill does not grow, and every-spec words do not grow in this spec. Check: `pnpm test tests/payload-guard.test.ts` passes; the implement skill's `wc -w` and the every-spec count are not above their counts before this spec.

## Test changes

none

- Spec 1 cut a `joycraft-testing` paragraph that was not a full duplicate; keep its two lost rules in the text this spec writes: "Do not commit tests of one-off run state" and that a test may be removed when it "conflicts with a later owner decision" (review of spec 1, finding f3). Check: rg finds both phrases in the payload.

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.agents/skills/joycraft-implement/SKILL.md`, `payload/.claude/agents/joycraft-implementer.md`, `payload/.joycraft/templates/spec.md`, `payload/.joycraft/references/testing.md`, `payload/.joycraft/references/testing-review.md`, `tests/text-fewer-tests.test.ts`.
- Tests: `tests/text-fewer-tests.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-22-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- The implement skill's duplicate sentence (about 41 words, ruling section 6) pays for this spec's every-spec text.
- The first saved faults for a real proof are the field project's reversed fixes (deferred; spec 26).

---
id: 17
status: done
---
# Specs declare their test changes, and the reviewer blocks only an undeclared change no line requires

Parent: [brief](../brief.md), sections `declared-test-changes`, `archive-tests`. All 13 decisions are answered; they are quoted by ID.

Brief `declared-test-changes`: decompose writes a `## Test changes` section (path, class, requiring line; default "none") with three classes; the reviewer blocks only an undeclared change that no line requires; decompose asks once when a brief's "no weakened tests" contradicts the feature; a red or flaky test outside the spec's set cannot hold the spec. Done when: a spec declaring class 1 for `a.test.ts` passes review with the expected value changed; an undeclared edit to `b.test.ts` with no requiring line blocks; startup output lists both.

## acceptance

- `templates/spec.md` gains `## Test changes` (default "none") with the three classes: 1 spec-mandated (the acceptance line states the new value), 2 same claim, changed test (a fault proof per file), 3 deleted, skipped or out of the gate (a ledger row and an owner yes per batch). Check: `tests/text-test-changes.test.ts` finds the heading, "none" and the three class names in the template, and `test-changes.mjs` parses the template's example bullet.
- `testing-review.md` gains `## Test changes`, which owns the reviewer rules: read `testChanges` from startup; block only an undeclared change that no line requires; a class-1 change passes when its acceptance line states the new value; a red or flaky test outside the spec's set is a follow-up, never a hold; a changed test that reads a path under the features folder is a follow-up finding. Check: the test finds each rule in that section.
- `joycraft-verify/SKILL.md:46-47` and `joycraft-reviewer.md:63-64` replace "a removed assertion, a new skip or a changed expected value with no reason in the spec is a blocking finding" with a pointer to that section; `joycraft-decompose/SKILL.md` says to write the section and to ask once when a brief's "no weakened tests" contradicts the feature. Check: the test finds the old sentence in neither file and finds `testing-review.md#test-changes` in verify, reviewer and decompose.
- Every-spec words (the guard's every-spec count, printed by `pnpm test tests/payload-guard.test.ts`) grow by at most 15 in this spec; on-demand files stay inside their budget. Pay for new every-spec text by rewriting the sentence it replaces; prefer printed runtime output to prose. If the text cannot fit, report `spec gap: every-spec words` instead of cutting other guidance. Check: `pnpm test tests/payload-guard.test.ts` passes and its printed every-spec count is at most 15 above the count before this spec.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.joycraft/templates/spec.md`, `payload/.joycraft/references/testing-review.md`, `payload/.agents/skills/joycraft-verify/SKILL.md`, `payload/.claude/agents/joycraft-reviewer.md`, `payload/.agents/skills/joycraft-decompose/SKILL.md`, `tests/text-test-changes.test.ts`.
- Tests: `tests/text-test-changes.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-17-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- The detail lives in `testing-review.md`, read on demand, so every-spec files carry only pointers (decision `cap-raise`).
- The Done-when review outcome (class 1 passes, undeclared blocks) is a reviewer judgment; the runtime half (startup lists both) is spec 11's check.

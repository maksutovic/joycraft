---
id: 5
status: todo
---
# setup.md gets back two dropped phrases, and the guard records the word-cap split

Parent: [brief](../brief.md), section `text`. Decision quoted by ID: `word-cap-split` = `on-demand`. Source: 1.9.1 review follow-ups, specs 6 and 7.

## acceptance

- Phrases back: `setup.md`'s project-owned worktrees section again says to keep an existing home's conventions (the words "its conventions"), and the ask-a-question rule again says the knowledge "materially" changes the next action. `setup.md` cuts as many words elsewhere as it adds, without dropping a rule. Check: `tests/drift-tidy-text.test.ts` `[AC:spec-5-1]` asserts both phrases, and `tests/payload-guard.test.ts` passes.
- Split recorded: a comment by `EVERY_SPEC_FILES` in `tests/payload-guard.test.ts` says `word-cap-split` = `on-demand` (Max, 2026-11-22): `testing-review.md` stays on-demand because per-spec readers link only its `#test-changes` and `#test-only-specs` sections, read only when a spec changes tests or is test-only. No assertion changes. Check: `tests/payload-guard.test.ts` passes unchanged in its assertions `[AC:spec-5-2]`.

## Test changes

- `tests/drift-tidy-text.test.ts` class 1: acceptance bullet 1 adds the two phrase assertions.
- `tests/payload-guard.test.ts`: a comment only (acceptance bullet 2), no assertion change.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; run the recorded gate once, before review.
- Files: `payload/.joycraft/references/setup.md`, `tests/drift-tidy-text.test.ts`, `tests/payload-guard.test.ts`.
- Tests: `tests/drift-tidy-text.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-5-<n>]`.

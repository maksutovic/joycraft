---
id: 24
status: todo
---
# Session end reads the archive's named-file list and fixes listed tests before the move

Parent: [brief](../brief.md), section `archive-tests`. All 13 decisions are answered; they are quoted by ID.

Decision `archive-edit-tests` = `yes`, which settles `archive-named-files` (Max: "all of these sound like poor solutions"; the panel's fourth option, prevent then fix). "Applied migrations are never edited." It relaxes `testing-review.md:5` ("never edits or deletes a test") for this one path edit.

## acceptance

- `archive.md` says: read the preview's `namedFiles` before `--apply`; pass each editable test with `--rewrite`; never pass an applied migration or a file the project cannot edit; a listed test that is not rewritten, or a `held` result, leaves that feature in place with one plain line on the session-end page. `joycraft-session-end/SKILL.md` points to it in one sentence. Check: `tests/text-archive-tests.test.ts` finds `namedFiles`, `--rewrite` and "migration" in archive.md and `namedFiles` in the skill.
- `testing-review.md:5` names the one exception: the archive step may rewrite a folder path in a listed test, and only moves on green. Check: the test finds "archive" in that paragraph.
- Every-spec words (the guard's every-spec count, printed by `pnpm test tests/payload-guard.test.ts`) grow by at most 2 in this spec; on-demand files stay inside their budget. Pay for new every-spec text by rewriting the sentence it replaces; prefer printed runtime output to prose. If the text cannot fit, report `spec gap: every-spec words` instead of cutting other guidance. Check: `pnpm test tests/payload-guard.test.ts` passes and its printed every-spec count is at most 2 above the count before this spec.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.joycraft/references/archive.md`, `payload/.agents/skills/joycraft-session-end/SKILL.md`, `payload/.joycraft/references/testing-review.md`, `tests/text-archive-tests.test.ts`.
- Tests: `tests/text-archive-tests.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-24-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Kill criterion (ruling row 9): drop the hold if two archives in a row list only files nobody can edit.

---
id: 24
status: done
---
# Session end reads the archive's named-file list and changes the folder path in listed tests after the move

Parent: [brief](../brief.md), section `archive-tests`. Source: the archive-panel ruling of 2026-11-21 (section 6, "Spec 24: the text"). All decisions are answered; they are quoted by ID.

Decision `archive-test-editor` = `agent`: "Archive lists the tests before the move. After the move the agent changes the path, runs the gate and commits both together. archive.mjs edits no test." Decision `archive-red-path` = `agent-undoes`: "Move the folder back, delete the archive record folder, restore the changed files with Git. git status must print nothing." Decision `archive-edit-tests` = `yes` stays: "Applied migrations are never edited." It relaxes `testing-review.md:5` ("never edits or deletes a test") for this one path edit. Spec 30 removes `--rewrite`; this spec writes the text for the agent's path.

## acceptance

- `archive.md` has one paragraph of about 90 words: read `namedFiles` in the preview; a comment needs no change; after `--apply`, change the folder path in each listed test that reads the folder, and nothing else in it; never edit an applied migration; run the gate, because a changed file outside the docs root makes the gate receipt stale and the push is then refused; commit the edits with the move, one feature per commit; when a test stays red, move the folder back, delete the archive record folder, restore the changed files with Git until `git status` prints nothing, and report the feature as not archived; a path built in pieces from a variable is not listed. Check: `tests/text-archive-tests.test.ts` `[AC:spec-24-1]` finds `namedFiles`, "migration" and "git status" in `archive.md`.
- `joycraft-session-end/SKILL.md:109` is one sentence: after `--apply`, fix the tests the preview listed (see the archive guidance), then commit the move and those edits in their own commit, `docs: archive <slug>`. The words "and any `--rewrite` edits" are gone. Check: the same file `[AC:spec-24-2]` finds `namedFiles` in the skill.
- `testing-review.md:5` names the one exception: at archive, session end may change a folder path in a listed test. `testing-review.md:106-107` (the `featurePaths` finding) gets one clause: the fix is to move the file the test reads out of the feature folder. Check: the same file `[AC:spec-24-3]` finds "archive" in the line-5 paragraph and "out of the feature folder" in the `featurePaths` item.
- No payload text names `--rewrite`, and every-spec words do not change (`archive.md`, the session-end skill and `testing-review.md` are on-demand, `tests/payload-guard.test.ts:42-55`). Check: the same file `[AC:spec-24-4]` finds no `--rewrite` in any file under `payload/`; `pnpm test tests/payload-guard.test.ts` passes and its printed every-spec count is equal to the count before this spec.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

- A cite-by-slug rule or a cleanup check for tests that name a feature folder (ruling section 6).
- The `archive.mjs` code and its `next` message: spec 30 owns them.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.joycraft/references/archive.md`, `payload/.agents/skills/joycraft-session-end/SKILL.md`, `payload/.joycraft/references/testing-review.md`, `tests/text-archive-tests.test.ts` (new).
- Tests: `tests/text-archive-tests.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-24-<n>]`.
- Start after spec 30 is done: the text describes its `namedFiles` and `--apply` result, and the no-`--rewrite` check fails while the flag is in the code.
- Kill criterion (ruling row 9, reworded by the archive ruling section 8): drop the list from the session-end text if two archives in a row list only files nobody should edit.

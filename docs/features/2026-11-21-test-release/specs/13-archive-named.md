---
id: 13
status: in-review
---
# The archive plan lists files that name the feature folder and fixes listed tests before the move

Parent: [brief](../brief.md), section `archive-tests`. All 13 decisions are answered; they are quoted by ID.

Decision `archive-edit-tests` = `yes`: "Archive rewrites the path in each listed test, runs that test file, and moves only on green." Brief `archive-tests`: "The archive plan lists tracked files that name the feature folder, tests first, before the move. Applied migrations are never edited." Today the scan runs only after the move (`archive.mjs:620-632`, `relinkLive`).

## acceptance

- The archive preview (strict and `--as-is`) carries `namedFiles`: each tracked non-Markdown file outside the features and archive folders that names the feature folder, with `line` and `test` (from `isTestPath`), tests first. Check: a fixture where `tests/two-tier.test.ts:3` and `scripts/x.mjs` name the folder previews both, the test first, and moves nothing.
- `--apply --rewrite <path>` (repeatable, each a listed file) rewrites the folder path in those files to the archive path, runs the recorded `tests.focused` command on them through `evidence.mjs`, and moves the folder only when it exits 0; the rewritten files stay changed for the session-end commit. Check: a fixture whose test reads the brief through the rewritten path passes and archives; `git diff --name-only` lists the test.
- On red the files are restored byte for byte, nothing moves, and the result is `status: "held"` with the receipt; `--rewrite` of an unlisted file, or with no `tests.focused` recorded, refuses (exit 2) before any edit. Check: a fixture whose rewritten test fails is held with the feature folder in place and the test unchanged; the two refusals exit 2.

## Test changes

none

Coordinator note (lane A spec gap): the rewritten path exists only after the move, so the order is: move, rewrite the listed tests to the archive path, run them through `evidence.mjs`; on red, restore every file byte for byte and move the folder back, so nothing moved. This meets `archive-edit-tests` = `yes` ("moves only on green") in net effect.

Coordinator note (round 2, safety rule): recovery and the red path may only undo what archive itself wrote, and only while everything is exactly as archive left it. When something else changed (a user edit, or a red test that writes into the moved folder), archive changes nothing, reports `held` (`interrupted-unverified`) with the differences and manual steps, and never reports archived. This narrows "on red the files are restored" for that rare case; it never loses data.

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Parallel seam: this spec owns only the files listed here. `payload/PIN` is generated, so on integration regenerate it with `node scripts/pin-payload.mjs` instead of merging it.
- Files: `payload/.joycraft/runtime/archive.mjs`, `tests/runtime-archive-named-files.test.ts`.
- Tests: `tests/runtime-archive-named-files.test.ts`, `tests/runtime-archive-links.test.ts`, `tests/runtime-archive-as-is.test.ts`. Tag each new test `[AC:spec-13-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- The agent judges which listed files are editable tests; the script never decides that an applied migration is safe to edit (text: spec 24).
- Keep the post-move `relinkLive` result as it is; the new list is computed in `previewArchiveFeature`, so the as-is path gets it too (ruling section 7 item 2).

## Decision needed

Review round 3 of 3 (review-13-r3.report.json) FAILED on f13r3-1 (a second archive call undoes a live run) and f13r3-2 (a save during staging is overwritten). The review limit is reached. Brief decision `archive-rewrite-route` (open) holds this spec and spec 24.

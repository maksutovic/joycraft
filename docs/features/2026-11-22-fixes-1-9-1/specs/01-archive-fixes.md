---
id: 1
status: todo
---
# Archive rewrites every Markdown case, lists an in-review spec's missing receipts, words two messages plainly, and quiets the `next` message for comment-only tests

Parent: [brief](../brief.md), section `archive`. Source: [1.9.0 review follow-ups](../../../backlog/2026-11-21-1-9-0-review-followups.md), section Archive (drift-tidy/7/f2, 7/f4, 8/f2, 8/f3), and the first real archive. Decision quoted by ID: `archive-list-kill` = `keep-quiet` (keep the list, quiet the message; session-end text unchanged).

## acceptance

- Markdown in any case [drift-tidy/7/f2]: `relinkLive` treats a live file whose name ends in `.md` or `.markdown`, in any letter case (`.MD`, `.Markdown`), as Markdown: a `docs/guide.MD` and a `docs/notes.markdown` that link into the feature folder are rewritten like `docs/guide.md`. A `.txt` file that names the folder is still listed unedited under `namedInOtherFiles`. Check: `tests/runtime-archive-links.test.ts` `[AC:spec-1-1]` finds both links rewritten to the archive path and the `.txt` file listed, unedited.
- Reference says where [drift-tidy/7/f4]: the `archive.md` rewrite sentence (today line 197, "Apply rewrites links into the folder only in live Markdown outside the features and archive folders") says the live Markdown is under the docs root. Check: `tests/text-archive-tests.test.ts` `[AC:spec-1-2]` finds "under the docs root" in the sentence that starts "Apply rewrites links", and `[AC:spec-24-1]` and `[AC:spec-32-3]` still pass unchanged.
- In-review receipts [drift-tidy/8/f2]: for a spec that an as-is archive lists as unverified and that has no acceptance record naming a report, `missingReceipts` also reads the spec's latest report file in the queue's folder, `review-<id>.report.json` or `review-<id>-r<n>.report.json` with the highest `<n>`, and lists each of its receipts that is missing or whose sha256 differs. With no such file, nothing more is listed. Check: `tests/runtime-archive-as-is.test.ts` `[AC:spec-1-3]`: the fixture's in-review spec 2 with `specs/review-2.report.json` naming the gone receipt gets `  - Missing or changed: \`docs/reviews/x/gone.txt\`` in `unverified.md`; with `review-2.report.json` (gone receipt) and `review-2-r2.report.json` (no gone receipt), only the r2 file is read and the gone receipt is not listed.
- Whitespace message [drift-tidy/8/f3]: `--owner-instruction "   "` (only whitespace) is refused with the same message as a value that starts with `--`: it says `--owner-instruction` needs the owner's words as its value, never "Invalid or duplicate argument". Nothing is changed. Check: `tests/runtime-archive-as-is.test.ts` `[AC:spec-1-4]`: stderr contains "needs the owner's words", does not contain "Invalid or duplicate", the exit code is non-zero and the feature folder is still in place.
- Quiet `next` for comment lines [first real archive; `archive-list-kill` = `keep-quiet`]: after `--apply`, `next` names a listed test only when the test names the feature folder (the same `namesFolder`/`namesDated` patterns) on a line that is not a comment, and it gives that test's first such line. A comment line is one whose trimmed text starts with `//`, `/*`, `*`, `#` or `<!--`. When every listed test names the folder only in comment lines, `next` says the listed tests name the folder only in comments and need no change, and asks for no path change. With no listed test, there is still no `next`. The `namedFiles` entries (path, line, text, test, migration) are the same as before this spec. Check: `tests/runtime-archive-named-files.test.ts` `[AC:spec-1-5]`: (a) two tests that name the folder only in `// Spec:` lines give a `next` with "need no change" and no "Change the folder path"; (b) one such test plus one test whose path sits in a string give a `next` naming only the second test at that line; (c) a test with a `// Spec:` line 1 and a string path at line 9 is named at line 9; in all three, `namedFiles` equals the list the preview gives.
- One root rule: `archive.mjs` imports `projectRoot` from `cleanup.mjs` (spec 3 exports it) and keeps no copy of its own; `archive.mjs archive ...` and `archive.mjs ignore --check` run from a subfolder of the project still find the project root. Check: `tests/runtime-archive-ignore.test.ts` `[AC:spec-1-6]`: `ignore --check` run with cwd a subfolder prints the same status as from the root, and `archive.mjs` holds no `function projectRoot`.
- Words: every-spec words do not change; on-demand words stay inside the cap. Check: the word-cap test in `tests/payload-guard.test.ts` passes and the printed every-spec count equals the count before this spec `[AC:spec-1-7]`.

## Test changes

- `tests/runtime-archive-links.test.ts` class 1: acceptance bullet 1 adds the `.MD`, `.markdown` and `.txt` case.
- `tests/text-archive-tests.test.ts` class 1: acceptance bullet 2 adds the "under the docs root" check.
- `tests/runtime-archive-as-is.test.ts` class 1: acceptance bullets 3 and 4 add the latest-report and whitespace cases.
- `tests/runtime-archive-named-files.test.ts` class 1: acceptance bullet 5 adds the three `next` cases; if an existing test asserts the old `next` words for a test whose naming line is a comment, it changes to the words bullet 5 states.
- `tests/runtime-archive-ignore.test.ts` class 1: acceptance bullet 6 adds the subfolder case.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

- The `namedFiles` list and the session-end text do not change (`archive-list-kill` = `keep-quiet`). `namedFiles` still skips only lowercase `.md` files, so a `.MD` file that names the folder is both relinked and listed; that list is the owner's, not this spec's.
- A comment that a test's code reads (a docstring parsed at runtime) counts as a comment.
- An acceptance record that names a report stays the only source for a done spec; the latest report file is read only when no record names one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; run the recorded gate once, before review.
- Files: `payload/.joycraft/runtime/archive.mjs` (`relinkLive`, `missingReceipts`, `argumentsFor`, `nextSteps`, the `projectRoot` import), `payload/.joycraft/references/archive.md`, and the five test files above.
- Tests: `tests/runtime-archive-links.test.ts`, `tests/runtime-archive-as-is.test.ts`, `tests/runtime-archive-named-files.test.ts`, `tests/runtime-archive-ignore.test.ts`, `tests/text-archive-tests.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-1-<n>]`; use git fixtures in a temp dir, as the existing archive tests do.
- Start after spec 3 is done: it exports `projectRoot` from `cleanup.mjs`.

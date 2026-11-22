---
id: 30
status: todo
---
# Archive lists the files that name the folder; the rewrite code is removed

Parent: [brief](../brief.md), section `archive-tests`. Source: the archive-panel ruling of 2026-11-21 (sections 4 to 6). All decisions are answered; they are quoted by ID.

Decision `archive-test-editor` = `agent`: "Archive lists the tests before the move. After the move the agent changes the path, runs the gate and commits both together. archive.mjs edits no test." Decision `archive-red-path` = `agent-undoes`: the session-end agent moves the folder back on red; archive has no undo. Decision `archive-in-place` = `keep-move`: the 1.8.1 move stays. Decision `archive-spec-13-close` = `replace`: spec 13 stays done as history; this spec replaces its acceptance items 2 and 3, and Max's answer is the owner yes for the test deletions listed under Test changes.

`archive.mjs` goes back to the plain move of 1.8.1 (`17baa32~1`) and keeps one thing from spec 13: the preview field `namedFiles`. Today it is 1,286 lines; the ruling estimates about 790 to 800 after (not a criterion).

## acceptance

- The preview is read-only in every state: it writes no file and moves no folder, also when a `.joycraft/local/archive-pending/` folder from an earlier build exists. Check: `tests/runtime-archive-named-files.test.ts` `[AC:spec-30-1]`: a strict and an `--as-is` preview on a git fixture leave `git status --porcelain --ignored` unchanged and the feature folder in place.
- `namedFiles` lists each tracked non-Markdown file outside the features and archive folders that names the feature folder, tests first, each with `path`, `line`, `text` (that line) and `test`. It matches the full path at a path boundary (the built `namesFolder`); for a dated folder name (`YYYY-MM-DD-...`) it also matches the folder name as a whole quoted token or as a path part, so split segments (`"docs", "features", "<dated-name>"`) and `"<dated-name>/brief.md"` are listed. A look-alike folder (`<name>.old`, `<name>-two`, `packages/app/docs/features/<name>`) is not listed. An undated folder name (such as `auth`) is matched by its full path only. A non-test file under a `migrations/` folder carries `migration: true`; a test under a `migrations/` folder (`tests/migrations/x.test.ts`) is a test and is not marked. Check: the same file `[AC:spec-30-2]` asserts each form, each look-alike, the undated case and both migration cases on one fixture.
- A plain `--apply` moves the folder as 1.8.1 does and edits no file outside the docs root. When the plan listed tests, the result carries `next`: "N tests still name `<source>`: `<file>:<line>` ... Change the folder path in each test that reads it, run the gate, and commit the edits with the move." Check: the same file `[AC:spec-30-3]`: after `--apply` on the fixture, `git status --porcelain` shows changes under the docs root only, and `next` names each listed `file:line` and the words "run the gate" and "commit".
- `archive.mjs` holds no `--rewrite`, no pending record and no recovery, and nothing it runs writes under `.joycraft/local/`. Check: the same file `[AC:spec-30-4]`: `--apply --rewrite tests/a.test.ts` exits 2 naming an unknown argument and moves nothing; after a preview and an `--apply`, `.joycraft/local/` is absent in the fixture; `grep -n "archive-pending\|--rewrite\|recoverPending" payload/.joycraft/runtime/archive.mjs` prints nothing.
- Two plain `--apply` runs of one feature: one archives; the other exits 2, names no manual step ("manually" is absent from its message) and leaves no `docs/archive/.<slug>.staging-*` folder. Drop this item, and say so in the review packet, if the refusal cannot be kept without a record (ruling section 5, about 12 lines). Check: the same file `[AC:spec-30-5]`, the rewritten `[owner-check-n1]` case.
- The tests this spec deletes are listed by name under Test changes as class 3 with the reason "conflicts with owner decision `archive-test-editor`", and the owner yes is decision `archive-spec-13-close` = `replace`. Check: the reviewer's test-change list for this spec matches the deletions and keeps named under Test changes, and `[AC:spec-13-1]`, `[review-13-2]` and the listing half of `[review-13-6]` still pass.

## Keep (from the built spec 13 code)

- `namedFiles` in the preview, strict and as-is, tests first (`archive.mjs:505-532`), with its test `[AC:spec-13-1]`.
- The anchored `namesFolder` match (the f13-2 fix), with its test `[review-13-2]`.
- The scan-cost fix inside `namedFiles` from finding f13-7, as far as it does not depend on `--rewrite`.
- The migration mark, corrected: a test path is never marked. The listing half of `[review-13-6]`.
- The refusal when another apply moved the folder while this run checked it (`movedMeanwhile`), and the "this run never moved it" branch of the staging `catch`, only in a form that needs no record: remove this run's own stage folder (it holds only copies) and refuse with no manual step. If it cannot be kept without the record, drop it with acceptance item 5.
- Not touched: `relinkLive`, the `afterArchive` hook, `archiveIgnore`, the as-is route, the replay manifest and `existingArchive`.

## Remove

- The `--rewrite` flag and its parsing; `rewriteBytes`, `planRewrite`, `recordBudget`; the `templateArgv` import in `archive.mjs` (`dispatch-start.mjs` keeps its own use).
- The pending record and its owner: `ensureLocal`, `writePending`, `processStart`, `ownerAlive`, `ownerOf`, `inProgress`, `pendingFor`, `runOwner`, `clearPending`, and the folder `.joycraft/local/archive-pending/`.
- Recovery and undo: `gitStatus`, `changedSince`, `missingHome`, `removeCreatedHome`, `recordProblems`, `holderDifferences`, `removePlaced`, `restoreRecord`, `plainRunFinished`, `heldUnverified`, `recoverPending`, `undoRun`, `rewriteAndTest`, `notArchived` (`archive.mjs:535-941`), and the `recoverPending` call before the preview return (`archive.mjs:946`).
- The signal handlers and the async `archiveRun`. `archiveFeature` is the sync function of `17baa32~1` again, plus the kept items above.
- The six `held` kinds: `in-progress`, `interrupted`, `interrupted-unverified`, `edited-during-archive`, `not-archived`, and the red-test hold.
- The 19 test blocks and the `[review-13-6]` refusal half listed under Test changes.

## Test changes

- `tests/runtime-archive-named-files.test.ts` class 3, reason "conflicts with owner decision `archive-test-editor`", owner yes `archive-spec-13-close` = `replace`. Deleted, because each pins removed behaviour: `[AC:spec-13-2]`, `[AC:spec-13-3]`, both `[review-13-1]` (SIGTERM and SIGKILL), `[review-13-4] [review-13-5]`, `[review-13-7]`, all six `[review-13-r2-1]` (user note, test edited after the interruption, edit in the archived copy, sibling's green rewrite, two interrupted features, hand-edited record), `[review-13-r2-2]`, `[review-13-r2-3]`, `[review-13-r2-4]`, both `[review-13-r3-1]`, the `[review-13-r3-2]` block (red and green cases) and `[review-13-r3-3]`; and the refusal half of `[review-13-6]` ("--rewrite of it refuses before any edit").
- `tests/runtime-archive-named-files.test.ts` class 1: `[review-13-6]` keeps its listing half and states the new mark `migration: true` in place of `reportOnly: true` (acceptance item 2). `[owner-check-n1]` is rewritten as two plain applies (acceptance item 5); if item 5 is dropped, it is deleted as class 3 with the same reason and owner yes.
- Kept unchanged: `[AC:spec-13-1]`, `[review-13-2]`.

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

- A hold, an undo command, a test run inside archive, a lock, a cleanup check, or any change to `relinkLive` (ruling section 6).
- The session-end and reference text: spec 24 owns it.
- A path built from a variable or a glob is not listed; the gate run or CI on the PR is the check (ruling section 4.3).
- Archive in place: decision `archive-in-place` = `keep-move`.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.joycraft/runtime/archive.mjs`, `tests/runtime-archive-named-files.test.ts`.
- Tests: `tests/runtime-archive-named-files.test.ts`, `tests/runtime-archive-links.test.ts`, `tests/runtime-archive-as-is.test.ts`. Tag each new test `[AC:spec-30-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Start from `git show 17baa32~1:payload/.joycraft/runtime/archive.mjs` for the plain move and add the kept items; do not trim the current file line by line.
- Seam: the owner of the list is `archive.mjs` `namedFiles`; its counterparts are `isTestPath` (from `test-changes.mjs`) and `delivery.mjs`, which refuses a stale gate receipt after a changed file outside the docs root (`delivery.mjs:146-168,182`). Discriminating scenario: after `--apply` and no test edit, `git status --porcelain` lists only docs-root paths, so a docs-only push still works; the `next` message is the only sign that tests still name the old path.
- Spec 29's archive-ignore items edit the same file and wait for this spec.

---
status: in-review
owner: Maximilian Maksutovic
created: 2026-11-20
area: archive
decisions:
  - "A merge commit whose brief bytes equal the brief bytes of one of its parents made no brief change, so it needs no amendment record. A merge that differs from every parent still needs one. Given by the lead session on 2026-11-20."
---

# Fix Archive Asking for a Brief Amendment on a Merge Commit — Bug Fix Spec

> **Parent Brief:** none (bug fix)
> **Issue/Error:** `Brief amendment 1f28784… does not match its commit's brief bytes` when archiving `docs/features/2026-11-17-canonical-entry-file`.
> **Status:** Ready
> **Date:** 2026-11-20
> **Estimated scope:** 1 session / 1 runtime file + 1 reference + 1 test / ~40 lines

---

## Bug

Archive cannot finish for a feature whose brief changed after acceptance and whose
branch was then merged with a merge commit. The accepted brief is at 0858346, the
real amendment is 1438911, and the PR #104 merge is 1f28784. The merge's first
parent (f28abad, on main) has no brief. No amendment record can satisfy the check,
so the archive fails every time.

## Root Cause

`historicalRequirement` in `payload/.joycraft/runtime/archive.mjs` lists later brief
commits with `git log --full-history <accepted>..HEAD -- <brief>`. That list includes
the merge, because the merge differs from its first parent on the brief path.
`briefAmendments` then needs a record for each listed commit and reads the before
bytes from `commit^`, the first parent. For this merge those bytes do not exist, so
`before !== null` fails.

`laterCommits` in the preview uses the same list, but it only records history; it
reads no parent bytes, so it has no such failure.

## Fix

In `briefAmendments`, skip a merge commit (two or more parents) when its brief bytes
equal the brief bytes of one of its parents. Such a merge made no brief change.
Every other commit keeps the current check. `laterCommits` still lists the merge.
Update the sentence in `payload/.joycraft/references/archive.md` that says the first
parent defines the before hash "including for merges".

## Acceptance Criteria

- [ ] [AC:merge-keeps-parent-brief] A feature branch adds the brief, is accepted,
  gets one amendment, and is merged with `--no-ff` into a main that has no brief.
  With one amendment record for the real amendment, the historical requirement
  check passes, records both later commits, and returns one amendment.
- [ ] [AC:merge-changes-brief] A merge whose brief differs from every parent still
  needs its own amendment record.
- [ ] The test fails before the fix and passes after it.
- [ ] `pnpm test && pnpm typecheck` pass.

## Constraints

- MUST NOT use `--first-parent`: feature-branch commits must still be checked.
- MUST NOT add words to the shipped payload (`tests/payload-guard.test.ts`).

## Field report

A second project hit the same refusal on 1.8.0: the archive counted its PR #61 merge commit as a brief edit, though the brief did not exist before that merge. The workaround there was to archive on a branch cut from the commit before the merge, then merge main back in. This fix removes the need for that workaround.

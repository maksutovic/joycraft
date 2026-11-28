---
id: 6
status: in-review
---
# An amendment for a commit with no brief on one side can be recorded

Parent: [brief](../brief.md), section `followups-1-10-3`. Review follow-ups: spec 5 `f2`, `f3`.

## acceptance

- Absent side: when the brief does not exist at `commit^` (or at `commit`), the missing-record refusal prints `fromSha256 null` (or `toSha256 null`) for that commit, not the hash of empty content. A record entry with `null` on that side, the other hash and an answered decision passes; a hash where the brief is absent is refused as not matching. `archive.md` says `null` marks a side with no brief. Check: `tests/runtime-archive-merge-amendment.test.ts` `[AC:spec-6-1]`.
- Several commits: with two later brief commits and no record, the refusal names both commits with their hashes, in commit order, joined by `; `. Check: `tests/runtime-archive-merge-amendment.test.ts` `[AC:spec-6-2]`.

## Test changes

- `tests/runtime-archive-merge-amendment.test.ts` class 1: the acceptance bullets add two tests; existing tests are unchanged.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Files: `payload/.joycraft/runtime/archive.mjs` (`briefAmendments`), `payload/.joycraft/references/archive.md`, `tests/runtime-archive-merge-amendment.test.ts`.
- Tests: `tests/runtime-archive-merge-amendment.test.ts`. Run the recorded gate once, before review.

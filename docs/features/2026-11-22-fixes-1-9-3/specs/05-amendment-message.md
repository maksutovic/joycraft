---
id: 5
status: todo
---
# A brief amendment refusal says what to record

Parent: [brief](../brief.md), section `amendment-message`.

## acceptance

- Refusal text: when a brief changed after acceptance and `brief-amendments.json` is missing, `historicalRequirement` refuses with `no <feature>/brief-amendments.json records its amendments; add one entry for each later brief commit, with the answered owner decision that authorized it, as .joycraft/references/archive.md shows for brief-amendments.json: <commit> (fromSha256 <hash at commit^>, toSha256 <hash at commit>)`, one item per later commit; a record without an entry for a commit names that commit the same way. A record with the named hashes and an answered decision then passes. The refusal itself stays: a brief edit after acceptance is still a requirement change. Check: `tests/runtime-archive-merge-amendment.test.ts` `[AC:spec-5-1]`.

## Test changes

- `tests/runtime-archive-merge-amendment.test.ts` class 1: the acceptance bullet adds the refusal test. The existing `merge-changes-brief` test matches a prefix of the longer message and is unchanged.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

- Recording an owner answer in the brief still needs an amendment entry; this spec does not exempt it.

## Implementation and verification scope

- Files: `payload/.joycraft/runtime/archive.mjs` (`briefAmendments`), `tests/runtime-archive-merge-amendment.test.ts`.
- Tests: `tests/runtime-archive-merge-amendment.test.ts`. Run the recorded gate once, before review.

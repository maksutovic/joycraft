---
id: 6
status: todo
---
# 1.10.2 carries its release fields and a CHANGELOG entry

Parent: [brief](../brief.md), section `release`. Governing: [releasing](../../../guides/releasing.md), section "Every release sets its own notes".

## acceptance

- Release fields: `package.json` `version` and `joycraft.release` are `1.10.2`; `joycraft.summary` is one line of at most 300 characters about this release; `src/joycraft-release.json` `releaseVersion` is `1.10.2`. Check: `tests/public-docs.test.ts` `[AC:spec-6-1]` (add the tag to the `[AC:release-fields]` test titles, no assertion change) passes.
- CHANGELOG: a `## 1.10.2 — <title>` entry above the 1.10.1 entry lists the changes of specs 1 to 5 in a few lines, with an `### Update notes` line about `follow-ups.json` and the `note` class. Check: `tests/public-docs.test.ts` `[AC:spec-6-1]` finds the entry, and `tests/release-preparation.test.ts` passes unchanged `[AC:spec-6-2]`.

## Test changes

- `tests/public-docs.test.ts` class 1: acceptance bullet 1 adds the `[AC:spec-6-1]` tag to the `[AC:release-fields]` test titles, with no assertion change.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Files: `package.json`, `src/joycraft-release.json`, `CHANGELOG.md`, `tests/public-docs.test.ts`.
- Tests: `tests/public-docs.test.ts`, `tests/release-preparation.test.ts`. Run the recorded gate once, before review.
- Start after specs 1 to 5 are done.

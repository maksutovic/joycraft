---
id: 8
status: in-review
---
# 1.9.1 carries its release fields and a CHANGELOG entry

Parent: [brief](../brief.md), section `release`. Decision quoted by ID: `se-followups` = `release-1-9-1`. Governing: [releasing](../../../guides/releasing.md), section "Every release sets its own notes".

## acceptance

- Release fields: `package.json` `version` and `joycraft.release` are `1.9.1`; `joycraft.summary` is one line of at most 300 characters about this release (for example: chained gate commands and runner aliases are caught, docs-root manifests need the gate, and archive's next step skips comment-only tests); `src/joycraft-release.json` `releaseVersion` is `1.9.1`. Check: `tests/public-docs.test.ts` `[AC:spec-8-1]` (add the tag to the two `[AC:release-fields]` test titles) passes.
- CHANGELOG: a `## 1.9.1 — <title>` entry above the 1.9.0 entry lists the fixes of specs 1 to 7 in a few lines and has an `### Update notes` line: `package.json`, `tsconfig*.json` and lockfiles under the docs root now need a fresh gate run before push. Check: `tests/public-docs.test.ts` `[AC:spec-8-1]` finds the entry, and `tests/release-preparation.test.ts` passes unchanged `[AC:spec-8-2]`.

## Test changes

- `tests/public-docs.test.ts` class 1: acceptance bullet 1 adds the `[AC:spec-8-1]` tag to the two `[AC:release-fields]` test titles, with no assertion change.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

- The field-project release proofs (backlog item 23) are not run here.

## Implementation and verification scope

- Files: `package.json`, `src/joycraft-release.json`, `CHANGELOG.md`, `tests/public-docs.test.ts`. AGENTS.md makes the release fields the implementer's job.
- Tests: `tests/public-docs.test.ts`, `tests/release-preparation.test.ts`. Run the recorded gate once, before review.
- Start after specs 1 to 7 are done, so the CHANGELOG entry describes what shipped. Run `/release-docs-sync` before the PR.

---
status: in-review
owner: Maximilian Maksutovic
created: 2026-11-21
area: releases
decisions:
  - "A main push publishes only when a product path (isProductPath) differs from the newest v* release tag in its history. No tag found means publish, as before. Given by the lead session on 2026-11-21."
  - "This fix ships no npm release: it changes only the workflow, scripts/release-preparation.mjs, tests and docs, none of which is in the package. Its own merge is the first run that must skip."
---

# Fix Docs-Only Merges Ending in a Red Publish Run — Bug Fix Spec

> **Parent Brief:** none (bug fix)
> **Issue/Error:** `[AC:release-fields] … expected '1.8.0' to be '1.8.1'` in the publish run of a docs-only merge.
> **Status:** Ready
> **Date:** 2026-11-21
> **Estimated scope:** 1 session / 1 workflow + 1 script + 1 test / ~60 lines

---

## Bug

Every push to `main` runs `.github/workflows/publish.yml` to the end. A merge that
changes no product file still runs `pack`: `scripts/automatic-release.mjs` picks the
next unused patch (for example 1.8.2) and writes it to `package.json` `version` in
the runner, but `joycraft.release` still names the published version. Then
`tests/public-docs.test.ts` `[AC:release-fields]` fails and the run is red. The
docs-only merges of PRs #107, #109 and #110 failed this way. (PR #111 also failed,
but it changed `payload/` without release fields, so its red run was correct; PR
#112 set the fields and published 1.8.1.)

## Root Cause

`scripts/release-preparation.mjs` already has `isProductPath()`, and
`createReleasePreparationPlan()` uses it to return `shouldPrepare: false` for a
docs-only change. But that plan belongs to the retired release-PR path. The
automatic path in `publish.yml` never asks whether the push changed the product: no
job reads changed files, so `pack`, `compatibility` and `publish` always run.

## Fix

- Add `resolvePublishGate()` and a `publish-gate` command to
  `scripts/release-preparation.mjs`. It finds the newest `v*` tag in the history of
  the release commit (`git describe --tags --abbrev=0`), lists the files that differ
  from it, and returns `shouldPublish: true` only when one of them is a product path.
  With no tag it returns `shouldPublish: true`.
- Comparing with the last release tag, not with the previous push, means a product
  change whose publish failed still publishes on the next merge.
- Add a `gate` job to `publish.yml` that runs the command for a push and writes
  `should_publish`. A `workflow_dispatch` retry always publishes. `pack` needs
  `gate` and runs only when `should_publish` is `true`; `compatibility` and
  `publish` need `pack`, so they are skipped too. A run whose jobs are skipped ends
  green and publishes nothing.
- Update `docs/guides/releasing.md` and `docs/context/production-map.md`.

## Acceptance Criteria

- [ ] [AC:docs-only-skips] In a git fixture tagged `v1.0.0`, a later commit that
  changes only `docs/` and `tests/` gives `shouldPublish: false`.
- [ ] [AC:product-publishes] A later commit that changes `payload/` or `src/` gives
  `shouldPublish: true` and names the product files.
- [ ] [AC:no-tag-publishes] A repository with no `v*` tag gives `shouldPublish: true`.
- [ ] [AC:workflow-gate] `publish.yml` has a `gate` job, and `pack` needs it and runs
  only when `needs.gate.outputs.should_publish == 'true'`.
- [ ] A product change still requires its release fields (`[AC:release-fields]` is
  unchanged and still runs in `pack`).
- [ ] The tests fail before the fix and pass after it.
- [ ] `pnpm test && pnpm typecheck` pass.

## Constraints

- MUST NOT add a second release PR, a manual approval or a new credential.
- MUST NOT change how a product change is versioned, verified or published.
- MUST keep `workflow_dispatch` retries working without the gate.

## Verification after merge

This PR's own merge changes no product path, so its publish run must end green with
`pack`, `compatibility` and `publish` skipped and no new npm version.

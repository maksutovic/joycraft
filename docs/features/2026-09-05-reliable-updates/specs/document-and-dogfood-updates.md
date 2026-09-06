---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
mode: checkpoint
---

# Document and Dogfood Updates — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Spec:** 15 of 15
> **Dependencies:** 14 — validate-upgrade-compatibility.md
> **Status:** Ready
> **Date:** 2026-09-06
> **Estimated scope:** 1 session / 5–8 files / ~250 lines

---

## What

Document the unified install/update lifecycle and its recovery boundaries, then use the completed reviewed update mechanism to migrate this repository’s own installation state while preserving its local content and validating generated outputs.

## Why

Users and maintainers need one accurate path for updates and release recovery, and Joycraft cannot credibly ship an update mechanism it has not used safely in its own repository.

## Acceptance Criteria

- [ ] Document one install/update command, `--prefer-online` recovery, the legacy bridge, safe flag behavior, exit codes, update policies, and reinvocation/restart guidance. [src: brief "Success Criteria"]
- [ ] Document credential ownership/renewal, candidate verification, retry and promotion failure recovery without storing secret values. [src: D4]
- [ ] Apply the same reviewed update mechanism to this repository while preserving local content; do not claim old installations discover updates before their bridge update. [src: brief "Success Criteria"]
- [ ] Run generators as a zero-drift verification, not deferred synchronization; complete build, tests, type checks, independent verification, and release-docs review before PR preparation. [src: brief "Test Strategy"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Public update guidance | Run the production CLI `--help`/documented commands in temporary initialized and legacy fixtures; assert every documented command, recovery flag, exit code, policy, and restart outcome matches actual output or result data. | CLI documentation contract |
| Credential and recovery guidance | Parse maintainer documentation for the required non-secret recovery sections; run the production promotion helper with an expired-credential fixture and assert its diagnostic matches the documented recovery action. | documentation contract + unit |
| Repository dogfood preservation | Execute the production update plan/apply path against a copied repository-state fixture containing a local customization; assert the customization bytes survive and the migration result records its preserved status. | filesystem integration |
| Zero-drift and completion gate | Run `pnpm sync-skills`, then assert no source-derived file changes; run build, tests, type checks, the independent verifier, and the release-docs check in the PR-preparation sequence. | repository integration |

**Execution order:**

1. Write the documentation-contract and copied-repository dogfood tests; they must be red for missing guidance or integration behavior while existing tests remain green.
2. Run focused local tests to confirm their red state.
3. Complete the documentation and dogfood migration until focused checks and the existing suite are green, then run the listed zero-drift and review gates.

**Smoke test:** Run the documented update command against a copied initialized fixture with one preserved local customization.

**Before implementing, verify your test harness:**

1. Confirm each new contract test fails for an actual missing behavior or documentation claim, while the pre-existing suite remains green.
2. Ensure the tests call the production CLI, update planner/transaction, or promotion helper rather than duplicating expected strings or filesystem logic.
3. Keep the copied-fixture smoke test under seconds; do not operate on an unreviewed working tree as the test fixture.

## Constraints

- MUST: Use project-relative paths in shipped documentation and never claim that old installations gain discovery before their explicit bridge update. [src: brief "Success Criteria"]
- MUST: Preserve local content, selections, unrelated configuration, and unknown state fields when dogfooding the repository migration. [src: brief "Hard Constraints"]
- MUST: Document the scoped credential’s owner/renewal and recovery procedures without reading, writing, or exposing secret values. [src: D4]
- MUST: Run source-derived generators as zero-drift verification; every earlier source-changing spec remains responsible for its own synchronization. [src: brief "Hard Constraints"]
- MUST: Complete build, tests, type checks, independent verification, and release-docs review before PR preparation. [src: brief "Test Strategy"]
- MUST NOT: publish to npm, promote tags, merge a PR, modify CLAUDE.md merge/improve logic, or make destructive Git changes as part of dogfooding. [src: brief "Hard Constraints"]
- MUST NOT: change unrelated templates or skills beyond the approved shared update-entry behavior already delivered by prior specs. [src: brief "Out of Scope"]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `README.md` | Document the single install/update path and user-visible recovery behavior. |
| Modify | `CHANGELOG.md` | Record the released update behavior and compatibility bridge. |
| Modify | `docs/guides/` | Add or update maintainer guidance for verification, credential lifecycle, and recovery. |
| Modify | `docs/.joycraft/manifest.json` or `docs/.joycraft/local/manifest.json` | Apply the reviewed dogfood migration only to the authority path selected by the repository profile. |
| Add | `tests/update-documentation.test.ts` | Assert documentation aligns with the production CLI and recovery helpers. |
| Add | `tests/dogfood-update.test.ts` | Verify a copied repository fixture preserves local content during migration. |

## Approach

Write documentation from the implemented command/result contracts, including the bridge limitation and recovery paths. Dogfood through a copied repository fixture first, then apply the approved plan to this repository only after the preservation result is reviewable. Run the generators at the end to prove zero drift; they do not own delayed synchronization from prior specs.

Reject manual edits to local Joycraft state: that would bypass the planner, transaction safeguards, and preservation behavior this feature must demonstrate.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| User is offline | Documentation directs the local/offline behavior without promising discovery. |
| Old installation has no bridge state | Documentation requires an explicit user-run bridge update. |
| Scoped promotion credential expires | Maintainer guide explains renewal and rerun; no secret is printed or stored. |
| Dogfood plan finds a customization | The plan preserves it and reports the pending/conflict status. |
| Generator changes an installed copy | Treat this as drift to resolve before PR preparation. |

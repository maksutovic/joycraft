---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
mode: checkpoint
---

# Validate Upgrade Compatibility — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Spec:** 14 of 15
> **Dependencies:** 11 — enable-opt-in-safe-updates.md, 13 — verify-registry-promotion.md
> **Status:** In review
> **Date:** 2026-09-06
> **Estimated scope:** 1 session / 4–7 files / ~300 lines

---

## What

Add package-level acceptance coverage that validates the integrated installer and updater across supported stacks, historical states, harness selections, consumer runtimes, and operating-system command boundaries before promotion can proceed.

## Why

Unit coverage of individual update modules cannot prove that a packaged Joycraft release preserves user state and works across the project and platform combinations it supports.

## External API Contract

**Services:** GitHub Actions and npm CLI

**Canonical sources:**

- [GitHub Actions matrix strategy](https://docs.github.com/actions/using-jobs/using-a-matrix-for-your-jobs)
- [GitHub Actions runner images](https://github.com/actions/runner-images)
- [npm exec CLI](https://docs.npmjs.com/cli/v11/commands/npm-exec)
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)

**Verified API facts:**

- The supported consumer contract is Node `>=22`, with Linux, macOS, and Windows required in the approved runtime matrix.
- Matrix failures are promotion blockers, so the workflow must expose every required lane as a required validation result rather than an advisory report. [src: design §2]

## Acceptance Criteria

- [x] Packaged fresh installs and repeat updates pass against Node.js, Python, Rust, and Go projects without adding a project runtime dependency. [src: brief "Test Strategy"]
- [x] Historical-release upgrades, shared clones, private installs, missing/corrupt state, poisoned baselines, declined edits, and version-only updates retain the approved safety behavior. [src: brief "Test Strategy"]
- [x] Each supported harness and relevant mixed selections are exercised; generated artifacts have zero drift. [src: brief "Test Strategy"]
- [x] Declare Node >=22 and validate supported minimum APIs and the approved runtime matrix across Linux, macOS, and Windows; a matrix failure blocks promotion. [src: brief "Test Strategy"]
- [x] Integrated interruption/concurrency, no-TTY, path-with-spaces, denied-access, and rollback-conflict tests call production code and preserve the original regression coverage. [src: brief "Test Strategy"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Four-stack packaged install/update | Pack the production package once, then invoke its actual CLI in temporary Node, Python, Rust, and Go fixture roots; assert init and repeat update succeed without writing a project dependency manifest. | package integration |
| Historical and state safety | Drive the production update command over fixtures for legacy releases, shared/private manifests, corrupt/missing state, poisoned baselines, declined customizations, and version-only stamps; assert preserved bytes, conflict status, and metadata outcomes. | filesystem integration |
| Harness and generated drift | Run init/update through every `HARNESSES` selection and selected mixed sets, then invoke the production bundle/sync generators and assert no tracked output changes. | integration |
| Runtime/platform matrix | Parse package engine metadata and workflow matrix; assert `>=22` and Linux/macOS/Windows lanes, then run the minimum-runtime production smoke command in the matrix. | workflow contract + CI integration |
| Boundary failures | Call the production update transaction/CLI with failure injection for locks, interrupted writes, no TTY, spaces, denied writes, and rollback conflicts; assert the documented result and preserved user files. | integration |
| Exact-artifact promotion wiring supporting matrix gate | Execute the real required-matrix report producer and promotion consumer together; fail one required cell, omit one, or alter commit/integrity and assert no promotion action. A complete matching report must still pass registry readiness. | workflow integration |

**Execution order:**

1. Add package and workflow-contract tests for the five criteria; they must fail against the current integrated release surface while existing regression tests remain green.
2. Run each focused suite locally with deterministic filesystem/process fixtures to confirm red tests.
3. Implement the minimum validation harness and matrix wiring until all focused tests and the existing suite are green.

**Smoke test:** Pack the current package and run its real CLI once in a temporary Node fixture project.

**Before implementing, verify your test harness:**

1. Confirm the new package-level tests are red for missing coverage/behavior and the existing suite is green before changes.
2. Make every acceptance test call the packed CLI, exported production module, or production workflow file.
3. Keep the single Node-fixture smoke test under seconds; leave the full matrix to CI.

## Constraints

- MUST: Test the real packaged artifact and production command boundaries, not only source-level functions. [src: brief "Hard Constraints"]
- MUST: Cover Node.js, Python, Rust, and Go projects, all supported harnesses, relevant mixed selections, and Linux/macOS/Windows. [src: brief "Test Strategy"]
- MUST: Declare consumer Node support as `>=22` and make a failed required matrix lane block promotion. [src: design §2]
- MUST: Preserve user files, harness selections, unrelated configuration, and unknown state fields throughout acceptance fixtures. [src: brief "Hard Constraints"]
- MUST: Regenerate and sync source-derived artifacts in every affected implementation commit; this spec verifies zero drift and does not defer synchronization. [src: brief "Hard Constraints"]
- MUST: Keep new regression tests red before implementation while the existing suite remains green. [src: brief "Test Strategy"]
- MUST NOT: add a project runtime dependency, access the external holdout-validation repository, or change its dispatch behavior. [src: brief "Hard Constraints"]
- MUST NOT: publish, promote, merge, or perform destructive Git operations while running this validation work. [src: brief "Hard Constraints"]

## Affected Files

This spec also integrates `.github/workflows/publish.yml` with the required-matrix report producer; exposing check results without enforcing them at the promotion adapter does not satisfy the matrix criterion.

| Action | File | What Changes |
|---|---|---|
| Modify | `package.json` | Declare the supported Node engine and expose bounded package-validation scripts if required. |
| Add | `tests/package-acceptance.test.ts` | Run packed-CLI acceptance cases across stack and state fixtures. |
| Add | `tests/upgrade-boundaries.test.ts` | Exercise production failure, interaction, and path boundaries. |
| Modify | `tests/fixtures/` | Add only fixture state needed for historical, stack, and harness acceptance cases. |
| Modify | `.github/workflows/test.yml` | Add required OS/runtime matrix lanes and promotion-visible results. |

## Approach

### Required-validation handoff

The promotion adapter consumes a required-validation report for the exact candidate. The report identifies the immutable release commit SHA, package version, tarball SHA-512 integrity, and outcomes for every required runtime/platform/stack/harness check configured by the release workflow. Readiness includes this report as well as the registry-cache checks; a missing, failed, incomplete, or mismatched report leaves latest unchanged. Do not accept a green branch-level check from another commit or rebuilt artifact.

Spec 13 implements this fail-closed consumer and tests it with deterministic complete/incomplete reports. Spec 14 supplies and wires the real required compatibility matrix to it. This keeps the approved dependency order without authorizing promotion during the intermediate state. Reused successful checks on retry must bind to the same immutable commit/artifact and complete required check set; registry readiness is still rerun. No missing matrix producer is treated as a successful check.

Treat the generated tarball as the system under test. Build compact fixtures around existing stack fixtures and production update APIs so state-preservation assertions remain realistic. Add a required CI matrix for the operating systems and Node range, while local tests use deterministic error injection and process fixtures. Run generation after source changes and assert that it produces no drift.

Reject testing only `src/` imports: that bypasses the package boundary, bundled files, executable metadata, and platform command behavior that releases must prove.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Existing shared clone has a pending customization | The update reports/preserves it rather than accepting it as vendor content. |
| Private install lacks shared manifest | The local authority path is used without creating tracked shared state. |
| Corrupt legacy state | Production code keeps it available for diagnosis and stops unsafe mutation. |
| Windows path contains spaces | The real CLI/process adapter succeeds without shell-string parsing. |
| Matrix lane fails | Promotion is blocked and reports the failing runtime/platform lane. |

## Implementation Evidence

The retained npm artifact is installed into an isolated consumer and exercised through its actual CLI across four stacks and seven harness selections. JSON outcomes, installed files, persisted selections, repeat-update bytes, and unchanged project manifests are checked; a no-op executable fails every cell. Seven OS/Node lanes produce 196 independently required outcomes tied to the release SHA, version, and tarball integrity. The producer feeds the promotion consumer, which rejects missing, failed, or mismatched evidence. Existing state/transaction regression coverage remains, with an added real denied-write recovery test. The reviewed automation descriptor survives packing while preparation resets the next release to false. Build, type checking, and the full staged suite passed: 3,419 tests, one skipped. Cross-platform execution is required in CI; the local packaged matrix passed on macOS.

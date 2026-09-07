---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-07
area: releases
---

# Fix publication verification and release retries

> **Parent Brief:** none (bug fix)
> **Issue:** Release run 34163367109 published 0.7.14, then failed its immediate latest check.
> **Date:** 2026-09-07
> **Authorization:** The user approved the diagnosed fixes in this conversation.

## Bug

A successful npm publication can leave the workflow failed and the GitHub release absent. A failed-job rerun then asks for a compatibility report that does not exist.

## Root Cause

The publish step in `.github/workflows/publish.yml` reads `latest` once immediately after publication. It assumes the registry exposes the update immediately and does not log the observed value. The report download uses the consuming job's `github.run_attempt`, even when compatibility succeeded in an earlier attempt and does not rerun.

## Fix

Poll exact-version registry metadata with online revalidation and a bounded deadline. Require the retained integrity and expected latest version before the GitHub release step. Report expected and observed state. Keep publication outside the polling loop and reject immutable identity mismatches or a newer latest version.

Download compatibility reports from the same workflow run across attempts. Select the newest producer attempt and validate its complete check set against the retained SHA, version, integrity, and current required-check configuration. Never fall back from a newer invalid report to an older passing report.

## Acceptance Criteria

- [x] Successful publication followed by temporarily old or missing metadata eventually verifies without publishing again.
- [x] The readiness deadline bounds subprocesses and polling; expiry reports expected and observed state.
- [x] A mismatched integrity, package identity, or newer latest version stops verification.
- [x] A publish-only rerun accepts a complete matching earlier-attempt compatibility report.
- [x] Missing, malformed, failed, incomplete, or mismatched newest reports block publication.
- [x] Tests execute the production workflow step and verification command without publishing to the public registry.
- [x] Automatic main-push releases, OIDC, retained artifact identity, and all existing compatibility checks remain intact.
- [x] Build, full tests, and typechecking pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Delayed registry visibility and recovery | Drive the production verifier through old/missing metadata to matching metadata, plus deadline and identity failures | Unit and subprocess |
| Publication occurs once | Execute the actual workflow publish step with a strict local npm fixture, then retry the already-published version | Integration |
| Report reuse across attempts | Resolve actual downloaded-report directories for earlier success, newest success, and newest invalid evidence | Integration |
| Existing behavior | Full suite, build, typecheck, and packaged Node/Python/Rust/Go compatibility | Regression |

Write focused tests first, observe their failure, then implement and rerun them. Keep all publication fixtures local. Do not publish to npm or merge this PR as part of implementation.

## Constraints

No new dependencies, credentials, release PRs, or approval stages. Do not change updater ownership rules, product skills, templates, or external validation resources. Preserve existing tarballs on retry.

## Affected Files

Release workflow, focused release verification/report helpers and tests, releasing guide, changelog, and this bugfix index/spec.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| npm accepts publication but metadata is still old | Poll without republishing |
| Registry never becomes ready | Fail with actionable observed-state diagnostics |
| Another release advances latest | Stop without moving latest backward |
| Only publish reruns | Reuse valid evidence from the successful producer attempt |
| Newer report is invalid | Fail instead of trusting an older green report |

## Verification

The extracted production publish step first failed with the reported immediate-latest error. With the fix it waits through stale metadata, and a separate post-publication failure resumes with exactly one publication. A local HTTP registry exercises actual npm reads, and a stalled npm subprocess is terminated within its budget. The report integration executes the production validation shell step against a real locally packed artifact and an earlier-attempt report.

Validation: 150 test files passed, 3,477 tests passed and one skipped. Build, typecheck, nine workflow shell syntax checks, and independent review passed. No public publication or workflow rerun was performed during implementation.

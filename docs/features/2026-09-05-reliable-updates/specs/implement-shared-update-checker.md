---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
mode: checkpoint
---

# Implement Shared Update Checker — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Spec:** 9 of 15
> **Dependencies:** 8 — separate-project-migrations.md
> **Status:** Ready
> **Date:** 2026-09-06
> **Estimated scope:** 1 session / 6–9 files / ~350 lines

---

## What

Create the importable, dependency-free update-check implementation and bundle it as `docs/.joycraft/check.mjs`. The checker must locate its project from its installed path, read local state before contacting npm, expose `check --json`, and return a structured status that callers can use without printing or running an update themselves.

## Why

Joycraft currently performs separate, inconsistent registry checks in the CLI, upgrade path, and Claude hook, so notices cannot reliably respect cached state, postponement, offline work, or future update policy.

## External API Contract

**Service:** npm registry package metadata

**Canonical sources:**

- [npm registry API](https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md)
- [npm package metadata endpoint](https://registry.npmjs.org/joycraft/latest)
- `docs/features/2026-09-05-reliable-updates/research.md`

**Key API facts:**

- Fetch `https://registry.npmjs.org/joycraft/latest` with a three-second deadline and treat a non-success response, invalid body, and network error as `unknown` rather than as evidence that the installation is current.
- The latest metadata response supplies the candidate exact version; validate the HTTP status and response shape before recording it in local checker state.

## Acceptance Criteria

- [ ] Bundle a dependency-free `docs/.joycraft/check.mjs` from the shared implementation; derive its root from installation location and support `check --json`. [src: design §2]
- [ ] Successful metadata refresh has a 24-hour lifetime and a three-second deadline, with a local refresh lock and bounded failure backoff. [src: design §2]
- [ ] Report available, current, postponed, pending-conflicts, and unknown distinctly; compare numeric stable versions and never automatically select prereleases. [src: design §2]
- [ ] Display acknowledgement differs from postponement; suppress repeated offers per release/session and honor explicit checks and newer releases. [src: design §2]
- [ ] Notify is the default local policy; off and auto-safe settings stay local; offline or failed checks do not block skill work. [src: design §2]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Bundle checker and support JSON | Add a real temporary-project test that writes the bundled `check.mjs`, launches `node docs/.joycraft/check.mjs check --json`, and asserts valid structured output plus root discovery from the installed script location. | integration |
| Cache, deadline, lock, and backoff | Exercise the exported checker with a fetch seam and real local cache/lock files: fresh cache avoids fetch, stale cache refreshes, a hanging fetch stops at the configured deadline, a competing lock does not duplicate refresh work, and a failed refresh records bounded retry state. | unit + integration |
| Distinct status and version rules | Table-test the production status resolver for current, available, postponed, pending-conflicts, and unknown; include numeric stable-version ordering and prerelease input that is never selected automatically. | unit |
| Acknowledge, postpone, and session suppression | Run the checker against persisted local settings across multiple calls and sessions to prove acknowledgement is not postponement, same-release notices are suppressed only for the recorded session or dismissal, explicit checks bypass dismissal, and a newer release may be offered. | integration |
| Local policy and offline continuation | Start with no preference and assert `notify`; assert `off` and `auto-safe` are read only from local state; simulate a network failure and assert the checker reports `unknown` without throwing or blocking its caller. | unit + integration |

**Execution order:**

1. Write all tests above against the public checker module and bundled script; they must fail against the current/stubbed code.
2. Run the focused checker tests to confirm they are red.
3. Implement until focused tests are green, then run `pnpm test && pnpm typecheck`.

**Smoke test:** the real temporary-project `check.mjs check --json` integration test runs in seconds with a deterministic fetch seam.

**Before implementing, verify your test harness:**

1. Run all new tests before implementation; they must fail. If they pass, the test is not exercising the missing production behavior.
2. Confirm every test calls the exported checker or generated `check.mjs`, never a reimplementation of cache, status, or version rules.
3. Keep the smoke test deterministic and local so it completes in seconds; registry behavior belongs behind the fetch seam.

## Constraints

- MUST: Preserve user files, selections, unrelated config, and unknown state fields; missing state and `--yes` never grant blanket overwrite permission. [src: brief "Hard Constraints"]
- MUST: Use existing dependencies and Node facilities; do not add a runtime dependency without separate approval. [src: design §2]
- MUST: Keep shipped paths project-relative and honor the external validation boundary. [src: brief "Hard Constraints"]
- MUST: Keep skill checks quiet when current, postponed, offline, or unavailable, and honor the user’s notification policy. [src: brief "Hard Constraints"]
- MUST: Keep `notify`, `auto-safe`, cache timestamps, acknowledgement, postponement, refresh locks, and failure backoff in local state; they must not become cloned shared-manifest settings. [src: design §2]
- MUST: Regenerate and sync source-derived artifacts in every affected commit, including generated and installed copies for Claude, Codex, Pi, Copilot, and omp. [src: brief "Hard Constraints"]
- MUST: Use meaningful production-function tests and run the required build/test/type checks; never defer a red suite to a final sync step. [src: brief "Test Strategy"]
- MUST NOT: Add a registry dependency, automatic updater invocation, or a repeated bootstrap loop when the checker is missing or fails. [src: design §2]
- MUST NOT: Inspect the external holdout repository or change its dispatch behavior. [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|--------|------|--------------|
| Add | `src/update-check.ts` | Pure local-state, cache, version-comparison, refresh, and status API. |
| Add | `src/check.mjs` or equivalent bundled checker source | Thin executable entry that resolves its installed project root and emits JSON. |
| Add | `src/release-resolver.ts` | Provide the bounded metadata-resolution seam if it does not already exist after spec 7. |
| Modify | `src/bundle-inventory.ts` | Include the managed checker artifact and its executable mode if introduced by prior specs. |
| Modify | `scripts/generate-bundled-files.mjs` and/or bundle build inputs | Include the checker in the package’s generated bundle. |
| Add | `tests/update-check.test.ts` | Production-module and real-filesystem checker regressions. |
| Modify | `tests/upgrade.test.ts` or current bundle/install tests | Assert the checker is installed as an owned artifact where the current inventory boundary requires it. |

## Approach

Define a narrow checker API that receives the project root, local-state store, clock, and metadata fetcher through explicit seams. Read local policy and cached metadata first; only acquire a short local refresh lock when a refresh is due. Normalize stable numeric versions, reject prerelease candidates from automatic selection, and return a structured status plus display eligibility rather than printing. Generate the executable wrapper from the same source path as the package bundle so its relative location determines the project root.

Reject retaining the existing independent CLI, upgrade, and hook fetch snippets: they cannot share cache, policy, postponement, or status semantics and would create another set of drifting checks.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No local state or checker settings | Use local defaults (`notify`), report safely, and never treat absence as update authorization. |
| Offline, timeout, malformed JSON, or non-success npm response | Return `unknown`, retain bounded backoff state when appropriate, and let the caller continue work. |
| Another checker currently refreshes | Use current cache if usable or return a quiet non-blocking result; do not wait indefinitely or corrupt the lock. |
| Cached release is postponed and npm reports the same version | Remain postponed until an explicit check or a newer release. |
| Candidate is `1.2.3-beta.1`, malformed, or lower than installed | Do not select it automatically; return an appropriate non-available/unknown result. |
| Cache or local settings contain unknown future fields | Preserve them when updating local checker fields. |

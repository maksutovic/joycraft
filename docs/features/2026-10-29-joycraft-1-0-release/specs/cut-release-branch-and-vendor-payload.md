---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 11
phase: 4
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Cut the Release Branch and Vendor the Payload — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 10
> **Date:** 2026-10-29
> **Estimated scope:** Small–medium
> **Phase:** 4 — Release vehicle
> **Where:** this repo, branch `release/1.0`

## What

Cut `release/1.0` from `origin/main` in its own worktree. Add `scripts/vendor-payload.mjs`, which copies the bundle from a pinned `joycraft-prototype` tag (a new `field-N` after phase 3) into `payload/` with a `PIN` file (tag, commit and a SHA-256 manifest). It excludes `jev.mjs`, `judge.mjs`, Jev hook config and the eval scripts.

## Why

The carrier approach from the field plan: ship the field bundle unchanged inside the existing npm package, with no TypeScript port.

## Acceptance Criteria

- [ ] **AC1:** `node scripts/vendor-payload.mjs --tag <tag>` is reproducible: two runs give identical bytes and an identical PIN.
- [ ] **AC2:** `grep -ri jev payload/` finds docs only (G11).
- [ ] **AC3:** `npm pack` includes `payload/`, and the tarball size is reported in the PR.
- [ ] **AC4:** D11: the payload has no trial data collection. A test fails if `payload/` contains `failure-record`, `failures.jsonl`, `Joycraft-Spec:` or the `jc-impl-`/`jc-rev-` naming rule.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Vendor twice, then diff. | Integration |
| AC2 | grep check in CI. | Unit |
| AC3 | `npm pack --dry-run` contains `payload/PIN`. | Integration |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT merge `release/1.0` to `main` (Max only).
- MUST NOT edit vendored files by hand; fix upstream and re-vendor.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Add | `scripts/vendor-payload.mjs` | Vendor |
| Add | `payload/` | Vendored bundle |
| Modify | `package.json` | files[] includes payload |

## Approach

Copy from a `git archive` of the tag, not from a working tree.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Tag missing | Fail with the tag name. |

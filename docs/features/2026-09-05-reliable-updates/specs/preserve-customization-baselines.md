---
status: done
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
mode: checkpoint
---

# Preserve Customization Baselines — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Spec:** 1 of 15
> **Dependencies:** None
> **Status:** Done
> **Date:** 2026-09-06
> **Estimated scope:** 1 session / 3 files / ~120 lines

---

## What

Replace the current post-upgrade hash rebuild in `upgrade()` with baseline-aware state updates so declining a managed-file replacement keeps the known vendor base (or records unknown ownership) rather than promoting the user's bytes to the vendor baseline.

## Why

`src/upgrade.ts` currently hashes every file remaining on disk after a run, so a declined customization becomes trusted on the next upgrade and can subsequently be overwritten.

## Acceptance Criteria

- [x] After declining replacement, the second and third upgrade preserve the same custom bytes without treating them as pristine vendor content. [src: design §2]
- [x] Accepting a replacement records the target vendor hash; declining preserves a known vendor base or unknown ownership rather than hashing the customization. [src: design §2]
- [x] Regression tests exercise the actual upgrade and persisted state on a real temporary filesystem. [src: design §3]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Declined bytes survive repeated upgrades | Add an `upgrade()` integration regression in `tests/upgrade.test.ts`: initialize a temporary project, arrange a managed file with a known vendor base and custom current bytes, decline once, then invoke the real exported `upgrade()` twice more; assert the bytes remain custom and each persisted baseline remains the vendor base/unknown, never the custom hash. | integration |
| Accepted replacement records target vendor hash | Add an `upgrade()` temporary-filesystem test that accepts a customized-file replacement and asserts the persisted entry equals the target bundle's vendor hash and metadata. | integration |
| Real filesystem/state regression | Extend the same tests to read the written state through the production `readVersion()`/new manifest reader and assert the on-disk JSON, rather than stubbing state writes. | integration |

**Execution order:**
1. Add the three regressions above and confirm they fail against the current `upgrade()` state-rebuild behavior.
2. Run the focused upgrade test file to establish red.
3. Implement the state transition and run the focused tests green.

**Smoke test:** the repeated-decline `upgrade()` temporary-filesystem regression.

**Before implementing, verify your test harness:**
1. Run all new focused tests — they must fail before the production change.
2. Each test calls exported `upgrade()` and reads persisted state; it must not recreate the comparison algorithm in test code.
3. Keep the smoke test runnable in seconds.

## Constraints

- MUST: Preserve user files, selections, unrelated config, and unknown state fields; missing state and `--yes` never grant blanket overwrite permission. [src: brief "Hard Constraints"]
- MUST: Store a vendor baseline only when it is known; a declined local customization must retain the prior verified base or unknown ownership. [src: design §2]
- MUST: Use existing dependencies and Node facilities; do not add a runtime dependency without separate approval. [src: design §2]
- MUST: Use meaningful production-function tests and run the required build/test/type checks; never defer a red suite to a final sync step. [src: brief "Test Strategy"]
- MUST NOT: Change unrelated templates, skills, or CLAUDE.md merge/improve logic. [src: brief "Out of Scope"]
- MUST NOT: Perform live publication, tag promotion, merge, or destructive Git operations. [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `src/upgrade.ts` | Preserve verified vendor bases across customized-file decisions instead of rebuilding every baseline from current disk bytes. |
| Modify | `src/version.ts` | Expose the minimal compatible state representation/helpers required to retain baseline provenance while preserving unknown fields. |
| Modify | `tests/upgrade.test.ts` | Add real-filesystem multi-run decline and acceptance regressions. |
| Modify | `tests/version.test.ts` | Cover compatible persistence of the added baseline semantics and unknown fields. |

## Approach

Keep the comparison source of truth separate from current content: carry forward a verified vendor base for a declined file, update it only after accepting target content, and represent an unverifiable base explicitly. Preserve the existing legacy reader/writer compatibility needed by the next manifest migration spec. Rejected alternative: hash all files after every run, because it erases the distinction between a user edit and vendor content.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Existing state has only a legacy truncated hash | Treat it conservatively; do not infer that customized current bytes are vendor content. |
| Target equals the stored vendor base | Keep the local-only edit without another replacement prompt. |
| User accepts after earlier declines | Replace bytes and advance the recorded base to the target vendor hash. |
| Managed file is missing | Leave deletion handling to later planner work; do not invent a current-content baseline. |

## Implementation evidence

The repeated-decline regression failed before the fix. Focused upgrade/version tests pass (59 tests). A clean validation copy of tracked and task files passed build, 3,029 tests (one skipped), and typecheck. The working checkout has a pre-existing ignored state version mismatch (0.7.11 versus package 0.7.13); that local state was preserved and is excluded from clean-checkout validation, as it is in CI.

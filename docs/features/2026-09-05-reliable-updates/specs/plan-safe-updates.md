---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
mode: isolated
---

# Plan Safe Updates — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Spec:** 5 of 15
> **Dependencies:** 4 — unify-managed-inventory.md
> **Status:** In review
> **Date:** 2026-09-06
> **Estimated scope:** 1 session / 2 files / ~350 lines

---

## What

Add `createUpdatePlan`, a pure production function that compares an explicit filesystem snapshot, installation manifest, managed inventory, and caller options, then returns every proposed action, preservation, and conflict for review before any update write can occur.

## Why

The current upgrade loop mixes comparison, prompting, and writes, so unattended operation can overwrite a customization and no reviewed plan exists for recovery to apply.

## Planner Comparison Contract

For a verified entry, **B** is its recorded vendor base, **C** is current content, and **T** is target content. Compare B/C/T equality using normalized vendor hashes. The planner must produce the following result for every case:

| Condition | Result |
|---|---|
| C equals T | No content write. Reconcile vendor version and state. |
| C equals B and T differs | Safe replacement. Advance the base to T. |
| C differs from B and T equals B | Preserve a local-only edit without repeated prompts. |
| C and T both differ from B | Preserve C and show a current-to-target diff as a conflict. |
| C absent, verified base present | Preserve a local deletion. Restore only through explicit repair selection. |
| C absent, no previous entry | Create a new selected inventory file. |
| C present, no verified base | Adopt only an exact trusted vendor match. Otherwise preserve and report a conflict. |
| T absent, verified C equals B | Delete the owned file only. Keep unknown sibling files and nonempty directories. |
| T absent, C customized or unknown | Preserve as an orphaned customization. |

`vendorHash` represents normalized vendor text and never arbitrary current disk bytes. The planner carries current and target bytes where a reviewable diff or preservation result needs them; it does not duplicate full vendor blobs in the project. Normalized LF hashes classify managed UTF-8 text across platforms. Raw byte hashes are separate transaction preconditions: `applyUpdatePlan` rechecks them immediately before replacement so it can detect an intervening edit. Preserve the existing newline convention for prose replacements; executable scripts retain their declared format.

## Acceptance Criteria

- [x] `createUpdatePlan` takes snapshot, manifest, inventory, and options with no filesystem writes, network requests, or prompts. [src: design §2]
- [x] All nine comparison cases in design section 2D distinguish reconciliation, safe replacement, local-only edit, conflict, local deletion, creation, trusted adoption, owned deletion, and orphaned customization. [src: design §2]
- [x] Conflicts include real current-to-target diffs and preserved bytes; missing state and generic legacy names never authorize replacement or deletion. [src: design §2]
- [x] Safe unattended selection excludes customized replacement; explicit replacement/repair selections are represented in the returned plan. [src: design §2]
- [x] Owned JSON/marked-region patches preserve unrelated content and are calculated before any application. [src: design §2]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Call the exported `createUpdatePlan` with immutable in-memory snapshot, manifest, inventory, and options; spy on filesystem, `fetch`, and prompt boundaries and assert none are used. | unit |
| AC2 | Table-drive all nine B/C/T comparison rows through `createUpdatePlan`; assert the returned action kind, preserved bytes, and manifest transition for each case. | unit |
| AC3 | Pass divergent current/target text and unverified/missing legacy inputs; assert a current-to-target diff and preserved current bytes, with no replace/delete action. | unit |
| AC4 | Compare unattended options with an explicit customized replacement or repair selection; assert only safe actions are selected by default and explicit selections remain visible in the plan. | unit |
| AC5 | Supply owned JSON-key and marked-region patch entries with unrelated content; assert calculated patch output retains unrelated keys/text and the input snapshot is unchanged. | unit |

**Execution order:**
1. Write the production-function tests above; they are expected to fail because `src/update-plan.ts` does not exist.
2. Run the focused test file and confirm it is red.
3. Implement the planner until the focused tests are green, then run the existing suite and type check; existing tests must remain green.

**Smoke test:** the AC2 table-driven planner test.

**Before implementing, verify your test harness:**
1. Run all newly added tests; they must fail before implementation.
2. Each test calls `createUpdatePlan`, never a reimplementation of its comparison rules.
3. Keep the smoke test in seconds so it can run after each planner change.

## Constraints

- MUST: Preserve user files, selections, unrelated config, and unknown state fields; missing state and `--yes` never grant blanket overwrite permission. [src: brief "Hard Constraints"]
- MUST: Use existing dependencies and Node facilities; do not add a runtime dependency without separate approval. [src: design §2]
- MUST: Keep shipped paths project-relative and honor the external validation boundary. [src: brief "Hard Constraints"]
- MUST: Use meaningful production-function tests and run the required build/test/type checks; never defer a red suite to a final sync step. [src: brief "Test Strategy"]
- MUST NOT: Treat `--yes`, missing state, or a matching legacy name as blanket authorization to overwrite local content. [src: brief "Hard Constraints"]
- MUST NOT: Change unrelated templates, skills, or CLAUDE.md merge/improve logic. [src: brief "Out of Scope"]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Add | `src/update-plan.ts` | Export planner input/output types and pure comparison, diff, selection, and patch-planning logic. |
| Add | `tests/update-plan.test.ts` | Add red-first production-function cases for every acceptance criterion. |

## Approach

Model snapshots as explicit data, with normalized vendor comparisons separated from the raw bytes retained for later transaction preconditions. Convert each inventory entry into one reviewed action or conflict, then apply selections to that action list without mutating inputs. Construct text diffs and JSON/region patch results while planning so the transaction receives only concrete work. Reject the alternative of extending `upgrade()` with another in-loop conditional tree because it would retain I/O and decisions inside comparison logic.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Current bytes equal target but manifest version lags | Return reconciliation with no content write. |
| Current file is absent with a verified base | Preserve local deletion unless explicit repair is selected. |
| Target no longer includes a customized file | Preserve it as an orphaned customization. |
| Text differs only by line endings | Compare normalized vendor hashes while preserving the current newline convention for a prose replacement. |
| JSON registration conflicts with user content | Return a conflict; do not calculate a destructive patch. |

## Implementation Evidence

- Pure planner classifies vendor base/current/target content before any writes and returns concrete selected actions, preserved content, conflicts/diffs, raw preconditions, modes, and the next manifest. Owned JSON and marked-region helpers preserve surrounding user data; ambiguous multiple selectors on one path are refused conservatively.
- Red-first planner/helper tests plus independent regression tests cover inactive sibling declarations, malformed settings, create-once protection, local deletion, and repeatable CRLF region patches. Forty focused tests pass.
- Exact staged clean checkout: build passed; 3,127 tests passed, one skipped; typecheck passed. Existing ignored local dogfood state remains unchanged until the new command can migrate it safely.

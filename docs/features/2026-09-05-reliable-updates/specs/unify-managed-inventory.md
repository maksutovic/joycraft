---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
mode: checkpoint
---

# Unify Managed Inventory — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Spec:** 4 of 15
> **Dependencies:** 3 — preserve-installation-manifest.md
> **Status:** Ready
> **Date:** 2026-09-06
> **Estimated scope:** 1 session / 5 files / ~220 lines

---

## What

Replace `upgrade.ts`'s private `getManagedFiles()` map and duplicated init loops with one ownership-aware bundle inventory that describes selected vendor files, executable modes, create-once documents, and owned configuration patches for every harness.

The inventory must reuse `HARNESSES` and `sanitizeHarnesses` from `src/harness.ts`; it must not define a second harness list. `kind` distinguishes vendor files from create-once user documents and owned configuration patches. Vendor entries are routine-refresh candidates, create-once entries retain the existing generators and are not routine replacements, and patch entries identify only the owned JSON key or marked region so unrelated content stays outside the update plan.

## Why

Init and upgrade currently maintain separate lists of generated artifacts, which omit lifecycle assets such as the Claude hook and cannot express ownership or safe patch behavior.

## Acceptance Criteria

- [ ] One inventory describes selected vendor files, executable modes, create-once documents, and owned configuration patches for all five harnesses. [src: design §2]
- [ ] Checker/hook entries have explicit managed ownership; the checker payload and adapter are activated when their later producer specs land, without shipping a broken placeholder. [src: design §2]
- [ ] Existing policy prose and unrelated JSON keys remain outside routine replacement; new policy-file creation retains existing generators. [src: design §2]
- [ ] Every change to generated sources regenerates and synchronizes its affected outputs in that same implementation commit. [src: design §2]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Five-harness inventory | Create `tests/bundle-inventory.test.ts` that calls exported inventory construction for each individual harness and mixed selections; assert vendor paths, kinds, executable modes, create-once documents, and owned patch descriptors. | unit |
| Explicit inactive checker/hook ownership | Test inventory entries for checker and verified Claude hook ownership before their producer content exists; assert they are declared inactive/non-installable and no placeholder payload is returned. | unit |
| Preserve policy prose and unrelated JSON | Add `init()`/inventory integration tests with existing `CLAUDE.md`, `AGENTS.md`, and settings JSON containing user keys; assert normal refresh targets only owned entries while first creation uses existing generators. | integration |
| Derived-artifact synchronization | Add or extend generator-sync tests that alter a canonical source fixture, run the repository's generation/sync production scripts, and assert all affected harness variants/bundled copies match; the test must fail when a declared output is stale. | integration |

**Execution order:**
1. Add the inventory, ownership, preservation, and derived-output regressions and confirm they fail against the split init/upgrade inventories.
2. Run focused inventory and sync tests red.
3. Extract the shared inventory and route init/upgrade through it; regenerate synchronized outputs in the same implementation commit.

**Smoke test:** exported inventory for a Codex-only selection plus an assertion that no Claude-only vendor file is selected.

**Before implementing, verify your test harness:**
1. Run all new focused tests — they must fail before extraction.
2. Each test must invoke production inventory/init/generation functions or scripts, not construct a matching inventory in test code.
3. Keep the smoke test runnable in seconds.

## Constraints

- MUST: Preserve user files, selections, unrelated config, and unknown state fields; missing state and `--yes` never grant blanket overwrite permission. [src: brief "Hard Constraints"]
- MUST: Reuse the existing `HARNESSES` names and validation rather than introducing a second harness list. [src: design §3]
- MUST: Keep vendor files, create-once user documents, and owned configuration patches distinct in the inventory. [src: design §2]
- MUST: Declare checker/hook ownership without installing a broken checker or unverified native adapter before their producer specs land. [src: design §2]
- MUST: Preserve existing policy prose and unrelated JSON keys; retain existing generators for first creation. [src: design §2]
- MUST: Regenerate and sync source-derived artifacts in every affected commit, including all installed harness copies. [src: brief "Hard Constraints"]
- MUST: Use existing dependencies and Node facilities; do not add a runtime dependency without separate approval. [src: design §2]
- MUST: Use meaningful production-function tests and run the required build/test/type checks; never defer a red suite to a final sync step. [src: brief "Test Strategy"]
- MUST NOT: Change unrelated templates, skills, or CLAUDE.md merge/improve logic. [src: brief "Out of Scope"]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Create | `src/bundle-inventory.ts` | Canonical typed inventory and selection helpers for all managed artifact classes. |
| Modify | `src/init.ts` | Consume inventory for managed artifact installation while retaining first-creation generators. |
| Modify | `src/upgrade.ts` | Consume inventory instead of private `getManagedFiles()`. |
| Modify | `src/harness.ts` | Export only any shared selection helpers required by the inventory; retain `HARNESSES` as the single list. |
| Modify | `tests/bundle-inventory.test.ts` | Add direct five-harness and ownership coverage. |
| Modify | `tests/init.test.ts` | Verify first-creation and user-content preservation through the production initializer. |
| Modify | `tests/*sync*.test.ts` | Verify generated and installed outputs remain synchronized after canonical-source changes. |

## Approach

Define typed inventory entries with path, content source, `kind`, ownership, and executable-mode metadata. Reuse `HARNESSES`/`sanitizeHarnesses` for selection. Make init and upgrade consume the same selected vendor entries, leave existing user-document generators responsible for create-once behavior, and represent owned patches by their exact key or marked region. Reserve checker and hook records as inactive declarations until later specs supply verified payloads. Rejected alternative: expand `getManagedFiles()` in place, because it remains upgrade-only and cannot express ownership, patches, or deferred activation.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Codex-only project | Inventory selects Codex entries and shared artifacts, never resurrects Claude/Pi/other harness trees. |
| Mixed harness selection | Each selected harness contributes exactly its declared entries. |
| Existing user `AGENTS.md` or `CLAUDE.md` | Routine refresh does not replace prose; first creation keeps current generator behavior. |
| Settings JSON has user-owned keys | Inventory exposes only owned patch keys/regions and leaves unrelated keys untouched. |
| Checker producer absent | No placeholder executable is installed, while future ownership is declared for planner use. |

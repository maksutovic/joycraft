---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
mode: isolated
---

# Unify Update Command — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Spec:** 7 of 15
> **Dependencies:** 6 — recover-interrupted-updates.md
> **Status:** In review
> **Date:** 2026-09-06
> **Estimated scope:** 1 session / 6 files / ~600 lines

---

## What

Add the public `update` orchestration command and route `init` and `upgrade` aliases through the inventory, planner, transaction, and exact-release resolver while keeping each entry point's explicitly retained compatibility behavior.

## Why

The current CLI has separate init and upgrade flows, separate update checks, stale-CLI re-execution, destructive `upgrade --yes`, and no structured outcome contract for agents or CI.

## External API Contract

**Packages:** `commander@^13.1.0`; npm CLI invoked by the exact-release runner.

**Canonical sources:**

- [Commander API documentation](https://github.com/tj/commander.js#readme)
- [npm CLI `exec` documentation](https://docs.npmjs.com/cli/v11/commands/npm-exec)
- [npm CLI configuration documentation](https://docs.npmjs.com/cli/v11/using-npm/config)

**Key API facts:**

- Commander command options and action handlers define the public CLI boundary already used by `src/cli.ts`.
- The resolver must invoke npm through validated argument arrays, not shell-built command strings, so paths containing spaces and Windows execution remain safe.
- The runner resolves an exact package version and integrity record once; the update engine then uses the executing package bundle and does not initiate another latest lookup.

## Outcome Contract

The public command returns structured applied, preserved-customization, and pending-conflict outcomes for both human-readable and JSON output. Exit code `0` means an update was applied or was a no-op with no pending conflict. Exit code `1` means failure or invalid input. Exit code `2` means unresolved conflicts remain. Exit code `3` means a recovery or project-lock condition needs attention. Registry unavailability is reported as unknown and does not block an explicitly selected local bundle.

## Acceptance Criteria

- [x] `update`, `init`, and `upgrade` share planning/application while applying the executing package bundle without nested latest resolution. [src: design §2]
- [x] Fresh unattended update requires harness selection; legacy init retains its all-harness default with a notice. [src: design §2]
- [x] `--yes` and `--non-interactive` apply safe actions only; `--replace-customized` selects explicit paths; init `--force` remains scoped to its existing inventory. [src: design §2]
- [x] JSON reports applied/preserved/conflict outcomes with the design exit codes; unavailable registry access does not block an explicitly selected local bundle. [src: design §2]
- [x] The exact-release runner validates version/integrity metadata once and invokes npm with argument arrays, including paths with spaces and Windows behavior. [src: design §2]
- [x] Legacy state backup and known checker-registration replacement participate in the transaction; a profile change moves manifest authority without automatically untracking files. [src: design §2]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Invoke exported update orchestration through each CLI alias using a stubbed executing bundle; assert all route to shared planning/application and no resolver nests a latest request. | integration |
| AC2 | Run fresh non-TTY `update` without harnesses and legacy non-TTY `init`; assert update requires explicit selection and init selects all with its compatibility notice. | integration |
| AC3 | Exercise `--yes`, `--non-interactive`, `--replace-customized`, and init `--force` against customized and non-inventory files; assert only authorized plan actions apply. | integration |
| AC4 | Run success, invalid input, conflict, and recovery/lock outcomes in JSON mode; assert exit 0/1/2/3 and separate applied/preserved/conflict fields, then simulate registry failure with an explicit local bundle. | integration |
| AC5 | Call the exported exact-release runner with validated metadata and paths containing spaces under platform adapter fixtures; assert array arguments, one metadata validation, and Windows-compatible invocation. | unit |
| AC6 | Upgrade legacy state/checker registration and switch profiles in a temporary project; assert both changes join the transaction, manifest authority moves, and Git tracking is never altered. | integration |

**Execution order:**
1. Write tests against the public command boundary and exported resolver/orchestrator functions; they are expected to fail because unified update command modules do not exist.
2. Run focused tests and confirm they are red.
3. Implement until green, then run the existing suite and type check; existing tests must remain green.

**Smoke test:** AC4 JSON outcome and exit-code matrix.

**Before implementing, verify your test harness:**
1. Run all new tests before implementation and confirm failure.
2. Each test invokes production CLI/orchestration/resolver functions, never Commander parsing or npm argument construction recreated inside the test.
3. Keep the smoke test in seconds for fast feedback.

## Constraints

- MUST: Preserve user files, selections, unrelated config, and unknown state fields; missing state and `--yes` never grant blanket overwrite permission. [src: brief "Hard Constraints"]
- MUST: Use existing dependencies and Node facilities; do not add a runtime dependency without separate approval. [src: design §2]
- MUST: Keep shipped paths project-relative and honor the external validation boundary. [src: brief "Hard Constraints"]
- MUST: Regenerate and sync source-derived artifacts in every affected commit, including all installed harness copies. [src: brief "Hard Constraints"]
- MUST: Use meaningful production-function tests and run the required build/test/type checks; never defer a red suite to a final sync step. [src: brief "Test Strategy"]
- MUST NOT: Treat `--yes`, missing state, or a matching legacy name as blanket authorization to overwrite local content. [src: brief "Hard Constraints"]
- MUST NOT: Change unrelated templates, skills, or CLAUDE.md merge/improve logic. [src: brief "Out of Scope"]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Add | `src/update.ts` | Collect command inputs, create/present a plan, select authorized actions, invoke the transaction, and format structured outcomes. |
| Modify | `src/cli.ts` | Register `update` and route `init`/`upgrade` aliases with consistent safe flags and exit handling. |
| Modify | `src/init.ts` | Delegate shared update behavior while retaining init's fresh-install defaults and scoped `--force` behavior. |
| Modify | `src/upgrade.ts` | Delegate legacy alias behavior to the shared engine and remove duplicated update flow. |
| Add | `src/release-resolver.ts` | Validate exact release metadata and run npm with argument arrays. |
| Add | `tests/update-cli.test.ts` | Cover public aliases, safe selection, JSON outcomes, registry unavailability, and exact-release invocation. |

## Approach

Make `update` the orchestration layer above the inventory/planner/transaction work completed by prior specs. Adapt `init` and `upgrade` at the CLI boundary so their legacy defaults are explicit inputs rather than parallel mutation implementations. Return structured outcomes from the engine and have Commander handlers map those outcomes to output and process status. Isolate release resolution in one adapter that accepts verified exact metadata and spawns npm with an argument vector. Reject the alternative of preserving the existing stale-CLI re-exec and upgrade loop as a compatibility wrapper because it would reintroduce nested latest resolution and destructive aliases.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Explicit local bundle with unavailable registry | Apply that selected bundle and report registry state as unavailable rather than blocking. |
| Agent or CI uses no TTY | Never prompt; require selection where the contract requires it and return structured outcome. |
| `--replace-customized` lists one path | Select only that matching customized action; retain conflicts for other paths. |
| Package path contains spaces | Pass it as one npm argument without shell interpolation. |
| Shared-to-private profile switch | Move manifest authority in the transaction but do not run Git untracking. |


## Implementation Evidence

- `update`, `init`, and `upgrade` now share executing-bundle planning and transactions. Fresh setup keeps its generators, interactive choices, harness defaults, safeguards, and guidance; routine refresh preserves customization and create-once documents. The duplicated upgrade engine and nested latest re-execution are removed.
- Exact-release resolution validates metadata and uses argument arrays, including a real Windows npm JavaScript-launcher fixture. CLI subprocess tests verify JSON output, exit codes, alias routing, and absence of extra registry requests.
- Independent red-first regressions cover authority ambiguity, profile moves, lossless legacy-state/local-preference migration, known checker retirement, guarded rollback, configuration symlinks, and explicit replacement. Git profile edits participate in the same transaction.
- Exact staged clean checkout: build passed; 3,179 tests passed, one skipped; typecheck passed. Node.js, Python, Rust, and Go initialization coverage is retained. Ignored local dogfood state remains preserved for the later public-command migration.
- Durable filesystem fixtures required bounded worker concurrency and an event-loop yield between init cases; the final suite passes with the existing per-test timeout and no internal worker errors.

Final integration: spec 10 reuses the canonical Claude SessionStart command for the shared checker adapter. The reviewed adapter file replacement and legacy state backup participate in the same transaction; unrelated registrations remain byte-preserved. The dogfood regression also rolls back both the hook and legacy state. Canonical interactive `update` now uses the same selection capture as `init`, and successful JSON outcomes report the resulting manifest version.

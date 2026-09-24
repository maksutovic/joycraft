---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-23
area: update
decisions:
  - "deny-patterns.txt is user-owned: Joycraft creates it on install and never changes it afterwards, including on existing installs whose manifest records it as vendor with unknown ownership. Confirmed in conversation 2026-09-23."
  - "A kept file is not a failure: the upgrade reports it as kept and exits 0. Confirmed in conversation 2026-09-23."
  - "docs/templates/evals/example-task.json joins the user-owned set, because its README tells users to replace it with their own task. Same rule as deny-patterns.txt; applied by the implementer on 2026-09-23."
---

# Fix Upgrade Reporting a Permanent Conflict for Files Users Are Told to Edit — Bug Fix Spec

> **Parent Brief:** none (bug fix)
> **Issue/Error:** `Joycraft update: conflict.` … `Pending conflicts: .claude/hooks/joycraft/deny-patterns.txt` … `⚠ …: Ownership is unverified; preserve current content until trusted evidence or explicit review.` Exit code 2 on every run.
> **Status:** Ready
> **Date:** 2026-09-23
> **Estimated scope:** 1 session / 4 source files + tests / ~120 lines

---

## Bug

`npx joycraft@latest upgrade` succeeds, but it prints `Joycraft update: conflict.` and exits with code 2. It does this on every later run too. The only file involved is `.claude/hooks/joycraft/deny-patterns.txt`, which has one extra deny pattern that the user added (the harden skill writes to this file). The only way to stop the report is `--replace-customized`, which deletes the user's pattern.

The file itself tells users to edit it (`# Edit this file to customize what's blocked.`), and the harden and lockdown skills write to it. So any user who follows the product's instructions gets this report.

## Root Cause

1. `src/bundle-inventory.ts:164` declares `deny-patterns.txt` as `vendor`, which means Joycraft owns it. CLAUDE.md and AGENTS.md are `create-once`, which means the user owns them after the first write. That is why the updater keeps edits to those two files quietly.
2. For a `vendor` file whose owner the manifest records as `unknown`, `src/update-plan.ts:333-335` always plans `conflict`. The legacy bridge in `src/install-manifest.ts:386-388` recorded `unknown` because the edited bytes matched no version that Joycraft shipped. Nothing ever changes that record, so the conflict repeats on every run.
3. `formatUpdateOutcome` (`src/update.ts:953-958`) prints the raw status word as the headline (`Joycraft update: conflict.`), and it prints kept files as "Preserved customizations". An update that succeeded therefore reads like a failure.

The same category error applies to `docs/templates/evals/example-task.json`. It is a `vendor` template, but `src/templates/evals/README.md:15` says "Sample content: replace it with your own."

## Fix

1. **Inventory.** In `src/bundle-inventory.ts`, declare `.claude/hooks/joycraft/deny-patterns.txt` and `docs/templates/evals/example-task.json` as `create-once` and keep their content, so that a fresh install still creates them. Add a `createOnceWithContent(path, harness, content, options)` helper next to `createOnce`. For the template, special-case the key `evals/example-task.json` inside `templateEntries`. Export the set of user-owned paths as `USER_OWNED_VENDOR_PATHS` so that tests and spec 2 can reference it.
2. **Planner** (`src/update-plan.ts`, the ownership decision around lines 312-336):
   - Leave the current `old?.kind === 'create-once'` branch as it is. Inside it, set `action.nonActionable = true` when the manifest has a non-empty `vendorHash` and the current bytes equal it. An untouched user-owned file then does not show up as "kept" on every run.
   - Add one branch after `forceCustomized` and before `targetEqualsBase`: when the inventory entry (`first.kind`) is `create-once` and the path is not an explicit replacement, plan `preserve` with the reason `User-owned file; Joycraft does not change it after creating it.` This covers existing installs whose manifest still says `vendor`, whether the ownership is `unknown` or `verified`.
   - When that branch preserves a file, rewrite its entry in `nextManifest` to `kind: 'create-once'`. Keep its other fields. The next run then takes the `create-once` branch directly.
   - Existing installs where the file is still identical to what Joycraft shipped keep their current path: reconcile or adopt when it equals the target, replace when it equals the verified base. `addFile` already records the kind from the inventory, so these installs move to `create-once` without extra code.
3. **Output** (`formatUpdateOutcome` in `src/update.ts`, text mode only; the `--json` shape does not change):
   - Headline by status: `applied` → `Joycraft updated to <target>.`; `noop` and `preserved` → `Joycraft is up to date (<target>).`; `conflict` → `Joycraft update needs your review.`; `attention`, `invalid` and `failed` keep `Joycraft update: <status>.`
   - Print the `Target:` line only when the headline does not already contain the version.
   - Rename `Preserved customizations:` to `Kept your versions:`, and `Pending conflicts:` to `Needs review:`.
   - Exit codes do not change: `conflict` stays 2. After this fix, a kept file produces `preserved` or `applied`, not `conflict`.
4. **Hook script.** No change. `block-dangerous.sh` already exits 0 when `deny-patterns.txt` is missing, so a user who deletes the file stays in a working state.

## Acceptance Criteria

- [ ] AC1: An existing install whose manifest has `deny-patterns.txt` as `{kind: vendor, ownership: unknown}` and whose file differs from the default gets `preserve`, not `conflict`. The status is not `conflict`, the exit code is 0, and the file bytes do not change.
- [ ] AC2: After that run, the manifest entry for `deny-patterns.txt` has `kind: 'create-once'`, and `pendingConflicts` does not list it.
- [ ] AC3: A verified, untouched `deny-patterns.txt` reconciles and moves to `create-once`. A later run with different default content in the target does not change the file.
- [ ] AC4: A fresh install still creates `deny-patterns.txt` and `docs/templates/evals/example-task.json` with the default content, and records both as `create-once` and `verified`.
- [ ] AC5: An untouched `create-once` file whose bytes equal its recorded `vendorHash` is `nonActionable` and is not listed under "Kept your versions".
- [ ] AC6: The text output uses the new headline for each status and prints `Kept your versions:` and `Needs review:`. The JSON output keys do not change.
- [ ] AC7: `--replace-customized .claude/hooks/joycraft/deny-patterns.txt` still replaces the file on request.
- [ ] No regressions: `pnpm test && pnpm typecheck` pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| AC1, AC2 | Plan an unknown-ownership, edited `deny-patterns.txt` with the real inventory: expect `preserve`, unchanged preserved bytes, `nextManifest` entry `create-once`, no conflicts | unit (`tests/update-plan.test.ts`) |
| AC1 | Run `upgrade` on a temporary project seeded with that manifest and file: status `preserved` or `applied`, exit code 0, file bytes unchanged | integration (`tests/upgrade.test.ts`) |
| AC3 | Verified untouched file: first plan `reconcile` with kind `create-once`; second plan with a changed target: `preserve` | unit |
| AC4 | `getBundleInventory()` lists both paths as `create-once` with content; a fresh plan creates them | unit (`tests/bundle-inventory.test.ts`) |
| AC5 | `create-once` whose current bytes equal `vendorHash` → `nonActionable`, left out of `preserved` | unit |
| AC6 | `formatUpdateOutcome` for `applied`, `noop`, `preserved` and `conflict` | unit |
| AC7 | `replaceCustomized` with an edited `deny-patterns.txt` → `replace` | unit |

**Execution order:**
1. Write the AC1/AC2 planner test. It must FAIL: today the planner returns `conflict`.
2. Run it and confirm the failure.
3. Apply the inventory and planner changes.
4. Run it and confirm it passes.
5. Add the output tests, then change `formatUpdateOutcome`.
6. Run `pnpm test && pnpm typecheck`.

**Smoke test:** the AC1 planner unit test.

**Before implementing, verify your test harness:**
1. Run the reproduction test. It must FAIL; if it passes, it does not test the actual bug.
2. The test must call the real `createUpdatePlan` and `getBundleInventory`, not a reimplementation or mock.
3. The smoke test must run in seconds.

## Constraints

- MUST: keep every byte of a user-owned file unless `--replace-customized` names that file.
- MUST: keep `--json` output keys and exit codes unchanged.
- MUST: keep the planner pure (no I/O).
- MUST NOT: change the transaction, recovery or rollback code.
- MUST NOT: change the default deny patterns themselves.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/bundle-inventory.ts` | `create-once` with content for `deny-patterns.txt` and `evals/example-task.json`; export `USER_OWNED_VENDOR_PATHS` |
| Modify | `src/update-plan.ts` | `create-once` inventory branch, manifest kind migration, `nonActionable` for untouched create-once files |
| Modify | `src/update.ts` | `formatUpdateOutcome` headlines and labels |
| Modify | `tests/update-plan.test.ts`, `tests/upgrade.test.ts`, `tests/bundle-inventory.test.ts`, `tests/update-cli.test.ts` | New regression tests |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User deleted `deny-patterns.txt` | Deletion is kept (existing `preserve` path); the hook exits 0 |
| Legacy project with no manifest and an edited file | The bridge records `unknown`; the planner keeps the file and migrates the entry to `create-once` |
| CRLF file with the same text as the default | The normalized hash matches, so it reconciles |
| Claude harness not selected | Entry is absent; the existing orphan loop handles the old manifest row |
| `init --force` | Still replaces through `forceCustomized` (explicit request) |

**Eval:** not applicable. This is deterministic CLI behavior, and the regression tests above cover it.

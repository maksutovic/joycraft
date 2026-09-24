---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-23
area: update
decisions:
  - "When a user has edited a Joycraft-owned file (skills, templates, hooks, scripts) and Joycraft ships a new version, an explicit update installs the new version and saves the user's copy as a backup instead of stopping on a conflict. Joycraft never replaces CLAUDE.md, AGENTS.md, settings or other user-owned files this way. Confirmed in conversation 2026-09-23 as a deliberate exception to the 'never overwrite user files' boundary."
  - "Backups go under docs/.joycraft/local/replaced/<timestamp>/, which is already gitignored for both profiles. Git history covers tracked files; this folder covers private-profile harness trees. Chosen by the implementer on 2026-09-23."
  - "Automatic (agent-triggered, auto-safe) updates stay conservative: a plan that would replace an edited file is not eligible, so the user runs the update explicitly. This matches the existing gate that customized replacements require an explicit update."
---

# Fix Upgrade Stopping on Edited Joycraft Files — Bug Fix Spec

> **Parent Brief:** none (bug fix)
> **Issue/Error:** Edited vendor files are reported as `conflict` (exit code 2) on every upgrade until `--replace-customized` is passed by hand.
> **Status:** Ready
> **Date:** 2026-09-23
> **Estimated scope:** 1 session / 5 source files + docs + tests / ~200 lines
> **Depends on:** `keep-user-owned-files.md` (user-owned files must be `create-once` before this change, or they would be replaced)

---

## Bug

A user edits a Joycraft skill or template. Later a new Joycraft version ships a new version of that file. Running `npx joycraft@latest upgrade` does not give the user the latest Joycraft: it keeps the old edited file, reports `conflict`, exits with code 2, and does this on every run. The only way forward is to find the path and rerun with `--replace-customized <path>`. The same happens for any file that the legacy bridge recorded as `unknown` ownership.

## Root Cause

`src/update-plan.ts:331-335` plans `conflict` whenever the current bytes differ from both the target and the base. That covers two cases: a verified base that the user edited, and an unknown owner. `selected()` (`src/update-plan.ts:136-140`) never selects a conflict, and there is no automatic resolution, so the conflict repeats until the user names the path with `--replace-customized`. This matched the reliable-updates design ("Unresolved changes remain conflicts", `docs/features/2026-09-05-reliable-updates/design.md:71`). The human reversed that choice for Joycraft-owned files on 2026-09-23.

## Fix

1. **Planner** (`src/update-plan.ts`):
   - Add `backupDirectory?: string` to `UpdatePlanOptions`. This is a project-relative directory. When it is absent, default to `docs/.joycraft/local/replaced/<targetVersion>`.
   - For a `vendor` group, replace the two `conflict` branches (verified both-changed at line 331, unverified at line 333) with `kind: 'replace'` and `selected: true`. Use the reason `Joycraft has a newer version; your edited copy is saved at <backupPath>.`
   - **Backup rule:** every `replace` whose current bytes exist but match neither the verified base nor the target gets a backup. That covers the two new branches, `forceCustomized`, and an explicit `--replace-customized` of a `preserve`. For each one, set `backupPath = <backupDirectory>/<path>.bak` on the replace action. Then add a separate selected action `{ kind: 'create', path: backupPath, content: <exact current bytes>, currentPresent: false, backupOf: <path> }`.
   - The `.bak` suffix is required. With it, `…/.claude/skills/<name>/SKILL.md.bak` is not discovered as a nested skill, and `…/.pi/extensions/<name>.ts.bak` is not loaded as an extension.
   - `config-patch` groups (`.claude/settings.json`) and `create-once` groups keep their existing behavior. They are never replaced by this rule.
   - Backup actions are not recorded in `nextManifest`.
   - Add `backupPath?: string` and `backupOf?: string` to `PlannedUpdateAction`.
2. **Transaction** (`src/update-transaction.ts`): `isControlPath` (line 352) must accept paths under `docs/.joycraft/local/replaced/` as ordinary write targets. Add a `REPLACED_RELATIVE` constant and an early `return false` for that prefix. All other `docs/.joycraft/local` paths stay protected. The existing checks still run: symlinks, raw preconditions, journaling. Rollback therefore deletes the backup and restores the user's copy.
3. **Orchestration** (`src/update.ts`):
   - Before planning, choose `docs/.joycraft/local/replaced/<YYYYMMDD-HHMMSS>` (UTC). If that directory exists, append `-2`, `-3` and so on. Pass it to `createUpdatePlan`.
   - Leave backup actions out of `applied` in `pathsForOutcome`.
   - Add `replaced: Array<{ path: string; backup: string }>` to `UpdateOutcome` and to the `--json` output.
   - Text output (after spec 1's headline): `  Replaced your edited copies (saved in <dir>/): <paths>`.
   - In automatic mode, a plan with any `backupPath` action is not eligible. Return status `conflict` (as today for these files) so that the checker keeps offering an explicit update.
4. **Auto-safe gate** (`src/auto-safe-update.ts`): add a check that rejects a plan when any selected action has a `backupPath`, with the message `Replacing edited files requires an explicit update.`
5. **Docs:**
   - `README.md` (lines 45 and 69): kept files versus replaced-with-backup files.
   - `docs/guides/upgrading.md` (around lines 55-75): describe the backup folder and how to restore a copy. `--rollback` undoes the last update; copying the `.bak` file back restores a single file.
   - `docs/guides/git-tracking.md` (lines 45-49) and `docs/guides/setup-walkthrough.md` (line 48): the same changes.
   - `AGENTS.md`: add the exception to the NEVER overwrite rule, and update the Key Data Flow line "preserve local settings and customized files".
   - `CHANGELOG.md` is handled by `/release-docs-sync`.

## Acceptance Criteria

- [ ] AC1: A verified vendor skill that the user edited, whose target also changed, is replaced with the target on a plain `upgrade`, with `--yes`, and with `--non-interactive`. The backup file holds the user's exact bytes. The status is `applied` and the exit code is 0.
- [ ] AC2: A vendor file with unknown ownership and bytes different from the target gets the same result as AC1. Its manifest entry becomes `verified`.
- [ ] AC3: A verified local-only edit whose target did not change is still preserved (no backup, listed as kept).
- [ ] AC4: `CLAUDE.md`, `AGENTS.md`, `.claude/settings.json`, `deny-patterns.txt` and `evals/example-task.json` are never replaced or backed up without `--replace-customized`.
- [ ] AC5: `--replace-customized` on a preserved local-only edit also writes a backup.
- [ ] AC6: `--rollback` after a replace-with-backup restores the user's bytes and removes the backup file.
- [ ] AC7: A second update in the same second uses a new `-2` directory instead of failing a raw precondition.
- [ ] AC8: Automatic mode refuses a plan that has a backup replacement: status `conflict`, no files written.
- [ ] AC9: `--json` output includes `replaced`, and backup paths do not appear in `applied`.
- [ ] AC10: `isControlPath` still rejects the lock, journal, staging, `backups/` and `last-successful.json` paths and both manifests.
- [ ] No regressions: `pnpm test && pnpm typecheck` pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| AC1 | Temporary project: install, edit a skill, upgrade with a changed inventory. File equals the target, backup equals the edit, exit code 0. Run for interactive-off, `--yes` and `--non-interactive` | integration (`tests/upgrade.test.ts`, `tests/update-cli.test.ts`) |
| AC2 | Unknown-ownership manifest row with an edited skill → replace and backup; manifest `verified` | integration (`tests/upgrade.test.ts`) and CLI process (`tests/update-cli-process.test.ts`) |
| AC3 | Planner: target equals base, current edited → `preserve`, no backup action | unit (`tests/update-plan.test.ts`) |
| AC4 | Planner, with every `USER_OWNED_VENDOR_PATHS` entry plus CLAUDE.md, AGENTS.md and settings edited, while the target changes → no replace, no backup | unit |
| AC5 | `replaceCustomized` on a local-only edit → replace plus a backup action | unit |
| AC6 | Apply, then `rollbackLastSuccessfulUpdate` → user bytes restored, backup gone | integration (`tests/update-transaction.test.ts`) |
| AC7 | Pre-create the timestamp directory → the plan uses `-2` | unit (`update.ts` helper) |
| AC8 | `update(..., { automatic: true })` with an edited skill → `conflict`, bytes unchanged | integration (`tests/auto-safe-update.test.ts`) |
| AC9 | `formatUpdateOutcome(result, true)` includes `replaced` | unit |
| AC10 | Every existing control path is still rejected; `docs/.joycraft/local/replaced/x.bak` is accepted | unit (`tests/update-transaction-safety.test.ts`) |

**Existing tests whose expected behavior changes on purpose.** Update these assertions; they are not regressions:
- `tests/update-plan.test.ts`: the `'current and target diverge'` table row (now `replace` plus a backup action) and the `replaceCustomized` test that expects `kind: 'conflict'` with `resolution: 'replace'`.
- `tests/upgrade.test.ts`: the three tests that expect a `conflict` status and a surviving custom file for an edited or unknown vendor skill. They now expect replacement plus a backup holding the custom bytes.
- `tests/update-cli.test.ts`: "preserves customized files in safe unattended mode". It now replaces the file and writes a backup.
- `tests/update-cli-process.test.ts`: "reports unknown customized files with exit 2". It now expects exit 0 and a backup.
- `tests/auto-safe-update.test.ts`: if the automatic conflict test uses an edited vendor file, keep status `conflict` and make it assert the new diagnostic.

**Execution order:**
1. Write the AC1 integration test. It must FAIL: today the status is `conflict`.
2. Run it and confirm the failure.
3. Implement the planner, transaction, orchestration and gate changes.
4. Run it and confirm it passes.
5. Update the tests listed above, then run `pnpm test && pnpm typecheck`.
6. Update the docs.

**Smoke test:** the AC1 integration test.

**Before implementing, verify your test harness:**
1. Run the reproduction test. It must FAIL; if it passes, it does not test the actual bug.
2. The test must call the real `upgrade`, `update` and `createUpdatePlan`, not a reimplementation or mock.
3. The smoke test must run in seconds.

## Constraints

- MUST: write the backup in the same journaled transaction as the replacement. Never replace a file whose backup was not written.
- MUST: back up the exact current bytes, not the normalized text.
- MUST: keep user-owned files (`create-once`) and config patches out of this rule.
- MUST: keep the planner pure (the timestamp is passed in by `update.ts`).
- MUST NOT: let automatic updates replace edited files.
- MUST NOT: open any other `docs/.joycraft/local` path to plan writes.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/update-plan.ts` | Replace-with-backup branches, backup actions, `backupDirectory` option |
| Modify | `src/update-transaction.ts` | Accept the `replaced/` prefix as a write target |
| Modify | `src/update.ts` | Unique backup directory, `replaced` outcome, output line, automatic-mode status |
| Modify | `src/auto-safe-update.ts` | Explicit-update gate for backup replacements |
| Modify | `README.md`, `docs/guides/upgrading.md`, `docs/guides/git-tracking.md`, `docs/guides/setup-walkthrough.md`, `AGENTS.md` | Describe the new behavior and the boundary exception |
| Modify | tests listed in the Test Plan | New and updated assertions |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Edited file is binary or has CRLF line endings | Backup holds the raw bytes; the replacement follows the existing newline rules |
| Edited executable (`.pi/scripts/joycraft/*`) | Replacement keeps the vendor mode; backup mode is the default (not executable) |
| File removed from the target while edited (orphan) | Unchanged: still preserved as an orphan, no backup |
| `docs/.joycraft/local/replaced` is a symlink | The transaction rejects it through the existing path checks; status `attention` |
| Private profile | Backups go to the same gitignored folder |
| User edits a file again after the replace, and the target did not change | Preserved as a local-only edit (AC3) |

**Eval:** not applicable. This is deterministic CLI behavior, and the regression tests above cover it.

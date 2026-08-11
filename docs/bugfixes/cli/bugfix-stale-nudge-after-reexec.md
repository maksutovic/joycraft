---
status: todo
owner: Maximilian Maksutovic
created: 2026-08-11
area: cli
decisions:
  - "Suppress the postAction nudge whenever the stale-CLI guard fires (both re-exec and declined paths), not only after a successful re-exec — both paths already print their own, correct guidance. Confirmed in conversation 2026-08-11."
---

# Fix stale update nudge after upgrade re-exec — Bug Fix Spec

> **Parent Brief:** none (bug fix)
> **Issue/Error:** After `npx joycraft upgrade` successfully delegates to the latest CLI via npx re-exec, the outer (stale) process still prints `Joycraft 0.7.9 available (you have 0.7.8). Run: npx joycraft@latest upgrade` — making users think the upgrade failed.
> **Status:** Ready
> **Date:** 2026-08-11
> **Estimated scope:** 1 session / 3 files / ~30 lines

---

## Bug

A user on a stale cached CLI runs `npx joycraft upgrade`. The stale-CLI guard correctly re-execs `joycraft@<latest> upgrade`, which completes the upgrade ("Upgrade complete: Updated 34, added 1 new…"). Then the outer stale process prints "Joycraft 0.7.9 available (you have 0.7.8). Run: npx joycraft@latest upgrade" — a nag that contradicts the successful upgrade that just happened. Following the nag ("Already up to date.") and then `npx joycraft --version` (npx cache → 0.7.8) compounds the impression that the upgrade never took.

## Root Cause

`src/cli.ts` registers a global `postAction` hook (~line 111) that prints an update nudge whenever the npm registry's latest version differs from the running package's version. It fires unconditionally after every command. The stale-CLI guard in `upgrade()` (`src/upgrade.ts:407-418`) runs *inside* the upgrade action, so after it delegates to the latest CLI (or prints its own "Update and re-run…" one-liner on decline), the action returns and the hook still fires — comparing against the stale outer process's own version.

## Fix

Give the upgrade path a way to tell the CLI layer the nudge is redundant:

1. In `src/upgrade.ts`, change `upgrade()`'s return type from `Promise<void>` to `Promise<{ cliWasStale: boolean }>` (all existing `return;` statements in the stale-guard block return `{ cliWasStale: true }`; every other return path returns `{ cliWasStale: false }`).
2. In `src/cli.ts`, add a module-level `let suppressUpdateNudge = false`. The upgrade action sets it from the return value. The `postAction` hook returns early when the flag is set.

No behavior change for `init` or any other command; the nudge still prints for a normal in-date `upgrade` run (where `latest !== pkg.version` can still be true within the guard's semver tolerance, e.g. registry propagation edge) — only stale-guard runs suppress it.

## Acceptance Criteria

- [ ] When the stale-CLI guard fires (re-exec accepted, re-exec spawn-failed, or declined), `upgrade()` reports `cliWasStale: true` and the CLI prints no postAction update nudge
- [ ] A normal upgrade run (CLI current) reports `cliWasStale: false` and postAction nudge behavior is unchanged
- [ ] No regressions in related functionality (existing upgrade/init tests pass)
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Stale guard reports `cliWasStale: true` | Unit test in `tests/upgrade.test.ts`: stub fetch to return a newer version, pass `spawnForReexec` seam + `yes: true`, assert return value `{ cliWasStale: true }` | unit |
| Declined/spawn-failed path also reports `cliWasStale: true` | Same setup with `spawnForReexec` returning `{ status: null, error: new Error(...) }` | unit |
| Normal run reports `cliWasStale: false` | Existing fetch-stub (same-version) fixture, assert `{ cliWasStale: false }` | unit |
| No regressions | Full `pnpm test && pnpm typecheck` | unit |

**Execution order:**
1. Write the reproduction test asserting `upgrade()` returns `{ cliWasStale: true }` on the stale path — it FAILS (current return is `undefined`)
2. Run the test to confirm it fails
3. Apply the fix (upgrade.ts return values, cli.ts flag + hook guard)
4. Run the test to confirm it passes
5. Run the full test suite

**Smoke test:** the stale-path return-value unit test (runs in seconds; existing tests already use the fetch-stub pattern from the gitignore-profiles tests and the `spawnForReexec` seam).

**Before implementing, verify your test harness:**
1. Run the reproduction test — it must FAIL first
2. The test must call the real `upgrade()` from `src/upgrade.ts`, using the existing fetch-stub + `spawnForReexec` seam, not a mock of `upgrade`
3. Smoke test = the single new unit test

## Constraints

- MUST: keep the existing `spawnForReexec` test seam working unchanged
- MUST: keep all existing console output of the stale-guard block (the guard's own messages are correct)
- MUST NOT: change the nudge behavior of `init`, `check-version`, or any non-upgrade command
- MUST NOT: change the public CLI surface (flags, exit codes)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/upgrade.ts` | `upgrade()` returns `{ cliWasStale: boolean }`; stale-guard returns `true`, all other paths `false` |
| Modify | `src/cli.ts` | `suppressUpdateNudge` flag set from upgrade's return; postAction hook early-returns when set |
| Modify | `tests/upgrade.test.ts` | New assertions on return value for stale, spawn-failed, and normal paths |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Registry fetch fails/times out in `checkCliVersion()` | Guard treats CLI as current → `cliWasStale: false`, nudge logic unchanged (hook's own fetch also fails silently) |
| Re-exec spawn fails (`result.error`) | Guard prints the one-liner fallback; still `cliWasStale: true`, no duplicate nudge |
| User declines re-exec prompt | Guard prints "Update and re-run in one step…"; `cliWasStale: true`, no duplicate nudge |
| Non-TTY without `--yes` | `rerun` is false → declined path, same as above |
| `upgrade()` throws before/inside the guard | cli.ts catch block runs, flag stays false — nudge may print, acceptable (unchanged from today) |

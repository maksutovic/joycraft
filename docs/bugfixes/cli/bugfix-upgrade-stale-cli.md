---
status: shipped
owner: Maximilian Maksutovic
created: 2026-05-27
area: cli
---

# Upgrade Falsely Reports "Already Up to Date" When CLI Is Stale — Bug Fix Spec

> **Status:** Complete
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 2 files / ~40 lines

---

## Bug

`npx joycraft upgrade` prints "Already up to date." for project files even when the joycraft CLI itself is outdated (e.g., running 0.6.4 while 0.6.6 is published on npm). This creates a confusing loop: the user is told to run `npm install -g joycraft`, but that command may not work (wrong package manager prefix, permissions, npx cache), and `upgrade` never helps them understand the real state.

## Root Cause

`src/upgrade.ts:112-223` compares the user's local project files against `getManagedFiles()` — the bundled skills and templates baked into the **currently running** joycraft binary. If the binary is stale (0.6.4), it compares against 0.6.4's bundled files. Since the user's project was already upgraded to 0.6.4's files, `changes.length === 0` → "Already up to date." There is no check against the npm registry to detect that a newer CLI version exists with newer bundled content.

Additionally, `src/cli.ts:61` (`check-version` command) tells users `Run: npx joycraft upgrade`, while `src/cli.ts:81` (postAction hook) tells them `Run: npm install -g joycraft`. These two nudges contradict each other.

## Fix

1. **Add a stale-CLI guard at the top of `upgrade()`** (`src/upgrade.ts`):
   - Fetch `https://registry.npmjs.org/joycraft/latest` with a 3s timeout (same pattern as `cli.ts`).
   - If the running `pkgVersion` is **semantically less than** the registry's `latest`, print:
     ```
     Joycraft CLI is out of date (you have {pkgVersion}, latest is {latest}).
     Update with: npm install -g joycraft
     Then re-run: npx joycraft upgrade
     ```
   - Early-return. Do NOT compare project files against stale bundled content.

2. **Fix nudge text consistency** (`src/cli.ts`):
   - Change `check-version` command (`src/cli.ts:61`) from `Run: npx joycraft upgrade` → `Run: npm install -g joycraft`.
   - Change the SessionStart hook script generated in `src/init.ts:177` from `Run: npx joycraft upgrade` → `Run: npm install -g joycraft`.

## Acceptance Criteria

- [ ] Running `upgrade()` with a stale CLI version prints the stale-CLI warning and exits without saying "Already up to date"
- [ ] Running `upgrade()` with the latest CLI version proceeds normally (no false positive)
- [ ] `check-version` command advises `npm install -g joycraft`
- [ ] SessionStart hook script advises `npm install -g joycraft`
- [ ] No regressions — existing tests still pass
- [ ] Build passes

## Test Plan

1. Write a reproduction test that mocks the npm registry response to return a newer version than `getPackageVersion()`
2. Verify `upgrade()` logs the stale-CLI warning and returns early (no file comparison)
3. Apply the fix
4. Reproduction test passes
5. Full test suite passes

## Constraints

- MUST: Use the same fetch + timeout pattern already in `cli.ts` to keep network behavior consistent
- MUST: Handle network failures silently (don't block upgrade if registry is unreachable)
- MUST NOT: Auto-execute `npm install` — only print instructions
- MUST NOT: Change the core file-diffing logic (only add an early guard)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/upgrade.ts` | Add npm-registry version check + early-return guard at top of `upgrade()` |
| Modify | `src/cli.ts` | Fix `check-version` nudge text |
| Modify | `src/init.ts` | Fix SessionStart hook script nudge text |
| Modify | `tests/upgrade.test.ts` | Add test for stale-CLI early-return |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Network unreachable / registry down | Silent fallback — proceed with normal upgrade flow (same as today) |
| Running version > published version (local dev) | No warning — proceed with normal upgrade flow |
| Running version === published version | No warning — proceed with normal upgrade flow |
| `getPackageVersion()` throws | Silent fallback — proceed with normal upgrade flow |

# Improve CLI Version and Upgrade UX — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-26-test-first-new-feature.md`
> **Status:** Ready
> **Date:** 2026-03-26
> **Estimated scope:** 1 session / 1-2 files / ~50 lines

---

## What

Improve the Joycraft CLI's version and upgrade experience: add `-v` alias for version, add a non-blocking update check on every command that nudges users when a newer version is available, and make the upgrade path clear for global installs.

## Why

Most users install Joycraft globally (`npm install -g joycraft`) and then never update. They get stuck on stale versions with missing skills and fixes. The CLI should proactively tell them when an update is available and make upgrading dead simple.

## Acceptance Criteria

- [ ] `joycraft -v` works as an alias for `joycraft --version`
- [ ] Every command (init, upgrade, init-autofix) checks npm registry for the latest version in the background
- [ ] If the installed version is older than the latest, prints a one-line message after the command output: `Joycraft X.Y.Z available (you have A.B.C). Run: npm install -g joycraft`
- [ ] The update check is non-blocking — if the registry is unreachable or slow (>3s timeout), the command runs normally with no message
- [ ] The update check does not delay the command — it runs concurrently and prints at the end
- [ ] `joycraft` with no arguments shows help and version
- [ ] Build passes
- [ ] Tests pass

## Constraints

- MUST: Not slow down any command — the update check runs concurrently, never blocks
- MUST: Use `npm install -g joycraft` as the upgrade instruction (since README instructs global install)
- MUST: Timeout after 3 seconds — don't hang on slow networks
- MUST NOT: Print update messages to stderr (keep it in stdout so users see it)
- MUST NOT: Add any dependencies — use built-in `fetch`

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/cli.ts` | Add `-v` alias, add update check hook that runs on every command, ensure bare `joycraft` shows help |

## Approach

Commander supports `.version(pkg.version, '-v, --version')` to add the `-v` alias. For the update check, use a `program.hook('postAction')` that fires after any command completes. The hook does a non-blocking fetch to `https://registry.npmjs.org/joycraft/latest`, compares versions, and prints a one-liner if outdated. Use `AbortSignal.timeout(3000)` to prevent hangs.

```typescript
program.hook('postAction', async () => {
  try {
    const res = await fetch('https://registry.npmjs.org/joycraft/latest', {
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const latest = (await res.json()).version;
      if (latest !== pkg.version) {
        console.log(`\nJoycraft ${latest} available (you have ${pkg.version}). Run: npm install -g joycraft`);
      }
    }
  } catch {
    // Silent — don't block or error on network issues
  }
});
```

For better UX, start the fetch at program init and await it in the postAction hook — this way the network request runs in parallel with the actual command.

**Rejected alternative:** Checking on a schedule (once per day) with a cache file. This adds file I/O complexity and state management. A simple per-invocation check is fast enough with the 3s timeout and requires no state.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No internet connection | Command runs normally, no update message, no error |
| npm registry is slow (>3s) | Command runs normally, fetch times out silently |
| User is on the latest version | No message printed |
| User runs `joycraft --version` | Shows version, no update check needed (version display is not an "action") |
| User runs `joycraft` with no args | Shows help output with version |

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| `-v` shows version | Run CLI with `-v`, assert output matches package.json version | unit |
| Update check prints nudge when outdated | Mock fetch to return higher version, assert nudge message in stdout | unit |
| Update check is silent when current | Mock fetch to return same version, assert no extra output | unit |
| Update check is silent on network failure | Mock fetch to throw, assert no error output | unit |
| Bare `joycraft` shows help | Run CLI with no args, assert help text in output | unit |

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

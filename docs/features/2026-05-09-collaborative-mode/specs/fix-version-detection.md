# Fix Version Detection — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-05-09-collaborative-mode-draft.md`
> **Status:** Complete
> **Date:** 2026-05-09
> **Estimated scope:** 1 session / 3 files / ~80 lines

---

## What

Extract the CLI's package-version lookup into a single shared module `src/package-version.ts` and replace both hardcoded `'0.1.0'` literals — at `src/init.ts:164` (the `writeVersion(targetDir, '0.1.0', fileHashes)` call) and at `src/upgrade.ts:238` (the `getPackageVersion()` function that unconditionally returns `'0.1.0'`). After this spec, every code path that stamps `.joycraft-version` writes the real CLI version read from the bundled `package.json`, identical to the working pattern at `src/cli.ts:7`.

## Why

The SessionStart hook reads `.joycraft-version` (always `0.1.0`) and compares against the npm-registry latest, producing a spurious "Joycraft X.Y.Z available (you have 0.1.0)" nudge on every session — even immediately after `npx joycraft upgrade`. The brief's "Scope of THIS PR" lists this as in-scope; research Q14/Q15 pinpointed the two literals.

## Acceptance Criteria

- [ ] `src/package-version.ts` exists and exports a `getPackageVersion(): string` function that reads `version` from the CLI's bundled `package.json` (the same `package.json` that `src/cli.ts:7` reads).
- [ ] `src/init.ts` imports `getPackageVersion` and the `writeVersion(...)` call uses it instead of the literal `'0.1.0'`.
- [ ] `src/upgrade.ts` deletes its local `getPackageVersion()` function and imports the shared one; the `writeVersion(targetDir, pkgVersion, newHashes)` call now writes the real version.
- [ ] After `node dist/cli.js init /tmp/test-project`, the `.joycraft-version` file in the test project has `"version"` equal to the CLI's `package.json` version (NOT `"0.1.0"` unless `package.json` actually says `0.1.0`).
- [ ] After `node dist/cli.js upgrade /tmp/test-project`, the same is true.
- [ ] No literal string `'0.1.0'` appears anywhere in `src/init.ts` or `src/upgrade.ts` afterward (grep returns no results).
- [ ] Build passes (`pnpm build`).
- [ ] Type check passes (`pnpm typecheck`).
- [ ] Tests pass (`pnpm test --run`).

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| `getPackageVersion()` returns CLI's real version | `tests/package-version.test.ts` — call exported fn, assert it equals the version field of the CLI's `package.json` | unit |
| `init` writes real version to `.joycraft-version` | Extend `tests/init.test.ts` — run init against a tmp dir, read `.joycraft-version`, assert `version` field matches `package.json` not `'0.1.0'` | integration |
| `upgrade` writes real version to `.joycraft-version` | Extend `tests/upgrade.test.ts` — pre-seed a project with `.joycraft-version` containing `"0.1.0"`, run upgrade, assert version is updated to current `package.json` version | integration |
| No literal `'0.1.0'` remains in init/upgrade | `tests/no-hardcoded-version.test.ts` — read both source files, assert `'0.1.0'` substring is absent | unit |

**Execution order:**
1. Write all four tests above — they should fail against current code (the integration tests should fail because today's code writes `'0.1.0'`).
2. Run tests to confirm they fail (red).
3. Create `src/package-version.ts` and update both call sites until all four tests pass (green).

**Smoke test:** `pnpm test --run tests/package-version.test.ts` — runs in <1s; covers the core unit-level behavior. The integration tests are fast (<3s each) but require building first.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing).
2. Each test calls your actual function/endpoint — not a reimplementation. The integration tests must run the real `init`/`upgrade` exports, not a stub.
3. Identify your smoke test — `pnpm test --run tests/package-version.test.ts` is fastest.

## Constraints

- MUST: Read version from the CLI's bundled `package.json` using the same path resolution pattern as `src/cli.ts:7` (`readFileSync(join(__dirname, '..', 'package.json'), ...)`).
- MUST: Keep the function synchronous — current call sites are sync.
- MUST: `src/cli.ts:7`'s direct read of `package.json` may be left as-is OR also routed through the new module — both are acceptable. Do not break `cli.ts`.
- MUST NOT: Introduce any new runtime dependencies (CLAUDE.md ALWAYS rule).
- MUST NOT: Hardcode any version string anywhere in the source (no `'0.1.0'`, no `'0.0.0'` fallback that silently writes a fake version — if reading `package.json` fails, throw).
- MUST NOT: Change the `.joycraft-version` JSON shape (`{ version, files }`) — `src/version.ts` interfaces stay the same.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/package-version.ts` | New module, single export `getPackageVersion(): string` |
| Modify | `src/init.ts` | Add `import { getPackageVersion } from './package-version.js';`. Change `writeVersion(targetDir, '0.1.0', fileHashes)` (line 164) to `writeVersion(targetDir, getPackageVersion(), fileHashes)`. |
| Modify | `src/upgrade.ts` | Add the same import. Delete local `getPackageVersion()` function (lines ~234-242). All existing references to `getPackageVersion()` continue to work since the imported one has the same name. |
| Create | `tests/package-version.test.ts` | Unit test for the new module |
| Create | `tests/no-hardcoded-version.test.ts` | Source-grep test ensuring no `'0.1.0'` literal remains in init.ts/upgrade.ts |
| Modify | `tests/init.test.ts` | Add assertion on the version stamped into `.joycraft-version` |
| Modify | `tests/upgrade.test.ts` | Add assertion that upgrade refreshes the version stamp |

## Approach

**Strategy:** Single source of truth. Both `init.ts` and `upgrade.ts` need the CLI's own version; `cli.ts` already does the right thing. Lift that logic into a shared module so the bug can't reappear by drift.

**Data flow:**
```
src/package-version.ts
  → readFileSync(join(__dirname, '..', 'package.json'))
  → JSON.parse → return .version

src/init.ts        → getPackageVersion() → writeVersion(...)
src/upgrade.ts     → getPackageVersion() → writeVersion(...)
src/cli.ts         (unchanged — direct read still works)
```

**Key decisions:**
- New module is named `package-version.ts` (not `version.ts`) to avoid collision with the existing `src/version.ts` which handles `.joycraft-version` file I/O. Two distinct concerns: reading the CLI's own version vs. reading/writing the project's installed version. Keeping them in separate files prevents future confusion.
- Throw on read failure rather than returning `'0.0.0'`. The existing `getPackageVersion()` in upgrade.ts had a comment "In bundled CLI, __dirname won't help" — but `src/cli.ts:7` proves `__dirname + '..'` does work post-build. The "fallback" was the bug.
- `cli.ts:7` can optionally be refactored to use the new module too (a one-liner change). Including it is a stylistic improvement, not a correctness requirement.

**Rejected alternative:** Inject the version at build-time via a constants file generated by the build script. Rejected — adds build-step complexity for a problem that filesystem reads already solve. The bug isn't that filesystem reads don't work; it's that they were skipped.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `package.json` exists but missing `version` field | Throw with a clear message; never silently default. |
| `package.json` not found at expected path | Throw with the resolved path included in the message. |
| Running tests outside the bundled CLI (i.e., from source) | `__dirname + '..'` resolves to the repo root, where `package.json` does exist — works. |
| Project's `.joycraft-version` file is missing entirely | Out of scope for this spec — handled by existing `readVersion()` returning null. |
| Version string contains pre-release suffixes (`0.5.21-beta.1`) | Pass through unchanged; the npm-registry comparison in cli.ts already handles string equality. |

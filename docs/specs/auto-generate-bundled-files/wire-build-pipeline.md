# Wire Build Pipeline — Atomic Spec

> **Parent Design:** `docs/designs/2026-04-07-auto-generate-bundled-files.md`
> **Status:** Complete
> **Date:** 2026-04-07
> **Estimated scope:** 1 session / 2 files / ~5 lines changed

---

## What
Wire the generator script into the build pipeline so `pnpm build` always regenerates `bundled-files.ts` before tsup runs, and gitignore the generated file so it never appears in diffs.

## Why
Without build wiring, developers must manually run the generator — defeating the purpose. Without gitignoring, every PR still shows 5K-line diffs in a generated file.

## Acceptance Criteria
- [ ] `pnpm build` runs the generator before tsup (generated file is always fresh)
- [ ] `src/bundled-files.ts` is listed in `.gitignore`
- [ ] `pnpm build` succeeds end-to-end (generator + tsup)
- [ ] `pnpm test --run` passes (existing tests still work with the generated file)
- [ ] `pnpm typecheck` passes
- [ ] Consumer imports (`init.ts`, `upgrade.ts`, `init-autofix.ts`) remain unchanged

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Generator runs before tsup | Delete `src/bundled-files.ts`, run `pnpm build`, assert file exists and dist/ is populated | integration (manual) |
| Gitignore entry works | Run `git status` after build — `src/bundled-files.ts` must not appear as untracked/modified | integration (manual) |
| Build output is functional | Run `node dist/cli.js init /tmp/test-project` — must scaffold correctly | smoke (manual) |

**Execution order:**
1. Write the gitignore entry and package.json change
2. Verify `pnpm build` succeeds
3. Verify `pnpm test --run` passes
4. Verify `git status` doesn't show `bundled-files.ts`

**Smoke test:** `pnpm build && ls src/bundled-files.ts && ls dist/cli.js`

**Before implementing, verify your test harness:**
1. Confirm `pnpm build` currently works (baseline)
2. After changes, confirm it still works with the generator in the chain

## Constraints
- MUST: Use chained command format: `"build": "node scripts/generate-bundled-files.mjs && tsup"`
- MUST: Generator runs first so tsup bundles the fresh file
- MUST NOT: Add npm lifecycle hooks (`prebuild`) — use chained command per design decision
- MUST NOT: Change consumer imports

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Modify | `package.json` | `build` script changes to `node scripts/generate-bundled-files.mjs && tsup` |
| Modify | `.gitignore` | Add `src/bundled-files.ts` |

## Approach
Two small edits:
1. In `package.json`, change `"build": "tsup"` to `"build": "node scripts/generate-bundled-files.mjs && tsup"`
2. In `.gitignore`, add `src/bundled-files.ts`

After both edits, run the full build and test suite to confirm nothing breaks.

**Rejected alternative:** `prebuild` lifecycle hook — not a guaranteed npm lifecycle script and adds implicit behavior. Chained command is explicit and obvious.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Generator fails (e.g., missing source dir) | `&&` ensures tsup does NOT run — build fails fast with a clear error |
| `bundled-files.ts` already exists | Generator overwrites it — idempotent by design |
| CI environment with clean checkout | Generator creates the file from scratch before tsup — no pre-existing file needed |

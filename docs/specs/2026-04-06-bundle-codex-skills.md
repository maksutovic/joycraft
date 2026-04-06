# Bundle Codex Skills — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-codex-skills-support.md`
> **Status:** Complete
> **Date:** 2026-04-06
> **Estimated scope:** 1 session / 1 file / ~50 lines

---

## What

Add a `CODEX_SKILLS` export to `src/bundled-files.ts` that embeds the content of all 12 Codex skill files from `src/codex-skills/`, mirroring the existing `SKILLS` export pattern. After this spec, the build produces a `bundled-files.js` that contains both Claude and Codex skills as string constants.

## Why

Without bundling, `init.ts` and `upgrade.ts` cannot access Codex skill content at runtime. The bundle is the bridge between source files and installation logic.

## Acceptance Criteria

- [ ] `CODEX_SKILLS` is exported from `src/bundled-files.ts` as `Record<string, string>`
- [ ] `CODEX_SKILLS` contains exactly 12 entries, one per Codex skill file
- [ ] Keys follow the same `joycraft-*.md` naming pattern as `SKILLS`
- [ ] `pnpm build` succeeds
- [ ] `pnpm test --run` passes
- [ ] `pnpm typecheck` passes

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| `CODEX_SKILLS` exported | Import and check `typeof CODEX_SKILLS === 'object'` | unit |
| 12 entries | `Object.keys(CODEX_SKILLS).length === 12` | unit |
| Keys match pattern | Every key matches `/^joycraft-.*\.md$/` | unit |
| Values are non-empty strings | Every value is a string with length > 0 | unit |

**Execution order:**
1. Write tests — they should fail (CODEX_SKILLS doesn't exist yet)
2. Run tests to confirm red
3. Add `CODEX_SKILLS` to `bundled-files.ts`
4. Run tests to confirm green

**Smoke test:** `pnpm build && node -e "const b = require('./dist/bundled-files.js'); console.log(Object.keys(b.CODEX_SKILLS).length);"` prints `12`.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL
2. Each test imports the actual `CODEX_SKILLS` export
3. Smoke test runs in <2 seconds

## Constraints

- MUST: Follow the exact same pattern as the existing `SKILLS` export
- MUST: Use the same key naming convention (`joycraft-*.md`)
- MUST NOT: Change the existing `SKILLS` or `TEMPLATES` exports
- MUST NOT: Add new dependencies

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/bundled-files.ts` | Add `CODEX_SKILLS` export with embedded Codex skill content |
| Create | `tests/bundled-codex-skills.test.ts` | Unit tests for the `CODEX_SKILLS` export |

## Approach

The existing `SKILLS` export in `bundled-files.ts` is a `Record<string, string>` where each key is a filename (e.g., `"joycraft-tune.md"`) and each value is the full file content as a template literal. Follow this exact pattern:

1. Add `export const CODEX_SKILLS: Record<string, string> = { ... }` after the existing `SKILLS` export
2. Each entry: key is the filename from `src/codex-skills/`, value is the file content as an escaped template literal
3. The build script (if any) that generates `bundled-files.ts` from source files may need updating — check how `SKILLS` content gets into `bundled-files.ts` (it may be manually embedded or build-generated)

**Rejected alternative:** Dynamically reading files at runtime with `fs.readFileSync`. Rejected because the CLI is distributed as a single package — files must be embedded at build time, matching the existing pattern.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Codex skill content contains backticks | Escape properly in template literal (same as existing SKILLS handling) |
| Codex skill content contains `${` | Escape to prevent template literal interpolation |
| A Codex skill file is missing from `src/codex-skills/` | Build/test fails — caught by parity test (Spec 5) |

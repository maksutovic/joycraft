# Add Sync Drift Test — Atomic Spec

> **Parent Design:** `docs/designs/2026-04-07-auto-generate-bundled-files.md`
> **Status:** Complete
> **Date:** 2026-04-07
> **Estimated scope:** 1 session / 1 file / ~40 lines

---

## What
Add a test that validates `src/bundled-files.ts` matches what the generator would produce from the current source files, catching drift when someone edits a source file but forgets to rebuild.

## Why
Without this test, CI can pass with a stale `bundled-files.ts` if the build step is skipped or the file is accidentally committed with outdated content. The test acts as a safety net — especially important since the file is gitignored and must be regenerated.

## Acceptance Criteria
- [ ] A test in `tests/bundled-files-sync.test.ts` reads source dirs, generates expected output, and compares to the current `bundled-files.ts`
- [ ] Test fails when `bundled-files.ts` is stale (modified a source file but didn't regenerate)
- [ ] Test passes after running `node scripts/generate-bundled-files.mjs`
- [ ] Test follows the pattern in `tests/codex-skill-parity.test.ts` (reads source dirs with `readdirSync`)
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Detects stale bundled-files.ts | Manually corrupt one SKILLS entry, run test, assert it fails | integration |
| Passes when in sync | Run generator, then run test, assert it passes | integration |
| Covers all three exports | Test checks SKILLS, TEMPLATES, and CODEX_SKILLS separately | unit |

**Execution order:**
1. Write the sync test — it should pass if `bundled-files.ts` was just generated
2. Verify test catches drift by temporarily modifying a source file
3. Confirm full test suite passes

**Smoke test:** `pnpm test --run tests/bundled-files-sync.test.ts`

**Before implementing, verify your test harness:**
1. After writing the test, manually introduce drift and confirm the test catches it
2. The test reads source files and the generated file — not a reimplementation of the generator
3. The test must run in seconds

## Constraints
- MUST: Read source directories directly (same pattern as `codex-skill-parity.test.ts`)
- MUST: Compare content, not just keys — key match alone doesn't catch stale values
- MUST: Use only Node.js built-ins — no test dependencies beyond vitest
- MUST NOT: Import or execute the generator script — the test independently reads sources and compares
- MUST NOT: Modify any existing test files

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `tests/bundled-files-sync.test.ts` | New test file |

## Approach
The test:
1. Reads `src/claude-skills/*.md` → builds expected SKILLS record
2. Reads `src/codex-skills/*.md` → builds expected CODEX_SKILLS record
3. Walks `src/templates/` → builds expected TEMPLATES record
4. Imports `{ SKILLS, TEMPLATES, CODEX_SKILLS }` from `../src/bundled-files.js`
5. Asserts deep equality between actual and expected for each export

This mirrors what the generator does but is an independent implementation — if the generator has a bug, this test catches it.

**Rejected alternative:** Running the generator in the test and diffing output files — that tests the generator, not the drift. We want to catch cases where the generator is correct but wasn't run.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| New source file added but generator not re-run | Test fails — missing key in bundled output |
| Source file deleted but generator not re-run | Test fails — extra key in bundled output |
| Source content changed but generator not re-run | Test fails — value mismatch |
| Generator and sources in sync | Test passes |

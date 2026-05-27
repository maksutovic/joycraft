# Add Pi Tests — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-26-pi-support/brief.md`
> **Status:** Complete
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / ~4 test files modified/created / ~200 lines

---

## What

A comprehensive test suite for the Pi integration. Includes: a Pi project fixture directory, detection tests, init integration tests, upgrade integration tests for Pi managed files, and content-level tests ensuring Pi skills, scripts, extension, and agent definitions are correctly installed with correct content.

## Why

Without tests, regressions in Pi detection, skill installation, pipeline runtime installation, or upgrade handling go undetected — breaking the Pi pipeline for users on subsequent changes.

## Acceptance Criteria

- [ ] `tests/fixtures/pi-project/` exists with `.pi/` directory and `.pi/settings.json`
- [ ] Init test verifies Pi skills installed to `.pi/skills/` with correct content
- [ ] Init test verifies pipeline scripts installed with executable permissions
- [ ] Init test verifies extension installed to `.pi/extensions/joycraft-pipeline.ts`
- [ ] Init test verifies subagent definitions installed to `.pi/agents/`
- [ ] Init test verifies idempotency (second init skips Pi files without --force)
- [ ] Init test verifies force overwrite works for Pi files
- [ ] Init test verifies AGENTS.md contains no "See CLAUDE.md" cross-reference
- [ ] Detection test verifies Pi is detected when `.pi/` exists
- [ ] Upgrade test verifies Pi managed files are hash-tracked and auto-updated
- [ ] Upgrade test verifies customized Pi files trigger prompt (or auto-accept with --yes)
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Pi fixture exists | Assert `tests/fixtures/pi-project/.pi/settings.json` exists | unit |
| Pi skills after init | Init on temp dir, assert 18 SKILL.md files under `.pi/skills/` | integration |
| Pi script permissions | Init, assert bash scripts have mode `755` | integration |
| Pi extension installed | Init, assert extension file content matches source | integration |
| Pi subagent defs installed | Init, assert both agent `.md` files exist with correct frontmatter | integration |
| Init idempotency | Init twice, assert second run reports Pi files as skipped | integration |
| Init --force | Init --force, assert all Pi files overwritten | integration |
| AGENTS.md no cross-ref | Generate AGENTS.md, assert string does not contain "See CLAUDE.md" | unit |
| Pi detection | Init on pi-project fixture, assert summary contains "Pi" or isPi flag true | integration |
| Pi in version hashes | After init, read `.joycraft-version`, assert `.pi/skills/` paths present | integration |
| Upgrade updates Pi | Init, change PI_SKILLS source, run upgrade, assert Pi files updated | integration |
| Upgrade prompts on customized Pi | Init, modify a Pi skill in-project, run upgrade, assert prompt shown | integration |

**Execution order:**
1. Create `tests/fixtures/pi-project/` with `.pi/` directory and a minimal `.pi/settings.json`
2. Write detection test — init on fixture, verify Pi flag
3. Write init integration tests — init on temp dir, verify all Pi files
4. Write AGENTS.md unit test
5. Write upgrade integration tests
6. Run all — should be red until all prior specs are merged
7. After prior specs land, all tests should be green

**Smoke test:** AGENTS.md cross-reference test — pure function, no I/O, instant.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: Tests use Vitest (existing test framework)
- MUST: Pi fixture is minimal — `.pi/settings.json` with `{}` and nothing else
- MUST: Init tests use `tmpdir()` for isolation (existing pattern from `tests/init.test.ts`)
- MUST: Test assertions use `expect()` from Vitest (existing pattern)
- MUST: Existing tests must still pass — no regressions in Claude or Codex init/upgrade behavior
- MUST NOT: Require Pi to be installed to run tests — tests verify file output, not Pi runtime behavior
- MUST NOT: Add network-requiring tests — everything is local file I/O

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| CREATE | `tests/fixtures/pi-project/.pi/settings.json` | Pi project fixture |
| MODIFY | `tests/init.test.ts` | Add Pi install test cases |
| MODIFY | `tests/upgrade.test.ts` | Add Pi managed files test cases |
| CREATE | `tests/pi-detection.test.ts` | Pi detection test (or add to detect.test.ts) |
| MODIFY | `tests/agents-md.test.ts` | Add cross-reference removal test (or create if not exists) |

## Approach

### Fixture

```
tests/fixtures/pi-project/
└── .pi/
    └── settings.json    → {}
```

### Detection test

```typescript
it('detects Pi when .pi/ directory exists', async () => {
  const dir = join(fixturesDir, 'pi-project');
  // Init should show Pi in output or set an internal flag
  // Test captures stdout and asserts "Detected agent: Pi"
});
```

### Init integration test

Pattern from existing `tests/init.test.ts`:
```typescript
it('installs Pi skills, scripts, extension, and subagent defs', async () => {
  const tmp = tmpdir();
  await init(tmp, { force: false });
  
  // Skills
  expect(existsSync(join(tmp, '.pi', 'skills', 'joycraft-tune', 'SKILL.md'))).toBe(true);
  
  // Scripts
  expect(existsSync(join(tmp, '.pi', 'scripts', 'joycraft', 'joycraft-next-spec'))).toBe(true);
  const mode = statSync(join(tmp, '.pi', 'scripts', 'joycraft', 'joycraft-next-spec')).mode;
  expect(mode & 0o111).not.toBe(0); // executable
  
  // Extension
  expect(existsSync(join(tmp, '.pi', 'extensions', 'joycraft-pipeline.ts'))).toBe(true);
  
  // Subagent defs
  expect(existsSync(join(tmp, '.pi', 'agents', 'joycraft-researcher.md'))).toBe(true);
  expect(existsSync(join(tmp, '.pi', 'agents', 'joycraft-verifier.md'))).toBe(true);
});
```

### Upgrade test

Pattern from existing upgrade tests — init with old content, run upgrade with new, verify Pi files updated.

**Rejected alternative:** Pi-specific test file for everything. Better to extend existing test files (`init.test.ts`, `upgrade.test.ts`) to keep tests co-located with the features they test. Only create a new file for the Pi-specific content checks that don't fit elsewhere.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Test runs on a system without Pi installed | Tests pass — they only check file output, not Pi execution |
| Pi fixture is empty (no `.pi/` subdirectories besides settings.json) | Init creates all subdirectories — `.pi/skills/`, `.pi/scripts/`, `.pi/extensions/`, `.pi/agents/` |
| Temp dir cleanup fails | Vitest handles tmpdir cleanup; no action needed |
| Existing init tests break from PI_SKILLS import | PI_SKILLS is always exported after build — existing tests import from bundled-files.ts which is regenerated |
| AGENTS.md test file doesn't exist yet | Create it as part of this spec |

# Init Codex Skills — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-codex-skills-support.md`
> **Status:** Complete
> **Date:** 2026-04-06
> **Estimated scope:** 1 session / 2 files / ~40 lines

---

## What

Update `init.ts` to copy Codex skills from `CODEX_SKILLS` to `.agents/skills/<name>/SKILL.md` in the target directory, using the same additive/force behavior as Claude skills. After this spec, `npx joycraft init` produces both `.claude/skills/` and `.agents/skills/` directories.

## Why

Without init support, Codex users don't get skills installed. This is the core delivery mechanism for the feature.

## Acceptance Criteria

- [ ] `init()` creates `.agents/skills/<name>/SKILL.md` for all 12 Codex skills
- [ ] Existing non-Joycraft content in `.agents/skills/` is preserved (not overwritten or deleted)
- [ ] With `--force`, existing Joycraft Codex skills are overwritten
- [ ] Without `--force`, existing Joycraft Codex skills are skipped
- [ ] `.joycraft-version` includes hashes for `.agents/skills/` files
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| 12 Codex skills created | Run `init()` on empty dir, check all 12 `.agents/skills/*/SKILL.md` exist | integration |
| Content matches bundled | Compare file content with `CODEX_SKILLS` values | integration |
| Non-Joycraft preserved | Create `.agents/skills/my-custom/SKILL.md` before init, verify it still exists after | integration |
| Force overwrites | Modify a Codex skill, run init with `force: true`, verify content reset | integration |
| No-force skips | Modify a Codex skill, run init with `force: false`, verify content preserved | integration |
| Version hashes include Codex | Read `.joycraft-version`, check for `.agents/skills/` paths in `files` | integration |

**Execution order:**
1. Write integration tests — they should fail (init doesn't write Codex skills yet)
2. Run tests to confirm red
3. Update `init.ts` to import `CODEX_SKILLS` and write to `.agents/skills/`
4. Update hash tracking to include Codex skill paths
5. Run tests to confirm green

**Smoke test:** `pnpm build && node dist/cli.js init /tmp/test-codex && ls /tmp/test-codex/.agents/skills/` lists 12 directories.

**Before implementing, verify your test harness:**
1. Run all tests — new Codex tests must FAIL
2. Each test calls the actual `init()` function
3. Smoke test runs in <3 seconds

## Constraints

- MUST: Use the same directory-per-skill structure (`.agents/skills/<name>/SKILL.md`)
- MUST: Always output both `.claude/skills/` and `.agents/skills/` — no flags, no detection
- MUST: Preserve existing non-Joycraft skills in `.agents/skills/`
- MUST: Track Codex skill hashes in `.joycraft-version`
- MUST NOT: Add any new CLI flags or modes
- MUST NOT: Change existing Claude skill installation behavior

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/init.ts` | Import `CODEX_SKILLS`, add loop to write `.agents/skills/<name>/SKILL.md`, add Codex hashes to version tracking |
| Modify | `tests/init.test.ts` | Add integration tests for Codex skill installation |

## Approach

Mirror the existing Claude skill installation logic in `init.ts` (lines 91-96):

```typescript
// Existing Claude pattern:
for (const [filename, content] of Object.entries(SKILLS)) {
  const skillName = filename.replace(/\.md$/, '');
  const skillDir = join(skillsDir, skillName);
  ensureDir(skillDir);
  writeFile(join(skillDir, 'SKILL.md'), content, opts.force, result);
}
```

Add an equivalent block for Codex:

1. Import `CODEX_SKILLS` from `bundled-files.js`
2. Define `codexSkillsDir = join(targetDir, '.agents', 'skills')`
3. Scan for existing non-Joycraft skills (same pattern as `.claude/skills/` scan on lines 74-88)
4. Loop over `CODEX_SKILLS`, write each to `.agents/skills/<name>/SKILL.md`
5. In the hash tracking section (lines 129-136), add entries for `.agents/skills/` paths

**Rejected alternative:** A separate `--codex` flag to opt into Codex skills. Rejected per brief constraint — always output both, no flags.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `.agents/` directory doesn't exist | Create it (ensureDir handles this) |
| `.agents/skills/` has non-Joycraft skills | Preserve them — only write `joycraft-*` directories |
| `.agents/skills/joycraft-tune/SKILL.md` already exists (no --force) | Skip — don't overwrite |
| `.agents/skills/joycraft-tune/SKILL.md` already exists (--force) | Overwrite with bundled content |
| Target dir has `.agents/` but not `.agents/skills/` | Create `.agents/skills/` |

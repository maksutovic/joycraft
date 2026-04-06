# Upgrade Codex Skills — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-codex-skills-support.md`
> **Status:** Complete
> **Date:** 2026-04-06
> **Estimated scope:** 1 session / 2 files / ~30 lines

---

## What

Update `upgrade.ts` to include Codex skills in the managed files set, so `npx joycraft upgrade` detects, diffs, and updates `.agents/skills/` files alongside `.claude/skills/` files. The existing upgrade logic (new/updated/customized detection, user prompting) applies to Codex skills without any behavioral changes.

## Why

Without upgrade support, Codex skills installed by a previous `init` will never be updated when the user upgrades Joycraft. Skills would drift out of sync with the latest version.

## Acceptance Criteria

- [ ] `getManagedFiles()` returns entries for both `.claude/skills/` and `.agents/skills/` paths
- [ ] New Codex skills (added in a newer Joycraft version) are auto-installed during upgrade
- [ ] Modified Codex skills (user hasn't customized) are auto-updated
- [ ] Customized Codex skills prompt the user before overwriting (or auto-overwrite with `--yes`)
- [ ] `.joycraft-version` hashes include `.agents/skills/` paths after upgrade
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Managed files include Codex | Call `getManagedFiles()` (or test via upgrade behavior), verify `.agents/skills/` paths present | unit |
| New Codex skill auto-installed | Set up a project missing one Codex skill, run upgrade, verify it appears | integration |
| Unmodified Codex skill updated | Set up project with old Codex skill content + matching hash, run upgrade, verify content updated | integration |
| Customized skill prompts | Set up project with modified Codex skill (hash mismatch), verify it's flagged as customized | integration |
| Version hashes updated | After upgrade, read `.joycraft-version` and check `.agents/skills/` entries | integration |

**Execution order:**
1. Write tests — they should fail (upgrade doesn't know about Codex skills yet)
2. Run tests to confirm red
3. Update `getManagedFiles()` in `upgrade.ts` to include Codex skills
4. Run tests to confirm green

**Smoke test:** Run upgrade on a test project and verify `.agents/skills/` entries appear in `.joycraft-version`.

**Before implementing, verify your test harness:**
1. Run all tests — new Codex upgrade tests must FAIL
2. Each test calls the actual `upgrade()` function or `getManagedFiles()`
3. Smoke test runs in <3 seconds

## Constraints

- MUST: Use the same upgrade logic (new/updated/customized) for Codex skills as Claude skills
- MUST: Track Codex skill hashes in `.joycraft-version`
- MUST NOT: Change existing upgrade behavior for Claude skills or templates
- MUST NOT: Add new CLI flags

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/upgrade.ts` | Import `CODEX_SKILLS`, add Codex entries to `getManagedFiles()` |
| Modify | `tests/upgrade.test.ts` | Add tests for Codex skill upgrade behavior |

## Approach

The change is minimal. In `getManagedFiles()` (upgrade.ts lines 18-28), add a loop for Codex skills after the existing SKILLS loop:

```typescript
for (const [name, content] of Object.entries(CODEX_SKILLS)) {
  const skillName = name.replace(/\.md$/, '');
  files[join('.agents', 'skills', skillName, 'SKILL.md')] = content;
}
```

That's it. The rest of the upgrade logic (hash comparison, new/updated/customized detection, user prompting, version file writing) operates on the `managedFiles` map generically — no changes needed.

**Rejected alternative:** Separate upgrade logic for Codex skills. Rejected because the existing upgrade logic is already generic over managed files — adding entries to `getManagedFiles()` is sufficient.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Project was init'd before Codex support existed | All 12 Codex skills show as "new" and are auto-installed |
| User deleted `.agents/skills/` entirely | Skills show as "new" and are recreated |
| User customized a Codex skill | Flagged as "customized", user prompted (or auto-overwritten with `--yes`) |
| `.joycraft-version` has no `.agents/skills/` hashes (old format) | Treated as no original hash — files flagged as customized if they differ |

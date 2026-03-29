# Register Bug Fix Skill in Init — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-26-bugfix-workflow-skill.md`
> **Status:** Complete
> **Date:** 2026-03-26
> **Estimated scope:** 1 session / 2-3 files / ~20 lines

---

## What

Wire `joycraft-bugfix.md` into the Joycraft init scaffolding so that `npx joycraft init` copies it to `.claude/skills/joycraft-bugfix.md` in the target project, alongside the existing skills.

## Why

Without this, the skill only exists in the Joycraft source repo. Users won't get it when they run `npx joycraft init` on their projects.

## Acceptance Criteria

- [ ] `npx joycraft init /tmp/test-project` copies `joycraft-bugfix.md` to `/tmp/test-project/.claude/skills/joycraft-bugfix.md`
- [ ] The skill file content matches the source in `src/skills/joycraft-bugfix.md`
- [ ] Existing skills are still copied (no regressions)
- [ ] `npx joycraft init` without `--force` skips the file if it already exists (same behavior as other skills)
- [ ] Build passes
- [ ] All tests pass (`pnpm test --run`)
- [ ] Typecheck passes

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Skill is copied during init | Run init on a temp dir, assert `.claude/skills/joycraft-bugfix.md` exists | integration |
| Content matches source | Compare content of copied file to `src/skills/joycraft-bugfix.md` | integration |
| Existing skills still copied | Run init on a temp dir, assert all pre-existing skills are present | integration |
| Skip without --force | Run init twice on same dir, assert second run reports skip (not overwrite) | integration |
| Build passes | `pnpm build` | build |
| Tests pass | `pnpm test --run` | meta |

**Execution order:**
1. Check how existing skills are registered (likely in `src/bundled-files.ts` or `src/init.ts`)
2. Write the integration test — it should fail because the skill isn't registered yet
3. Run test to confirm red
4. Add the skill to the registration
5. Run tests to confirm green

**Smoke test:** The "Skill is copied during init" integration test.

## Constraints

- MUST: Follow the same registration pattern as existing skills (check `src/bundled-files.ts` or equivalent)
- MUST: Respect the `--force` / skip behavior for existing files
- MUST NOT: Change the behavior of any existing skill installation

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/bundled-files.ts` (or equivalent) | Add `joycraft-bugfix.md` to the skill registry |
| Modify | `tests/init.test.ts` (or equivalent) | Add test for the new skill being copied |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User already has a custom `joycraft-bugfix.md` in `.claude/skills/` | Skip without `--force`, overwrite with `--force` (same as other skills) |
| Upgrade from older Joycraft version | `npx joycraft upgrade` should also pick up the new skill (verify upgrade path handles new skills) |

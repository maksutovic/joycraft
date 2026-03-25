# Namespace Skills with `joycraft-` Prefix — Atomic Spec

> **Parent:** docs/research/contextual-stewardship-evals.md (Phase 1)
> **Status:** Ready
> **Date:** 2026-03-24
> **Estimated scope:** 1 session / 8 files / ~50 lines changed

---

## What

Rename all 5 Joycraft skills from bare names to `joycraft-` prefixed names so they're clearly distinguishable from other skills in a project.

## Why

Praful's feedback: bare skill names (`/tune`, `/interview`) get lost in a sea of other skills. Prefixing with `joycraft-` makes it immediately obvious these are Joycraft skills. The colon namespace (`joycraft:tune`) is reserved for the future plugin migration.

## Acceptance Criteria

- [ ] `tune.md` → `joycraft-tune.md` (frontmatter `name: joycraft-tune`)
- [ ] `interview.md` → `joycraft-interview.md`
- [ ] `new-feature.md` → `joycraft-new-feature.md`
- [ ] `decompose.md` → `joycraft-decompose.md`
- [ ] `session-end.md` → `joycraft-session-end.md`
- [ ] Init installs to `.claude/skills/joycraft-tune/SKILL.md` etc.
- [ ] Upgrade detects old names and migrates (backwards compat)
- [ ] All cross-references updated in skill files
- [ ] improve-claude-md.ts "Getting Started" section uses new names
- [ ] README updated
- [ ] Tests updated
- [ ] bundled-files.ts regenerated
- [ ] Build passes, tests pass

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Rename | `src/skills/tune.md` → `src/skills/joycraft-tune.md` | Filename + frontmatter name |
| Rename | `src/skills/interview.md` → `src/skills/joycraft-interview.md` | Same |
| Rename | `src/skills/new-feature.md` → `src/skills/joycraft-new-feature.md` | Same |
| Rename | `src/skills/decompose.md` → `src/skills/joycraft-decompose.md` | Same |
| Rename | `src/skills/session-end.md` → `src/skills/joycraft-session-end.md` | Same |
| Modify | `src/init.ts` | Skill paths |
| Modify | `src/upgrade.ts` | Skill detection paths, backwards compat |
| Modify | `src/improve-claude-md.ts` | Skill names in generated sections |
| Modify | `src/bundled-files.ts` | Regenerate |
| Modify | `tests/init.test.ts` | Skill path assertions |
| Modify | `tests/upgrade.test.ts` | Skill references |
| Modify | `README.md` | Skill names |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Project has old skill names (tune, joy, joysmith) | Upgrade detects and offers to rename |
| Project has user skills with joycraft- prefix | Don't touch — only manage known Joycraft skills |

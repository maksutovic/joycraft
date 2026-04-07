# Rename Skills Directory — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-readme-and-workflow-improvements.md`
> **Status:** Ready
> **Date:** 2026-04-06
> **Estimated scope:** 1 session / ~8 files / ~20 lines changed

---

## What

Rename `src/skills/` to `src/claude-skills/` so it parallels `src/codex-skills/`. Update all references to the old path across the codebase: the bundled-files regeneration script in CONTRIBUTING.md, CLAUDE.md architecture docs, CONTRIBUTING.md skill directory references, and any specs/briefs that reference the old path.

## Why

Having `src/skills/` alongside `src/codex-skills/` is confusing — it's unclear that `skills/` means "Claude skills." Renaming to `src/claude-skills/` makes the purpose of each directory immediately obvious to contributors.

## Acceptance Criteria

- [ ] `src/skills/` is renamed to `src/claude-skills/`
- [ ] `src/bundled-files.ts` regeneration script in CONTRIBUTING.md references `src/claude-skills/` instead of `src/skills/`
- [ ] CLAUDE.md architecture section references `src/claude-skills/`
- [ ] CONTRIBUTING.md skill development references updated
- [ ] `tests/codex-skill-parity.test.ts` line 5: `SKILLS_DIR` path updated to `src/claude-skills/`
- [ ] `src/bundled-files.ts` is regenerated with the new path (run the regeneration script)
- [ ] All existing skill files are present in `src/claude-skills/` (same files, new directory)
- [ ] `pnpm test --run && pnpm typecheck` passes
- [ ] `pnpm build` passes

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Directory renamed | `ls src/claude-skills/` returns all 12 skill files | integration |
| Old directory gone | `ls src/skills/` fails (directory doesn't exist) | integration |
| bundled-files regenerated | `pnpm build` succeeds | integration |
| Tests pass | `pnpm test --run` passes | integration |
| Typecheck passes | `pnpm typecheck` passes | integration |

**Smoke test:** `pnpm build` — if bundled-files references break, build fails immediately.

## Constraints

- MUST: Rename the directory, not copy (avoid leaving the old directory behind)
- MUST: Regenerate `src/bundled-files.ts` after rename
- MUST: Update CLAUDE.md and CONTRIBUTING.md references
- MUST NOT: Change any skill file content — this is a path-only change
- MUST NOT: Change `src/codex-skills/` or `templates/claude-kit/skills/` in this spec

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Rename | `src/skills/` → `src/claude-skills/` | Directory rename |
| Modify | `CONTRIBUTING.md` | Lines 48, 83, 93, 99: `src/skills/` → `src/claude-skills/` |
| Modify | `CLAUDE.md` | Architecture section: `src/skills/` → `src/claude-skills/` in the tree and Key Files table |
| Modify | `tests/codex-skill-parity.test.ts` | Line 5: `SKILLS_DIR` path from `'src', 'skills'` → `'src', 'claude-skills'` |
| Regenerate | `src/bundled-files.ts` | Regenerate using the updated script path |

## Approach

1. `git mv src/skills src/claude-skills` — preserves git history
2. Update CONTRIBUTING.md regeneration script and references (4 occurrences)
3. Update CLAUDE.md architecture tree and Key Files table
4. Update `tests/codex-skill-parity.test.ts` line 5: `SKILLS_DIR` path
5. Run the regeneration script to rebuild `src/bundled-files.ts`
6. Run `pnpm test --run && pnpm typecheck && pnpm build` to verify

**Alternative rejected:** Creating a symlink `src/skills → src/claude-skills` for backwards compatibility. Rejected because there are no external consumers of this path — it's an internal source directory.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Docs/specs reference `src/skills/` | Update references in docs that are part of this feature brief; older specs are historical and don't need updating |
| Git history for skill files | `git mv` preserves rename tracking |
| bundled-files.ts has hardcoded paths | The regeneration script reads from the directory — regenerating after rename picks up the new path |

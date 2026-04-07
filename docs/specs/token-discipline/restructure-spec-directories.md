# Restructure Spec Directories — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-token-discipline.md`
> **Status:** Complete
> **Date:** 2026-04-06
> **Estimated scope:** 1 session / ~15 files / mechanical find-replace

---

## What

Change the spec output convention from a flat `docs/specs/YYYY-MM-DD-spec-name.md` structure to feature-grouped subdirectories: `docs/specs/<feature-name>/spec-name.md`. Update all skills, templates, and bundled files that reference the old convention. Drop the date prefix from spec filenames (the brief and git history provide dating).

## Why

After `/clear`, users land in a fresh session with no memory of what specs exist. A flat directory with 20+ files from multiple features is hard to navigate. Feature-grouped subdirectories let users pass `@docs/specs/<feature>/` as context and let agents discover related specs without reading every file.

## Acceptance Criteria

- [ ] All skills that generate specs use the new path convention: `docs/specs/<feature-name>/spec-name.md`
- [ ] Spec filenames no longer include date prefix (brief has the date, git has the history)
- [ ] The feature-name is derived from the brief filename (minus the date prefix and `.md`)
- [ ] Skills that scan `docs/specs/` (verify, session-end, tune) handle subdirectories
- [ ] `ATOMIC_SPEC_TEMPLATE.md` updated with new naming convention
- [ ] Changes applied to: `src/claude-skills/`, `src/codex-skills/`, `templates/claude-kit/skills/`, `templates/ATOMIC_SPEC_TEMPLATE.md`
- [ ] `bundled-files.ts` updated to reflect all skill changes
- [ ] Level 5 workflow references (`docs/specs/*.md` glob, CI paths) updated to `docs/specs/**/*.md`
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| New path convention in all skills | Grep for old `YYYY-MM-DD-spec-name.md` pattern — should be gone | manual |
| Subdirectory handling in verify/session-end/tune | Read skills, confirm they glob `docs/specs/` recursively | manual |
| Template updated | Read ATOMIC_SPEC_TEMPLATE.md | manual |
| CI glob updated | Grep for `docs/specs/*.md` (non-recursive) — should be `docs/specs/**/*.md` | manual |
| Build passes | `pnpm build` | build |
| No regressions | `pnpm test --run` | unit |

**Execution order:**
1. Update `src/claude-skills/` files that reference spec paths
2. Update `src/codex-skills/` files with same changes
3. Update `templates/claude-kit/skills/` files
4. Update `templates/ATOMIC_SPEC_TEMPLATE.md`
5. Update `src/bundled-files.ts` to match
6. Run build and tests

**Smoke test:** `pnpm build && pnpm test --run`

## Constraints

- MUST: Feature-name derived from brief filename (e.g., `2026-04-06-token-discipline.md` → `token-discipline/`)
- MUST: Spec filenames are `verb-object.md` (no date prefix)
- MUST: Skills that scan specs must use recursive glob (`docs/specs/**/*.md`)
- MUST: Preserve `Parent Brief` field in spec template — it still links back to the brief
- MUST NOT: Move or rename existing specs in other projects — this only changes the generation convention
- MUST NOT: Change brief directory structure — briefs stay flat with date prefixes

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `src/claude-skills/joycraft-new-feature.md` | Spec path convention |
| Edit | `src/claude-skills/joycraft-decompose.md` | Spec path convention |
| Edit | `src/claude-skills/joycraft-bugfix.md` | Spec path convention |
| Edit | `src/claude-skills/joycraft-session-end.md` | Recursive spec scanning |
| Edit | `src/claude-skills/joycraft-verify.md` | Recursive spec scanning |
| Edit | `src/claude-skills/joycraft-tune.md` | Recursive spec reference |
| Edit | `src/claude-skills/joycraft-implement-level5.md` | CI glob pattern |
| Edit | `src/codex-skills/joycraft-new-feature.md` | Same as Claude Code |
| Edit | `src/codex-skills/joycraft-decompose.md` | Same |
| Edit | `src/codex-skills/joycraft-bugfix.md` | Same |
| Edit | `src/codex-skills/joycraft-session-end.md` | Same |
| Edit | `src/codex-skills/joycraft-verify.md` | Same |
| Edit | `src/codex-skills/joycraft-tune.md` | Same |
| Edit | `src/codex-skills/joycraft-implement-level5.md` | Same |
| Edit | `templates/claude-kit/skills/new-feature.md` | Spec path convention |
| Edit | `templates/claude-kit/skills/decompose.md` | Spec path convention |
| Edit | `templates/claude-kit/skills/session-end.md` | Recursive spec scanning |
| Edit | `templates/ATOMIC_SPEC_TEMPLATE.md` | Naming convention |
| Edit | `src/bundled-files.ts` | All inlined skill content |

## Approach

Mechanical find-replace across all skill files:

1. `docs/specs/YYYY-MM-DD-spec-name.md` → `docs/specs/<feature-name>/spec-name.md`
2. `docs/specs/*.md` (non-recursive globs) → `docs/specs/**/*.md`
3. Skills that generate specs: add a step to create the subdirectory (`docs/specs/<feature-name>/`)
4. Skills that scan specs: change from reading `docs/specs/` flat to recursive scan

The feature-name derivation rule: take the brief filename, strip the date prefix and `.md`. Example: `docs/briefs/2026-04-06-token-discipline.md` → subdirectory name `token-discipline`.

**Rejected alternative:** Using the date as part of the subdirectory name (`docs/specs/2026-04-06-token-discipline/`). This preserves chronology but adds noise — the brief already has the date and `git log` provides history.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No brief exists (standalone decompose) | Use a user-provided or inferred feature name for the subdirectory |
| Feature name has spaces or special chars | Slugify to kebab-case |
| Existing flat specs in a user's project | Don't migrate — only new specs use subdirectories. Old flat specs still work. |
| Verify/session-end with mixed flat + subdirectory specs | Recursive glob catches both |

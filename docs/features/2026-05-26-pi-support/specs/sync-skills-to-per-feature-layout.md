# Sync All Skills to Per-Feature Layout — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-26-pi-support/brief.md`
> **Status:** Complete
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / ~5 files modified / ~60 lines

---

## What

All skill source files (Claude and Codex variants) are audited and corrected so every path reference uses the post-migration per-feature layout (`docs/features/<slug>/`) instead of the old flat layout (`docs/briefs/`, `docs/research/`, `docs/designs/`). The installed skill copies in `.agents/skills/` and `.claude/skills/` are regenerated. The orphaned `docs/research/2026-05-26-pi-support.md` is moved into the feature directory.

## Why

The Codex skill variants were never updated for the migration from flat layout to per-feature layout. The installed `.agents/skills/` copies are catastrophically stale — agents reading them get directed to non-existent paths. Pi skills (spec 1) will be derived from these broken Codex sources, propagating the errors.

## Acceptance Criteria

- [ ] `src/codex-skills/joycraft-interview.md` references `docs/features/<slug>/brief.md` not `docs/briefs/`
- [ ] `src/codex-skills/joycraft-design.md` references `docs/features/<slug>/design.md` not `docs/designs/`
- [ ] `src/codex-skills/joycraft-research.md` references `docs/features/<slug>/research.md` not `docs/research/`
- [ ] `src/codex-skills/joycraft-new-feature.md` references `docs/features/<slug>/` not `docs/briefs/` (verify)
- [ ] `src/codex-skills/joycraft-decompose.md` references `docs/features/<slug>/specs/` not `docs/specs/` (verify)
- [ ] `src/claude-skills/joycraft-collaborative-setup.md` uses `docs/features/<slug>/` not `docs/briefs/`, `docs/designs/`, `docs/research/`
- [ ] `src/codex-skills/joycraft-collaborative-setup.md` uses `docs/features/<slug>/` (sync with Claude variant)
- [ ] `src/codex-skills/joycraft-session-end.md` supports scanning `docs/features/<slug>/specs/` (sync with Claude variant)
- [ ] `docs/research/2026-05-26-pi-support.md` moved to `docs/features/2026-05-26-pi-support/research.md`
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test`)
- [ ] After rebuild, installed `.agents/skills/` files use correct new layout paths

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Codex interview uses feature layout | Grep for `docs/briefs/` in file — assert zero matches | unit |
| Codex design uses feature layout | Grep for `docs/briefs/\|docs/designs/` — assert zero matches | unit |
| Codex research uses feature layout | Grep for `docs/research/` — assert zero matches | unit |
| Codex new-feature uses feature layout | Grep for `docs/briefs/` — assert zero matches | unit |
| Codex decompose uses feature layout | Grep for `docs/specs/<feature-name>/` (spec creation, not bugfix refs) — assert zero matches | unit |
| Claude collaborative-setup uses feature layout | Grep for `docs/briefs/\|docs/designs/\|docs/research/` — assert zero matches | unit |
| Codex collaborative-setup matches Claude | Diff Claude vs Codex collaborative-setup, assert path references are identical | unit |
| Codex session-end scans features/ | Assert file references `docs/features/` for spec scanning | unit |
| Research file moved | Assert file exists at `docs/features/2026-05-26-pi-support/research.md` and old path is gone | unit |
| Installed Codex skills regenerate | Build, then check `.agents/skills/joycraft-interview/SKILL.md` for `docs/features/` | integration |

**Execution order:**
1. Write grep-based tests — they fail against current files
2. Fix each source file (codex-interview, codex-design, codex-research, claude-collaborative-setup, codex-collaborative-setup, codex-session-end)
3. Move research file
4. Run `pnpm build` to regenerate bundled-files and installed skills
5. Run grep tests again — all green

**Smoke test:** Grep for `docs/briefs/` across all source skills — instant, no build required.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: Codex skills must be functionally identical to their Claude counterparts for path references — sync, don't rewrite
- MUST: `docs/specs/` references that are intentional (bugfix/area-level work) must NOT be changed — only stale flat-layout references to briefs/research/designs
- MUST: `docs/specs/` references for spec creation in decompose/new-feature must point to `docs/features/<slug>/specs/`
- MUST: The `joycraft-implement` and `joycraft-verify` skills intentionally keep `docs/specs/` for backward compat with bugfix specs — do not change
- MUST NOT: Change any Claude skill that is already correct
- MUST NOT: Change skill behavior — only path references

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| MODIFY | `src/codex-skills/joycraft-interview.md` | `docs/briefs/` → `docs/features/<slug>/brief.md` throughout |
| MODIFY | `src/codex-skills/joycraft-design.md` | `docs/briefs/` → `docs/features/<slug>/brief.md`, `docs/designs/` → `docs/features/<slug>/design.md` |
| MODIFY | `src/codex-skills/joycraft-research.md` | `docs/research/` → `docs/features/<slug>/research.md`, add subagent pattern |
| MODIFY | `src/claude-skills/joycraft-collaborative-setup.md` | `docs/briefs/`, `docs/research/`, `docs/designs/` → `docs/features/<slug>/` |
| MODIFY | `src/codex-skills/joycraft-collaborative-setup.md` | Sync paths with Claude variant |
| MODIFY | `src/codex-skills/joycraft-session-end.md` | Add `docs/features/<slug>/specs/` scanning support |
| RENAME | `docs/research/2026-05-26-pi-support.md` → `docs/features/2026-05-26-pi-support/research.md` | Move to feature directory |
| AUTO | `src/bundled-files.ts` | Regenerated after build |
| AUTO | `.agents/skills/*/SKILL.md` | Regenerated after build |
| AUTO | `.claude/skills/*/SKILL.md` | Regenerated after build |

## Approach

For each stale Codex source file, diff against its Claude counterpart. The Claude variant is the authority — copy path references verbatim, adapting only the invocation syntax (`/joycraft-` → `$joycraft-`).

### Specific changes per file:

**`src/codex-skills/joycraft-interview.md`:**
- Line ~39: `docs/briefs/` → `docs/features/<slug>/brief.md`
- Line ~81: `docs/briefs/` → `docs/features/<slug>/brief.md`
- Match Claude variant's paths exactly

**`src/codex-skills/joycraft-design.md`:**
- Line ~10: `docs/briefs/` → `docs/features/<slug>/brief.md`
- Line ~33: `docs/designs/` → `docs/features/<slug>/design.md`
- Line ~56: `docs/designs/` → `docs/features/<slug>/design.md`

**`src/codex-skills/joycraft-research.md`:**
- Line ~22: `docs/research/` → `docs/features/<slug>/`
- Line ~63: `docs/research/` → `docs/features/<slug>/research.md`
- Line ~67: `docs/research/` → `docs/features/<slug>/research.md`

**`src/claude-skills/joycraft-collaborative-setup.md`:**
- Lines ~30-33: All `docs/briefs/`, `docs/research/`, `docs/designs/` → `docs/features/<slug>/`

**`src/codex-skills/joycraft-collaborative-setup.md`:**
- Same as Claude variant, plus invocation syntax adaptation

**`src/codex-skills/joycraft-session-end.md`:**
- Add `docs/features/<slug>/specs/` to spec scanning logic (match Claude variant)

**Rejected alternative:** Fix only installed files. Patches the symptom, not the cause. Source files are what get bundled and shipped — they must be correct.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Codex skill has `docs/specs/` used for bugfix specs | Keep — intentional for area-level bugfix work |
| Claude skill references `docs/specs/<feature-or-area>/` for bugfix | Keep — intentional |
| A skill references both old and new paths | Replace old, keep new, ensure no duplicates |
| Research file already exists in feature directory | Skip move, delete old location only if content matches |
| Build produces different hashes than expected | Expected — content changed, hashes update |

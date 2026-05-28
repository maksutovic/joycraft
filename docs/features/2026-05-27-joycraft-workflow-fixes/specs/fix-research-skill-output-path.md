# Fix Research Skill Output Path — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-joycraft-workflow-fixes/brief.md`
> **Status:** Complete
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 4 files / ~15 lines

---

## What

Add a fallback path to the research skill: when a feature brief exists at `docs/features/<slug>/brief.md`, write to the per-feature layout (`docs/features/<slug>/research.md`). When no brief exists, fall back to the flat layout (`docs/research/YYYY-MM-DD-feature-name.md`). The per-feature path is already the primary output in all three skill variants — only the fallback logic is missing.

## Why

The research skill currently assumes a feature slug always exists (Phase 1 says "Derive a slug YYYY-MM-DD-<feature-name>"). But the skill can also be invoked without a brief — the user can provide an inline description. In that case, there's no `docs/features/<slug>/` folder and the skill should fall back gracefully to the flat layout instead of failing or creating orphaned feature folders.

## Acceptance Criteria
- [ ] Pi research skill has fallback logic: per-feature path when brief exists, flat path otherwise
- [ ] Claude research skill has same fallback logic
- [ ] Codex research skill has same fallback logic
- [ ] Per-feature path is `docs/features/<slug>/research.md` (unchanged primary)
- [ ] Fallback path is `docs/research/YYYY-MM-DD-feature-name.md`
- [ ] Regenerated `src/bundled-files.ts` contains updated skill content
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test`)
- [ ] Typecheck passes (`pnpm typecheck`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Pi research has fallback | grep pi research for "docs/research/" as fallback path | unit |
| Claude research has fallback | grep Claude research for "docs/research/" as fallback path | unit |
| Codex research has fallback | grep Codex research for "docs/research/" as fallback path | unit |
| Primary path unchanged | grep all variants for "docs/features/<slug>/research.md" as primary | unit |

**Execution order:**
1. Write tests that grep source skill files for fallback path mention — they must FAIL
2. Add fallback logic to `src/pi-skills/joycraft-research.md` Phase 3
3. Add fallback logic to `src/claude-skills/joycraft-research.md` Phase 3
4. Add fallback logic to `src/codex-skills/joycraft-research.md` Phase 3
5. Regenerate `src/bundled-files.ts`
6. Run tests — all green

**Smoke test:** Grep any research skill source for "fallback" or "docs/research/" — instant pass/fail.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, fallback already exists)
2. Tests grep actual source skill files (not bundled-files.ts)
3. Smoke test runs in milliseconds

## Constraints
- MUST: Primary output path is `docs/features/<slug>/research.md` — do NOT change this
- MUST: Fallback path is `docs/research/YYYY-MM-DD-feature-name.md` — match existing convention
- MUST: Lazy-create the output directory regardless of which path is used
- MUST: Propagate changes to Pi, Claude, AND Codex skill variants
- MUST NOT: Remove the per-feature path as the primary output
- MUST NOT: Change the output file format or content

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| EDIT | `src/pi-skills/joycraft-research.md` | Add fallback path logic to Phase 1 (slug derivation) |
| EDIT | `src/claude-skills/joycraft-research.md` | Add fallback path logic to Phase 1 (slug derivation) |
| EDIT | `src/codex-skills/joycraft-research.md` | Add fallback path logic to Phase 1 (slug derivation) |
| REGENERATE | `src/bundled-files.ts` | Updated skill content embedded |

## Approach

Add to Phase 1 of each research skill, after deriving the slug, before writing questions:

```markdown
**Output path:**
- If a brief exists at `docs/features/<slug>/brief.md`, write to `docs/features/<slug>/research.md` (per-feature layout).
- If no brief exists (inline description only), write to `docs/research/YYYY-MM-DD-feature-name.md` (flat layout).
```

And adjust Phase 3 to use the resolved path:

```markdown
Write the subagent's response to the resolved output path (per-feature or flat, as determined in Phase 1).
```

**Rejected alternative:** Always writing to per-feature layout, creating a folder even without a brief. This creates orphaned feature folders with no brief — confusing for users browsing `docs/features/`.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Brief exists at `docs/features/<slug>/brief.md` | Write to `docs/features/<slug>/research.md` (primary) |
| No brief, inline description only | Write to `docs/research/YYYY-MM-DD-feature-name.md` (fallback) |
| `docs/research/` doesn't exist | Lazy-create it |
| Brief path provided but file missing | Treat as no-brief; use fallback path |
| Research runs twice (per-feature) | Overwrites `docs/features/<slug>/research.md` |
| Research runs twice (flat) | Overwrites `docs/research/YYYY-MM-DD-feature-name.md` |

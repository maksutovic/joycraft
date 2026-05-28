# Add Brief Back-References from Research and Design Skills — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-joycraft-workflow-fixes/brief.md`
> **Status:** Complete
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 7 files / ~40 lines

---

## What

After writing their output artifact (`research.md` or `design.md`), the research and design skills will read the parent feature brief, add or update a back-reference link in the brief's header blockquote, and write the brief back. This propagates to all three platform variants (Pi, Claude, Codex).

## Why

The `joycraft-decompose` skill reads the brief's header blockquote for `> **Research:**` and `> **Design:**` links to locate those artifacts. Currently, neither skill writes these back-references — so even after running research or design, decompose can't find them automatically. This breaks the workflow chain.

## Acceptance Criteria
- [ ] Pi research skill includes instructions to update brief with `> **Research:** docs/features/<slug>/research.md`
- [ ] Claude research skill includes instructions to update brief with `> **Research:**` back-reference
- [ ] Codex research skill includes instructions to update brief with `> **Research:**` back-reference
- [ ] Pi design skill includes instructions to update brief with `> **Design:** docs/features/<slug>/design.md`
- [ ] Claude design skill includes instructions to update brief with `> **Design:**` back-reference
- [ ] Codex design skill includes instructions to update brief with `> **Design:**` back-reference
- [ ] Back-reference format matches existing brief conventions
- [ ] Updating an existing back-reference works (replace, don't duplicate)
- [ ] Regenerated `src/bundled-files.ts` contains updated skill content
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test`)
- [ ] Typecheck passes (`pnpm typecheck`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Pi research has back-ref instruction | grep pi research skill for "**Research:**" and "brief.md" | unit |
| Claude research has back-ref instruction | grep Claude research skill for "**Research:**" and "brief.md" | unit |
| Codex research has back-ref instruction | grep Codex research skill for "**Research:**" | unit |
| Pi design has back-ref instruction | grep Pi design skill for "**Design:**" and "brief.md" | unit |
| Claude design has back-ref instruction | grep Claude design skill for "**Design:**" and "brief.md" | unit |
| Codex design has back-ref instruction | grep Codex design skill for "**Design:**" | unit |
| Regenerated bundle matches source | test that bundled-files.ts content matches source skill content | unit |

**Execution order:**
1. Write tests that grep source skill files for back-reference instructions — they must FAIL
2. Add back-reference step to `src/pi-skills/joycraft-research.md` Phase 3
3. Add back-reference step to `src/claude-skills/joycraft-research.md` Phase 3
4. Add back-reference step to `src/codex-skills/joycraft-research.md` Phase 3
5. Add back-reference step to `src/pi-skills/joycraft-design.md` after Step 3 (before Step 4)
6. Add back-reference step to `src/claude-skills/joycraft-design.md` after Step 3 (before Step 4)
7. Add back-reference step to `src/codex-skills/joycraft-design.md` after Step 3 (before Step 4)
8. Regenerate `src/bundled-files.ts`
9. Run tests — all green

**Smoke test:** Grep any research skill source for `brief.md` and `**Research:**` — instant pass/fail.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, back-references already exist)
2. Tests grep actual source skill files (not bundled-files.ts)
3. Smoke test runs in milliseconds

## Constraints
- MUST: Back-reference format: `> **Research:** docs/features/<slug>/research.md` on its own line in the brief's header blockquote
- MUST: Design back-reference format: `> **Design:** docs/features/<slug>/design.md`
- MUST: If a back-reference already exists, update it — do NOT duplicate
- MUST: Propagate changes to Pi, Claude, AND Codex skill variants
- MUST NOT: Change the research/design artifact content or format
- MUST NOT: Add back-references for skills other than research and design

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| EDIT | `src/pi-skills/joycraft-research.md` | Add brief update step after writing research.md |
| EDIT | `src/claude-skills/joycraft-research.md` | Add brief update step after writing research.md |
| EDIT | `src/codex-skills/joycraft-research.md` | Add brief update step after writing research.md |
| EDIT | `src/pi-skills/joycraft-design.md` | Add brief update step after writing design.md |
| EDIT | `src/claude-skills/joycraft-design.md` | Add brief update step after writing design.md |
| EDIT | `src/codex-skills/joycraft-design.md` | Add brief update step after writing design.md |
| REGENERATE | `src/bundled-files.ts` | Updated skill content embedded |

## Approach

### Research skill addition

Add to Phase 3 of each research skill, after writing `research.md` and before the "Present:" block:

```markdown
### Update the Feature Brief

After writing the research document, update the parent brief with a back-reference:
1. Read `docs/features/<slug>/brief.md`
2. In the header blockquote (the `>` lines at the top), add or update:
   `> **Research:** docs/features/<slug>/research.md`
3. If a `> **Research:**` line already exists, replace it — do NOT add a duplicate
4. Write the brief back
```

### Design skill addition

Add to each design skill, after writing `design.md` (end of Step 3) and before the "Present and STOP" step:

```markdown
### Update the Feature Brief

After writing the design document, update the parent brief with a back-reference:
1. Read `docs/features/<slug>/brief.md`
2. In the header blockquote (the `>` lines at the top), add or update:
   `> **Design:** docs/features/<slug>/design.md`
3. If a `> **Design:**` line already exists, replace it — do NOT add a duplicate
4. Write the brief back
```

**Rejected alternative:** Having decompose search for artifacts by convention (check if `docs/features/<slug>/research.md` exists). This is fragile — the brief is the single source of truth and should explicitly link to all related artifacts.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Brief already has a back-reference | Update it, don't duplicate |
| Brief header blockquote has no existing back-references | Add the new line |
| Brief doesn't exist (edge case) | Skip the back-reference update, note it in output |
| Research runs twice for same feature | Second run updates the existing back-reference |
| Design runs before research | Design back-reference added; research back-reference added later (both coexist) |

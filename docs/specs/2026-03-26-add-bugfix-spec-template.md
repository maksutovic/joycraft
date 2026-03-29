# Add Bug Fix Spec Template — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-26-bugfix-workflow-skill.md`
> **Status:** Complete
> **Date:** 2026-03-26
> **Estimated scope:** 1 session / 1 file / ~40 lines modified

---

## What

Refine the embedded bug fix spec template within `src/skills/joycraft-bugfix.md` to be a polished, lighter alternative to the feature atomic spec template. The template should capture: what's broken, the root cause, the proposed fix, acceptance criteria with test plan, constraints, affected files, and edge cases — but omit the feature-oriented sections (Vision, Approach with rejected alternative, decomposition).

## Why

The initial skill (Spec 1) will include a working template, but this spec ensures the template is reviewed and refined as a standalone concern. The template is the artifact users will see most — it needs to be right.

## Acceptance Criteria

- [ ] Bug fix spec template in the skill uses `bugfix-` prefix in the filename pattern: `docs/specs/YYYY-MM-DD-bugfix-name.md`
- [ ] Template includes these sections: What (the bug), Root Cause, Fix (the proposed change), Acceptance Criteria, Test Plan, Constraints, Affected Files, Edge Cases
- [ ] Template does NOT include: Vision, User Stories, Decomposition, Approach with rejected alternative
- [ ] Test Plan section includes execution order (write failing test → confirm red → fix → green)
- [ ] Test Plan section includes smoke test identification
- [ ] Test Plan includes the "verify your test harness" checklist from the feature spec template
- [ ] Template includes `> **Parent Brief:** none (bug fix)` or links to an issue/error if available
- [ ] Build passes
- [ ] Typecheck passes

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Template has required sections | Parse the skill file, extract the template block, check for What, Root Cause, Fix, AC, Test Plan, Affected Files, Edge Cases | unit |
| Template omits feature sections | Parse the template block, confirm no Vision, User Stories, Decomposition, or Approach headers | unit |
| Uses bugfix- prefix | Check template filename pattern contains `bugfix-` | unit |
| Test-first discipline present | Grep for "fail"/"red"/"green" execution order in template | unit |
| Build passes | `pnpm build` | build |

**Execution order:**
1. Read the skill file created in Spec 1
2. Refine the embedded template
3. Run `pnpm build && pnpm typecheck`

**Smoke test:** `pnpm typecheck`

## Constraints

- MUST: Keep the template shorter than the feature atomic spec template
- MUST: Retain test-first enforcement — this is non-negotiable even for bug fixes
- MUST NOT: Add sections that only make sense for features (Vision, User Stories, etc.)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-bugfix.md` | Refine the embedded bug fix spec template section |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Bug with no known root cause yet | Template's "Root Cause" section should say "TBD — diagnosed during implementation" |
| Bug that requires a parent brief (part of a larger fix effort) | Template allows optional `Parent Brief` link |

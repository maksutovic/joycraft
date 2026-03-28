# Create Bug Fix Skill — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-26-bugfix-workflow-skill.md`
> **Status:** Ready
> **Date:** 2026-03-26
> **Estimated scope:** 1 session / 1 file / ~150 lines

---

## What

Create `src/skills/joycraft-bugfix.md` — a new Joycraft skill that provides a structured bug fix workflow: Triage → Diagnose → Discuss → Spec → Hand Off. The skill guides the agent through reproducing the bug, identifying the root cause, discussing findings with the user, writing a focused spec, and handing off for implementation in a fresh session.

## Why

Without this skill, users encountering bugs either misuse `/joycraft-new-feature` (too heavy) or get no structured guidance at all. The agent already recognized this gap by abandoning the new-feature workflow when asked to fix a bug.

## Acceptance Criteria

- [ ] `src/skills/joycraft-bugfix.md` exists with valid frontmatter (name: `joycraft-bugfix`, description)
- [ ] Skill defines 5 phases: Triage, Diagnose, Discuss, Spec, Hand Off
- [ ] Phase 1 (Triage) instructs the agent to reproduce the bug — get the error, symptom, or unexpected behavior
- [ ] Phase 2 (Diagnose) instructs the agent to read relevant code, identify root cause, and trace the failure
- [ ] Phase 3 (Discuss) instructs the agent to present findings to the user and get alignment before writing code
- [ ] Phase 4 (Spec) instructs the agent to write a bug fix spec to `docs/specs/YYYY-MM-DD-bugfix-name.md` using a lighter template (no Vision, no Approach with rejected alternative, but keeps AC, test plan, affected files, edge cases)
- [ ] Phase 5 (Hand Off) instructs the agent to recommend a fresh session for implementation
- [ ] Skill includes a guard clause: if the request is clearly a new feature (not a bug), redirect to `/joycraft-new-feature`
- [ ] Embedded bug fix spec template includes: What (what's broken), Why (root cause), Fix (what the fix is), Acceptance Criteria, Test Plan, Constraints, Affected Files, Edge Cases
- [ ] Test plan section in the embedded template enforces test-first discipline (write failing tests, then fix)
- [ ] Build passes (`pnpm build`)
- [ ] Typecheck passes (`pnpm typecheck`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| File exists with valid frontmatter | Check `src/skills/joycraft-bugfix.md` exists, parse frontmatter for `name` and `description` fields | unit |
| Contains 5 phases | Grep for Phase 1-5 headers or Triage/Diagnose/Discuss/Spec/Hand Off sections | unit |
| Embedded spec template has required sections | Grep for What, Why, Fix, Acceptance Criteria, Test Plan, Affected Files | unit |
| Guard clause present | Grep for redirect to `/joycraft-new-feature` | unit |
| Build passes | `pnpm build` | build |
| Typecheck passes | `pnpm typecheck` | build |

**Execution order:**
1. Write the skill file
2. Run `pnpm build && pnpm typecheck` to confirm no regressions

**Smoke test:** `pnpm typecheck` — skill files are static markdown, build/typecheck confirms nothing broke.

## Constraints

- MUST: Follow the same frontmatter format as `src/skills/joycraft-new-feature.md`
- MUST: Be self-contained — no imports or references to other files at runtime
- MUST: Keep the embedded spec template lighter than the feature spec template
- MUST NOT: Include an interview phase — bugs don't need interviews, they need reproduction
- MUST NOT: Include a feature brief phase — bugs go straight from diagnosis to spec

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/skills/joycraft-bugfix.md` | New skill file with full bug fix workflow |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User reports something that's clearly a feature request | Skill redirects to `/joycraft-new-feature` |
| Bug is trivial (one-line fix) | Still write a spec — discipline matters, but the spec will be short |
| Bug spans multiple files/systems | Spec's Affected Files section captures all of them; consider suggesting decomposition if truly large |
| User can't reproduce the bug | Triage phase should guide gathering more info (logs, env, steps to reproduce) |

# Level 5 Smoke Test — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-07-level-5-implementation.md`
> **Status:** Ready
> **Date:** 2026-04-07
> **Estimated scope:** 1 session / 1 file / ~20 lines

---

## What

Add a `getLevel()` export to `src/version.ts` that returns the current Joycraft harness level (1–5) by checking for the presence of Level 5 artifacts: workflow files and CLAUDE.md external validation section.

## Why

This is a smoke-test spec to validate the Level 5 autonomous loop: scenario generation on spec push, autofix on CI failure, and holdout validation on CI pass. The implementation is intentionally trivial so the focus is on verifying the pipeline, not the code.

## Acceptance Criteria

- [ ] `getLevel()` exported from `src/version.ts`
- [ ] Returns `5` when `.github/workflows/autofix.yml` exists and CLAUDE.md contains "External Validation"
- [ ] Returns `4` otherwise (simplified — full detection is out of scope)
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Returns 5 when artifacts present | Mock fs to include autofix.yml + CLAUDE.md with section, assert returns 5 | unit |
| Returns 4 when artifacts missing | Mock fs without autofix.yml, assert returns 4 | unit |
| Build passes | Verified by build step | build |

## Constraints

- MUST: Keep implementation under 20 lines — this is a smoke test, not a real feature
- MUST NOT: Import any new dependencies

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/version.ts` | Add `getLevel()` function |
| Create | `tests/version.test.ts` | Unit tests for `getLevel()` |

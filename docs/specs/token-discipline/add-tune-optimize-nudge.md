# Add Tune → Optimize Nudge — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-token-discipline.md`
> **Status:** Complete
> **Date:** 2026-04-06
> **Estimated scope:** 1 session / 3 files / ~3 lines added
> **Depends on:** Spec 2 (build-optimize-skill)

---

## What

Add a text line at the end of the `/joycraft-tune` skill output that nudges users to run `/joycraft-optimize` to audit their session overhead. This connects the two skills — tune assesses your harness config, optimize audits your runtime session costs.

## Why

Users who run `/joycraft-tune` are already thinking about harness quality. They're the ideal audience for `/joycraft-optimize`, but won't know it exists unless told. A simple nudge line creates discoverability without adding workflow complexity.

## Acceptance Criteria

- [ ] `src/claude-skills/joycraft-tune.md` includes a nudge to run `/joycraft-optimize` in Step 6 (Show Path to Level 5)
- [ ] `src/codex-skills/joycraft-tune.md` includes the same nudge
- [ ] Nudge is a single text line — not a conditional check or new workflow step
- [ ] `bundled-files.ts` is updated to reflect the change
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Nudge present in tune skill | Grep both tune files for "optimize" | manual |
| Consistent wording | Compare nudge text in both files | manual |
| bundled-files.ts matches | `pnpm build` succeeds | build |
| No regressions | `pnpm test --run` | unit |

**Execution order:**
1. Edit `src/claude-skills/joycraft-tune.md`
2. Edit `src/codex-skills/joycraft-tune.md`
3. Update `bundled-files.ts`
4. Run build and tests

**Smoke test:** `pnpm build && pnpm test --run`

## Constraints

- MUST: `/joycraft-optimize` skill must exist before this spec is executed (depends on spec 2)
- MUST: Single line — not a conditional or a new assessment dimension
- MUST: Placed in Step 6 (Show Path to Level 5) — the last section the user sees
- MUST NOT: Make optimize a required step in the tune flow
- MUST NOT: Change any tune scoring or assessment logic

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `src/claude-skills/joycraft-tune.md` | Add nudge line to Step 6 |
| Edit | `src/codex-skills/joycraft-tune.md` | Same nudge line |
| Edit | `src/bundled-files.ts` | Updated inlined skill content |

## Approach

Add a line after the Level 5 roadmap output in Step 6:

> **Tip:** Run `/joycraft-optimize` to audit your session's token overhead — plugins, MCP servers, and harness file sizes.

Simple text append. No logic changes.

**Rejected alternative:** Making the nudge conditional on detecting large CLAUDE.md or many plugins. This adds complexity for minimal value — the nudge is cheap and always relevant.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User hasn't installed optimize skill yet | Nudge still shows — the skill will be available after next `joycraft init` or `upgrade` |
| Template tune skill (non-joycraft-prefixed) | No template version of tune exists — only needs edit in src/ |

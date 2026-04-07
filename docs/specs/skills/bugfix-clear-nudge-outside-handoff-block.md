# Fix /clear Nudge Outside Handoff Block — Bug Fix Spec

> **Parent Brief:** none (bug fix)
> **Issue/Error:** `/clear` nudge placed outside code-fenced handoff template — model skips it inconsistently
> **Status:** Ready
> **Date:** 2026-04-07
> **Estimated scope:** 1 session / 5 skill files + 5 bundled source files / ~20 lines changed

---

## Bug

After artifact-producing skills complete (interview, new-feature, decompose, bugfix, session-end), users are not consistently prompted to `/clear` or start a new session. The nudge appears intermittently because the model treats it as optional commentary.

## Root Cause

In all 5 skills, the `/clear` nudge is a `**Tip:**` line placed *after* the code-fenced handoff template. The model reliably reproduces content inside code fences (the "tell the user:" block) but treats surrounding prose as optional guidance. The bugfix skill is missing the nudge entirely.

| Skill | Line | Issue |
|-------|------|-------|
| `joycraft-interview` | 98 | `**Tip:**` after ``` block |
| `joycraft-new-feature` | 185 | `**Tip:**` after ``` block |
| `joycraft-decompose` | 150 | `**Tip:**` after ``` block |
| `joycraft-session-end` | 100 | `**Tip:**` after ``` block |
| `joycraft-bugfix` | — | Missing entirely |

## Fix

For each of the 5 skills:
1. Move the `/clear` nudge **inside** the code-fenced handoff block, as the last line before the closing ```
2. Remove the standalone `**Tip:**` line that currently sits outside the block
3. Use consistent wording: `Run /clear before your next step — your artifacts are saved to files.`

Apply the same change to the corresponding bundled source files in `templates/claude-kit/skills/` so that `npx joycraft init` and `npx joycraft upgrade` propagate the fix to users.

## Acceptance Criteria

- [ ] All 5 skills have the `/clear` nudge inside their code-fenced handoff block
- [ ] No `**Tip:** Run /clear` lines remain outside code fences in these 5 skills
- [ ] Bugfix skill has the nudge (was missing before)
- [ ] Bundled source files in `templates/claude-kit/skills/` match the installed skill files
- [ ] No other skill content is altered
- [ ] Build passes

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Nudge inside code fence in all 5 skills | Grep for `/clear` in `.claude/skills/*/SKILL.md` — verify each match is within a code-fenced block (between ``` delimiters) | manual inspection |
| No stray Tip lines | Grep for `**Tip:** Run /clear` outside code fences — should return 0 matches | manual inspection |
| Bundled sources match | Existing `codex-skill-parity.test.ts` or diff between `templates/claude-kit/skills/` and `.claude/skills/` | unit |
| Build passes | `pnpm build` | build |

**Execution order:**
1. Edit the 5 installed skill files in `.claude/skills/`
2. Edit the 5 bundled source files in `templates/claude-kit/skills/`
3. Run `pnpm build` to regenerate bundled-files
4. Verify with grep that no stray Tip lines remain
5. Run `pnpm test --run && pnpm typecheck`

**Smoke test:** Grep `.claude/skills/*/SKILL.md` for `/clear` and verify every match is inside a code fence.

**Before implementing, verify your test harness:**
1. Grep for the current `**Tip:**` pattern — confirm it exists in 4 skills (5th is missing)
2. Confirm the code-fenced handoff blocks exist in all 5 skills

## Constraints

- MUST: Change only the position/presence of the `/clear` nudge line
- MUST: Update both installed skills (`.claude/skills/`) and bundled sources (`templates/claude-kit/skills/`)
- MUST NOT: Change any other skill content or behavior
- MUST NOT: Alter the handoff template structure beyond adding the nudge line

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `.claude/skills/joycraft-interview/SKILL.md` | Move nudge inside code fence, remove Tip line |
| Edit | `.claude/skills/joycraft-new-feature/SKILL.md` | Move nudge inside code fence, remove Tip line |
| Edit | `.claude/skills/joycraft-decompose/SKILL.md` | Move nudge inside code fence, remove Tip line |
| Edit | `.claude/skills/joycraft-session-end/SKILL.md` | Move nudge inside code fence, remove Tip line |
| Edit | `.claude/skills/joycraft-bugfix/SKILL.md` | Add nudge inside code fence |
| Edit | `templates/claude-kit/skills/joycraft-interview.md` | Same as installed skill |
| Edit | `templates/claude-kit/skills/joycraft-new-feature.md` | Same as installed skill |
| Edit | `templates/claude-kit/skills/joycraft-decompose.md` | Same as installed skill |
| Edit | `templates/claude-kit/skills/joycraft-session-end.md` | Same as installed skill |
| Edit | `templates/claude-kit/skills/joycraft-bugfix.md` | Same as installed skill |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Skill has multiple code-fenced blocks | Only the handoff block gets the nudge — not earlier examples |
| User runs skill but doesn't reach handoff | No impact — nudge is only in the final output |

# Fix Decompose Pi Handoff — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-26-pi-support/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 1 file / ~10 lines changed

---

## What

Update `.pi/skills/joycraft-decompose/SKILL.md` Step 7 so its handoff message is Pi-aware. When the Joycraft pipeline extension is present, the agent should tell the user to run `/joycraft-next-spec` to trigger autonomous execution, rather than the Claude Code–specific `/clear`.

## Why

The decompose skill currently hardcodes `/clear` in its handoff, which breaks Pi's Level 4 autonomy loop. A user who follows the skill literally will manually clear context and hunt for the next spec, even though `/joycraft-next-spec` could chain `session-end → next-spec → newSession → implement` automatically.

## Acceptance Criteria

- [ ] `.pi/skills/joycraft-decompose/SKILL.md` Step 7 mentions `/joycraft-next-spec` as the Pi execution path
- [ ] Step 7 still mentions `/clear` for non-Pi environments (Claude Code / Codex)
- [ ] No other skill content is changed
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Mentions `/joycraft-next-spec` | grep the skill file for the string | unit (script) |
| Still mentions `/clear` | grep the skill file for the string | unit (script) |
| Only Step 7 changed | diff shows ≤ 15 lines changed in 1 file | unit (script) |

**Execution order:**
1. Write a grep-based test that fails against current skill text
2. Confirm failure (red)
3. Edit Step 7, rerun tests (green)

**Smoke test:** Single grep for `/joycraft-next-spec` (runs in < 10ms)

## Constraints

- MUST: Keep the skill valid Agent Skills markdown — no dynamic runtime logic
- MUST NOT: Change any other step or section of the skill
- MUST NOT: Add new dependencies

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `.pi/skills/joycraft-decompose/SKILL.md` | Step 7 handoff text |

## Approach

Replace the monolithic Step 7 block with a versioned handoff that lists both paths. Since skills are static markdown, we enumerate the two common harnesses (Pi vs Claude Code/Codex) and let the user/agent pick the right one.

**Rejected alternative:** Adding runtime platform detection inside the skill — impossible in static markdown, would require an extension change (out of scope for this spec).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User is on Codex | Still sees `/clear` path, works as before |
| User is on Pi without extension | Sees `/joycraft-next-spec` path; command will 404, but at least the skill isn't silently wrong |
| Skill is synced back to Codex source | Diff is minimal, no merge conflicts |

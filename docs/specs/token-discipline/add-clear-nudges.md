# Add Clear Nudges to Skill Handoffs — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-token-discipline.md`
> **Status:** Complete
> **Date:** 2026-04-06
> **Estimated scope:** 1 session / 12 files / ~12 lines added
> **Depends on:** Spec 0 (restructure-spec-directories)

---

## What

Add a one-line `/clear` nudge to the handoff section of four Joycraft skills: interview, new-feature, decompose, and session-end. The nudge reminds users that their conversation context is disposable because all artifacts are saved to files — so they should run `/clear` before starting the next workflow phase.

## Why

Users accumulate context debt across workflow phases without realizing it. Since Joycraft produces file artifacts at every step, the conversation is scaffolding that can be discarded after each phase. Without a nudge, users carry stale context forward, increasing cost per turn and reducing output quality.

## Acceptance Criteria

- [ ] `src/claude-skills/joycraft-interview.md` handoff section includes a clear nudge
- [ ] `src/claude-skills/joycraft-new-feature.md` handoff section includes a clear nudge
- [ ] `src/claude-skills/joycraft-decompose.md` handoff section includes a clear nudge
- [ ] `src/claude-skills/joycraft-session-end.md` report section includes a clear nudge
- [ ] All four corresponding Codex skills in `src/codex-skills/` have the same nudge
- [ ] All four corresponding template skills in `templates/claude-kit/skills/` have the same nudge (where they exist: session-end.md, new-feature.md, decompose.md — interview is not in templates)
- [ ] Nudge text is consistent across all files — same wording, same placement
- [ ] `bundled-files.ts` is updated to reflect the new skill content
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Nudge present in all skill files | Grep all affected files for nudge text | manual verification |
| Consistent wording | Compare nudge lines across all files | manual verification |
| bundled-files.ts matches source | Run `pnpm build` and verify no diff | build |
| No regressions | `pnpm test --run` | unit |

**Execution order:**
1. Edit the 4 `src/claude-skills/` files
2. Edit the 4 `src/codex-skills/` files
3. Edit the 3 `templates/claude-kit/skills/` files (interview not present)
4. Update `bundled-files.ts` to match
5. Run build and tests

**Smoke test:** `pnpm build && pnpm test --run`

## Constraints

- MUST: Nudge is a single line or short paragraph — not a workflow interruption
- MUST: Placed in the handoff/report section (the last thing the user sees)
- MUST: Explain WHY (artifacts are in files, context is disposable)
- MUST: Mention `/clear` by name (or Codex equivalent where applicable)
- MUST NOT: Change any other skill behavior or content
- MUST NOT: Make clearing mandatory or automatic

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `src/claude-skills/joycraft-interview.md` | Add nudge to Step 5 (Hand Off) |
| Edit | `src/claude-skills/joycraft-new-feature.md` | Add nudge to Phase 4 (Hand Off) |
| Edit | `src/claude-skills/joycraft-decompose.md` | Add nudge to Step 7 (Hand Off) |
| Edit | `src/claude-skills/joycraft-session-end.md` | Add nudge to Step 6 (Report) |
| Edit | `src/codex-skills/joycraft-interview.md` | Same nudge as Claude Code version |
| Edit | `src/codex-skills/joycraft-new-feature.md` | Same nudge |
| Edit | `src/codex-skills/joycraft-decompose.md` | Same nudge |
| Edit | `src/codex-skills/joycraft-session-end.md` | Same nudge |
| Edit | `templates/claude-kit/skills/session-end.md` | Same nudge |
| Edit | `templates/claude-kit/skills/new-feature.md` | Same nudge |
| Edit | `templates/claude-kit/skills/decompose.md` | Same nudge |
| Edit | `src/bundled-files.ts` | Updated inlined skill content |

## Approach

Add a consistent nudge line after each skill's handoff output. Suggested wording:

> **Tip:** Run `/clear` before starting the next step. Your artifacts are saved to files — this conversation context is disposable.

For session-end, the nudge goes after the report block. For the other three, it goes after the handoff instructions.

**Rejected alternative:** Adding the nudge as a comment/annotation inside the handoff code block. This would make it part of the template output rather than a skill instruction, which is less flexible and harder to maintain.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User ignores the nudge | No effect — purely advisory |
| Codex doesn't have `/clear` | Use Codex-appropriate equivalent or generic "start a fresh session" |
| Template skills (non-joycraft-prefixed) | Same nudge wording, adapted for non-prefixed skill names |

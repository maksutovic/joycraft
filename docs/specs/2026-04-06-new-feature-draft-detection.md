# New-Feature Draft Detection — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-readme-and-workflow-improvements.md`
> **Status:** Ready
> **Date:** 2026-04-06
> **Estimated scope:** 1 session / 6 files / ~30 lines changed

---

## What

Make the `joycraft-new-feature` skill check `docs/briefs/` for recent draft briefs (files with `Status: DRAFT` or `-draft` in the filename) before starting the interview phase. If a draft exists, offer to formalize it into a full Feature Brief instead of re-interviewing from scratch.

## Why

When users run `/joycraft-interview` first, they produce a draft brief. Then when they run `/joycraft-new-feature`, it starts a redundant interview from scratch. The interview → new-feature handoff should be smooth — new-feature should detect the existing draft and build on it.

## Acceptance Criteria

- [ ] `joycraft-new-feature` checks `docs/briefs/` for files matching `*-draft.md` or containing `Status: DRAFT` at the start of Phase 1
- [ ] If draft(s) found, presents them to the user: "I found a draft brief at [path]. Want me to formalize this into a full Feature Brief, or start a new interview?"
- [ ] If user chooses to formalize, reads the draft and uses it as input for Phase 2 (Feature Brief), skipping the interview
- [ ] If user chooses to start fresh, proceeds with the normal interview flow
- [ ] If no drafts found, proceeds with the normal interview flow (no change to behavior)
- [ ] Changes applied to `src/claude-skills/`, `src/codex-skills/`, and `templates/claude-kit/skills/`
- [ ] Build passes (`pnpm build`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Draft detection logic present | Read skill file, verify Phase 1 has draft check before interview | manual review |
| Both options offered | Verify skill text offers formalize vs. start-fresh paths | manual review |
| All three directories updated | Diff skill files across directories — draft detection present in all | manual review |
| Build passes | `pnpm build` succeeds | integration |

**Smoke test:** `pnpm build`

## Constraints

- MUST: Keep the skill self-contained (no imports)
- MUST: Apply to `src/claude-skills/`, `src/codex-skills/`, and `templates/claude-kit/skills/`
- MUST: Preserve the normal interview flow when no drafts exist
- MUST NOT: Auto-select a draft — always ask the user which path to take
- MUST NOT: Delete or modify existing draft files

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/claude-skills/joycraft-new-feature.md` | Add draft detection guard before Phase 1 interview |
| Modify | `src/codex-skills/joycraft-new-feature.md` | Same change |
| Modify | `templates/claude-kit/skills/new-feature.md` | Same change (filename: `new-feature.md`) |

## Approach

Add a new "Phase 0: Check for Existing Drafts" section before Phase 1. This section:

1. Uses Glob/LS to check `docs/briefs/` for files matching `*-draft.md`
2. If matches found, reads the first few lines of each to confirm `Status: DRAFT`
3. Presents the list to the user with a choice: formalize or start fresh
4. If formalizing: reads the full draft, extracts the idea/problem/constraints, and jumps to Phase 2 with that context pre-filled

**Alternative rejected:** Automatically formalizing the most recent draft without asking. Rejected because users may have multiple drafts or may want to start fresh with a different angle on the same idea.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Multiple draft briefs exist | List all drafts with dates, let user pick which one to formalize |
| Draft brief is very short (1-2 lines) | Still offer to formalize — the interview can fill in gaps |
| `docs/briefs/` doesn't exist | Skip draft check, proceed to normal interview (directory created later) |
| User provides a brief path as an argument | Skip draft check — they've already specified what to work from |
| Draft has `Status: DRAFT` but no `-draft` suffix | Still detected via status check |

# Build Implement Skill — Atomic Spec

> **Parent Brief:** standalone (closes workflow gap identified in `docs/briefs/2026-04-06-token-discipline.md`)
> **Status:** Complete
> **Date:** 2026-04-07
> **Estimated scope:** 1 session / 5 files / ~150 lines

---

## What

Create a `/joycraft-implement` skill that guides execution of atomic specs produced by `/joycraft-decompose`. This fills the missing step in the Joycraft workflow chain: interview → new-feature → decompose → **implement** → session-end. The skill is an optimized prompt that enforces TDD, explains the spec directory structure for context gathering, and nudges `/joycraft-session-end` on completion and `/clear` between specs.

## Why

Users currently have no skill to guide spec execution. After `/joycraft-decompose` produces specs, the user is on their own — no TDD enforcement, no context-gathering guidance, no handoff to session-end. This gap breaks the otherwise continuous skill chain and misses an opportunity for clear nudges between implementation sessions.

## Acceptance Criteria

- [ ] `src/claude-skills/joycraft-implement.md` exists with valid frontmatter (`name`, `description`, `instructions` count)
- [ ] Skill accepts one or more spec paths as arguments
- [ ] Skill explains the spec directory structure: briefs infer feature subdirectory names (strip date prefix and `.md`), specs live in `docs/specs/<feature-name>/`
- [ ] Skill enforces TDD: write tests first, confirm they fail (red), implement until green
- [ ] Skill instructs the agent to read the spec's Test Plan and Acceptance Criteria as the execution contract
- [ ] Skill nudges `/joycraft-session-end` when implementation is complete
- [ ] Skill includes a `/clear` nudge in the handoff section (consistent with existing skills)
- [ ] Corresponding Codex skill exists at `src/codex-skills/joycraft-implement.md` with platform-appropriate language
- [ ] `src/bundled-files.ts` includes the new skill in both `SKILLS` and `CODEX_SKILLS` objects
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Skill file exists with valid frontmatter | Check file exists, parse frontmatter for required fields | manual verification |
| Accepts spec path arguments | Read skill — verify argument handling instructions | manual verification |
| Explains spec directory structure | Read skill — verify directory convention explanation | manual verification |
| Enforces TDD | Read skill — verify red-green cycle instructions | manual verification |
| Reads Test Plan and AC | Read skill — verify spec-as-contract instructions | manual verification |
| Nudges session-end | Read skill — verify session-end handoff | manual verification |
| Clear nudge present | Grep for `/clear` in handoff section | manual verification |
| Codex skill exists | Check `src/codex-skills/joycraft-implement.md` exists | manual verification |
| bundled-files.ts updated | `pnpm build` succeeds with new skill included | build |
| No regressions | `pnpm test --run` | unit |

**Execution order:**
1. Write the Claude Code skill (`src/claude-skills/joycraft-implement.md`)
2. Write the Codex skill (`src/codex-skills/joycraft-implement.md`)
3. Add both to `src/bundled-files.ts`
4. Run `pnpm build && pnpm test --run`

**Smoke test:** `pnpm build && pnpm test --run`

## Constraints

- MUST: Be a self-contained markdown skill file — no code changes beyond bundled-files.ts registration
- MUST: Follow existing skill conventions (frontmatter format, step numbering, handoff pattern)
- MUST: Enforce TDD — not suggest, enforce. The skill should instruct the agent to write tests first and confirm failure before implementing
- MUST: Work for both single-spec and multi-spec execution in one session
- MUST: Include `/clear` nudge consistent with other skills' handoff wording
- MUST NOT: Duplicate `/joycraft-implement-level5` functionality (no autofix loops, no holdout testing, no scenario evolution)
- MUST NOT: Duplicate `/joycraft-session-end` functionality — nudge to it, don't replicate it
- MUST NOT: Require CLI code changes beyond bundled-files.ts
- MUST NOT: Exceed 200 lines (skill file size threshold)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/claude-skills/joycraft-implement.md` | New skill file (~120-150 lines) |
| Create | `src/codex-skills/joycraft-implement.md` | Codex variant of the skill |
| Edit | `src/bundled-files.ts` | Add new skill to `SKILLS` and `CODEX_SKILLS` objects |

## Approach

The skill follows the same structural pattern as `joycraft-decompose` and `joycraft-session-end`: numbered steps, clear instructions, handoff at the end.

**Skill structure:**
1. **Parse arguments** — identify spec path(s) provided by the user
2. **Locate and read specs** — explain the directory convention (`docs/specs/<feature-name>/`) so the agent can find related specs and the parent brief if needed for additional context
3. **For each spec, execute TDD cycle:**
   - Read the spec's Test Plan section
   - Write all tests — confirm they fail (red)
   - Implement until tests pass (green)
   - Verify all Acceptance Criteria are met
4. **Multi-spec handling** — if multiple specs, nudge `/clear` between each
5. **Hand off** — nudge `/joycraft-session-end` to capture discoveries, then `/clear`

**Context gathering guidance:** The skill should explain that specs are designed to be self-contained, but if the agent needs more context:
- The parent brief is linked in the spec's frontmatter
- Related specs live in the same `docs/specs/<feature-name>/` directory
- The feature name is derived from the brief filename (strip date prefix and `.md`)

**Rejected alternative:** Making this a wrapper that programmatically invokes other skills (session-end, lockdown). Skills should nudge to other skills, not orchestrate them — keeps each skill simple and independently usable.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No spec path provided | Prompt the user to provide a spec path, suggest checking `docs/specs/` |
| Spec has no Test Plan section | Warn the user, suggest writing tests based on Acceptance Criteria |
| Spec status is already "Complete" | Warn the user, ask if they want to re-implement or skip |
| Multiple specs with dependencies | Instruct the agent to execute in dependency order per the spec's frontmatter |
| Tests pass immediately (no red phase) | Flag this — either tests aren't testing the right thing or code already exists |

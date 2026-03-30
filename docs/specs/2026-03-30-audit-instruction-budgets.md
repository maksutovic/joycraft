# Audit Instruction Budgets — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-30-crispy-harness-upgrades.md`
> **Status:** Complete
> **Date:** 2026-03-30
> **Estimated scope:** 1 session / 10+ files / ~200 lines changed (mostly deletions)

---

## What

Audit all Joycraft skills for instruction count, trim each to under 40 instructions, and split any skill that exceeds the budget. The primary target is `joycraft-tune.md` (380 lines, ~80+ instructions) which should be refactored to route to `tune-assess.md` and `tune-upgrade.md` (which already exist but are bypassed by the monolithic `tune.md`). Add an instruction count comment to each skill's frontmatter.

## Why

Research from HumanLayer (citing arxiv.org/pdf/2507.11538) shows frontier LLMs follow ~150-200 instructions with consistency. Joycraft skills share the instruction budget with the system prompt, CLAUDE.md, built-in tools, and MCP servers. A skill with 80+ instructions is competing for attention with all of that. Splitting into focused skills with <40 instructions each ensures reliable adherence to the workflow.

## Acceptance Criteria

- [ ] Every skill in `src/skills/` has an `instructions` field in its frontmatter (e.g., `instructions: 34`)
- [ ] No skill exceeds 40 instructions
- [ ] `joycraft-tune.md` is refactored to be a thin router (~15 instructions) that delegates to `tune-assess` and `tune-upgrade`
- [ ] Any skill that was over 40 instructions is either trimmed or split
- [ ] Trimming removes: duplicate instructions, hedging language, "nice to have" guidance, conditional instructions that can be separate skills
- [ ] No behavioral changes — all existing workflows produce the same outputs
- [ ] Template skills in `templates/claude-kit/skills/` are also audited (but these are already smaller)
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| All skills have instruction count | Script: grep for `instructions:` in all skill frontmatter | manual |
| No skill over 40 | Script: parse frontmatter, assert max <= 40 | manual |
| Tune routes to sub-skills | Read tune.md, verify it delegates rather than does everything | manual review |
| No behavioral changes | Run existing tests, compare init output before/after | integration |
| Build passes | `pnpm build` | build |
| Tests pass | `pnpm test --run` | meta |

**Execution order:**
1. Count instructions in every skill (create a spreadsheet/table)
2. Identify which skills exceed 40
3. For each over-budget skill: trim first, split only if trimming isn't enough
4. Add `instructions: N` to each skill's frontmatter
5. Run tests to confirm nothing broke

**Smoke test:** `pnpm test --run`

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: Count instructions as imperative sentences (each "do X" = 1 instruction)
- MUST: Preserve all existing behavior — this is a refactor, not a feature change
- MUST: Keep `tune.md` as the entry point (users run `/tune`, it routes internally)
- MUST NOT: Change the spec template format
- MUST NOT: Remove any skill entirely — only trim or split
- MUST NOT: Change skill filenames (would break existing installations)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-tune.md` | Refactor to thin router (~15 instructions) |
| Modify | `src/skills/joycraft-new-feature.md` | Trim to under 40 instructions |
| Modify | `src/skills/joycraft-bugfix.md` | Trim to under 40 instructions |
| Modify | `src/skills/joycraft-add-fact.md` | Trim to under 40 instructions |
| Modify | `src/skills/joycraft-decompose.md` | Trim to under 40 instructions |
| Modify | `src/skills/joycraft-implement-level5.md` | Trim to under 40 instructions |
| Modify | `src/skills/joycraft-verify.md` | Trim if needed |
| Modify | `src/skills/joycraft-lockdown.md` | Trim if needed |
| Modify | `src/skills/joycraft-session-end.md` | Trim if needed |
| Modify | `src/skills/joycraft-interview.md` | Trim if needed |

## Approach

**Counting method:** One instruction = one imperative sentence or directive. "Read the brief" = 1. "If no brief exists, tell the user X" = 1. A bullet list of 5 things to check = 5 instructions. Section headers and explanatory prose don't count.

**Trimming strategy (in priority order):**
1. Remove duplicate instructions (same thing said two ways)
2. Remove hedging ("you might want to", "consider whether")
3. Remove explanatory prose that restates the obvious
4. Consolidate bullet lists (5 similar checks → 1 instruction: "verify all acceptance criteria")
5. Move conditional branches to separate skills (if X then do Y → route to skill-Y)

**Split strategy for tune.md:**
`tune.md` currently does: read state → score 7 dimensions → decide tier → execute upgrades. Refactor to:
- `tune.md` (~15 instructions): Read state, score, decide tier, route to `tune-assess` or `tune-upgrade`
- `tune-assess.md` (already exists): Assessment logic
- `tune-upgrade.md` (already exists): Upgrade execution

**Rejected alternative:** Raising the instruction limit to 60. The research is clear — more instructions = lower adherence. The fix is fewer instructions, not a higher ceiling.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Skill is exactly 40 instructions | Acceptable — no trimming needed |
| Trimming changes behavior | Revert — preserve behavior over instruction count |
| Template skills are over 40 | Trim them too, but they're already small (largest is 85 lines) |
| New skills (research, design) added in parallel | Those specs already target <40 — no conflict |

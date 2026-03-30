# Create Research Skill — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-30-crispy-harness-upgrades.md`
> **Status:** Complete
> **Date:** 2026-03-30
> **Estimated scope:** 1 session / 2 files / ~120 lines

---

## What

Create a new `/joycraft-research` skill that produces objective codebase research by isolating question generation from fact-gathering in separate context windows. One context sees the brief and generates questions; a subagent sees ONLY the questions (never the brief) and researches the codebase. Output: `docs/research/YYYY-MM-DD-feature-name.md` containing compressed facts with zero implementation opinions.

## Why

HumanLayer found that when the researching agent knows what it's building, research gets contaminated with opinions about how to build it. Hiding the ticket from the researcher keeps research objective — "compression of truth" rather than pre-planning. This prevents wrong patterns/assumptions from propagating into specs.

## Acceptance Criteria

- [ ] New skill file exists at `src/skills/joycraft-research.md`
- [ ] Skill accepts a brief path (or inline description) as input
- [ ] Phase 1: Skill reads the brief and generates 5-10 research questions about the codebase (objective, fact-seeking questions only)
- [ ] Phase 1 output: Questions written to a temporary artifact or passed directly to phase 2
- [ ] Phase 2: Skill spawns a subagent (via Agent tool) that receives ONLY the research questions — the brief/ticket is NOT passed to this subagent
- [ ] Phase 2 subagent explores the codebase using the questions and produces a research document
- [ ] Research document contains only facts: file paths, function signatures, data flows, patterns found, dependencies — no recommendations or opinions
- [ ] Research document is written to `docs/research/YYYY-MM-DD-feature-name.md`
- [ ] Skill creates `docs/research/` directory if it doesn't exist
- [ ] Skill is registered in `src/bundled-files.ts` for installation via `npx joycraft init`
- [ ] Skill instruction count is under 40
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Skill file exists | Check file at `src/skills/joycraft-research.md` | unit |
| Skill registered in bundled-files | Grep for joycraft-research in bundled-files.ts | unit |
| Instruction count under 40 | Count imperative sentences in skill file | manual review |
| Research doc has no opinions | Manual test: run skill, grep output for "should", "recommend", "suggest" | manual |
| Subagent never sees brief | Manual test: verify subagent prompt contains only questions, not brief content | manual review |
| Build passes | `pnpm build` | build |
| Tests pass | `pnpm test --run` | meta |

**Execution order:**
1. Write unit tests for file existence and registration — they should fail
2. Run tests to confirm they fail (red)
3. Create the skill file and register it
4. Run tests to confirm they pass (green)

**Smoke test:** `pnpm test --run` (fast, covers registration)

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: Keep skill under 40 instructions (the whole point of CRISPY is instruction budget discipline)
- MUST: Subagent context must never contain the brief/ticket — only the generated questions
- MUST: Research output must be facts only — explicitly instruct the subagent to avoid opinions, recommendations, or implementation suggestions
- MUST NOT: Require the research step — it should be optional (users can skip straight to decompose)
- MUST NOT: Add runtime dependencies

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/skills/joycraft-research.md` | New skill file |
| Modify | `src/bundled-files.ts` | Register new skill for installation |

## Approach

The skill has two phases in a single skill file:

**Phase 1 (main context):** Read the brief, identify what zones of the codebase are relevant, generate 5-10 research questions. Questions should be like: "How does endpoint registration work?", "What patterns exist for tenant isolation?", "Trace the data flow for X." Write questions to a markdown artifact.

**Phase 2 (subagent):** Spawn an Agent tool with `subagent_type: "Explore"`. Pass ONLY the questions (not the brief). Instruct the subagent: "You are researching a codebase. Answer these questions with facts only. Report file paths, function signatures, data flows, patterns. Do not recommend or suggest anything." Write output to `docs/research/`.

**Rejected alternative:** Single context that "pretends" not to know the brief. This doesn't work because the brief is still in the context window — the model can't truly un-know it.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No brief exists | Skill accepts inline description, generates questions from that |
| Codebase is empty/new | Research doc reports "no existing patterns found" — still useful for greenfield |
| User runs research twice | Overwrites previous research doc (same filename convention) |
| Brief is very short (1-2 sentences) | Still generates questions — even simple features benefit from understanding existing patterns |

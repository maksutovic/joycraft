# Create Design Skill — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-30-crispy-harness-upgrades.md`
> **Status:** Complete
> **Date:** 2026-03-30
> **Estimated scope:** 1 session / 2 files / ~100 lines

---

## What

Create a new `/joycraft-design` skill that produces a ~200-line design discussion artifact between research and decompose. The artifact captures the agent's understanding of current state, desired end state, patterns to follow, resolved design decisions, and open questions — forcing the agent to "brain dump" its thinking so the human can catch wrong assumptions before specs are written.

## Why

HumanLayer found that reviewing a 200-line design doc is far higher leverage than reviewing a 1000-line plan. The design discussion is where you catch "that's not how we do X" and "you found the wrong pattern" — before those mistakes propagate into specs and then into 2000 lines of code. Matt Pocock calls this the "design concept" — the shared understanding between human and agent.

## Acceptance Criteria

- [ ] New skill file exists at `src/skills/joycraft-design.md`
- [ ] Skill accepts a brief path and optional research doc path as input
- [ ] Skill reads the brief and research doc (if available)
- [ ] Skill spawns subagents to explore the codebase for patterns relevant to the brief
- [ ] Skill produces a design discussion document with all five sections (see Approach)
- [ ] Design document is ~200 lines (100-300 acceptable range)
- [ ] Open Questions section presents options (A/B/C) for the human to choose from
- [ ] Skill writes output to `docs/designs/YYYY-MM-DD-feature-name.md`
- [ ] Skill creates `docs/designs/` directory if it doesn't exist
- [ ] Skill explicitly asks the human to review and respond before proceeding
- [ ] Skill is registered in `src/bundled-files.ts` for installation
- [ ] Skill instruction count is under 40
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Skill file exists | Check file at `src/skills/joycraft-design.md` | unit |
| Skill registered in bundled-files | Grep for joycraft-design in bundled-files.ts | unit |
| Instruction count under 40 | Count imperative sentences in skill file | manual review |
| Design doc has all 5 sections | Manual test: run skill, check for section headers | manual |
| Open Questions have options | Manual test: verify questions present A/B/C options | manual |
| Skill pauses for human review | Manual test: verify skill asks user to review before proceeding | manual |
| Build passes | `pnpm build` | build |
| Tests pass | `pnpm test --run` | meta |

**Execution order:**
1. Write unit tests for file existence and registration — they should fail
2. Run tests to confirm they fail (red)
3. Create the skill file and register it
4. Run tests to confirm they pass (green)

**Smoke test:** `pnpm test --run`

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: Keep skill under 40 instructions
- MUST: Include all five sections (Current State, Desired End State, Patterns to Follow, Resolved Design Decisions, Open Questions)
- MUST: Pause for human review — do NOT proceed to decompose automatically
- MUST: Open Questions must present concrete options with pros/cons, not vague "what do you think?"
- MUST NOT: Include implementation details (that's what the plan is for)
- MUST NOT: Require a research doc — should work with just the brief (research is optional)
- MUST NOT: Add runtime dependencies

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/skills/joycraft-design.md` | New skill file |
| Modify | `src/bundled-files.ts` | Register new skill for installation |

## Approach

The skill reads the brief + research (if available), explores the codebase for relevant patterns, then produces a design document with these five sections:

1. **Current State** — What exists today in the codebase. File paths, function signatures, data flows relevant to this feature. Sourced from research doc or direct exploration.

2. **Desired End State** — What the codebase should look like when done. High-level description of the change, not implementation steps.

3. **Patterns to Follow** — Existing patterns in the codebase that this feature should match. Include code snippets and file:line references. This is where humans catch "that's the old pattern, use the one in /services/billing instead."

4. **Resolved Design Decisions** — Decisions the agent has already made, with brief rationale. Example: "Will use the existing EventEmitter pattern rather than adding a new pub/sub system because it's already used in 3 similar features."

5. **Open Questions** — Things the agent doesn't know or where multiple valid approaches exist. Each question has 2-3 concrete options with pros/cons. The human picks.

After writing the document, the skill presents it to the user and asks them to review, answer open questions, and correct any wrong pattern choices. Only after the human approves should the user proceed to `/joycraft-decompose`.

**Rejected alternative:** Embedding the design discussion into the decompose skill. This was exactly the mistake RPI's `/create-plan` made — bundling too many steps into one prompt, causing the important ones (design options, structure feedback) to get skipped.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No research doc exists | Skill explores codebase directly, notes that research was not done |
| Greenfield project (no patterns) | "Patterns to Follow" section notes no existing patterns, proposes conventions |
| Human rejects a pattern choice | Update the design doc with the corrected pattern, re-present |
| Feature is trivial (1 spec) | Design doc may be shorter (~100 lines), still worth the checkpoint |
| Human has no open questions | All questions become "Resolved" — proceed to decompose |

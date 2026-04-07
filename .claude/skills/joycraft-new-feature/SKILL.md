---
name: joycraft-new-feature
description: Guided feature development — interview the user, produce a Feature Brief, then decompose into atomic specs
instructions: 35
---

# New Feature Workflow

You are starting a new feature. Follow this process in order. Do not skip steps.

## Phase 1: Interview

Interview the user about what they want to build. Let them talk — your job is to listen, then sharpen.

**Ask about:**
- What problem does this solve? Who is affected?
- What does "done" look like?
- Hard constraints? (business rules, tech limitations, deadlines)
- What is explicitly NOT in scope? (push hard on this)
- Edge cases or error conditions?
- What existing code/patterns should this follow?
- Testing: existing setup? framework? smoke test budget? lockdown mode desired?

**Interview technique:**
- Let the user "yap" — don't interrupt their flow
- Play back your understanding: "So if I'm hearing you right..."
- Push toward testable statements: "How would we verify that works?"

Keep asking until you can fill out a Feature Brief.

## Phase 2: Feature Brief

Write a Feature Brief to `docs/briefs/YYYY-MM-DD-feature-name.md`. Create the `docs/briefs/` directory if it doesn't exist.

**Why:** The brief is the single source of truth for what we're building. It prevents scope creep and gives every spec a shared reference point.

Use this structure:

```markdown
# [Feature Name] — Feature Brief

> **Date:** YYYY-MM-DD
> **Project:** [project name]
> **Status:** Interview | Decomposing | Specs Ready | In Progress | Complete

---

## Vision
What are we building and why? The full picture in 2-4 paragraphs.

## User Stories
- As a [role], I want [capability] so that [benefit]

## Hard Constraints
- MUST: [constraint that every spec must respect]
- MUST NOT: [prohibition that every spec must respect]

## Out of Scope
- NOT: [tempting but deferred]

## Test Strategy
- **Existing setup:** [framework and tools, or "none yet"]
- **User expertise:** [comfortable / learning / needs guidance]
- **Test types:** [smoke, unit, integration, e2e, etc.]
- **Smoke test budget:** [target time for fast-feedback tests]
- **Lockdown mode:** [yes/no — constrain agent to code + tests only]

## Decomposition
| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | [verb-object] | [one sentence] | None | [S/M/L] |

## Execution Strategy
- [ ] Sequential (specs have chain dependencies)
- [ ] Parallel worktrees (specs are independent)
- [ ] Mixed

## Success Criteria
- [ ] [End-to-end behavior 1]
- [ ] [No regressions in existing features]
```

If `docs/templates/FEATURE_BRIEF_TEMPLATE.md` exists, reference it for the full template with additional guidance.

Present the brief to the user. Focus review on:
- "Does the decomposition match how you think about this?"
- "Is anything in scope that shouldn't be?"
- "Are the specs small enough? Can each be described in one sentence?"

Iterate until approved.

## Phase 3: Generate Atomic Specs

For each row in the decomposition table, create a self-contained spec file at `docs/specs/<feature-name>/spec-name.md`. Derive the feature-name from the brief filename (strip the date prefix and `.md` — e.g., `2026-04-06-token-discipline.md` → `token-discipline`). Create the `docs/specs/<feature-name>/` directory if it doesn't exist.

**Why:** Each spec must be understandable WITHOUT reading the Feature Brief. This prevents the "Curse of Instructions" — no spec should require holding the entire feature in context. Copy relevant context into each spec.

Use this structure for each spec:

```markdown
# [Verb + Object] — Atomic Spec

> **Parent Brief:** `docs/briefs/YYYY-MM-DD-feature-name.md`
> **Status:** Ready
> **Date:** YYYY-MM-DD
> **Estimated scope:** [1 session / N files / ~N lines]

---

## What
One paragraph — what changes when this spec is done?

## Why
One sentence — what breaks or is missing without this?

## Acceptance Criteria
- [ ] [Observable behavior]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| [Each AC above] | [What to call/assert] | [unit/integration/e2e] |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** [Identify the fastest test for iteration feedback]

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints
- MUST: [hard requirement]
- MUST NOT: [hard prohibition]

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|

## Approach
Strategy, data flow, key decisions. Name one rejected alternative.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
```

If `docs/templates/ATOMIC_SPEC_TEMPLATE.md` exists, reference it for the full template with additional guidance.

## Phase 4: Hand Off for Execution

Tell the user:
```
Feature Brief and [N] atomic specs are ready.

Specs:
1. [spec-name] — [one sentence] [S/M/L]
2. [spec-name] — [one sentence] [S/M/L]
...

Recommended execution:
- [Parallel/Sequential/Mixed strategy]
- Estimated: [N] sessions total

To execute: Start a fresh session per spec. Each session should:
1. Read the spec
2. Implement
3. Run /joycraft-session-end to capture discoveries
4. Commit and PR

Ready to start?

Run /clear before your next step — your artifacts are saved to files.
```

**Why:** A fresh session for execution produces better results. The interview session has too much context noise — a clean session with just the spec is more focused.

You can also use `/joycraft-decompose` to re-decompose a brief if the breakdown needs adjustment, or run `/joycraft-interview` first for a lighter brainstorm before committing to the full workflow.

# [Feature Name] — Feature Brief

> **Date:** YYYY-MM-DD
> **Project:** [project name]
> **Status:** Interview | Decomposing | Specs Ready | In Progress | Complete

---

## Vision

What are we building and why? This is the "yap" distilled — the full picture in 2-4 paragraphs. Written for humans, not for Claude to execute directly. Include:

- The problem or opportunity
- Who it affects and how
- What the world looks like when this is done

## User Stories

Write 2-5 user stories that capture the core behaviors:

- As a [role], I want [capability] so that [benefit]
- As a [role], I want [capability] so that [benefit]

## Hard Constraints

Business rules, technical limitations, non-negotiables that apply across ALL specs in this feature:

- MUST: [constraint that every spec must respect]
- MUST NOT: [prohibition that every spec must respect]

> These propagate into every atomic spec. A constraint here means "every spec inherits this."

## Out of Scope

What this feature explicitly does NOT include. Be generous — aggressive scoping is what makes atomic specs work.

- NOT: [tempting but deferred]
- NOT: [related but separate]
- NOT: [nice-to-have that would bloat scope]

## Decomposition

Break this feature into atomic specs. Each row becomes its own ATOMIC_SPEC_TEMPLATE.md file.

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | [verb-object] | [one sentence: what changes] | None | [S/M/L] |
| 2 | [verb-object] | [one sentence: what changes] | Spec 1 | [S/M/L] |
| 3 | [verb-object] | [one sentence: what changes] | None | [S/M/L] |

**Dependency rules:**
- Specs with no dependencies can run in parallel (separate worktrees)
- Specs with dependencies must run in order
- If a spec depends on more than 2 others, it's probably too big — decompose further

**Size guide:**
- **S** = 1-2 files, < 1 hour Claude work, no plan needed
- **M** = 3-5 files, 1-2 hours, spec is the plan
- **L** = 6+ files, needs a separate implementation plan

## Execution Strategy

How should these specs be executed?

- [ ] Sequential (specs have chain dependencies)
- [ ] Agent teams (parallel teammates within phases, sequential between phases)
- [ ] Parallel worktrees (specs are independent, one session per worktree)
- [ ] Mixed (annotate in decomposition table above)

**Agent teams (recommended for 3+ specs):**
Use Claude Code agent teams to parallelize within each phase. Each teammate owns one spec file. The lead agent scaffolds shared infrastructure first, then assigns teammates per phase.

```
Phase 1: Teammate A → Spec X, Teammate B → Spec Y (no dependencies)
Phase 2: Teammate A → Spec Z (depends on Phase 1)
```

**Worktree assignment** (alternative to agent teams):
| Worktree | Specs | Branch |
|----------|-------|--------|
| main workspace | Spec 1 | `feature/verb-object-1` |
| worktree-2 | Spec 3 | `feature/verb-object-3` |

## Success Criteria

How do we know the WHOLE feature works? These are the end-to-end checks run after all specs are merged:

- [ ] [End-to-end behavior 1]
- [ ] [End-to-end behavior 2]
- [ ] [No regressions in existing features]

> These are different from per-spec acceptance criteria. These test the integration of all specs together.

## External Scenarios

Holdout tests that live OUTSIDE the codebase — the agent can't see them, can't game them. Design these during the brief, build them separately, run them AFTER all specs are merged.

| Scenario | What It Tests | Pass Criteria |
|----------|--------------|---------------|
| [scenario-name] | [behavior to verify] | [observable outcome] |

> These are the ML "holdout set" for your feature. They prevent the agent from overfitting to visible tests. At Level 4.5+, these run automatically in CI. At Level 5, failures auto-generate bug specs.
>
> Skip this section for small features (1-2 specs). Required for any feature touching user-facing behavior, data pipelines, or security.

---

## Template Usage Notes

**The interview produces this document.** The `/new-feature` skill interviews the user, then outputs a Feature Brief. The user reviews and approves it before any specs are written.

**The decomposition is the key step.** This is where the human adds the most value — breaking a large vision into small, testable, independently executable units. Bad decomposition = hallucination and drift. Good decomposition = each spec fits entirely in Claude's context.

**Rule of thumb:** If a spec in the decomposition table can't be described in one sentence, it's too big.

**The "Curse of Instructions" guard:** No single spec should need to reference this brief to be understood. Each atomic spec is self-contained. This brief is the map; the specs are the turn-by-turn directions.

**Flow:**
```
Interview (user yaps) → Feature Brief (this doc) → Decompose into N atomic specs
→ Execute each spec (worktrees) → Discoveries per spec → Merge
→ End-to-end verification (Success Criteria) → External Scenarios (holdout tests)
```

**After all specs complete:** Run the Success Criteria checklist, then run external scenarios. Scenario failures become new atomic specs (bug fixes). Record any cross-spec discoveries in the PR description.

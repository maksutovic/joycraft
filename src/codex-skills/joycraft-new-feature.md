---
name: joycraft-new-feature
description: Guided feature development — interview the user, produce a Feature Brief, then decompose into atomic specs
---

# New Feature Workflow

You are starting a new feature. Follow this process in order. Do not skip steps.

## Phase 0: Check for Existing Drafts and In-Flight Features

Before starting the interview, scan `docs/features/` for existing artifacts the user may want to continue from.

**Skip this phase if:** the user provided a brief path as an argument (they already know what to work from).

**Steps:**
1. Check if `docs/features/` exists. If not, skip to Phase 1.
2. List subdirectories. For each `docs/features/<slug>/brief.md`, read the YAML frontmatter at the top.
3. **Filter by status:** treat each brief as `status: active` unless its frontmatter says otherwise. **Skip** any brief whose `status:` is `shipped`, `deprecated`, or `superseded`. Also skip anything under `docs/archive/` — those are out-of-scope for new feature work.
4. Group what you find:
   - **Drafts** (frontmatter `status: draft`) — likely from `$joycraft-interview`.
   - **Active in-flight** (frontmatter `status: active`) — work the user already started.

5. Present them:

```
I found existing artifacts in docs/features/:

Drafts:
- docs/features/<slug>/brief.md (drafted YYYY-MM-DD)

Active features:
- docs/features/<slug>/brief.md (started YYYY-MM-DD)

Want me to:
1. **Formalize** a draft into a full Feature Brief
2. **Continue** an active feature
3. **Start a new interview** from scratch
```

6. If user picks formalize/continue: read the full brief, extract context, and jump to Phase 2 with that context pre-filled.
7. If user picks start fresh, or nothing found: proceed to Phase 1.

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

Derive a slug `YYYY-MM-DD-<feature-name>` (today's date + kebab-case feature name).
Write the Feature Brief to `docs/features/<slug>/brief.md`. Lazy-create the folder if needed.

**Slug derivation:** today's date in `YYYY-MM-DD` format, then `-`, then the feature name lower-cased and hyphen-separated. Example: a feature about "Token Discipline" started on 2026-04-06 → slug `2026-04-06-token-discipline` → folder `docs/features/2026-04-06-token-discipline/`.

**Why:** The brief is the single source of truth for what we're building. It prevents scope creep and gives every spec a shared reference point.

The brief MUST start with YAML frontmatter — the 4-field personal schema:

```yaml
---
status: active
owner: <resolved name>
created: YYYY-MM-DD
feature: <slug>
---
```

**Owner resolution:** look up the owner name in this order — (1) `git config user.name`, (2) value in your auto-memory `joycraft-owner.txt` if present, (3) ask the user once and persist. If you can't get a name, leave the field as `<resolved name>` and note it for the user.

If the brief was formalized from an existing draft, parse the existing draft's frontmatter and update `status:` from `draft` to `active`. Never silently overwrite — if the draft already has body content, preserve it and append/refine rather than replacing.

Use this structure for the body:

```markdown
# [Feature Name] — Feature Brief

> **Date:** YYYY-MM-DD
> **Project:** [project name]

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

For each row in the decomposition table, create a self-contained spec file at `docs/features/<slug>/specs/<spec-name>.md`. Lazy-create the `specs/` subfolder if it doesn't exist.

**Why:** Each spec must be understandable WITHOUT reading the Feature Brief. This prevents the "Curse of Instructions" — no spec should require holding the entire feature in context. Copy relevant context into each spec.

Each spec file MUST start with YAML frontmatter — the 4-field personal schema:

```yaml
---
status: active
owner: <resolved name>
created: YYYY-MM-DD
feature: <slug>
---
```

When listing existing in-flight features in Phase 0, ignore briefs whose `status:` is `shipped`, `deprecated`, or `superseded`. Also ignore anything under `docs/archive/`.

If `docs/backlog/` items surface during the interview as "deferred work" candidates, ask the user before writing — never auto-write to `docs/backlog/`.

Use this structure for each spec body:

```markdown
# [Verb + Object] — Atomic Spec

> **Parent Brief:** `docs/features/<slug>/brief.md`
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

## Phase 3.5: Offer to Capture Deferred Items to Backlog

If during the interview deferred work surfaces (out-of-scope items, "later" features, tangents), ASK the user:

> "This looks like deferred work — want me to capture it to `docs/backlog/`?"

Only on user confirmation, write a backlog entry at `docs/backlog/YYYY-MM-DD-<short-name>.md` with backlog frontmatter:

```yaml
---
status: backlog
owner: <resolved name>
created: YYYY-MM-DD
source: docs/features/<slug>/brief.md
---
```

**Never auto-write to `docs/backlog/`.** Every backlog entry is user-confirmed.

## Phase 4: Hand Off for Execution

Before jumping to execution, consider whether research or design would catch wrong assumptions early:

```
Feature Brief and [N] atomic specs are ready.

Specs:
1. [spec-name] — [one sentence] [S/M/L]
2. [spec-name] — [one sentence] [S/M/L]
...

Before executing, consider the complexity of this feature:

COMPLEX (5+ files, architectural decisions, unfamiliar area):
  → $joycraft-research — gather codebase facts before committing to a design
  → $joycraft-design — make architectural decisions explicit
  → Then execute specs

MEDIUM (clear scope but non-trivial):
  → $joycraft-design — make key decisions explicit before building
  → Then execute specs

SIMPLE (scope is clear, < 5 files, well-understood area):
  → Skip to execution

Recommended execution:
- [Parallel/Sequential/Mixed strategy]
- Estimated: [N] sessions total

To execute: Start a fresh session per spec. Each session should:
1. Read the spec
2. Implement
3. Run $joycraft-session-end to capture discoveries
4. Commit and PR

Ready to start?
```

End with the canonical Handoff block. Include any backlog paths produced as a side effect.

## Recommended Next Steps

Next:
```bash
$joycraft-decompose docs/features/<slug>/brief.md
```
Run run `/clear` in the CLI, or press Cmd+N (Ctrl+N on Windows/Linux) for a new thread in the desktop/IDE app first.

**Why:** A fresh session for execution produces better results. The interview session has too much context noise — a clean session with just the spec is more focused. Research and design catch wrong assumptions before they propagate into specs — but skip them if the scope is clear and well-understood.

You can also use `$joycraft-decompose` to re-decompose a brief if the breakdown needs adjustment, or run `$joycraft-interview` first for a lighter brainstorm before committing to the full workflow.

// Bundled file contents — embedded at build time since tsup bundles everything
// and we can't read files from the package at runtime.

export const SKILLS: Record<string, string> = {
  'joysmith.md': `---
name: joysmith
description: Assess your project's AI development harness — detect state, score dimensions, recommend upgrades
---

# Joysmith — Project Harness Assessment

You are evaluating this project's AI development harness. Follow these steps precisely.

## Step 1: Detect Harness State

Check the following and note what exists:

1. **CLAUDE.md** — Read it if it exists. Check whether it contains meaningful content (not just a project name or generic README).
2. **Key directories** — Check for: \`docs/specs/\`, \`docs/briefs/\`, \`docs/discoveries/\`, \`docs/templates/\`, \`.claude/skills/\`
3. **Boundary framework** — Look for \`Always\`, \`Ask First\`, and \`Never\` sections in CLAUDE.md (or similar behavioral constraints).
4. **Skills infrastructure** — Check \`.claude/skills/\` for installed skill files.
5. **Test configuration** — Look for test commands in package.json, pyproject.toml, Cargo.toml, Makefile, or CI config files.

## Step 2: Classify and Route

Based on what you found, classify the project into one of three states:

### State A: No Harness
**Trigger:** No CLAUDE.md, OR CLAUDE.md exists but has no behavioral boundaries, no spec references, and no structured sections.

**Action:** Tell the user:
- Their project has no AI development harness (or a minimal one)
- Recommend running \`npx joysmith init\` to scaffold one
- Briefly explain what Joysmith will set up: CLAUDE.md with boundaries, spec/brief templates, skills, and documentation structure
- Stop here — do not run the full assessment

### State B: Partial Harness
**Trigger:** CLAUDE.md exists with some structured content (boundaries, commands, or architecture), but not all 7 dimensions score 3.5 or above.

**Action:**
- Tell the user you've detected a partial harness and will run a detailed assessment
- Invoke the detailed assessment by running \`/joysmith-assess\`

### State C: Full Harness
**Trigger:** All of the following are true:
- CLAUDE.md has Always/Ask First/Never boundaries
- \`docs/specs/\` exists and contains spec files
- \`docs/briefs/\` exists
- \`.claude/skills/\` exists with skill files
- Test commands are configured
- Documentation structure is in place
- Knowledge capture mechanism exists (docs/discoveries/ or similar)

**Action:** Tell the user:
- Their project harness is solid across all dimensions
- Provide a quick summary of what's well-configured
- Offer to start work: "Your harness is ready. What would you like to work on? You can use \`/new-feature\` to start a new feature, or \`/decompose\` to break down a large task."

## Quick Scoring Rubric (for routing decisions)

Use these presence checks to quickly estimate scores. You do NOT need to do deep analysis here — that's what \`/joysmith-assess\` is for.

| Dimension | Score 1 (None) | Score 3 (Partial) | Score 5 (Complete) |
|-----------|---------------|-------------------|-------------------|
| Spec Quality | No specs directory | Specs exist but informal | Atomic specs with acceptance criteria |
| Spec Granularity | N/A | Large multi-session specs | Each spec fits one session |
| Behavioral Boundaries | No CLAUDE.md | CLAUDE.md without boundaries | Always/Ask First/Never sections |
| Skills & Hooks | No .claude/ directory | .claude/ exists, few skills | Multiple skills, hooks configured |
| Documentation | No docs/ directory | docs/ exists with some content | Structured docs/ with templates |
| Knowledge Capture | No discovery tracking | Ad-hoc notes | Structured discoveries directory |
| Testing & Validation | No test config | Tests exist, no CI | Tests + CI + validation commands in CLAUDE.md |

If the average quick score is 3.5 or above, classify as State C. Otherwise, classify as State B.

## Edge Cases

- **Not a git repo:** Note this to the user. Joysmith works best in a git repository. Recommend initializing one first.
- **CLAUDE.md is just a README:** Treat as State A — the file exists but isn't a harness.
- **Non-Joysmith skills already installed:** Acknowledge them. Do not suggest replacing them — suggest Joysmith skills as additions.
- **Monorepo:** Assess the root CLAUDE.md. Note if component-level CLAUDE.md files exist in subdirectories.`,

  'joysmith-assess.md': `---
name: joysmith-assess
description: Deep assessment of project harness quality — score 7 dimensions with evidence and upgrade plan
---

# Joysmith — Detailed Harness Assessment

You are performing a deep assessment of this project's AI development harness. Score each of the 7 dimensions below on a 1-5 scale, with specific evidence and recommendations.

## Instructions

1. Read CLAUDE.md thoroughly
2. Explore the project structure: check docs/, .claude/, test config, CI config
3. Score each dimension using the rubrics below
4. Write the full assessment to \`docs/joysmith-assessment.md\`
5. Display the assessment in the conversation as well

## Dimension 1: Spec Quality

**What to check:** Look in \`docs/specs/\` for specification files.

| Score | Criteria |
|-------|----------|
| 1 | No specs directory or no spec files |
| 2 | Specs exist but are informal notes or TODOs |
| 3 | Specs have structure (sections, some criteria) but lack consistency |
| 4 | Specs are structured with clear acceptance criteria and constraints |
| 5 | Atomic specs: self-contained, acceptance criteria, constraints, edge cases, affected files |

**Evidence to capture:** Number of specs found, example of best/worst spec, whether acceptance criteria are present.

## Dimension 2: Spec Granularity

**What to check:** Examine spec scope — can each spec be completed in a single coding session?

| Score | Criteria |
|-------|----------|
| 1 | No specs |
| 2 | Specs cover entire features or epics (multi-day work) |
| 3 | Specs are feature-sized (multi-session but bounded) |
| 4 | Most specs are session-sized with clear scope |
| 5 | All specs are atomic — one session, one concern, clear done state |

## Dimension 3: Behavioral Boundaries

**What to check:** Read CLAUDE.md for explicit behavioral constraints.

| Score | Criteria |
|-------|----------|
| 1 | No CLAUDE.md or no behavioral guidance |
| 2 | CLAUDE.md exists with general instructions but no structured boundaries |
| 3 | Some boundaries exist but not organized as Always/Ask First/Never |
| 4 | Always/Ask First/Never sections present with reasonable coverage |
| 5 | Comprehensive boundaries covering code style, testing, deployment, dependencies, and dangerous operations |

## Dimension 4: Skills & Hooks

**What to check:** Look in \`.claude/skills/\` for skill files.

| Score | Criteria |
|-------|----------|
| 1 | No .claude/ directory |
| 2 | .claude/ exists but empty or minimal |
| 3 | A few skills installed, no hooks |
| 4 | Multiple relevant skills, basic hooks |
| 5 | Comprehensive skill set covering workflow (new feature, decompose, session end), hooks for validation |

## Dimension 5: Documentation

**What to check:** Examine \`docs/\` directory structure and content.

| Score | Criteria |
|-------|----------|
| 1 | No docs/ directory |
| 2 | docs/ exists with ad-hoc files |
| 3 | Some structure (subdirectories) but inconsistent |
| 4 | Structured docs/ with templates and clear organization |
| 5 | Full documentation structure: briefs/, specs/, templates/, architecture docs, and CLAUDE.md references them |

## Dimension 6: Knowledge Capture

**What to check:** Look for mechanisms to capture discoveries, decisions, and session notes.

| Score | Criteria |
|-------|----------|
| 1 | No knowledge capture mechanism |
| 2 | Ad-hoc notes in random locations |
| 3 | A dedicated notes or decisions directory exists |
| 4 | Structured discoveries/decisions directory with some entries |
| 5 | Active knowledge capture: discoveries directory with entries, session-end workflow, decision log |

## Dimension 7: Testing & Validation

**What to check:** Look for test configuration, CI setup, and validation commands in CLAUDE.md.

| Score | Criteria |
|-------|----------|
| 1 | No test configuration |
| 2 | Test framework installed but few/no tests |
| 3 | Tests exist with reasonable coverage |
| 4 | Tests + CI pipeline configured |
| 5 | Tests + CI + validation commands documented in CLAUDE.md + scenario/integration tests |

## Output Format

Write the assessment in this format (both to file and conversation):

\`\`\`markdown
# Joysmith Assessment — [Project Name]

**Date:** [today's date]
**Overall Level:** [1-5, based on average score]

## Scores

| Dimension | Score | Summary |
|-----------|-------|---------|
| Spec Quality | X/5 | [one-line summary] |
| Spec Granularity | X/5 | [one-line summary] |
| Behavioral Boundaries | X/5 | [one-line summary] |
| Skills & Hooks | X/5 | [one-line summary] |
| Documentation | X/5 | [one-line summary] |
| Knowledge Capture | X/5 | [one-line summary] |
| Testing & Validation | X/5 | [one-line summary] |

**Average:** X.X/5

## Detailed Findings

### [Dimension Name] — X/5
**Evidence:** [what was found]
**Gap:** [what's missing]
**Recommendation:** [specific action]

[repeat for each dimension]

## Upgrade Plan

To reach Level [current + 1], complete these steps:

1. [Most impactful action] — addresses [dimension]
2. [Second action] — addresses [dimension]
3. [Third action] — addresses [dimension]

## Available Joysmith Skills

These skills are installed and can help with upgrades:
- \`/new-feature\` — Start a structured feature with brief and specs
- \`/decompose\` — Break a large task into atomic specs
- \`/session-end\` — Capture discoveries and learnings
- \`/joysmith-upgrade\` — Apply specific upgrades to your harness
\`\`\`

Write this assessment to \`docs/joysmith-assessment.md\`. Create the \`docs/\` directory if it doesn't exist.`,

  'new-feature.md': `---
name: new-feature
description: Guided feature development — interview the user, produce a Feature Brief, then decompose into atomic specs
---

# New Feature Workflow

You are starting a new feature. Follow this process in order. Do not skip steps.

## Phase 1: Interview

Interview the user about what they want to build. Let them talk — your job is to listen, then sharpen.

**Why:** A thorough interview prevents wasted implementation time. Most failed features fail because the problem wasn't understood, not because the code was wrong.

**Ask about:**
- What problem does this solve? Who is affected?
- What does "done" look like? How will a user know this works?
- What are the hard constraints? (business rules, tech limitations, deadlines)
- What is explicitly NOT in scope? (push hard on this — aggressive scoping is key)
- Are there edge cases or error conditions we need to handle?
- What existing code/patterns should this follow?

**Interview technique:**
- Let the user "yap" — don't interrupt their flow of ideas
- After they finish, play back your understanding: "So if I'm hearing you right..."
- Ask clarifying questions that force specificity: "When you say 'handle errors,' what should the user see?"
- Push toward testable statements: "How would we verify that works?"

Keep asking until you can fill out a Feature Brief. When ready, say:
"I have enough context. Let me write the Feature Brief for your review."

## Phase 2: Feature Brief

Write a Feature Brief to \`docs/briefs/YYYY-MM-DD-feature-name.md\`. Create the \`docs/briefs/\` directory if it doesn't exist.

**Why:** The brief is the single source of truth for what we're building. It prevents scope creep and gives every spec a shared reference point.

Use this structure:

\\\`\\\`\\\`markdown
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
\\\`\\\`\\\`

If \`docs/templates/FEATURE_BRIEF_TEMPLATE.md\` exists, reference it for the full template with additional guidance.

Present the brief to the user. Focus review on:
- "Does the decomposition match how you think about this?"
- "Is anything in scope that shouldn't be?"
- "Are the specs small enough? Can each be described in one sentence?"

Iterate until approved.

## Phase 3: Generate Atomic Specs

For each row in the decomposition table, create a self-contained spec file at \`docs/specs/YYYY-MM-DD-spec-name.md\`. Create the \`docs/specs/\` directory if it doesn't exist.

**Why:** Each spec must be understandable WITHOUT reading the Feature Brief. This prevents the "Curse of Instructions" — no spec should require holding the entire feature in context. Copy relevant context into each spec.

Use this structure for each spec:

\\\`\\\`\\\`markdown
# [Verb + Object] — Atomic Spec

> **Parent Brief:** \\\`docs/briefs/YYYY-MM-DD-feature-name.md\\\`
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
\\\`\\\`\\\`

If \`docs/templates/ATOMIC_SPEC_TEMPLATE.md\` exists, reference it for the full template with additional guidance.

## Phase 4: Hand Off for Execution

Tell the user:
\\\`\\\`\\\`
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
3. Run /session-end to capture discoveries
4. Commit and PR

Ready to start?
\\\`\\\`\\\`

**Why:** A fresh session for execution produces better results. The interview session has too much context noise — a clean session with just the spec is more focused.

You can also use \`/decompose\` to re-decompose a brief if the breakdown needs adjustment.`,

  'decompose.md': `---
name: decompose
description: Break a feature brief into atomic specs — small, testable, independently executable units
---

# Decompose Feature into Atomic Specs

You have a Feature Brief (or the user has described a feature). Your job is to decompose it into atomic specs that can be executed independently — one spec per session.

## Step 1: Verify the Brief Exists

Look for a Feature Brief in \`docs/briefs/\`. If one doesn't exist yet, tell the user:

> No feature brief found. Run \`/new-feature\` first to interview and create one, or describe the feature now and I'll work from your description.

If the user describes the feature inline, work from that description directly. You don't need a formal brief to decompose — but recommend creating one for complex features.

## Step 2: Identify Natural Boundaries

**Why:** Good boundaries make specs independently testable and committable. Bad boundaries create specs that can't be verified without other specs also being done.

Read the brief (or description) and identify natural split points:

- **Data layer changes** (schemas, types, migrations) — always a separate spec
- **Pure functions / business logic** — separate from I/O
- **UI components** — separate from data fetching
- **API endpoints / route handlers** — separate from business logic
- **Test infrastructure** (mocks, fixtures, helpers) — can be its own spec if substantial
- **Configuration / environment** — separate from code changes

Ask yourself: "Can this piece be committed and tested without the other pieces existing?" If yes, it's a good boundary.

## Step 3: Build the Decomposition Table

For each atomic spec, define:

| # | Spec Name | Description | Dependencies | Size |
|---|-----------|-------------|--------------|------|

**Rules:**
- Each spec name is \`verb-object\` format (e.g., \`add-terminal-detection\`, \`extract-prompt-module\`)
- Each description is ONE sentence — if you need two, the spec is too big
- Dependencies reference other spec numbers — keep the dependency graph shallow
- More than 2 dependencies on a single spec = it's too big, split further
- Aim for 3-7 specs per feature. Fewer than 3 = probably not decomposed enough. More than 10 = the feature brief is too big

## Step 4: Present and Iterate

Show the decomposition table to the user. Ask:
1. "Does this breakdown match how you think about this feature?"
2. "Are there any specs that feel too big or too small?"
3. "Should any of these run in parallel (separate worktrees)?"

Iterate until the user approves.

## Step 5: Generate Atomic Specs

For each approved row, create \`docs/specs/YYYY-MM-DD-spec-name.md\`. Create the \`docs/specs/\` directory if it doesn't exist.

**Why:** Each spec must be self-contained — a fresh Claude session should be able to execute it without reading the Feature Brief. Copy relevant constraints and context into each spec.

Use this structure:

\\\`\\\`\\\`markdown
# [Verb + Object] — Atomic Spec

> **Parent Brief:** \\\`docs/briefs/YYYY-MM-DD-feature-name.md\\\` (or "standalone")
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
\\\`\\\`\\\`

If \`docs/templates/ATOMIC_SPEC_TEMPLATE.md\` exists, reference it for the full template with additional guidance.

Fill in all sections — each spec must be self-contained (no "see the brief for context"). Copy relevant constraints from the Feature Brief into each spec. Write acceptance criteria specific to THIS spec, not the whole feature.

## Step 6: Recommend Execution Strategy

Based on the dependency graph:
- **Independent specs** — "These can run in parallel worktrees"
- **Sequential specs** — "Execute these in order: 1 -> 2 -> 4"
- **Mixed** — "Start specs 1 and 3 in parallel. After 1 completes, start 2."

Update the Feature Brief's Execution Strategy section with the plan (if a brief exists).

## Step 7: Hand Off

Tell the user:
\\\`\\\`\\\`
Decomposition complete:
- [N] atomic specs created in docs/specs/
- [N] can run in parallel, [N] are sequential
- Estimated total: [N] sessions

To execute:
- Sequential: Open a session, point Claude at each spec in order
- Parallel: Use worktrees — one spec per worktree, merge when done
- Each session should end with /session-end to capture discoveries

Ready to start execution?
\\\`\\\`\\\``,

  'session-end.md': `---
name: session-end
description: Wrap up a session — capture discoveries, verify, prepare for PR or next session
---

# Session Wrap-Up

Before ending this session, complete these steps in order.

## 1. Capture Discoveries

**Why:** Discoveries are the surprises — things that weren't in the spec or that contradicted expectations. They prevent future sessions from hitting the same walls.

Check: did anything surprising happen during this session? If yes, create or update a discovery file at \`docs/discoveries/YYYY-MM-DD-topic.md\`. Create the \`docs/discoveries/\` directory if it doesn't exist.

Only capture what's NOT obvious from the code or git diff:
- "We thought X but found Y" — assumptions that were wrong
- "This API/library behaves differently than documented" — external gotchas
- "This edge case needs handling in a future spec" — deferred work with context
- "The approach in the spec didn't work because..." — spec-vs-reality gaps
- Key decisions made during implementation that aren't in the spec

**Do NOT capture:**
- Files changed (that's the diff)
- What you set out to do (that's the spec)
- Step-by-step narrative of the session (nobody re-reads these)

Use this format:

\\\`\\\`\\\`markdown
# Discoveries — [topic]

**Date:** YYYY-MM-DD
**Spec:** [link to spec if applicable]

## [Discovery title]
**Expected:** [what we thought would happen]
**Actual:** [what actually happened]
**Impact:** [what this means for future work]
\\\`\\\`\\\`

If nothing surprising happened, skip the discovery file entirely. No discovery is a good sign — the spec was accurate.

## 2. Run Validation

Run the project's validation commands. Check CLAUDE.md for project-specific commands. Common checks:

- Type-check (e.g., \`tsc --noEmit\`, \`mypy\`, \`cargo check\`)
- Tests (e.g., \`npm test\`, \`pytest\`, \`cargo test\`)
- Lint (e.g., \`eslint\`, \`ruff\`, \`clippy\`)

Fix any failures before proceeding.

## 3. Update Spec Status

If working from an atomic spec in \`docs/specs/\`:
- All acceptance criteria met — update status to \`Complete\`
- Partially done — update status to \`In Progress\`, note what's left

If working from a Feature Brief in \`docs/briefs/\`, check off completed specs in the decomposition table.

## 4. Commit

Commit all changes including the discovery file (if created) and spec status updates. The commit message should reference the spec if applicable.

## 5. Report

\\\`\\\`\\\`
Session complete.
- Spec: [spec name] — [Complete / In Progress]
- Build: [passing / failing]
- Discoveries: [N items / none]
- Next: [what the next session should tackle, or "ready for PR"]
\\\`\\\`\\\``,
};

export const TEMPLATES: Record<string, string> = {
  'ATOMIC_SPEC_TEMPLATE.md': `# [Verb + Object] — Atomic Spec

> **Parent Brief:** \`docs/briefs/YYYY-MM-DD-feature-name.md\` (or "standalone")
> **Status:** Draft | Ready | In Progress | Complete
> **Date:** YYYY-MM-DD
> **Estimated scope:** [1 session / 2-3 files / ~N lines]

---

## What

One paragraph. What changes when this spec is done? A developer with no context should understand the change in 15 seconds.

## Why

One sentence. What breaks, hurts, or is missing without this? Links to the parent brief if part of a larger feature.

## Acceptance Criteria

- [ ] [Observable behavior — what a human would see/verify]
- [ ] [Another observable behavior]
- [ ] [Regression: existing behavior X still works]
- [ ] Build passes
- [ ] Tests pass

> These are your "done" checkboxes. If Claude says "done" and these aren't all green, it's not done.

## Constraints

- MUST: [hard requirement]
- MUST NOT: [hard prohibition]
- SHOULD: [strong preference, with rationale]

> Use RFC 2119 language. 2-5 constraints is typical. Zero is a red flag — every change has boundaries.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | \`path/to/file.ts\` | [brief description] |
| Modify | \`path/to/file.ts\` | [what specifically changes] |

## Approach

How this will be implemented. Not pseudo-code — describe the strategy, data flow, and key decisions. Name one rejected alternative and why it was rejected.

_Scale to complexity: 3 sentences for a bug fix, 1 page max for a feature. If you need more than a page, this spec is too big — decompose further._

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| [what could go wrong] | [what should happen] |

> Skip for trivial changes. Required for anything touching user input, data, or external APIs.`,

  'FEATURE_BRIEF_TEMPLATE.md': `# [Feature Name] — Feature Brief

> **Date:** YYYY-MM-DD
> **Project:** [project name]
> **Status:** Interview | Decomposing | Specs Ready | In Progress | Complete

---

## Vision

What are we building and why? This is the "yap" distilled — the full picture in 2-4 paragraphs.

## User Stories

- As a [role], I want [capability] so that [benefit]

## Hard Constraints

- MUST: [constraint that every spec must respect]
- MUST NOT: [prohibition that every spec must respect]

## Out of Scope

- NOT: [tempting but deferred]

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | [verb-object] | [one sentence] | None | [S/M/L] |

## Execution Strategy

- [ ] Sequential (specs have chain dependencies)
- [ ] Agent teams (parallel teammates within phases)
- [ ] Parallel worktrees (specs are independent)

## Success Criteria

- [ ] [End-to-end behavior 1]
- [ ] [No regressions in existing features]`,

  'IMPLEMENTATION_PLAN_TEMPLATE.md': `# [Feature Name] — Implementation Plan

> **Design Spec:** \`docs/specs/YYYY-MM-DD-feature-name.md\`
> **Date:** YYYY-MM-DD
> **Estimated Tasks:** [number]

---

## Prerequisites

- [ ] Design spec is approved
- [ ] Branch created (if warranted): \`feature/feature-name\`
- [ ] Required context loaded: [list any docs Claude should read first]

## Task 1: [Descriptive Name]

**Goal:** One sentence — what is true after this task that wasn't true before.

**Files:**
- \`path/to/file.ts\` — [what changes]

**Steps:**
1. [Concrete action]
2. [Next concrete action]

**Verification:**
- [ ] [How to confirm this task worked]

**Commit:** \`feat: description\`

---

## Task N: Final Verification

**Goal:** Confirm everything works end-to-end.

**Steps:**
1. Run full type-check
2. Run linter
3. Run tests
4. Walk through verification checklist from design spec

**Verification:**
- [ ] All design spec verification items pass
- [ ] No regressions in existing functionality`,

  'BOUNDARY_FRAMEWORK.md': `# Boundary Framework

> Add this to the TOP of your CLAUDE.md, before any project context.
> Customize the specific rules per project, but keep the three-tier structure.

---

## Behavioral Boundaries

### ALWAYS (do these without asking)
- Run type-check and lint before every commit
- Commit after completing each discrete task (atomic commits)
- Follow patterns in existing code — match existing code style
- Check the active implementation plan before starting work

### ASK FIRST (pause and confirm before doing these)
- Adding new dependencies
- Modifying database schema, migrations, or data models
- Changing authentication or authorization flows
- Deviating from an approved implementation plan
- Any destructive operation (deleting files, dropping tables, force-pushing)
- Modifying CI/CD, deployment, or infrastructure configuration

### NEVER (do not do these under any circumstances)
- Push to production or main branch without explicit approval
- Delete specs, plans, or documentation
- Modify environment variables or secrets
- Skip type-checking or linting to "save time"
- Make changes outside the scope of the current spec/plan
- Commit code that doesn't build
- Remove or weaken existing tests
- Hardcode secrets, API keys, or credentials`,
};

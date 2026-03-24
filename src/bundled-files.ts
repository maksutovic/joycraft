// Bundled file contents — embedded at build time since tsup bundles everything
// and we cannot read files from the package at runtime.

export const SKILLS: Record<string, string> = {
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

\`\`\`markdown
# [Verb + Object] — Atomic Spec

> **Parent Brief:** \`docs/briefs/YYYY-MM-DD-feature-name.md\` (or "standalone")
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
\`\`\`

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
\`\`\`
Decomposition complete:
- [N] atomic specs created in docs/specs/
- [N] can run in parallel, [N] are sequential
- Estimated total: [N] sessions

To execute:
- Sequential: Open a session, point Claude at each spec in order
- Parallel: Use worktrees — one spec per worktree, merge when done
- Each session should end with /session-end to capture discoveries

Ready to start execution?
\`\`\`
`,

  'interview.md': `---
name: interview
description: Brainstorm freely about what you want to build — yap, explore ideas, and get a structured summary you can use later
---

# Interview — Idea Exploration

You are helping the user brainstorm and explore what they want to build. This is a lightweight, low-pressure conversation — not a formal spec process. Let them yap.

## How to Run the Interview

### 1. Open the Floor

Start with something like:
"What are you thinking about building? Just talk — I'll listen and ask questions as we go."

Let the user talk freely. Do not interrupt their flow. Do not push toward structure yet.

### 2. Ask Clarifying Questions

As they talk, weave in questions naturally — don't fire them all at once:

- **What problem does this solve?** Who feels the pain today?
- **What does "done" look like?** If this worked perfectly, what would a user see?
- **What are the constraints?** Time, tech, team, budget — what boxes are we in?
- **What's NOT in scope?** What's tempting but should be deferred?
- **What are the edge cases?** What could go wrong? What's the weird input?
- **What exists already?** Are we building on something or starting fresh?

### 3. Play Back Understanding

After the user has gotten their ideas out, reflect back:
"So if I'm hearing you right, you want to [summary]. The core problem is [X], and done looks like [Y]. Is that right?"

Let them correct and refine. Iterate until they say "yes, that's it."

### 4. Write a Draft Brief

Create a draft file at \`docs/briefs/YYYY-MM-DD-topic-draft.md\`. Create the \`docs/briefs/\` directory if it doesn't exist.

Use this format:

\`\`\`markdown
# [Topic] — Draft Brief

> **Date:** YYYY-MM-DD
> **Status:** DRAFT
> **Origin:** /interview session

---

## The Idea
[2-3 paragraphs capturing what the user described — their words, their framing]

## Problem
[What pain or gap this addresses]

## What "Done" Looks Like
[The user's description of success — observable outcomes]

## Constraints
- [constraint 1]
- [constraint 2]

## Open Questions
- [things that came up but weren't resolved]
- [decisions that need more thought]

## Out of Scope (for now)
- [things explicitly deferred]

## Raw Notes
[Any additional context, quotes, or tangents worth preserving]
\`\`\`

### 5. Hand Off

After writing the draft, tell the user:

\`\`\`
Draft brief saved to docs/briefs/YYYY-MM-DD-topic-draft.md

When you're ready to move forward:
- /new-feature — formalize this into a full Feature Brief with specs
- /decompose — break it directly into atomic specs if scope is clear
- Or just keep brainstorming — run /interview again anytime
\`\`\`

## Guidelines

- **This is NOT /new-feature.** Do not push toward formal briefs, decomposition tables, or atomic specs. The point is exploration.
- **Let the user lead.** Your job is to listen, clarify, and capture — not to structure or direct.
- **Mark everything as DRAFT.** The output is a starting point, not a commitment.
- **Keep it short.** The draft brief should be 1-2 pages max. Capture the essence, not every detail.
- **Multiple interviews are fine.** The user might run this several times as their thinking evolves. Each creates a new dated draft.
`,

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

\`\`\`markdown
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
\`\`\`

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

\`\`\`markdown
# [Verb + Object] — Atomic Spec

> **Parent Brief:** \`docs/briefs/YYYY-MM-DD-feature-name.md\`
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
\`\`\`

If \`docs/templates/ATOMIC_SPEC_TEMPLATE.md\` exists, reference it for the full template with additional guidance.

## Phase 4: Hand Off for Execution

Tell the user:
\`\`\`
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
\`\`\`

**Why:** A fresh session for execution produces better results. The interview session has too much context noise — a clean session with just the spec is more focused.

You can also use \`/decompose\` to re-decompose a brief if the breakdown needs adjustment, or run \`/interview\` first for a lighter brainstorm before committing to the full workflow.
`,

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

\`\`\`markdown
# Discoveries — [topic]

**Date:** YYYY-MM-DD
**Spec:** [link to spec if applicable]

## [Discovery title]
**Expected:** [what we thought would happen]
**Actual:** [what actually happened]
**Impact:** [what this means for future work]
\`\`\`

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

\`\`\`
Session complete.
- Spec: [spec name] — [Complete / In Progress]
- Build: [passing / failing]
- Discoveries: [N items / none]
- Next: [what the next session should tackle, or "ready for PR"]
\`\`\`
`,

  'tune.md': `---
name: tune
description: Assess and upgrade your project's AI development harness — score 7 dimensions, apply fixes, show path to Level 5
---

# Tune — Project Harness Assessment & Upgrade

You are evaluating and upgrading this project's AI development harness. Follow these steps in order.

## Step 1: Detect Harness State

Check the following and note what exists:

1. **CLAUDE.md** — Read it if it exists. Check whether it contains meaningful content (not just a project name or generic README).
2. **Key directories** — Check for: \`docs/specs/\`, \`docs/briefs/\`, \`docs/discoveries/\`, \`docs/templates/\`, \`.claude/skills/\`
3. **Boundary framework** — Look for \`Always\`, \`Ask First\`, and \`Never\` sections in CLAUDE.md (or similar behavioral constraints under any heading).
4. **Skills infrastructure** — Check \`.claude/skills/\` for installed skill files.
5. **Test configuration** — Look for test commands in package.json, pyproject.toml, Cargo.toml, Makefile, or CI config files.

## Step 2: Route Based on State

### If No Harness (no CLAUDE.md, or CLAUDE.md is just a README with no structured sections):

Tell the user:
- Their project has no AI development harness
- Recommend running \`npx joycraft init\` to scaffold one
- Briefly explain what it sets up: CLAUDE.md with boundaries, spec/brief templates, skills, documentation structure
- **Stop here** — do not run the full assessment on a bare project

### If Harness Exists (CLAUDE.md has structured content — boundaries, commands, architecture, or domain rules):

Continue to Step 3 for the full assessment.

## Step 3: Score 7 Dimensions

Read CLAUDE.md thoroughly. Explore the project structure. Score each dimension on a 1-5 scale with specific evidence.

### Dimension 1: Spec Quality

Look in \`docs/specs/\` for specification files.

| Score | Criteria |
|-------|----------|
| 1 | No specs directory or no spec files |
| 2 | Specs exist but are informal notes or TODOs |
| 3 | Specs have structure (sections, some criteria) but lack consistency |
| 4 | Specs are structured with clear acceptance criteria and constraints |
| 5 | Atomic specs: self-contained, acceptance criteria, constraints, edge cases, affected files |

**Evidence:** Number of specs found, example of best/worst, whether acceptance criteria are present.

### Dimension 2: Spec Granularity

Can each spec be completed in a single coding session?

| Score | Criteria |
|-------|----------|
| 1 | No specs |
| 2 | Specs cover entire features or epics |
| 3 | Specs are feature-sized (multi-session but bounded) |
| 4 | Most specs are session-sized with clear scope |
| 5 | All specs are atomic — one session, one concern, clear done state |

### Dimension 3: Behavioral Boundaries

Read CLAUDE.md for explicit behavioral constraints.

| Score | Criteria |
|-------|----------|
| 1 | No CLAUDE.md or no behavioral guidance |
| 2 | CLAUDE.md exists with general instructions but no structured boundaries |
| 3 | Some boundaries exist but not organized as Always/Ask First/Never |
| 4 | Always/Ask First/Never sections present with reasonable coverage |
| 5 | Comprehensive boundaries covering code style, testing, deployment, dependencies, and dangerous operations |

**Important:** Projects may have strong rules under different headings (e.g., "Critical Rules", "Constraints"). Give credit for substance over format — a project with clear, enforced rules scores higher than one with empty Always/Ask First/Never sections.

### Dimension 4: Skills & Hooks

Look in \`.claude/skills/\` for skill files. Check for hooks configuration.

| Score | Criteria |
|-------|----------|
| 1 | No .claude/ directory |
| 2 | .claude/ exists but empty or minimal |
| 3 | A few skills installed, no hooks |
| 4 | Multiple relevant skills, basic hooks |
| 5 | Comprehensive skills covering workflow, hooks for validation |

### Dimension 5: Documentation

Examine \`docs/\` directory structure and content.

| Score | Criteria |
|-------|----------|
| 1 | No docs/ directory |
| 2 | docs/ exists with ad-hoc files |
| 3 | Some structure (subdirectories) but inconsistent |
| 4 | Structured docs/ with templates and clear organization |
| 5 | Full structure: briefs/, specs/, templates/, architecture docs, referenced from CLAUDE.md |

### Dimension 6: Knowledge Capture

Look for discoveries, decisions, and session notes.

| Score | Criteria |
|-------|----------|
| 1 | No knowledge capture mechanism |
| 2 | Ad-hoc notes in random locations |
| 3 | A dedicated notes or decisions directory exists |
| 4 | Structured discoveries/decisions directory with entries |
| 5 | Active capture: discoveries with entries, session-end workflow, decision log |

### Dimension 7: Testing & Validation

Look for test config, CI setup, and validation commands.

| Score | Criteria |
|-------|----------|
| 1 | No test configuration |
| 2 | Test framework installed but few/no tests |
| 3 | Tests exist with reasonable coverage |
| 4 | Tests + CI pipeline configured |
| 5 | Tests + CI + validation commands in CLAUDE.md + scenario tests |

## Step 4: Write Assessment

Write the assessment to \`docs/joycraft-assessment.md\` AND display it in the conversation. Use this format:

\`\`\`markdown
# Joycraft Assessment — [Project Name]

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
**Evidence:** [specific files, paths, counts found]
**Gap:** [what's missing]
**Recommendation:** [specific action to improve]

## Upgrade Plan

To reach Level [current + 1], complete these steps:
1. [Most impactful action] — addresses [dimension] (X -> Y)
2. [Next action] — addresses [dimension] (X -> Y)
[up to 5 actions, ordered by impact]
\`\`\`

## Step 5: Apply Upgrades

Immediately after presenting the assessment, apply upgrades using the three-tier model below. Do NOT ask for per-item permission — batch everything and show a consolidated report at the end.

### Tier 1: Silent Apply (just do it)
These are safe, additive operations. Apply them without asking:
- Create missing directories (\`docs/specs/\`, \`docs/briefs/\`, \`docs/discoveries/\`, \`docs/templates/\`)
- Install missing skills to \`.claude/skills/\`
- Copy missing templates to \`docs/templates/\`
- Create AGENTS.md if it doesn't exist

### Tier 2: Apply and Show Diff (do it, then report)
These modify important files but are additive (append-only). Apply them, then show what changed so the user can review. Git is the undo button.
- Add missing sections to CLAUDE.md (Behavioral Boundaries, Development Workflow, Getting Started with Joycraft, Key Files, Common Gotchas)
- Draft section content from the actual codebase — not generic placeholders. Read the project's real rules, real commands, real structure.
- Only append — never modify or reformat existing content

### Tier 3: Confirm First (ask before acting)
These are potentially destructive or opinionated. Ask before proceeding:
- Rewriting or reorganizing existing CLAUDE.md sections
- Overwriting files the user has customized
- Suggesting test framework installation or CI setup (present as recommendations, don't auto-install)

### Reading a Previous Assessment

If \`docs/joycraft-assessment.md\` already exists, read it first. If all recommendations have been applied, report "nothing to upgrade" and offer to re-assess.

### After Applying

Append a history entry to \`docs/joycraft-history.md\` (create if needed):
\`\`\`
| [date] | [new avg score] | [change from last] | [summary of what changed] |
\`\`\`

Then display a single consolidated report:

\`\`\`markdown
## Upgrade Results

| Dimension              | Before | After | Change |
|------------------------|--------|-------|--------|
| Spec Quality           | X/5    | X/5   | +X     |
| ...                    | ...    | ...   | ...    |

**Previous Level:** X — **New Level:** X

### What Changed
- [list each change applied]

### Remaining Gaps
- [anything still below 3.5, with specific next action]
\`\`\`

Update \`docs/joycraft-assessment.md\` with the new scores and today's date.

## Step 6: Show Path to Level 5

After the upgrade report, always show the Level 5 roadmap tailored to the project's current state:

\`\`\`markdown
## Path to Level 5 — Autonomous Development

You're at Level [X]. Here's what each level looks like:

| Level | You | AI | Key Skill |
|-------|-----|-----|-----------|
| 2 | Guide direction | Multi-file changes | AI-native tooling |
| 3 | Review diffs | Primary developer | Code review at scale |
| 4 | Write specs, check tests | End-to-end development | Specification writing |
| 5 | Define what + why | Specs in, software out | Systems design |

### Your Next Steps Toward Level [X+1]:
1. [Specific action based on current gaps — e.g., "Write your first atomic spec using /new-feature"]
2. [Next action — e.g., "Add vitest and write tests for your core logic"]
3. [Next action — e.g., "Use /session-end consistently to build your discoveries log"]

### What Level 5 Looks Like (Your North Star):
- A backlog of ready specs that agents pull from and execute autonomously
- CI failures auto-generate fix specs — no human triage for regressions
- Multi-agent execution with parallel worktrees, one spec per agent
- External holdout scenarios (tests the agent can't see) prevent overfitting
- CLAUDE.md evolves from discoveries — the harness improves itself

### You'll Know You're at Level 5 When:
- You describe a feature in one sentence and walk away
- The system produces a PR with tests, docs, and discoveries — without further input
- Failed CI runs generate their own fix specs
- Your harness improves without you manually editing CLAUDE.md

This is a significant journey. Most teams are at Level 2. Getting to Level 4 with Joycraft's workflow is achievable — Level 5 requires building validation infrastructure (scenario tests, spec queues, CI feedback loops) that goes beyond what Joycraft scaffolds today. But the harness you're building now is the foundation.
\`\`\`

Tailor the "Next Steps" section based on the project's actual gaps — don't show generic advice.

## Edge Cases

- **Not a git repo:** Note this. Joycraft works best in a git repo.
- **CLAUDE.md is just a README:** Treat as "no harness."
- **Non-Joycraft skills already installed:** Acknowledge them. Do not replace — suggest additions.
- **Monorepo:** Assess the root CLAUDE.md. Note if component-level CLAUDE.md files exist.
- **Project has rules under non-standard headings:** Give credit. Suggest reformatting as Always/Ask First/Never but acknowledge the rules are there.
- **Assessment file missing when upgrading:** Run the full assessment first, then offer to apply.
- **Assessment is stale:** Warn and offer to re-assess before proceeding.
- **All recommendations already applied:** Report "nothing to upgrade" and stop.
- **User declines a recommendation:** Skip it, continue, include in "What Was Skipped."
- **CLAUDE.md does not exist at all:** Create it with recommended sections, but ask the user first.
- **Non-Joycraft content in CLAUDE.md:** Preserve exactly as-is. Only append or merge — never remove or reformat existing content.
`,

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
  'examples/example-brief.md': `# Add User Notifications — Feature Brief

> **Date:** 2026-03-15
> **Project:** acme-web
> **Status:** Specs Ready

---

## Vision

Our users have no idea when things happen in their account. A teammate comments on their pull request, a deployment finishes, a billing threshold is hit — they find out by accident, minutes or hours later. This is the #1 complaint in our last user survey.

We are building a notification system that delivers real-time and batched notifications across in-app, email, and (later) Slack channels. Users will have fine-grained control over what they receive and how. When this ships, no important event goes unnoticed, and no user gets buried in noise they didn't ask for.

The system is designed to be extensible — new event types plug in without touching the notification infrastructure. We start with three event types (PR comments, deploy status, billing alerts) and prove the pattern works before expanding.

## User Stories

- As a developer, I want to see a notification badge in the app when someone comments on my PR so that I can respond quickly
- As a team lead, I want to receive an email when a production deployment fails so that I can coordinate the response
- As a billing admin, I want to get alerted when usage exceeds 80% of our plan limit so that I can upgrade before service is disrupted
- As any user, I want to control which notifications I receive and through which channels so that I am not overwhelmed

## Hard Constraints

- MUST: All notifications go through a single event bus — no direct coupling between event producers and delivery channels
- MUST: Email delivery uses the existing SendGrid integration (do not add a new email provider)
- MUST: Respect user preferences before delivering — never send a notification the user has opted out of
- MUST NOT: Store notification content in plaintext in the database — use the existing encryption-at-rest pattern
- MUST NOT: Send more than 50 emails per user per day (batch if necessary)

## Out of Scope

- NOT: Slack/Discord integration (Phase 2)
- NOT: Push notifications / mobile (Phase 2)
- NOT: Notification templates with rich HTML — plain text and simple markdown only for now
- NOT: Admin dashboard for monitoring notification delivery rates
- NOT: Retroactive notifications for events that happened before the feature ships

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | add-notification-preferences-api | Create REST endpoints for users to read and update their notification preferences | None | M |
| 2 | add-event-bus-infrastructure | Set up the internal event bus that decouples event producers from notification delivery | None | M |
| 3 | add-notification-delivery-service | Build the service that consumes events, checks preferences, and dispatches to channels (in-app, email) | Spec 1, Spec 2 | L |
| 4 | add-in-app-notification-ui | Add notification bell, dropdown, and badge count to the app header | Spec 3 | M |
| 5 | add-email-batching | Implement daily digest batching for email notifications that exceed the per-user threshold | Spec 3 | S |

## Execution Strategy

- [x] Agent teams (parallel teammates within phases, sequential between phases)

\`\`\`
Phase 1: Teammate A -> Spec 1 (preferences API), Teammate B -> Spec 2 (event bus)
Phase 2: Teammate A -> Spec 3 (delivery service) — depends on Phase 1
Phase 3: Teammate A -> Spec 4 (UI), Teammate B -> Spec 5 (batching) — both depend on Spec 3
\`\`\`

## Success Criteria

- [ ] User updates notification preferences via API, and subsequent events respect those preferences
- [ ] A PR comment event triggers an in-app notification visible in the UI within 2 seconds
- [ ] A deploy failure event sends an email to subscribed users via SendGrid
- [ ] When email threshold (50/day) is exceeded, remaining notifications are batched into a daily digest
- [ ] No regressions in existing PR, deployment, or billing features

## External Scenarios

| Scenario | What It Tests | Pass Criteria |
|----------|--------------|---------------|
| opt-out-respected | User disables email for deploy events, deploy fails | No email sent, in-app notification still appears |
| batch-threshold | Send 51 email-eligible events for one user in a day | 50 individual emails + 1 digest containing the overflow |
| preference-persistence | User sets preferences, logs out, logs back in | Preferences are unchanged |
`,

  'examples/example-spec.md': `# Add Notification Preferences API — Atomic Spec

> **Parent Brief:** \`docs/briefs/2026-03-15-add-user-notifications.md\`
> **Status:** Ready
> **Date:** 2026-03-15
> **Estimated scope:** 1 session / 4 files / ~250 lines

---

## What

Add REST API endpoints that let users read and update their notification preferences. Each user gets a preferences record with per-event-type, per-channel toggles (e.g., "PR comments: in-app=on, email=off"). Preferences default to all-on for new users and are stored encrypted alongside the user profile.

## Why

The notification delivery service (Spec 3) needs to check preferences before dispatching. Without this API, there is no way for users to control what they receive, and we cannot build the delivery pipeline.

## Acceptance Criteria

- [ ] \`GET /api/v1/notifications/preferences\` returns the current user's preferences as JSON
- [ ] \`PATCH /api/v1/notifications/preferences\` updates one or more preference fields and returns the updated record
- [ ] New users get default preferences (all channels enabled for all event types) on first read
- [ ] Preferences are validated — unknown event types or channels return 400
- [ ] Preferences are stored using the existing encryption-at-rest pattern (\`EncryptedJsonColumn\`)
- [ ] Endpoint requires authentication (returns 401 for unauthenticated requests)
- [ ] Build passes
- [ ] Tests pass (unit + integration)

## Constraints

- MUST: Use the existing \`EncryptedJsonColumn\` utility for storage — do not roll a new encryption pattern
- MUST: Follow the existing REST controller pattern in \`src/controllers/\`
- MUST NOT: Expose other users' preferences (scope queries to authenticated user only)
- SHOULD: Return the full preferences object on PATCH (not just the changed fields), so the frontend can replace state without merging

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | \`src/controllers/notification-preferences.controller.ts\` | New controller with GET and PATCH handlers |
| Create | \`src/models/notification-preferences.model.ts\` | Sequelize model with EncryptedJsonColumn for preferences blob |
| Create | \`src/migrations/20260315-add-notification-preferences.ts\` | Database migration to create notification_preferences table |
| Create | \`tests/controllers/notification-preferences.test.ts\` | Unit and integration tests for both endpoints |
| Modify | \`src/routes/index.ts\` | Register the new controller routes |

## Approach

Create a \`NotificationPreferences\` model backed by a single \`notification_preferences\` table with columns: \`id\`, \`user_id\` (unique FK), \`preferences\` (EncryptedJsonColumn), \`created_at\`, \`updated_at\`. The \`preferences\` column stores a JSON blob shaped like \`{ "pr_comment": { "in_app": true, "email": true }, "deploy_status": { ... } }\`.

The GET endpoint does a find-or-create: if no record exists for the user, create one with defaults and return it. The PATCH endpoint deep-merges the request body into the existing preferences, validates the result against a known schema of event types and channels, and saves.

**Rejected alternative:** Storing preferences as individual rows (one per event-type-channel pair). This would make queries more complex and would require N rows per user instead of 1. The JSON blob approach is simpler and matches how the frontend will consume the data.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| PATCH with empty body \`{}\` | Return 200 with unchanged preferences (no-op) |
| PATCH with unknown event type \`{"foo": {"email": true}}\` | Return 400 with validation error listing valid event types |
| GET for user with no existing record | Create default preferences, return 200 |
| Concurrent PATCH requests | Last-write-wins (optimistic, no locking) — acceptable for user preferences |
`,

};

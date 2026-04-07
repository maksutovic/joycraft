// Bundled file contents — embedded at build time

export const SKILLS: Record<string, string> = {
  "joycraft-add-fact.md": `---
name: joycraft-add-fact
description: Capture a project fact and route it to the correct context document -- production map, dangerous assumptions, decision log, institutional knowledge, or troubleshooting
instructions: 38
---

# Add Fact

The user has a fact to capture. Your job is to classify it, route it to the correct context document, append it in the right format, and optionally add a CLAUDE.md boundary rule.

## Step 1: Get the Fact

If the user already provided the fact (e.g., \`/joycraft-add-fact the staging DB resets every Sunday\`), use it directly.

If not, ask: "What fact do you want to capture?" -- then wait for their response.

If the user provides multiple facts at once, process each one separately through all the steps below, then give a combined confirmation at the end.

## Step 2: Classify the Fact

Route the fact to one of these 5 context documents based on its content:

### \`docs/context/production-map.md\`
The fact is about **infrastructure, services, environments, URLs, endpoints, credentials, or what is safe/unsafe to touch**.
- Signal words: "production", "staging", "endpoint", "URL", "database", "service", "deployed", "hosted", "credentials", "secret", "environment"
- Examples: "The staging DB is at postgres://staging.example.com", "We use Vercel for the frontend and Railway for the API"

### \`docs/context/dangerous-assumptions.md\`
The fact is about **something an AI agent might get wrong -- a false assumption that leads to bad outcomes**.
- Signal words: "assumes", "might think", "but actually", "looks like X but is Y", "not what it seems", "trap", "gotcha"
- Examples: "The \`users\` table looks like a test table but it's production", "Deleting a workspace doesn't delete the billing subscription"

### \`docs/context/decision-log.md\`
The fact is about **an architectural or tooling choice and why it was made**.
- Signal words: "decided", "chose", "because", "instead of", "we went with", "the reason we use", "trade-off"
- Examples: "We chose SQLite over Postgres because this runs on embedded devices", "We use pnpm instead of npm for workspace support"

### \`docs/context/institutional-knowledge.md\`
The fact is about **team conventions, unwritten rules, organizational context, or who owns what**.
- Signal words: "convention", "rule", "always", "never", "team", "process", "review", "approval", "owns", "responsible"
- Examples: "The design team reviews all color changes", "We never deploy on Fridays", "PR titles must start with the ticket number"

### \`docs/context/troubleshooting.md\`
The fact is about **diagnostic knowledge -- when X happens, do Y (or don't do Z)**.
- Signal words: "when", "fails", "error", "if you see", "stuck", "broken", "fix", "workaround", "before trying", "reboot", "restart", "reset"
- Examples: "If Wi-Fi disconnects during flash, wait and retry -- don't switch networks", "When tests fail with ECONNREFUSED, check if Docker is running"

### Ambiguous Facts

If the fact fits multiple categories, pick the **best fit** based on the primary intent. You will mention the alternative in your confirmation message so the user can correct you.

## Step 3: Ensure the Target Document Exists

1. If \`docs/context/\` does not exist, create the directory.
2. If the target document does not exist, create it from the template structure. Check \`docs/templates/\` for the matching template. If no template exists, use this minimal structure:

For **production-map.md**:
\`\`\`markdown
# Production Map

> What's real, what's staging, what's safe to touch.

## Services

| Service | Environment | URL/Endpoint | Impact if Corrupted |
|---------|-------------|-------------|-------------------|
\`\`\`

For **dangerous-assumptions.md**:
\`\`\`markdown
# Dangerous Assumptions

> Things the AI agent might assume that are wrong in this project.

## Assumptions

| Agent Might Assume | But Actually | Impact If Wrong |
|-------------------|-------------|----------------|
\`\`\`

For **decision-log.md**:
\`\`\`markdown
# Decision Log

> Why choices were made, not just what was chosen.

## Decisions

| Date | Decision | Why | Alternatives Rejected | Revisit When |
|------|----------|-----|----------------------|-------------|
\`\`\`

For **institutional-knowledge.md**:
\`\`\`markdown
# Institutional Knowledge

> Unwritten rules, team conventions, and organizational context.

## Team Conventions

- (none yet)
\`\`\`

For **troubleshooting.md**:
\`\`\`markdown
# Troubleshooting

> What to do when things go wrong for non-code reasons.

## Common Failures

| When This Happens | Do This | Don't Do This |
|-------------------|---------|---------------|
\`\`\`

## Step 4: Read the Target Document

Read the target document to understand its current structure. Note:
- Which section to append to
- Whether it uses tables or lists
- The column format if it's a table

## Step 5: Append the Fact

Add the fact to the appropriate section of the target document. Match the existing format exactly:

- **Table-based documents** (production-map, dangerous-assumptions, decision-log, troubleshooting): Add a new table row in the correct columns. Use today's date where a date column exists.
- **List-based documents** (institutional-knowledge): Add a new list item (\`- \`) to the most appropriate section.

Remove any italic example rows (rows where all cells start with \`_\`) before appending, so the document transitions from template to real content. Only remove examples from the specific table you are appending to.

**Append only. Never modify or remove existing real content.**

## Step 6: Evaluate CLAUDE.md Boundary Rule

Decide whether the fact also warrants a rule in CLAUDE.md's behavioral boundaries:

**Add a CLAUDE.md rule if the fact:**
- Describes something that should ALWAYS or NEVER be done
- Could cause real damage if violated (data loss, broken deployments, security issues)
- Is a hard constraint that applies across all work, not just a one-time note

**Do NOT add a CLAUDE.md rule if the fact is:**
- Purely informational (e.g., "staging DB is at this URL")
- A one-time decision that's already captured
- A diagnostic tip rather than a prohibition

If a rule is warranted, read CLAUDE.md, find the appropriate section (ALWAYS, ASK FIRST, or NEVER under Behavioral Boundaries), and append the rule. If no Behavioral Boundaries section exists, append one.

## Step 7: Confirm

Report what you did in this format:

\`\`\`
Added to [document name]:
  [summary of what was added]

[If CLAUDE.md was also updated:]
Added CLAUDE.md rule:
  [ALWAYS/ASK FIRST/NEVER]: [rule text]

[If the fact was ambiguous:]
Routed to [chosen doc] -- move to [alternative doc] if this is more about [alternative category description].
\`\`\`
`,

  "joycraft-bugfix.md": `---
name: joycraft-bugfix
description: Structured bug fix workflow — triage, diagnose, discuss with user, write a focused spec, hand off for implementation
instructions: 32
---

# Bug Fix Workflow

You are fixing a bug. Follow this process in order. Do not skip steps.

**Guard clause:** If this is clearly a new feature, redirect to \`/joycraft-new-feature\` and stop.

---

## Phase 1: Triage

Establish what's broken. Gather: symptom, steps to reproduce, expected vs actual behavior, when it started, relevant logs/errors. If an error message or stack trace is provided, read the referenced files immediately. Try to reproduce if steps are given.

**Done when:** You can describe the symptom in one sentence.

---

## Phase 2: Diagnose

Find the root cause. Start from the error site and trace backward. Read source files — don't guess. Identify the specific line(s) and logic error. Check git blame if it's a recent regression.

**Done when:** You can explain what's wrong, why, and where in 2-3 sentences.

---

## Phase 3: Discuss

Present findings to the user BEFORE writing any code or spec:
1. **Symptom** — confirm it matches what they see
2. **Root cause** — specific file(s) and line(s)
3. **Proposed fix** — what changes, where
4. **Risk** — side effects? scope?

Ask: "Does this match? Comfortable with this approach?" If large/risky, suggest decomposing into multiple specs.

**Done when:** User agrees with the diagnosis and fix direction.

---

## Phase 4: Spec the Fix

Write a bug fix spec to \`docs/specs/YYYY-MM-DD-bugfix-name.md\`. Create the \`docs/specs/\` directory if it doesn't exist.

**Why:** Even bug fixes deserve a spec. It forces clarity on what "fixed" means, ensures test-first discipline, and creates a traceable record of the fix.

Use this template:

\`\`\`markdown
# Fix [Bug Description] — Bug Fix Spec

> **Parent Brief:** none (bug fix)
> **Issue/Error:** [error message, issue link, or symptom description]
> **Status:** Ready
> **Date:** YYYY-MM-DD
> **Estimated scope:** [1 session / N files / ~N lines]

---

## Bug

What is broken? Describe the symptom the user experiences.

## Root Cause

What is wrong in the code and why? Name the specific file(s) and line(s).

## Fix

What changes will fix this? Be specific — describe the code change, not just "fix the bug."

## Acceptance Criteria

- [ ] [The bug no longer occurs — describe the correct behavior]
- [ ] [No regressions in related functionality]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| [Bug no longer occurs] | [Test that reproduces the bug, then verifies the fix] | [unit/integration/e2e] |
| [No regressions] | [Existing tests still pass, or new regression test] | [unit/integration] |

**Execution order:**
1. Write a test that reproduces the bug — it should FAIL (red)
2. Run the test to confirm it fails
3. Apply the fix
4. Run the test to confirm it passes (green)
5. Run the full test suite to check for regressions

**Smoke test:** [The bug reproduction test — fastest way to verify the fix works]

**Before implementing, verify your test harness:**
1. Run the reproduction test — it must FAIL (if it passes, you're not testing the actual bug)
2. The test must exercise your actual code — not a reimplementation or mock
3. Identify your smoke test — it must run in seconds, not minutes

## Constraints

- MUST: [any hard requirements for the fix]
- MUST NOT: [any prohibitions — e.g., don't change the public API]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
\`\`\`

**For trivial bugs:** The spec will be short. That's fine — the structure is the point, not the length.

**For large bugs that span multiple files/systems:** Consider whether this should be decomposed into multiple specs. If so, create a brief first using \`/joycraft-new-feature\`, then decompose. A bug fix spec should be implementable in a single session.

---

## Phase 5: Hand Off

Tell the user:

\`\`\`
Bug fix spec is ready: docs/specs/YYYY-MM-DD-bugfix-name.md

Summary:
- Bug: [one sentence]
- Root cause: [one sentence]
- Fix: [one sentence]
- Estimated: 1 session

To execute: Start a fresh session and:
1. Read the spec
2. Write the reproduction test (must fail)
3. Apply the fix (test must pass)
4. Run full test suite
5. Run /joycraft-session-end to capture discoveries
6. Commit and PR

Ready to start?
\`\`\`

**Why:** A fresh session for implementation produces better results. This diagnostic session has context noise from exploration — a clean session with just the spec is more focused.
`,

  "joycraft-decompose.md": `---
name: joycraft-decompose
description: Break a feature brief into atomic specs — small, testable, independently executable units
instructions: 32
---

# Decompose Feature into Atomic Specs

You have a Feature Brief (or the user has described a feature). Your job is to decompose it into atomic specs that can be executed independently — one spec per session.

## Step 1: Verify the Brief Exists

Look for a Feature Brief in \`docs/briefs/\`. If one doesn't exist yet, tell the user:

> No feature brief found. Run \`/joycraft-new-feature\` first to interview and create one, or describe the feature now and I'll work from your description.

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
\`\`\`

If \`docs/templates/ATOMIC_SPEC_TEMPLATE.md\` exists, reference it for the full template with additional guidance.

Fill in all sections — each spec must be self-contained (no "see the brief for context"). Copy relevant constraints from the Feature Brief into each spec. Write acceptance criteria specific to THIS spec, not the whole feature. Every acceptance criterion must have at least one corresponding test in the Test Plan. If the user provided test strategy info from the interview, use it to choose test types and frameworks. Include the test harness verification rules in every Test Plan.

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
- Each session should end with /joycraft-session-end to capture discoveries

Ready to start execution?
\`\`\`
`,

  "joycraft-design.md": `---
name: joycraft-design
description: Design discussion before decomposition — produce a ~200-line design artifact for human review, catching wrong assumptions before they propagate into specs
---

# Design Discussion

You are producing a design discussion document for a feature. This sits between research and decomposition — it captures your understanding so the human can catch wrong assumptions before specs are written.

**Guard clause:** If no brief path is provided and no brief exists in \`docs/briefs/\`, say:
"No feature brief found. Run \`/joycraft-new-feature\` first to create one, or provide the path to your brief."
Then stop.

---

## Step 1: Read Inputs

Read the feature brief at the path the user provides. If the user also provides a research document path, read that too. Research is optional — if none exists, note that you'll explore the codebase directly.

## Step 2: Explore the Codebase

Spawn subagents to explore the codebase for patterns relevant to the brief. Focus on:

- Files and functions that will be touched or extended
- Existing patterns this feature should follow (naming, data flow, error handling)
- Similar features already implemented that serve as models
- Boundaries and interfaces the feature must integrate with

Gather file paths, function signatures, and code snippets. You need concrete evidence, not guesses.

## Step 3: Write the Design Document

Create \`docs/designs/\` directory if it doesn't exist. Write the design document to \`docs/designs/YYYY-MM-DD-feature-name.md\`.

The document has exactly five sections:

### Section 1: Current State

What exists today in the codebase that is relevant to this feature. Include file paths, function signatures, and data flows. Be specific — reference actual code, not abstractions. If no research doc was provided, note that and describe what you found through direct exploration.

### Section 2: Desired End State

What the codebase should look like when this feature is complete. Describe the change at a high level — new files, modified interfaces, new data flows. Do NOT include implementation steps. This is the "what," not the "how."

### Section 3: Patterns to Follow

Existing patterns in the codebase that this feature should match. Include short code snippets and \`file:line\` references. Show the pattern, don't just name it.

If this is a greenfield project with no existing patterns, propose conventions and note that no precedent exists.

### Section 4: Resolved Design Decisions

Decisions you have already made, with brief rationale. Format each as:

> **Decision:** [what you decided]
> **Rationale:** [why, referencing existing code or constraints]
> **Alternative rejected:** [what you considered and why you rejected it]

### Section 5: Open Questions

Things you don't know or where multiple valid approaches exist. Each question MUST present 2-3 concrete options with pros and cons. Format:

> **Q: [question]**
> - **Option A:** [description] — Pro: [benefit]. Con: [cost].
> - **Option B:** [description] — Pro: [benefit]. Con: [cost].
> - **Option C (if applicable):** [description] — Pro: [benefit]. Con: [cost].

Do NOT ask vague questions like "what do you think?" Every question must have actionable options the human can choose from.

## Step 4: Present and STOP

Present the design document to the user. Say:

\`\`\`
Design discussion written to docs/designs/YYYY-MM-DD-feature-name.md

Please review the document above. Specifically:
1. Are the patterns in Section 3 the right ones to follow, or should I use different ones?
2. Do you agree with the resolved decisions in Section 4?
3. Pick an option for each open question in Section 5 (or propose your own).

Reply with your feedback. I will NOT proceed to decomposition until you have reviewed and approved this design.
\`\`\`

**CRITICAL: Do NOT proceed to \`/joycraft-decompose\` or generate specs.** Wait for the human to review, answer open questions, and correct any wrong assumptions. The entire value of this skill is the pause — it forces a human checkpoint before mistakes propagate.

## After Human Review

Once the human responds:
- Update the design document with their corrections and chosen options
- Move answered questions from "Open Questions" to "Resolved Design Decisions"
- Present the updated document for final confirmation
- Only after explicit approval, tell the user: "Design approved. Run \`/joycraft-decompose\` with this brief to generate atomic specs."
`,

  "joycraft-implement-level5.md": `---
name: joycraft-implement-level5
description: Set up Level 5 autonomous development — autofix loop, holdout scenario testing, and scenario evolution from specs
instructions: 35
---

# Implement Level 5 — Autonomous Development Loop

You are guiding the user through setting up Level 5: the autonomous feedback loop where specs go in, validated software comes out. This is a one-time setup that installs workflows, creates a scenarios repo, and configures the autofix loop.

## Before You Begin

Check prerequisites:

1. **Project must be initialized.** Look for \`.joycraft-version\`. If missing, tell the user to run \`npx joycraft init\` first.
2. **Project should be at Level 4.** Check \`docs/joycraft-assessment.md\` if it exists. If the project hasn't been assessed yet, suggest running \`/joycraft-tune\` first. But don't block — the user may know they're ready.
3. **Git repo with GitHub remote.** This setup requires GitHub Actions. Check for \`.git/\` and a GitHub remote.

If prerequisites aren't met, explain what's needed and stop.

## Step 1: Explain What Level 5 Means

Tell the user:

> Level 5 is the autonomous loop. When you push specs, three things happen automatically:
>
> 1. **Scenario evolution** — A separate AI agent reads your specs and writes holdout tests in a private scenarios repo. These tests are invisible to your coding agent.
> 2. **Autofix** — When CI fails on a PR, Claude Code automatically attempts a fix (up to 3 times).
> 3. **Holdout validation** — When CI passes, your scenarios repo runs behavioral tests against the PR. Results post as PR comments.
>
> The key insight: your coding agent never sees the scenario tests. This prevents it from gaming the test suite — like a validation set in machine learning.

## Step 2: Gather Configuration

Ask these questions **one at a time**:

### Question 1: Scenarios repo name

> What should we call your scenarios repo? It'll be a private repo that holds your holdout tests.
>
> Default: \`{current-repo-name}-scenarios\`

Accept the default or the user's choice.

### Question 2: GitHub App

> Level 5 needs a GitHub App to provide a separate identity for autofix pushes (this avoids GitHub's anti-recursion protection). Creating one takes about 2 minutes:
>
> 1. Go to https://github.com/settings/apps/new
> 2. Give it a name (e.g., "My Project Autofix")
> 3. Uncheck "Webhook > Active" (not needed)
> 4. Under **Repository permissions**, set:
>    - **Contents**: Read & Write
>    - **Pull requests**: Read & Write
>    - **Actions**: Read & Write
> 5. Click **Create GitHub App**
> 6. Note the **App ID** from the settings page
> 7. Scroll to **Private keys** > click **Generate a private key** > save the \`.pem\` file
> 8. Click **Install App** in the left sidebar > install it on your repo
>
> What's your App ID?

## Step 3: Run init-autofix

Run the CLI command with the gathered configuration:

\`\`\`bash
npx joycraft init-autofix --scenarios-repo {name} --app-id {id}
\`\`\`

Review the output with the user. Confirm files were created.

## Step 4: Walk Through Secret Configuration

Guide the user step by step:

### 4a: Add Secrets to Main Repo

> You should already have the \`.pem\` file from when you created the app in Step 2.

> Go to your repo's Settings > Secrets and variables > Actions, and add:
> - \`JOYCRAFT_APP_PRIVATE_KEY\` — paste the contents of your \`.pem\` file
> - \`ANTHROPIC_API_KEY\` — your Anthropic API key

### 4b: Create the Scenarios Repo

> Create the private scenarios repo:
> \`\`\`bash
> gh repo create {scenarios-repo-name} --private
> \`\`\`
>
> Then copy the scenario templates into it:
> \`\`\`bash
> cp -r docs/templates/scenarios/* ../{scenarios-repo-name}/
> cd ../{scenarios-repo-name}
> git add -A && git commit -m "init: scaffold scenarios repo from Joycraft"
> git push
> \`\`\`

### 4c: Add Secrets to Scenarios Repo

> The scenarios repo also needs the App private key:
> - \`JOYCRAFT_APP_PRIVATE_KEY\` — same \`.pem\` file as the main repo
> - \`ANTHROPIC_API_KEY\` — same key (needed for scenario generation)

## Step 5: Verify Setup

Help the user verify everything is wired correctly:

1. **Check workflow files exist:** \`ls .github/workflows/autofix.yml .github/workflows/scenarios-dispatch.yml .github/workflows/spec-dispatch.yml .github/workflows/scenarios-rerun.yml\`
2. **Check scenario templates were copied:** Verify the scenarios repo has \`example-scenario.test.ts\`, \`workflows/run.yml\`, \`workflows/generate.yml\`, \`prompts/scenario-agent.md\`
3. **Check the App ID is correct** in the workflow files (not still a placeholder)

## Step 6: Update CLAUDE.md

If the project's CLAUDE.md doesn't already have an "External Validation" section, add one:

> ## External Validation
>
> This project uses holdout scenario tests in a separate private repo.
>
> ### NEVER
> - Access, read, or reference the scenarios repo
> - Mention scenario test names or contents
> - Modify the scenarios dispatch workflow to leak test information
>
> The scenarios repo is deliberately invisible to you. This is the holdout guarantee.

## Step 7: First Test (Optional)

If the user wants to test the loop:

> Want to do a quick test? Here's how:
>
> 1. Write a simple spec in \`docs/specs/\` and push to main — this triggers scenario generation
> 2. Create a PR with a small change — when CI passes, scenarios will run
> 3. Watch for the scenario test results as a PR comment
>
> Or deliberately break something in a PR to test the autofix loop.

## Step 8: Summary

Print a summary of what was set up:

> **Level 5 is live.** Here's what's running:
>
> | Trigger | What Happens |
> |---------|-------------|
> | Push specs to \`docs/specs/\` | Scenario agent writes holdout tests |
> | PR fails CI | Claude autofix attempts (up to 3x) |
> | PR passes CI | Holdout scenarios run against PR |
> | Scenarios update | Open PRs re-tested with latest scenarios |
>
> Your scenarios repo: \`{name}\`
> Your coding agent cannot see those tests. The holdout wall is intact.

Update \`docs/joycraft-assessment.md\` if it exists — set the Level 5 score to reflect the new setup.
`,

  "joycraft-interview.md": `---
name: joycraft-interview
description: Brainstorm freely about what you want to build — yap, explore ideas, and get a structured summary you can use later
instructions: 18
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
> **Origin:** /joycraft-interview session

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
- /joycraft-new-feature — formalize this into a full Feature Brief with specs
- /joycraft-decompose — break it directly into atomic specs if scope is clear
- Or just keep brainstorming — run /joycraft-interview again anytime
\`\`\`

## Guidelines

- **This is NOT /joycraft-new-feature.** Do not push toward formal briefs, decomposition tables, or atomic specs. The point is exploration.
- **Let the user lead.** Your job is to listen, clarify, and capture — not to structure or direct.
- **Mark everything as DRAFT.** The output is a starting point, not a commitment.
- **Keep it short.** The draft brief should be 1-2 pages max. Capture the essence, not every detail.
- **Multiple interviews are fine.** The user might run this several times as their thinking evolves. Each creates a new dated draft.
`,

  "joycraft-lockdown.md": `---
name: joycraft-lockdown
description: Generate constrained execution boundaries for an implementation session -- NEVER rules and deny patterns to prevent agent overreach
instructions: 28
---

# Lockdown Mode

The user wants to constrain agent behavior for an implementation session. Your job is to interview them about what should be off-limits, then generate CLAUDE.md NEVER rules and \`.claude/settings.json\` deny patterns they can review and apply.

## When Is Lockdown Useful?

Lockdown is most valuable for:
- **Complex tech stacks** (hardware, firmware, multi-device) where agents can cause real damage
- **Long-running autonomous sessions** where you won't be monitoring every action
- **Production-adjacent work** where accidental network calls or package installs are risky

For simple feature work on a well-tested codebase, lockdown is usually overkill. Mention this context to the user so they can decide.

## Step 1: Check for Tests

Before starting the interview, check if the project has test files or directories (look for \`tests/\`, \`test/\`, \`__tests__/\`, \`spec/\`, or files matching \`*.test.*\`, \`*.spec.*\`).

If no tests are found, tell the user:

> Lockdown mode is most useful when you already have tests in place -- it prevents the agent from modifying them while constraining behavior to writing code and running tests. Consider running \`/joycraft-new-feature\` first to set up a test-driven workflow, then come back to lock it down.

If the user wants to proceed anyway, continue with the interview.

## Step 2: Interview -- What to Lock Down

Ask these three questions, one at a time. Wait for the user's response before proceeding to the next question.

### Question 1: Read-Only Files

> What test files or directories should be off-limits for editing? (e.g., \`tests/\`, \`__tests__/\`, \`spec/\`, specific test files)
>
> I'll generate NEVER rules to prevent editing these.

If the user isn't sure, suggest the test directories you found in Step 1.

### Question 2: Allowed Commands

> What commands should the agent be allowed to run? Defaults:
> - Write and edit source code files
> - Run the project's smoke test command
> - Run the full test suite
>
> Any other commands to explicitly allow? Or should I restrict to just these?

### Question 3: Denied Commands

> What commands should be denied? Defaults:
> - Package installs (\`npm install\`, \`pip install\`, \`cargo add\`, \`go get\`, etc.)
> - Network tools (\`curl\`, \`wget\`, \`ping\`, \`ssh\`)
> - Direct log file reading
>
> Any specific commands to add or remove from this list?

**Edge case -- user wants to allow some network access:** If the user mentions API tests or specific endpoints that need network access, exclude those from the deny list and note the exception in the output.

**Edge case -- user wants to lock down file writes:** If the user wants to prevent ALL file writes, warn them:

> Denying all file writes would prevent the agent from doing any work. I recommend keeping source code writes allowed and only locking down test files, config files, or other sensitive directories.

## Step 3: Generate Boundaries

Based on the interview responses, generate output in this exact format:

\`\`\`
## Lockdown boundaries generated

Review these suggestions and add them to your project:

### CLAUDE.md -- add to NEVER section:

- Edit any file in \`[user's test directories]\`
- Run \`[denied package manager commands]\`
- Use \`[denied network tools]\`
- Read log files directly -- interact with logs only through test assertions
- [Any additional NEVER rules based on user responses]

### .claude/settings.json -- suggested deny patterns:

Add these to the \`permissions.deny\` array:

["[command1]", "[command2]", "[command3]"]

---

Copy these into your project manually, or tell me to apply them now (I'll show you the exact changes for approval first).
\`\`\`

Adjust the content based on the actual interview responses:
- Only include deny patterns for commands the user confirmed should be denied
- Only include NEVER rules for directories/files the user specified
- If the user allowed certain network tools or package managers, exclude those

## Recommended Permission Mode

After generating the boundaries above, also recommend a Claude Code permission mode. Include this section in your output:

\`\`\`
### Recommended Permission Mode

You don't need \`--dangerously-skip-permissions\`. Safer alternatives exist:

| Your situation | Use | Why |
|---|---|---|
| Autonomous spec execution | \`--permission-mode dontAsk\` + allowlist above | Only pre-approved commands run |
| Long session with some trust | \`--permission-mode auto\` | Safety classifier reviews each action |
| Interactive development | \`--permission-mode acceptEdits\` | Auto-approves file edits, prompts for commands |

**For lockdown mode, we recommend \`--permission-mode dontAsk\`** combined with the deny patterns above. This gives you full autonomy for allowed operations while blocking everything else -- no classifier overhead, no prompts, and no safety bypass.

\`--dangerously-skip-permissions\` disables ALL safety checks. The modes above give you autonomy without removing the guardrails.
\`\`\`

## Step 4: Offer to Apply

If the user asks you to apply the changes:

1. **For CLAUDE.md:** Read the existing CLAUDE.md, find the Behavioral Boundaries section, and show the user the exact diff for the NEVER section. Ask for confirmation before writing.
2. **For settings.json:** Read the existing \`.claude/settings.json\`, show the user what the \`permissions.deny\` array will look like after adding the new patterns. Ask for confirmation before writing.

**Never auto-apply. Always show the exact changes and wait for explicit approval.**
`,

  "joycraft-new-feature.md": `---
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
3. Run /joycraft-session-end to capture discoveries
4. Commit and PR

Ready to start?
\`\`\`

**Why:** A fresh session for execution produces better results. The interview session has too much context noise — a clean session with just the spec is more focused.

You can also use \`/joycraft-decompose\` to re-decompose a brief if the breakdown needs adjustment, or run \`/joycraft-interview\` first for a lighter brainstorm before committing to the full workflow.
`,

  "joycraft-research.md": `---
name: joycraft-research
description: Produce objective codebase research by isolating question generation from fact-gathering — subagent sees only questions, never the brief
---

# Research Codebase for a Feature

You are producing objective codebase research to inform a future spec or implementation. The key insight: the researching agent must never see the brief or ticket — only research questions. This prevents opinions from contaminating the facts.

**Guard clause:** If the user doesn't provide a brief path or inline description, ask:
"What feature or change are you researching? Provide a brief path (e.g., \`docs/briefs/2026-03-30-my-feature.md\`) or describe it in a few sentences."

---

## Phase 1: Generate Research Questions

Read the brief file (if a path was provided) or use the user's inline description.

Identify which zones of the codebase are relevant to this feature. Then generate 5-10 research questions that are:

- **Objective and fact-seeking** — "How does X work?" not "How should we build X?"
- **Specific to the codebase** — reference concrete systems, files, or flows
- **Answerable by reading code** — no questions about business strategy or user preferences

Good examples:
- "How does endpoint registration work in the current router?"
- "What patterns exist for input validation across existing handlers?"
- "Trace the data flow from API request to database write for entity X."
- "What test infrastructure exists? Where are fixtures, mocks, and helpers?"
- "What dependencies does module Y import, and what does its public API look like?"

Bad examples (do NOT generate these):
- "What's the best way to implement this feature?" (opinion)
- "Should we use library X or Y?" (recommendation)
- "What would a good architecture look like?" (design, not research)

Write the questions to a temporary file at \`docs/research/.questions-tmp.md\`. Create the \`docs/research/\` directory if it doesn't exist.

**Do NOT include any content from the brief in this file — only the questions.**

---

## Phase 2: Spawn Research Subagent

Use Claude Code's Agent tool to spawn a subagent. Pass ONLY the research questions — never the brief path, brief content, or feature description.

Build the subagent prompt by reading the questions file you just wrote, then use this template:

\`\`\`
You are researching a codebase to answer specific questions. You have NO context about why these questions are being asked — you are simply gathering facts.

RULES — these are hard constraints:
- Answer each question with FACTS ONLY: file paths, function signatures, data flows, patterns, dependencies
- Do NOT recommend, suggest, or opine on anything
- Do NOT speculate about what should be built or how
- If a question cannot be answered (no relevant code exists), say "No existing code found for this"
- Use the Read tool and Grep tool to explore the codebase thoroughly
- Include code snippets only when they are essential evidence (e.g., a function signature, a config block)

QUESTIONS:
[INSERT_QUESTIONS_HERE]

OUTPUT FORMAT — write your findings as a single markdown document using this structure:

# Codebase Research

**Date:** [today's date]
**Questions answered:** [N/total]

---

## Q1: [question text]

[Facts, file paths, function signatures, data flows. No opinions.]

## Q2: [question text]

[Facts, file paths, function signatures, data flows. No opinions.]

[Continue for all questions]
\`\`\`

## Phase 3: Write the Research Document

Take the subagent's response and write it to \`docs/research/YYYY-MM-DD-feature-name.md\`. Derive the feature name from the brief filename or the user's description (lowercase, hyphenated).

Delete the temporary questions file (\`docs/research/.questions-tmp.md\`).

Present the research document path to the user:

\`\`\`
Research complete: docs/research/YYYY-MM-DD-feature-name.md

This document contains objective facts about your codebase — no opinions or recommendations.

Next steps:
- /joycraft-decompose — break the feature into atomic specs (research will inform the specs)
- /joycraft-new-feature — formalize into a full Feature Brief first
- Read the research and add any corrections or missing context manually
\`\`\`

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No brief provided | Accept inline description, generate questions from that |
| Codebase is empty or new | Research doc reports "no existing patterns found" per question |
| User runs research twice for same feature | Overwrites previous research doc (same filename) |
| Brief is very short (1-2 sentences) | Still generate questions — even simple features benefit from understanding existing patterns |
| \`docs/research/\` doesn't exist | Create it |
`,

  "joycraft-session-end.md": `---
name: joycraft-session-end
description: Wrap up a session — capture discoveries, verify, prepare for PR or next session
instructions: 22
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

## 1b. Update Context Documents

If \`docs/context/\` exists, quickly check whether this session revealed anything about:

- **Production risks** — did you interact with or learn about production vs staging systems? → Update \`docs/context/production-map.md\`
- **Wrong assumptions** — did the agent (or you) assume something that turned out to be false? → Update \`docs/context/dangerous-assumptions.md\`
- **Key decisions** — did you make an architectural or tooling choice? → Add a row to \`docs/context/decision-log.md\`
- **Unwritten rules** — did you discover a convention or constraint not documented anywhere? → Update \`docs/context/institutional-knowledge.md\`

Skip this if nothing applies. Don't force it — only update when there's genuine new context.

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

## 5. Push and PR (if autonomous git is enabled)

**Check CLAUDE.md for "Git Autonomy" in the Behavioral Boundaries section.** If it says "STRICTLY ENFORCED" or the ALWAYS section includes "Push to feature branches immediately after every commit":

1. **Push immediately.** Run \`git push origin <branch>\` — do not ask, do not hesitate.
2. **Open a PR if the feature is complete.** Check the parent Feature Brief's decomposition table — if all specs are done, run \`gh pr create\` with a summary of all completed specs. Do not ask first.
3. **If not all specs are done,** still push. The PR comes when the last spec is complete.

If CLAUDE.md does NOT have autonomous git rules (or has "ASK FIRST" for pushing), ask the user before pushing.

## 6. Report

\`\`\`
Session complete.
- Spec: [spec name] — [Complete / In Progress]
- Build: [passing / failing]
- Discoveries: [N items / none]
- Pushed: [yes / no — and why not]
- PR: [opened #N / not yet — N specs remaining]
- Next: [what the next session should tackle]
\`\`\`
`,

  "joycraft-tune.md": `---
name: joycraft-tune
description: Assess and upgrade your project's AI development harness — score 7 dimensions, apply fixes, show path to Level 5
instructions: 15
---

# Tune — Project Harness Assessment & Upgrade

You are evaluating and upgrading this project's AI development harness.

## Step 1: Detect Harness State

Check for: CLAUDE.md (with meaningful content), \`docs/specs/\`, \`docs/briefs/\`, \`docs/discoveries/\`, \`.claude/skills/\`, and test configuration.

## Step 2: Route

- **No harness** (no CLAUDE.md or just a README): Recommend \`npx joycraft init\` and stop.
- **Harness exists**: Continue to assessment.

## Step 3: Assess — Score 7 Dimensions (1-5 scale)

Read CLAUDE.md and explore the project. Score each with specific evidence:

| Dimension | What to Check |
|-----------|--------------|
| Spec Quality | \`docs/specs/\` — structured? acceptance criteria? self-contained? |
| Spec Granularity | Can each spec be done in one session? |
| Behavioral Boundaries | ALWAYS/ASK FIRST/NEVER sections (or equivalent rules under any heading) |
| Skills & Hooks | \`.claude/skills/\` files, hooks config |
| Documentation | \`docs/\` structure, templates, referenced from CLAUDE.md |
| Knowledge Capture | \`docs/discoveries/\`, \`docs/context/*.md\` — existence AND real content |
| Testing & Validation | Test framework, CI pipeline, validation commands in CLAUDE.md |

Score 1 = absent, 3 = partially there, 5 = comprehensive. Give credit for substance over format.

## Step 4: Write Assessment

Write to \`docs/joycraft-assessment.md\` AND display it. Include: scores table, detailed findings (evidence + gap + recommendation per dimension), and an upgrade plan (up to 5 actions ordered by impact).

## Step 5: Apply Upgrades

Apply using three tiers — do NOT ask per-item permission:

**Tier 1 (silent):** Create missing dirs, install missing skills, copy missing templates, create AGENTS.md.

**Before Tier 2, ask TWO things:**

1. **Git autonomy:** Cautious (ask before push/PR) or Autonomous (push + PR without asking)?
2. **Risk interview (3-5 questions, one at a time):** What could break? What services connect to prod? Unwritten rules? Off-limits files/commands? Skip if \`docs/context/\` already has content.

From answers, generate: CLAUDE.md boundary rules, \`.claude/settings.json\` deny patterns, \`docs/context/\` documents. Also recommend a permission mode (\`auto\` for most; \`dontAsk\` + allowlist for high-risk).

**Tier 2 (show diff):** Add missing CLAUDE.md sections (Boundaries, Workflow, Key Files). Draft from real codebase content. Append only — never reformat existing content.

**Tier 3 (confirm first):** Rewriting existing sections, overwriting customized files, suggesting test framework installs.

After applying, append to \`docs/joycraft-history.md\` and show a consolidated upgrade results table.

## Step 6: Show Path to Level 5

Show a tailored roadmap: Level 2-5 table, specific next steps based on actual gaps, and the Level 5 north star (spec queue, autofix, holdout scenarios, self-improving harness).

## Edge Cases

- **CLAUDE.md is just a README:** Treat as no harness.
- **Non-Joycraft skills:** Acknowledge, don't replace.
- **Rules under non-standard headings:** Give credit for substance.
- **Previous assessment exists:** Read it first. If nothing to upgrade, say so.
- **Non-Joycraft content in CLAUDE.md:** Preserve as-is. Only append.
`,

  "joycraft-verify.md": `---
name: joycraft-verify
description: Spawn an independent verifier subagent to check an implementation against its spec -- read-only, no code edits, structured pass/fail verdict
instructions: 30
---

# Verify Implementation Against Spec

The user wants independent verification of an implementation. Your job is to find the relevant spec, extract its acceptance criteria and test plan, then spawn a separate verifier subagent that checks each criterion and produces a structured verdict.

**Why a separate subagent?** Anthropic's research found that agents reliably skew positive when grading their own work. Separating the agent doing the work from the agent judging it consistently outperforms self-evaluation. The verifier gets a clean context window with no implementation bias.

## Step 1: Find the Spec

If the user provided a spec path (e.g., \`/joycraft-verify docs/specs/2026-03-26-add-widget.md\`), use that path directly.

If no path was provided, scan \`docs/specs/\` for spec files. Pick the most recently modified \`.md\` file in that directory. If \`docs/specs/\` doesn't exist or is empty, tell the user:

> No specs found in \`docs/specs/\`. Please provide a spec path: \`/joycraft-verify path/to/spec.md\`

## Step 2: Read and Parse the Spec

Read the spec file and extract:

1. **Spec name** -- from the H1 title
2. **Acceptance Criteria** -- the checklist under the \`## Acceptance Criteria\` section
3. **Test Plan** -- the table under the \`## Test Plan\` section, including any test commands
4. **Constraints** -- the \`## Constraints\` section if present

If the spec has no Acceptance Criteria section, tell the user:

> This spec doesn't have an Acceptance Criteria section. Verification needs criteria to check against. Add acceptance criteria to the spec and try again.

If the spec has no Test Plan section, note this but proceed -- the verifier can still check criteria by reading code and running any available project tests.

## Step 3: Identify Test Commands

Look for test commands in these locations (in priority order):

1. The spec's Test Plan section (look for commands in backticks or "Type" column entries like "unit", "integration", "e2e", "build")
2. The project's CLAUDE.md (look for test/build commands in the Development Workflow section)
3. Common defaults based on the project type:
   - Node.js: \`npm test\` or \`pnpm test --run\`
   - Python: \`pytest\`
   - Rust: \`cargo test\`
   - Go: \`go test ./...\`

Build a list of specific commands the verifier should run.

## Step 4: Spawn the Verifier Subagent

Use Claude Code's Agent tool to spawn a subagent with the following prompt. Replace the placeholders with the actual content extracted in Steps 2-3.

\`\`\`
You are a QA verifier. Your job is to independently verify an implementation against its spec. You have NO context about how the implementation was done -- you are checking it fresh.

RULES -- these are hard constraints, not suggestions:
- You may READ any file using the Read tool or cat
- You may RUN these specific test/build commands: [TEST_COMMANDS]
- You may NOT edit, create, or delete any files
- You may NOT run commands that modify state (no git commit, no npm install, no file writes)
- You may NOT install packages or access the network
- Report what you OBSERVE, not what you expect or hope

SPEC NAME: [SPEC_NAME]

ACCEPTANCE CRITERIA:
[ACCEPTANCE_CRITERIA]

TEST PLAN:
[TEST_PLAN]

CONSTRAINTS:
[CONSTRAINTS_OR_NONE]

YOUR TASK:
For each acceptance criterion, determine if it PASSES or FAILS based on evidence:

1. Run the test commands listed above. Record the output.
2. For each acceptance criterion:
   a. Check if there is a corresponding test and whether it passes
   b. If no test exists, read the relevant source files to verify the criterion is met
   c. If the criterion cannot be verified by reading code or running tests, mark it MANUAL CHECK NEEDED
3. For criteria about build/test passing, actually run the commands and report results.

OUTPUT FORMAT -- you MUST use this exact format:

VERIFICATION REPORT

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | [criterion text] | PASS/FAIL/MANUAL CHECK NEEDED | [what you observed] |
| 2 | [criterion text] | PASS/FAIL/MANUAL CHECK NEEDED | [what you observed] |
[continue for all criteria]

SUMMARY: X/Y criteria passed. [Z failures need attention. / All criteria verified.]

If any test commands fail to run (missing dependencies, wrong command, etc.), report the error as evidence for a FAIL verdict on the relevant criterion.
\`\`\`

## Step 5: Format and Present the Verdict

Take the subagent's response and present it to the user in this format:

\`\`\`
## Verification Report -- [Spec Name]

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | ... | PASS | ... |
| 2 | ... | FAIL | ... |

**Overall: X/Y criteria passed.**

[If all passed:]
All criteria verified. Ready to commit and open a PR.

[If any failed:]
N failures need attention. Review the evidence above and fix before proceeding.

[If any MANUAL CHECK NEEDED:]
N criteria need manual verification -- they can't be checked by reading code or running tests alone.
\`\`\`

## Step 6: Suggest Next Steps

Based on the verdict:

- **All PASS:** Suggest committing and opening a PR, or running \`/joycraft-session-end\` to capture discoveries.
- **Some FAIL:** List the failed criteria and suggest the user fix them, then run \`/joycraft-verify\` again.
- **MANUAL CHECK NEEDED items:** Explain what needs human eyes and why automation couldn't verify it.

**Do NOT offer to fix failures yourself.** The verifier reports; the human (or implementation agent in a separate turn) decides what to do. This separation is the whole point.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Spec has no Test Plan | Warn that verification is weaker without a test plan, but proceed by checking criteria through code reading and any available project-level tests |
| All tests pass but a criterion is not testable | Mark as MANUAL CHECK NEEDED with explanation |
| Subagent can't run tests (missing deps) | Report the error as FAIL evidence |
| No specs found and no path given | Tell user to provide a spec path or create a spec first |
| Spec status is "Complete" | Still run verification -- "Complete" means the implementer thinks it's done, verification confirms |
`,

};

export const TEMPLATES: Record<string, string> = {
  "context/dangerous-assumptions.md": `# Dangerous Assumptions

> Things the AI agent might assume that are wrong in this project.
> Generated by Joycraft risk interview. Update when you discover new gotchas.

## Assumptions

| Agent Might Assume | But Actually | Impact If Wrong |
|-------------------|-------------|----------------|
| _Example: All databases are dev/test_ | _The default connection is production_ | _Data loss_ |
| _Example: Deleting and recreating is safe_ | _Some resources have manual config not in code_ | _Hours of manual recovery_ |

## Historical Incidents

| Date | What Happened | Lesson | Rule Added |
|------|-------------|--------|------------|
| _Example: 2026-03-15_ | _Agent deleted staging infra thinking it was temp_ | _Always verify environment before destructive ops_ | _NEVER: Delete cloud resources without listing them first_ |
`,

  "context/decision-log.md": `# Decision Log

> Why choices were made, not just what was chosen.
> Update this when making architectural, tooling, or process decisions.
> This is the institutional memory that prevents re-litigating settled questions.

## Decisions

| Date | Decision | Why | Alternatives Rejected | Revisit When |
|------|----------|-----|----------------------|-------------|
| _Example: 2026-03-15_ | _Use Supabase over Firebase_ | _Postgres flexibility, row-level security, self-hostable_ | _Firebase (vendor lock-in), PlanetScale (no RLS)_ | _If we need real-time sync beyond Supabase's capabilities_ |

## Principles

_Capture recurring decision patterns here — they save time on future choices._

- _Example: "Prefer tools we can self-host over pure SaaS — reduces vendor risk"_
- _Example: "Choose boring technology for infrastructure, cutting-edge only for core differentiators"_
`,

  "context/institutional-knowledge.md": `# Institutional Knowledge

> Unwritten rules, team conventions, and organizational context that AI agents can't derive from code.
> This is the knowledge that takes a new developer months to absorb.
> Update when you catch yourself saying "oh, you didn't know about that?"

## Team Conventions

_Things everyone on the team knows but nobody wrote down._

- _Example: "We never deploy on Fridays"_
- _Example: "The CEO reviews all UI changes before they ship"_
- _Example: "PR titles must reference the Jira ticket number"_

## Organizational Constraints

_Business rules, compliance requirements, or political realities that affect technical decisions._

- _Example: "Legal requires all user data to be stored in EU regions"_
- _Example: "The payments team owns the billing schema — never modify without their approval"_
- _Example: "We have an informal agreement with Vendor X about API rate limits"_

## Historical Context

_Why things are the way they are — especially when it looks wrong._

- _Example: "The auth module uses an old pattern because it predates our TypeScript migration — don't refactor without a spec"_
- _Example: "The caching layer has a 5-second TTL because we had a consistency bug in 2025 — increasing it requires careful testing"_

## People & Ownership

_Who owns what, who to ask, who cares about what._

- _Example: "Alice owns the payment pipeline — all changes need her review"_
- _Example: "The data team is sensitive about query performance on the analytics tables"_
`,

  "context/production-map.md": `# Production Map

> What's real, what's staging, what's safe to touch.
> Generated by Joycraft risk interview. Update as your infrastructure evolves.

## Services

| Service | Environment | URL/Endpoint | Impact if Corrupted |
|---------|-------------|-------------|-------------------|
| _Example: Main DB_ | _Production_ | _postgres://prod.example.com_ | _1.9M user records lost_ |
| _Example: Staging DB_ | _Staging_ | _postgres://staging.example.com_ | _Test data only, safe to reset_ |

## Secrets & Credentials

| Secret | Location | Notes |
|--------|----------|-------|
| _Example: DATABASE_URL_ | _.env.local_ | _Production connection — NEVER commit_ |

## Safe to Touch

- [ ] Staging environment at [URL]
- [ ] Test/fixture data in [location]
- [ ] Development API keys

## NEVER Touch Without Explicit Approval

- [ ] Production database
- [ ] Live API endpoints
- [ ] User-facing infrastructure
`,

  "context/troubleshooting.md": `# Troubleshooting

> What to do when things go wrong for non-code reasons.
> Environment issues, flaky dependencies, hardware quirks, and diagnostic steps.
> Update when you discover new failure modes and their fixes.

## Common Failures

| When This Happens | Do This | Don't Do This |
|-------------------|---------|---------------|
| _Example: Tests fail with ECONNREFUSED_ | _Check if the dev database is running_ | _Don't rewrite the test or mock the connection_ |
| _Example: Build fails with out-of-memory_ | _Increase Node heap size or close other processes_ | _Don't simplify the code to reduce bundle size_ |
| _Example: Lint passes locally but fails in CI_ | _Check Node/tool version mismatch between local and CI_ | _Don't disable the lint rule_ |

## Environment Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| _Example: "Module not found" after branch switch_ | _Dependencies changed on the new branch_ | _Run the package manager install command_ |
| _Example: Port already in use_ | _Previous dev server didn't shut down cleanly_ | _Kill the process on that port or use a different one_ |
| _Example: Permission denied on file/directory_ | _File ownership or permission mismatch_ | _Check and fix file permissions, don't run as root_ |

## Diagnostic Steps

_When something fails unexpectedly, follow this sequence before trying to fix the code:_

1. **Check the error message literally** -- don't assume what it means, read it
2. **Check environment prerequisites** -- are all services running? Correct versions?
3. **Check recent changes** -- did a config file, dependency, or environment variable change?
4. **Check network/connectivity** -- is the internet up? Are external services reachable?
5. **Search project docs first** -- check this file and \`docs/discoveries/\` before web searching

## "Stop and Ask" Scenarios

_Situations where the AI agent should stop and ask the human instead of trying to fix things._

- _Example: Hardware device not responding -- the human may need to physically reconnect it_
- _Example: Authentication token expired -- the human needs to re-authenticate manually_
- _Example: CI pipeline blocked by a required approval -- a human needs to approve it_
- _Example: Error messages referencing infrastructure the agent doesn't have access to_
`,

  "examples/example-brief.md": `# Add User Notifications — Feature Brief

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

  "examples/example-spec.md": `# Add Notification Preferences API — Atomic Spec

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

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| GET returns preferences as JSON | Call GET with authenticated user, assert 200 + JSON shape matches preferences schema | integration |
| PATCH updates preferences | Call PATCH with valid partial update, assert 200 + returned record reflects changes | integration |
| New users get defaults | Call GET for user with no existing record, assert default preferences (all channels enabled) | unit |
| Unknown event types return 400 | Call PATCH with \`{"foo": {"email": true}}\`, assert 400 + validation error | unit |
| Stored with EncryptedJsonColumn | Verify model uses EncryptedJsonColumn for preferences field | unit |
| Auth required | Call GET/PATCH without auth token, assert 401 | integration |
| Build passes | Verified by build step — no separate test needed | build |
| Tests pass | Verified by test runner — no separate test needed | meta |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** The "New users get defaults" unit test — no database or HTTP needed, fastest feedback loop.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

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

  "scenarios/README.md": `# \$SCENARIOS_REPO

Holdout scenario tests for the main project. These tests run in CI against the
built artifact of each PR — but they live here, in a separate repository, so
the coding agent working on the main project cannot see them.

---

## What is the holdout pattern?

Think of it like a validation set in machine learning. When you train a model,
you keep a slice of your data hidden from the training process. If the model
scores well on data it has never seen, you can trust that it has actually
learned something — not just memorized the training examples.

Scenario tests work the same way. The coding agent writes code and passes
internal tests in the main repo. These scenario tests then check whether the
result behaves correctly from a real user's perspective, using only the public
interface of the built artifact.

Because the agent cannot read this repository, it cannot game the tests. A
passing scenario run means the feature genuinely works.

---

## Why a separate repository?

A single repository would expose the tests to the agent. Claude Code reads
files in the working directory; if scenario tests lived in the main repo, the
agent could (and would) read them when fixing failures, which defeats the
purpose.

A separate repo also means:

- The test suite can be updated by humans without triggering the autofix loop
- Scenarios can reference multiple projects over time
- Access controls are independent — the scenarios repo can be more restricted

---

## How the CI pipeline works

\`\`\`
Main repo PR opened
        |
        v
Main repo CI runs (unit + integration tests)
        |
        | passes
        v
scenarios-dispatch.yml fires a repository_dispatch event
        |
        v
This repo: run.yml receives the event
        |
        +-- clones main-repo PR branch to ../main-repo
        |
        +-- builds the artifact (npm ci && npm run build)
        |
        +-- runs: NO_COLOR=1 npx vitest run
        |
        +-- captures exit code + output
        |
        v
Posts PASS / FAIL comment on the originating PR
\`\`\`

The PR author sees the scenario result as a comment. No separate status check
is required, though you can add one via the GitHub Checks API if you prefer.

---

## Adding scenarios

### Rules

1. **Behavioral, not structural.** Test what the tool does, not how it is
   built internally. Invoke the binary; assert on stdout, exit codes, and
   filesystem state. Never import from \`../main-repo/src\`.

2. **End-to-end.** Each test should represent something a real user would
   actually do. If you would not put it in a demo or docs example, reconsider
   whether it belongs here.

3. **No source imports.** The entire point of the holdout is that tests cannot
   see source code. Any \`import\` that reaches into \`../main-repo/src\` breaks
   the pattern.

4. **Independent.** Each test must be able to run in isolation. Use \`beforeEach\`
   / \`afterEach\` to set up and tear down temp directories. Do not share mutable
   state between tests.

5. **Deterministic.** Avoid network calls, timestamps, or random values in
   assertions unless the feature under test genuinely involves them.

### File layout

\`\`\`
\$SCENARIOS_REPO/
├── example-scenario.test.ts   # Starter file — replace with real scenarios
├── workflows/
│   └── run.yml                # CI workflow (do not rename)
├── package.json
└── README.md
\`\`\`

Add new \`.test.ts\` files at the top level or in subdirectories. Vitest will
discover them automatically.

### Example structure

\`\`\`ts
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const CLI = join(__dirname, "..", "main-repo", "dist", "cli.js");

it("init creates a CLAUDE.md file", () => {
  const tmp = mkdtempSync(join(tmpdir(), "scenario-"));
  const { status } = spawnSync("node", [CLI, "init", tmp], { encoding: "utf8" });
  expect(status).toBe(0);
  expect(existsSync(join(tmp, "CLAUDE.md"))).toBe(true);
});
\`\`\`

---

## Internal tests vs scenario tests

| | Internal tests (main repo) | Scenario tests (this repo) |
|---|---|---|
| Location | \`tests/\` in main repo | This repo |
| Visible to agent | Yes | No |
| What they test | Units, modules, logic | End-to-end behavior |
| Import source code | Yes | Never |
| Run on every push | Yes | Yes (via dispatch) |
| Purpose | Catch regressions fast | Validate real behavior |

---

## Relationship to Joycraft

This repository was bootstrapped by \`npx joycraft init --autofix\`. Joycraft
manages the \`run.yml\` workflow and keeps it in sync when you run
\`npx joycraft upgrade\`. The test files are yours — Joycraft will never
overwrite them.

If the \`run.yml\` workflow needs updating (e.g., a new version of
\`actions/create-github-app-token\`), run \`npx joycraft upgrade\` in this repo
and review the diff before applying.
`,

  "scenarios/example-scenario.test.ts": `/**
 * Example Scenario Test
 *
 * This file is a template for scenario tests in your holdout repository.
 * Scenarios are behavioral, end-to-end tests that run against the BUILT
 * artifact of your main project — not its source code.
 *
 * The Holdout Pattern
 * -------------------
 * These tests live in a SEPARATE repository that your coding agent cannot
 * see. This is intentional: if the agent could read these tests, it could
 * write code that passes them without actually solving the problem correctly
 * (the same way a student who sees the exam beforehand can score well without
 * understanding the material).
 *
 * In CI, the main repo is cloned to ../main-repo (relative to this repo's
 * checkout). The run.yml workflow builds the artifact there before running
 * these tests, so \`../main-repo\` is always available and already built.
 *
 * How to Write Scenarios
 * ----------------------
 * DO:
 *   - Invoke the built binary / entry point via child_process (execSync, spawnSync)
 *   - Test observable behavior: exit codes, stdout/stderr content, file system state
 *   - Write scenarios around things a real user would actually do
 *   - Keep each test fully independent — no shared state between tests
 *
 * DON'T:
 *   - Import from ../main-repo/src — that defeats the holdout
 *   - Test internal implementation details (function names, module structure)
 *   - Rely on network access unless your tool genuinely requires it
 *   - Share mutable fixtures across tests
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Path to the built CLI entry point in the main repo.
// The run.yml workflow clones the main repo to ../main-repo and builds it
// before this test file runs, so this path is always valid in CI.
const CLI = join(__dirname, "..", "main-repo", "dist", "cli.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run the CLI and return { stdout, stderr, status }. Never throws. */
function runCLI(args: string[], cwd?: string) {
  const result = spawnSync("node", [CLI, ...args], {
    encoding: "utf8",
    cwd: cwd ?? process.cwd(),
    env: { ...process.env, NO_COLOR: "1" },
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

// ---------------------------------------------------------------------------
// Basic invocation scenarios
// ---------------------------------------------------------------------------

describe("CLI: basic invocation", () => {
  it("--help prints usage information", () => {
    const { stdout, status } = runCLI(["--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("Usage:");
  });

  it("--version returns a semver string", () => {
    const { stdout, status } = runCLI(["--version"]);
    expect(status).toBe(0);
    // Matches x.y.z, x.y.z-alpha.1, etc.
    expect(stdout.trim()).toMatch(/^\\d+\\.\\d+\\.\\d+/);
  });

  it("unknown command exits non-zero", () => {
    const { status } = runCLI(["not-a-real-command"]);
    expect(status).not.toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Example: filesystem interaction scenario
//
// This pattern is useful when your CLI creates or modifies files.
// Each test gets a fresh temp directory so they can't interfere.
// ---------------------------------------------------------------------------

describe("CLI: init command (example — replace with your real scenarios)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "scenarios-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("init creates expected output in an empty directory", () => {
    // This is a placeholder. Replace with whatever your CLI actually does.
    // The point is: invoke the binary, observe side effects, assert on them.
    const { status } = runCLI(["init", tmpDir]);

    // Example assertions — adjust to your tool's actual behavior:
    // expect(status).toBe(0);
    // expect(existsSync(join(tmpDir, "CLAUDE.md"))).toBe(true);

    // Remove this line once you've written a real assertion above:
    expect(typeof status).toBe("number"); // placeholder
  });
});
`,

  "scenarios/package.json": `{
  "name": "\$SCENARIOS_REPO",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
`,

  "scenarios/prompts/scenario-agent.md": `You are a QA engineer working in a holdout test repository. You CANNOT access the main repository's source code. Your job is to write or update behavioral scenario tests based on specs that are pushed from the main repo.

## What You Have Access To

- This scenarios repository (test files, \`specs/\` mirror, \`package.json\`)
- The incoming spec (provided below)
- A list of existing test files and spec mirrors (provided below)
- The main repo is available at \`../main-repo\` and is already built — you can invoke its CLI or entry point via \`execSync\`/\`spawnSync\`, but you MUST NOT import from \`../main-repo/src\`

## Triage Decision Tree

Read the incoming spec carefully. Decide which of these three actions to take:

### SKIP — Do nothing if the spec is:
- An internal refactor with no user-facing behavior change (e.g., "extract module", "rename internal type")
- CI or dev tooling changes (e.g., "add lint rule", "update GitHub Actions workflow")
- Documentation-only changes
- Performance improvements with identical observable behavior

If you SKIP, write a brief comment in the relevant test file (or a new one) explaining why, then stop.

### NEW — Create a new test file if the spec describes:
- A new command, flag, or subcommand
- A new output format or file that gets generated
- A new user-facing behavior that doesn't map to any existing test file

Name the file after the feature area: \`[feature-area].test.ts\`. One feature area per test file.

### UPDATE — Modify an existing test file if the spec:
- Changes behavior that is already tested
- Adds a flag or option to an existing command
- Modifies output format for an existing feature

Match to the most relevant existing test file by feature area.

**If you are unsure whether a spec is user-facing, err on the side of writing a test.**

## Test Writing Rules

1. **Behavioral only.** Test observable output — stdout, stderr, exit codes, files created/modified on disk. Never test internal implementation details or import source modules.

2. **Use \`execSync\` or \`spawnSync\`.** Invoke the built binary at \`../main-repo/dist/cli.js\` (or whatever the main repo's entry point is). Check \`../main-repo/package.json\` to find the correct entry point if unsure.

3. **Use vitest.** Import \`describe\`, \`it\`, \`expect\` from \`vitest\`. Use \`beforeEach\`/\`afterEach\` for temp directory setup/teardown.

4. **Each test is fully independent.** No shared mutable state between tests. Each test that touches the filesystem gets its own temp directory via \`mkdtempSync\`.

5. **Assert on realistic user actions.** Write tests that reflect what a real user would do — not what the implementation happens to do.

6. **Never import from the parent repo's source.** If you find yourself writing \`import { ... } from '../main-repo/src/...'\`, stop — that defeats the holdout.

## Test File Template

\`\`\`typescript
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const CLI = join(__dirname, '..', 'main-repo', 'dist', 'cli.js');

function runCLI(args: string[], cwd?: string) {
  const result = spawnSync('node', [CLI, ...args], {
    encoding: 'utf8',
    cwd: cwd ?? process.cwd(),
    env: { ...process.env, NO_COLOR: '1' },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? 1,
  };
}

describe('[feature area]: [behavior being tested]', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'scenarios-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('[specific observable behavior]', () => {
    const { stdout, status } = runCLI(['command', 'args'], tmpDir);
    expect(status).toBe(0);
    expect(stdout).toContain('expected output');
  });
});
\`\`\`

## Checklist Before Committing

- [ ] Decision: SKIP / NEW / UPDATE (and why)
- [ ] Tests assert on observable behavior, not implementation
- [ ] No imports from \`../main-repo/src\`
- [ ] Each test has its own temp directory if it touches the filesystem
- [ ] File is named after the feature area, not the spec
`,

  "scenarios/workflows/generate.yml": `# Scenario Generation Workflow
#
# Triggered by a \`spec-pushed\` repository_dispatch event sent from the main
# project when a spec is added or modified on main. A scenario agent triages
# the spec and writes or updates holdout tests in this repo.
#
# After the agent commits changes, fires \`scenarios-updated\` back to the main
# repo so that any open PRs are re-tested with the new/updated scenarios.
#
# Prerequisites:
#   - ANTHROPIC_API_KEY secret: Anthropic API key for Claude Code
#   - JOYCRAFT_APP_PRIVATE_KEY secret: GitHub App private key (.pem)
#   - \$JOYCRAFT_APP_ID is replaced with the actual App ID number at install time

name: Generate Scenarios

on:
  repository_dispatch:
    types: [spec-pushed]

jobs:
  generate:
    name: Run scenario agent
    runs-on: ubuntu-latest

    steps:
      # ── 1. Check out the scenarios repo ──────────────────────────────────
      - name: Checkout scenarios repo
        uses: actions/checkout@v4

      # ── 2. Save incoming spec to local mirror ─────────────────────────────
      # The agent reads this file to understand what changed.
      - name: Save spec to mirror
        run: |
          mkdir -p specs
          cat > "specs/\${{ github.event.client_payload.spec_filename }}" << 'SPEC_EOF'
          \${{ github.event.client_payload.spec_content }}
          SPEC_EOF
          echo "Saved \${{ github.event.client_payload.spec_filename }} to specs/"

      # ── 3. Gather context for the agent ───────────────────────────────────
      # Bounded context: filenames only (not file contents) to stay within
      # token limits. The agent uses these lists to decide whether to create
      # a new test file or update an existing one.
      - name: Gather context
        id: context
        run: |
          EXISTING_TESTS=\$(find . -name "*.test.ts" -not -path "./.git/*" \\
            | sed 's|^\\./||' | sort | tr '\\n' ',' | sed 's/,\$//')
          EXISTING_SPECS=\$(find specs/ -name "*.md" 2>/dev/null \\
            | sed 's|^specs/||' | sort | tr '\\n' ',' | sed 's/,\$//')

          echo "existing_tests=\$EXISTING_TESTS" >> "\$GITHUB_OUTPUT"
          echo "existing_specs=\$EXISTING_SPECS" >> "\$GITHUB_OUTPUT"
          echo "Existing test files: \$EXISTING_TESTS"
          echo "Existing spec mirrors: \$EXISTING_SPECS"

      # ── 4. Set up Node.js ─────────────────────────────────────────────────
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      # ── 5. Install Claude Code CLI ────────────────────────────────────────
      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code

      # ── 6. Run scenario agent ─────────────────────────────────────────────
      # - Uses \`claude -p\` (prompt mode) for non-interactive execution.
      # - No --model flag: the environment's default model is used.
      # - --dangerously-skip-permissions lets Claude write files without prompts.
      # - --max-turns 20 caps the agentic loop so it can't run indefinitely.
      - name: Run scenario agent
        id: agent
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          PROMPT=\$(cat .claude/prompts/scenario-agent.md 2>/dev/null || cat prompts/scenario-agent.md)

          claude -p \\
            --dangerously-skip-permissions \\
            --max-turns 20 \\
            "\${PROMPT}

          ---

          ## Incoming Spec

          Filename: \${{ github.event.client_payload.spec_filename }}

          Content:
          \$(cat 'specs/\${{ github.event.client_payload.spec_filename }}')

          ---

          ## Context

          Existing test files in this repo: \${{ steps.context.outputs.existing_tests }}
          Existing spec mirrors: \${{ steps.context.outputs.existing_specs }}"

      # ── 7. Commit any changes the agent made ──────────────────────────────
      - name: Commit scenario changes
        id: commit
        run: |
          git config user.name  "Joycraft Scenario Agent"
          git config user.email "joycraft-scenarios@users.noreply.github.com"

          git add -A

          if git diff --cached --quiet; then
            echo "No changes to commit — spec triaged as no-op."
            echo "committed=false" >> "\$GITHUB_OUTPUT"
            exit 0
          fi

          git commit -m "scenarios: update tests for \${{ github.event.client_payload.spec_filename }}"
          git push
          echo "committed=true" >> "\$GITHUB_OUTPUT"

      # ── 8. Generate GitHub App token for cross-repo dispatch ──────────────
      # Only needed if the agent committed changes (otherwise nothing to re-run).
      - name: Generate GitHub App token
        id: app-token
        if: steps.commit.outputs.committed == 'true'
        uses: actions/create-github-app-token@v1
        with:
          app-id: \$JOYCRAFT_APP_ID
          private-key: \${{ secrets.JOYCRAFT_APP_PRIVATE_KEY }}
          repositories: \${{ github.event.client_payload.repo }}

      # ── 9. Notify main repo that scenarios were updated ───────────────────
      # Fires \`scenarios-updated\` so the main repo's re-run workflow can
      # trigger scenario runs against any open PRs that may now be affected.
      - name: Dispatch scenarios-updated to main repo
        if: steps.commit.outputs.committed == 'true'
        env:
          GH_TOKEN: \${{ steps.app-token.outputs.token }}
        run: |
          REPO="\${{ github.event.client_payload.repo }}"
          REPO_OWNER="\${REPO%%/*}"
          REPO_NAME="\${REPO##*/}"

          gh api "repos/\${REPO_OWNER}/\${REPO_NAME}/dispatches" \\
            -f event_type=scenarios-updated \\
            -f "client_payload[spec_filename]=\${{ github.event.client_payload.spec_filename }}" \\
            -f "client_payload[scenarios_repo]=\${{ github.repository }}"

          echo "Dispatched scenarios-updated to \${REPO}"
`,

  "scenarios/workflows/run.yml": `# Scenarios Run Workflow
#
# Triggered by a \`repository_dispatch\` event (type: run-scenarios) sent from
# the main project's CI pipeline after a PR passes its internal tests.
#
# This workflow:
#   1. Clones the main repo's PR branch to ../main-repo
#   2. Builds the artifact
#   3. Runs the scenario tests in this repo
#   4. Posts a PASS or FAIL comment on the originating PR
#
# Prerequisites:
#   - A GitHub App ("Joycraft Autofix" or equivalent) installed on BOTH repos.
#     \$JOYCRAFT_APP_ID is replaced with the actual App ID number at install time.
#     JOYCRAFT_APP_PRIVATE_KEY must be stored as a repository secret in this repo.
#   - This scenarios repo must be added to the App's repository access list.

name: Run Scenarios

on:
  repository_dispatch:
    types: [run-scenarios]

jobs:
  run-scenarios:
    name: Run holdout scenario tests
    runs-on: ubuntu-latest

    steps:
      # ── 1. Check out the scenarios repo ─────────────────────────────────────
      - name: Checkout scenarios repo
        uses: actions/checkout@v4
        with:
          path: scenarios

      # ── 2. Mint a GitHub App token ───────────────────────────────────────────
      # \$JOYCRAFT_APP_ID is replaced with the numeric App ID at install time
      # (e.g., app-id: 3180156). It is NOT a secret — App IDs are public.
      - name: Generate GitHub App token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: \$JOYCRAFT_APP_ID
          private-key: \${{ secrets.JOYCRAFT_APP_PRIVATE_KEY }}
          repositories: \${{ github.event.client_payload.repo }}

      # ── 3. Clone the main repo's PR branch ──────────────────────────────────
      # Cloned to ./main-repo so scenario tests can reference ../main-repo
      # relative to the scenarios/ checkout.
      - name: Clone main repo PR branch
        env:
          GH_TOKEN: \${{ steps.app-token.outputs.token }}
        run: |
          git clone \\
            --branch \${{ github.event.client_payload.branch }} \\
            --depth 1 \\
            https://x-access-token:\${GH_TOKEN}@github.com/\${{ github.event.client_payload.repo }}.git \\
            main-repo

      # ── 4. Set up Node.js ────────────────────────────────────────────────────
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: main-repo/package-lock.json

      # ── 5. Build the main repo artifact ─────────────────────────────────────
      - name: Build main repo
        working-directory: main-repo
        run: npm ci && npm run build

      # ── 6. Install scenario test dependencies ────────────────────────────────
      - name: Install scenario dependencies
        working-directory: scenarios
        run: npm ci

      # ── 7. Run scenario tests ────────────────────────────────────────────────
      # set +e    — don't abort on non-zero exit; we capture it manually
      # set -o pipefail — propagate failures through pipes (for tee)
      # NO_COLOR=1 — strip color codes before they reach tee
      # ANSI codes are also stripped via sed as a belt-and-suspenders measure
      - name: Run scenario tests
        id: scenarios
        working-directory: scenarios
        run: |
          set +e
          set -o pipefail
          NO_COLOR=1 npx vitest run 2>&1 \\
            | sed 's/\\x1b\\[[0-9;]*m//g' \\
            | tee test-output.txt
          VITEST_EXIT=\$?
          echo "exit_code=\$VITEST_EXIT" >> "\$GITHUB_OUTPUT"
          exit \$VITEST_EXIT

      # ── 8. Post PASS or FAIL comment on the originating PR ──────────────────
      # Always runs so the PR author always gets feedback.
      - name: Post result comment on PR
        if: always()
        env:
          GH_TOKEN: \${{ steps.app-token.outputs.token }}
          PR_NUMBER: \${{ github.event.client_payload.pr_number }}
          MAIN_REPO: \${{ github.event.client_payload.repo }}
          VITEST_EXIT: \${{ steps.scenarios.outputs.exit_code }}
        run: |
          # Read test output (cap at 100 lines to keep the comment manageable)
          OUTPUT=\$(head -100 scenarios/test-output.txt 2>/dev/null || echo "(no output captured)")

          if [ "\$VITEST_EXIT" = "0" ]; then
            STATUS_LINE="**Scenario tests: PASS**"
          else
            STATUS_LINE="**Scenario tests: FAIL** (exit code: \$VITEST_EXIT)"
          fi

          BODY="\${STATUS_LINE}

          <details>
          <summary>Test output</summary>

          \\\`\\\`\\\`
          \${OUTPUT}
          \\\`\\\`\\\`

          </details>

          Run triggered by commit \\\`\${{ github.event.client_payload.sha }}\\\`."

          gh api "repos/\${MAIN_REPO}/issues/\${PR_NUMBER}/comments" \\
            -f body="\$BODY"
`,

  "workflows/autofix.yml": `# Autofix Workflow
#
# Triggered when CI fails on a PR. Uses Claude Code to attempt an automated fix,
# then pushes a commit and re-triggers CI. Limits to 3 autofix attempts per PR
# before escalating to human review.
#
# Prerequisites:
#   - A GitHub App called "Joycraft Autofix" (or equivalent) installed on the repo.
#     Its credentials must be stored as repository secrets:
#       JOYCRAFT_APP_ID          — the App's numeric ID
#       JOYCRAFT_APP_PRIVATE_KEY — the App's PEM private key
#   - ANTHROPIC_API_KEY secret for Claude Code

name: Autofix

on:
  workflow_run:
    # Replace with the exact name of your CI workflow
    workflows: ["CI"]
    types: [completed]

# One autofix run per PR at a time — cancel in-flight runs for the same PR
concurrency:
  group: autofix-pr-\${{ github.event.workflow_run.pull_requests[0].number }}
  cancel-in-progress: true

jobs:
  autofix:
    name: Attempt automated fix
    runs-on: ubuntu-latest

    # Only run when CI failed and the triggering workflow was on a PR
    if: |
      github.event.workflow_run.conclusion == 'failure' &&
      github.event.workflow_run.pull_requests[0] != null

    steps:
      # ── 1. Mint a short-lived GitHub App token ──────────────────────────────
      # Using a dedicated App identity lets this workflow push commits without
      # triggering GitHub's anti-recursion protection on the GITHUB_TOKEN.
      - name: Generate GitHub App token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          # \$JOYCRAFT_APP_ID is replaced with the actual App ID number at install time
          app-id: \$JOYCRAFT_APP_ID
          private-key: \${{ secrets.JOYCRAFT_APP_PRIVATE_KEY }}

      # ── 2. Check out the PR branch ──────────────────────────────────────────
      # We check out the exact branch (not a merge ref) so that any commit we
      # push lands directly on the PR branch.
      - name: Checkout PR branch
        uses: actions/checkout@v4
        with:
          token: \${{ steps.app-token.outputs.token }}
          ref: \${{ github.event.workflow_run.pull_requests[0].head.ref }}
          fetch-depth: 0

      # ── 3. Count previous autofix attempts ─────────────────────────────────
      # Count "autofix:" commits in the log. If we have already made 3 attempts
      # on this PR, stop and ask a human to review instead.
      - name: Check autofix iteration count
        id: iteration
        run: |
          COUNT=\$(git log --oneline | grep "autofix:" | wc -l | tr -d ' ')
          echo "count=\$COUNT" >> "\$GITHUB_OUTPUT"
          echo "Autofix attempts so far: \$COUNT"

      # ── 4. Post "human review needed" and exit if limit reached ─────────────
      - name: Post human-review comment and exit
        if: steps.iteration.outputs.count >= 3
        env:
          GH_TOKEN: \${{ steps.app-token.outputs.token }}
          PR_NUMBER: \${{ github.event.workflow_run.pull_requests[0].number }}
        run: |
          gh pr comment "\$PR_NUMBER" \\
            --body "**Autofix limit reached (3 attempts).** Please review manually — Claude was unable to resolve the CI failures automatically."
          echo "Max iterations reached. Exiting without further autofix."
          exit 0

      # ── 5. Fetch the CI failure logs ────────────────────────────────────────
      # Download logs from the failed workflow run so Claude has concrete
      # failure context to work from. ANSI escape codes are stripped so the
      # logs are readable as plain text.
      - name: Fetch CI failure logs
        id: logs
        env:
          GH_TOKEN: \${{ github.token }}
          RUN_ID: \${{ github.event.workflow_run.id }}
        run: |
          gh run view "\$RUN_ID" --log-failed 2>&1 \\
            | sed 's/\\x1b\\[[0-9;]*m//g' \\
            > /tmp/ci-failure.log
          echo "=== CI failure log (first 200 lines) ==="
          head -200 /tmp/ci-failure.log

      # ── 6. Set up Node.js (adjust version to match your project) ───────────
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      # ── 7. Install project dependencies ─────────────────────────────────────
      - name: Install dependencies
        run: npm ci

      # ── 8. Install Claude Code CLI ───────────────────────────────────────────
      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code

      # ── 9. Run Claude Code to fix the failure ───────────────────────────────
      # - Uses \`claude -p\` (prompt mode) so it runs non-interactively.
      # - No --model flag: the environment's default model is used.
      # - --dangerously-skip-permissions lets Claude edit files without prompts.
      # - --max-turns 20 caps the agentic loop so it can't run indefinitely.
      # - set +e captures the exit code without aborting the step immediately.
      # - set -o pipefail ensures piped commands propagate failures correctly.
      - name: Run Claude Code autofix
        id: claude
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
          GH_TOKEN: \${{ steps.app-token.outputs.token }}
        run: |
          set +e
          set -o pipefail

          FAILURE_LOG=\$(cat /tmp/ci-failure.log)

          claude -p \\
            --dangerously-skip-permissions \\
            --max-turns 20 \\
            "CI is failing on this PR. Here are the failure logs:

          \${FAILURE_LOG}

          Please investigate the root cause, fix the code, and make sure the tests pass.
          Do not modify workflow files. Focus only on source code and test files.
          After making changes, run the test suite to verify the fix works." \\
            2>&1 | sed 's/\\x1b\\[[0-9;]*m//g' | tee /tmp/claude-output.log

          CLAUDE_EXIT=\$?
          echo "exit_code=\$CLAUDE_EXIT" >> "\$GITHUB_OUTPUT"
          exit \$CLAUDE_EXIT

      # ── 10. Commit and push any changes Claude made ──────────────────────────
      # If Claude modified files, commit them with an "autofix:" prefix so the
      # iteration counter in step 3 can find them on future runs.
      - name: Commit and push autofix changes
        if: steps.claude.outputs.exit_code == '0'
        env:
          GH_TOKEN: \${{ steps.app-token.outputs.token }}
        run: |
          git config user.name  "Joycraft Autofix"
          git config user.email "autofix@joycraft.dev"

          git add -A

          if git diff --cached --quiet; then
            echo "No changes to commit — Claude made no file modifications."
            exit 0
          fi

          ITERATION=\${{ steps.iteration.outputs.count }}
          NEXT=\$(( ITERATION + 1 ))

          git commit -m "autofix: attempt \$NEXT — fix CI failures [skip autofix]"
          git push

      # ── 11. Post a summary comment on the PR ─────────────────────────────────
      # Always post a comment so the PR author knows what happened.
      - name: Post result comment
        if: always()
        env:
          GH_TOKEN: \${{ steps.app-token.outputs.token }}
          PR_NUMBER: \${{ github.event.workflow_run.pull_requests[0].number }}
          CLAUDE_EXIT: \${{ steps.claude.outputs.exit_code }}
        run: |
          if [ "\$CLAUDE_EXIT" = "0" ]; then
            BODY="**Autofix pushed a fix.** CI has been re-triggered. If it still fails, another autofix attempt will run (up to 3 total)."
          else
            BODY="**Autofix ran but could not produce a clean fix** (exit code: \$CLAUDE_EXIT). Please review the logs and fix manually."
          fi

          gh pr comment "\$PR_NUMBER" --body "\$BODY"
`,

  "workflows/scenarios-dispatch.yml": `# Scenarios Dispatch Workflow
#
# Triggered when CI passes on a PR. Fires a \`repository_dispatch\` event to a
# separate scenarios repository so that integration / end-to-end scenario tests
# can run against the PR's code without living in this repo.
#
# Prerequisites:
#   - JOYCRAFT_APP_PRIVATE_KEY secret: GitHub App private key (.pem)
#   - \$SCENARIOS_REPO is replaced with the actual repo name at install time

name: Scenarios Dispatch

on:
  workflow_run:
    # Replace with the exact name of your CI workflow
    workflows: ["CI"]
    types: [completed]

jobs:
  dispatch:
    name: Fire scenarios dispatch
    runs-on: ubuntu-latest

    # Only run when CI succeeded and the triggering workflow was on a PR
    if: |
      github.event.workflow_run.conclusion == 'success' &&
      github.event.workflow_run.pull_requests[0] != null

    steps:
      # ── 1. Generate GitHub App token for cross-repo dispatch ─────────────
      - name: Generate GitHub App token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: \$JOYCRAFT_APP_ID
          private-key: \${{ secrets.JOYCRAFT_APP_PRIVATE_KEY }}
          repositories: \$SCENARIOS_REPO

      # ── 2. Fire repository_dispatch to the scenarios repo ──────────────────
      # Sends a \`run-scenarios\` event carrying enough context for the scenarios
      # repo to check out the correct branch/SHA and know which PR triggered it.
      # \$SCENARIOS_REPO is replaced with the actual repo name at install time.
      - name: Dispatch run-scenarios event
        env:
          GH_TOKEN: \${{ steps.app-token.outputs.token }}
        run: |
          PR_NUMBER=\${{ github.event.workflow_run.pull_requests[0].number }}
          BRANCH=\${{ github.event.workflow_run.pull_requests[0].head.ref }}
          SHA=\${{ github.event.workflow_run.head_sha }}

          gh api repos/\${{ github.repository_owner }}/\$SCENARIOS_REPO/dispatches \\
            -f event_type=run-scenarios \\
            -f "client_payload[pr_number]=\$PR_NUMBER" \\
            -f "client_payload[branch]=\$BRANCH" \\
            -f "client_payload[sha]=\$SHA" \\
            -f "client_payload[repo]=\${{ github.repository }}"

          echo "Dispatched run-scenarios to \$SCENARIOS_REPO for PR #\$PR_NUMBER"
`,

  "workflows/scenarios-rerun.yml": `# Scenarios Re-run Workflow
#
# Triggered when the scenarios repo reports that it has updated its tests
# (type: scenarios-updated). Finds all open PRs and fires a \`run-scenarios\`
# dispatch to the scenarios repo for each one, so that newly generated or
# updated tests are exercised against in-flight PR branches.
#
# This handles the race condition where a PR's implementation completes before
# the scenario agent has finished writing its holdout tests.
#
# Prerequisites:
#   - JOYCRAFT_APP_PRIVATE_KEY secret: GitHub App private key (.pem)
#   - \$JOYCRAFT_APP_ID is replaced with the actual App ID number at install time
#   - \$SCENARIOS_REPO is replaced with the actual scenarios repo name at install time

name: Scenarios Re-run

on:
  repository_dispatch:
    types: [scenarios-updated]

jobs:
  rerun:
    name: Re-run scenarios against open PRs
    runs-on: ubuntu-latest

    steps:
      # ── 1. Generate GitHub App token for cross-repo dispatch ──────────────
      - name: Generate GitHub App token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: \$JOYCRAFT_APP_ID
          private-key: \${{ secrets.JOYCRAFT_APP_PRIVATE_KEY }}
          repositories: \$SCENARIOS_REPO

      # ── 2. List open PRs and dispatch run-scenarios for each ──────────────
      # If there are no open PRs, exits cleanly — nothing to do.
      - name: Dispatch run-scenarios for each open PR
        env:
          GH_TOKEN: \${{ steps.app-token.outputs.token }}
        run: |
          OPEN_PRS=\$(gh api repos/\${{ github.repository }}/pulls \\
            --jq '.[] | "\\(.number) \\(.head.ref) \\(.head.sha)"')

          if [ -z "\$OPEN_PRS" ]; then
            echo "No open PRs — nothing to re-run."
            exit 0
          fi

          while IFS=' ' read -r PR_NUMBER BRANCH SHA; do
            [ -z "\$PR_NUMBER" ] && continue

            echo "Dispatching run-scenarios for PR #\$PR_NUMBER (branch: \$BRANCH, sha: \$SHA)"

            gh api repos/\${{ github.repository_owner }}/\$SCENARIOS_REPO/dispatches \\
              -f event_type=run-scenarios \\
              -f "client_payload[pr_number]=\$PR_NUMBER" \\
              -f "client_payload[branch]=\$BRANCH" \\
              -f "client_payload[sha]=\$SHA" \\
              -f "client_payload[repo]=\${{ github.repository }}"

          done <<< "\$OPEN_PRS"
`,

  "workflows/spec-dispatch.yml": `# Spec Dispatch Workflow
#
# Triggered when specs are pushed to main. For each added or modified spec,
# fires a \`spec-pushed\` repository_dispatch event to the scenarios repo so
# that a scenario agent can triage the spec and write/update holdout tests.
#
# Prerequisites:
#   - JOYCRAFT_APP_PRIVATE_KEY secret: GitHub App private key (.pem)
#   - \$JOYCRAFT_APP_ID is replaced with the actual App ID number at install time
#   - \$SCENARIOS_REPO is replaced with the actual scenarios repo name at install time

name: Spec Dispatch

on:
  push:
    branches: [main]
    paths:
      - "docs/specs/**"

jobs:
  dispatch:
    name: Dispatch changed specs to scenarios repo
    runs-on: ubuntu-latest

    steps:
      # ── 1. Check out with depth 2 to enable HEAD~1 diff ──────────────────
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 2

      # ── 2. Find added or modified spec files ──────────────────────────────
      # --diff-filter=AM: Added or Modified only — ignore deletions.
      - name: Find changed specs
        id: changed
        run: |
          FILES=\$(git diff --name-only --diff-filter=AM HEAD~1 HEAD -- 'docs/specs/*.md')
          echo "files<<EOF" >> "\$GITHUB_OUTPUT"
          echo "\$FILES" >> "\$GITHUB_OUTPUT"
          echo "EOF" >> "\$GITHUB_OUTPUT"
          echo "Changed specs: \$FILES"

      # ── 3. Generate GitHub App token for cross-repo dispatch ──────────────
      # Skipped if no specs changed (token unused, save the round-trip).
      - name: Generate GitHub App token
        id: app-token
        if: steps.changed.outputs.files != ''
        uses: actions/create-github-app-token@v1
        with:
          app-id: \$JOYCRAFT_APP_ID
          private-key: \${{ secrets.JOYCRAFT_APP_PRIVATE_KEY }}
          repositories: \$SCENARIOS_REPO

      # ── 4. Dispatch each changed spec to the scenarios repo ───────────────
      # Sends a \`spec-pushed\` event with the spec filename, full content,
      # commit SHA, branch, and originating repo. The scenario agent uses
      # this payload to triage and generate/update tests.
      - name: Dispatch spec-pushed events
        if: steps.changed.outputs.files != ''
        env:
          GH_TOKEN: \${{ steps.app-token.outputs.token }}
        run: |
          while IFS= read -r SPEC_FILE; do
            [ -z "\$SPEC_FILE" ] && continue

            SPEC_FILENAME=\$(basename "\$SPEC_FILE")
            SPEC_CONTENT=\$(cat "\$SPEC_FILE")

            echo "Dispatching spec-pushed for \$SPEC_FILENAME"

            gh api repos/\${{ github.repository_owner }}/\$SCENARIOS_REPO/dispatches \\
              -f event_type=spec-pushed \\
              -f "client_payload[spec_filename]=\$SPEC_FILENAME" \\
              -f "client_payload[spec_content]=\$SPEC_CONTENT" \\
              -f "client_payload[commit_sha]=\${{ github.sha }}" \\
              -f "client_payload[branch]=\${{ github.ref_name }}" \\
              -f "client_payload[repo]=\${{ github.repository }}"

          done <<< "\${{ steps.changed.outputs.files }}"
`,

};

export const CODEX_SKILLS: Record<string, string> = {
  "joycraft-add-fact.md": `---
name: joycraft-add-fact
description: Capture a project fact and route it to the correct context document -- production map, dangerous assumptions, decision log, institutional knowledge, or troubleshooting
---

# Add Fact

The user has a fact to capture. Your job is to classify it, route it to the correct context document, append it in the right format, and optionally add a boundary rule to CLAUDE.md or AGENTS.md.

## Step 1: Get the Fact

If the user already provided the fact (e.g., \`\$joycraft-add-fact the staging DB resets every Sunday\`), use it directly.

If not, ask: "What fact do you want to capture?" -- then wait for their response.

If the user provides multiple facts at once, process each one separately through all the steps below, then give a combined confirmation at the end.

## Step 2: Classify the Fact

Route the fact to one of these 5 context documents based on its content:

### \`docs/context/production-map.md\`
The fact is about **infrastructure, services, environments, URLs, endpoints, credentials, or what is safe/unsafe to touch**.
- Signal words: "production", "staging", "endpoint", "URL", "database", "service", "deployed", "hosted", "credentials", "secret", "environment"
- Examples: "The staging DB is at postgres://staging.example.com", "We use Vercel for the frontend and Railway for the API"

### \`docs/context/dangerous-assumptions.md\`
The fact is about **something an AI agent might get wrong -- a false assumption that leads to bad outcomes**.
- Signal words: "assumes", "might think", "but actually", "looks like X but is Y", "not what it seems", "trap", "gotcha"
- Examples: "The \`users\` table looks like a test table but it's production", "Deleting a workspace doesn't delete the billing subscription"

### \`docs/context/decision-log.md\`
The fact is about **an architectural or tooling choice and why it was made**.
- Signal words: "decided", "chose", "because", "instead of", "we went with", "the reason we use", "trade-off"
- Examples: "We chose SQLite over Postgres because this runs on embedded devices", "We use pnpm instead of npm for workspace support"

### \`docs/context/institutional-knowledge.md\`
The fact is about **team conventions, unwritten rules, organizational context, or who owns what**.
- Signal words: "convention", "rule", "always", "never", "team", "process", "review", "approval", "owns", "responsible"
- Examples: "The design team reviews all color changes", "We never deploy on Fridays", "PR titles must start with the ticket number"

### \`docs/context/troubleshooting.md\`
The fact is about **diagnostic knowledge -- when X happens, do Y (or don't do Z)**.
- Signal words: "when", "fails", "error", "if you see", "stuck", "broken", "fix", "workaround", "before trying", "reboot", "restart", "reset"
- Examples: "If Wi-Fi disconnects during flash, wait and retry -- don't switch networks", "When tests fail with ECONNREFUSED, check if Docker is running"

### Ambiguous Facts

If the fact fits multiple categories, pick the **best fit** based on the primary intent. You will mention the alternative in your confirmation message so the user can correct you.

## Step 3: Ensure the Target Document Exists

1. If \`docs/context/\` does not exist, create the directory.
2. If the target document does not exist, create it from the template structure. Check \`docs/templates/\` for the matching template. If no template exists, use this minimal structure:

For **production-map.md**:
\`\`\`markdown
# Production Map

> What's real, what's staging, what's safe to touch.

## Services

| Service | Environment | URL/Endpoint | Impact if Corrupted |
|---------|-------------|-------------|-------------------|
\`\`\`

For **dangerous-assumptions.md**:
\`\`\`markdown
# Dangerous Assumptions

> Things the AI agent might assume that are wrong in this project.

## Assumptions

| Agent Might Assume | But Actually | Impact If Wrong |
|-------------------|-------------|----------------|
\`\`\`

For **decision-log.md**:
\`\`\`markdown
# Decision Log

> Why choices were made, not just what was chosen.

## Decisions

| Date | Decision | Why | Alternatives Rejected | Revisit When |
|------|----------|-----|----------------------|-------------|
\`\`\`

For **institutional-knowledge.md**:
\`\`\`markdown
# Institutional Knowledge

> Unwritten rules, team conventions, and organizational context.

## Team Conventions

- (none yet)
\`\`\`

For **troubleshooting.md**:
\`\`\`markdown
# Troubleshooting

> What to do when things go wrong for non-code reasons.

## Common Failures

| When This Happens | Do This | Don't Do This |
|-------------------|---------|---------------|
\`\`\`

## Step 4: Read the Target Document

Read the target document to understand its current structure. Note:
- Which section to append to
- Whether it uses tables or lists
- The column format if it's a table

## Step 5: Append the Fact

Add the fact to the appropriate section of the target document. Match the existing format exactly:

- **Table-based documents** (production-map, dangerous-assumptions, decision-log, troubleshooting): Add a new table row in the correct columns. Use today's date where a date column exists.
- **List-based documents** (institutional-knowledge): Add a new list item (\`- \`) to the most appropriate section.

Remove any italic example rows (rows where all cells start with \`_\`) before appending, so the document transitions from template to real content. Only remove examples from the specific table you are appending to.

**Append only. Never modify or remove existing real content.**

## Step 6: Evaluate Boundary Rule

Decide whether the fact also warrants a rule in the project's boundary configuration (CLAUDE.md and/or AGENTS.md -- check which files the project uses and update accordingly):

**Add a boundary rule if the fact:**
- Describes something that should ALWAYS or NEVER be done
- Could cause real damage if violated (data loss, broken deployments, security issues)
- Is a hard constraint that applies across all work, not just a one-time note

**Do NOT add a boundary rule if the fact is:**
- Purely informational (e.g., "staging DB is at this URL")
- A one-time decision that's already captured
- A diagnostic tip rather than a prohibition

If a rule is warranted, read the project's boundary file(s) -- CLAUDE.md and/or AGENTS.md -- find the appropriate section (ALWAYS, ASK FIRST, or NEVER under Behavioral Boundaries), and append the rule. If no Behavioral Boundaries section exists, append one. Update whichever boundary files the project uses (some projects have CLAUDE.md, some have AGENTS.md, some have both).

## Step 7: Confirm

Report what you did in this format:

\`\`\`
Added to [document name]:
  [summary of what was added]

[If boundary file(s) were also updated:]
Added boundary rule to [CLAUDE.md / AGENTS.md / both]:
  [ALWAYS/ASK FIRST/NEVER]: [rule text]

[If the fact was ambiguous:]
Routed to [chosen doc] -- move to [alternative doc] if this is more about [alternative category description].
\`\`\`
`,

  "joycraft-bugfix.md": `---
name: joycraft-bugfix
description: Structured bug fix workflow — triage, diagnose, discuss with user, write a focused spec, hand off for implementation
---

# Bug Fix Workflow

You are fixing a bug. Follow this process in order. Do not skip steps.

**Guard clause:** If this is clearly a new feature, redirect to \`\$joycraft-new-feature\` and stop.

---

## Phase 1: Triage

Establish what's broken. Gather: symptom, steps to reproduce, expected vs actual behavior, when it started, relevant logs/errors. If an error message or stack trace is provided, read the referenced files immediately. Try to reproduce if steps are given.

**Done when:** You can describe the symptom in one sentence.

---

## Phase 2: Diagnose

Find the root cause. Start from the error site and trace backward. Search the codebase and read files — don't guess. Identify the specific line(s) and logic error. Check git blame if it's a recent regression.

**Done when:** You can explain what's wrong, why, and where in 2-3 sentences.

---

## Phase 3: Discuss

Present findings to the user BEFORE writing any code or spec:
1. **Symptom** — confirm it matches what they see
2. **Root cause** — specific file(s) and line(s)
3. **Proposed fix** — what changes, where
4. **Risk** — side effects? scope?

Ask: "Does this match? Comfortable with this approach?" If large/risky, suggest decomposing into multiple specs.

**Done when:** User agrees with the diagnosis and fix direction.

---

## Phase 4: Spec the Fix

Write a bug fix spec to \`docs/specs/YYYY-MM-DD-bugfix-name.md\`. Create the \`docs/specs/\` directory if it doesn't exist.

**Why:** Even bug fixes deserve a spec. It forces clarity on what "fixed" means, ensures test-first discipline, and creates a traceable record of the fix.

Use this structure:

\`\`\`markdown
# [Bug Name] — Bug Fix Spec

> **Status:** Ready
> **Date:** YYYY-MM-DD
> **Estimated scope:** [1 session / N files / ~N lines]

---

## Bug
One sentence — what's broken?

## Root Cause
What's actually wrong, in which file(s) and line(s)?

## Fix
What changes, where?

## Acceptance Criteria
- [ ] [Observable behavior that proves the fix works]
- [ ] No regressions — existing tests still pass
- [ ] Build passes

## Test Plan
1. Write a reproduction test that fails before the fix
2. Apply the fix
3. Reproduction test passes
4. Full test suite passes

## Constraints
- MUST: [hard requirement]
- MUST NOT: [hard prohibition]

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
\`\`\`

**For large bugs that span multiple files/systems:** Consider whether this should be decomposed into multiple specs. If so, create a brief first using \`\$joycraft-new-feature\`, then decompose.

---

## Phase 5: Hand Off

\`\`\`
Bug fix spec is ready: docs/specs/YYYY-MM-DD-bugfix-name.md

Summary:
- Bug: [one sentence]
- Root cause: [one sentence]
- Fix: [one sentence]
- Estimated: 1 session

To execute: Start a fresh session and:
1. Read the spec
2. Write the reproduction test (must fail)
3. Apply the fix (test must pass)
4. Run full test suite
5. Run \$joycraft-session-end to capture discoveries
6. Commit and PR

Ready to start?
\`\`\`
`,

  "joycraft-decompose.md": `---
name: joycraft-decompose
description: Break a feature brief into atomic specs — small, testable, independently executable units
---

# Decompose Feature into Atomic Specs

You have a Feature Brief (or the user has described a feature). Your job is to decompose it into atomic specs that can be executed independently — one spec per session.

## Step 1: Verify the Brief Exists

Look for a Feature Brief in \`docs/briefs/\`. If one doesn't exist yet, tell the user:

> No feature brief found. Run \`\$joycraft-new-feature\` first to interview and create one, or describe the feature now and I'll work from your description.

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
3. "Should any of these run in parallel (separate branches)?"

Iterate until the user approves.

## Step 5: Generate Atomic Specs

For each approved row, create \`docs/specs/YYYY-MM-DD-spec-name.md\`. Create the \`docs/specs/\` directory if it doesn't exist.

**Why:** Each spec must be self-contained — a fresh session should be able to execute it without reading the Feature Brief. Copy relevant constraints and context into each spec.

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
\`\`\`

If \`docs/templates/ATOMIC_SPEC_TEMPLATE.md\` exists, reference it for the full template with additional guidance.

Fill in all sections — each spec must be self-contained (no "see the brief for context"). Copy relevant constraints from the Feature Brief into each spec. Write acceptance criteria specific to THIS spec, not the whole feature. Every acceptance criterion must have at least one corresponding test in the Test Plan. If the user provided test strategy info from the interview, use it to choose test types and frameworks. Include the test harness verification rules in every Test Plan.

## Step 6: Recommend Execution Strategy

Based on the dependency graph:
- **Independent specs** — "These can run in parallel branches"
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
- Sequential: Open a session, point at each spec in order
- Parallel: One spec per branch, merge when done
- Each session should end with \$joycraft-session-end to capture discoveries

Ready to start execution?
\`\`\`
`,

  "joycraft-design.md": `---
name: joycraft-design
description: Design discussion before decomposition — produce a ~200-line design artifact for human review, catching wrong assumptions before they propagate into specs
---

# Design Discussion

You are producing a design discussion document for a feature. This sits between research and decomposition — it captures your understanding so the human can catch wrong assumptions before specs are written.

**Guard clause:** If no brief path is provided and no brief exists in \`docs/briefs/\`, say:
"No feature brief found. Run \`\$joycraft-new-feature\` first to create one, or provide the path to your brief."
Then stop.

---

## Step 1: Read Inputs

Read the feature brief at the path the user provides. If the user also provides a research document path, read that too.

## Step 2: Explore the Codebase

Spawn concurrent subagent threads to explore the codebase for patterns relevant to the brief. Focus on:

- Files and functions that will be touched or extended
- Existing patterns this feature should follow
- Similar features already implemented that serve as models
- Boundaries and interfaces the feature must integrate with

Each subagent should search the codebase and read files to gather file paths, function signatures, and code snippets.

## Step 3: Write the Design Document

Create \`docs/designs/\` directory if it doesn't exist. Write to \`docs/designs/YYYY-MM-DD-feature-name.md\`.

The document has exactly five sections:

### Section 1: Current State
What exists today in the codebase. Include file paths, function signatures, data flows. Be specific.

### Section 2: Desired End State
What the codebase should look like when this feature is complete.

### Section 3: Patterns to Follow
Existing patterns in the codebase that this feature should match. Include code snippets and \`file:line\` references.

### Section 4: Resolved Design Decisions
Decisions made with rationale. Format: Decision, Rationale, Alternative rejected.

### Section 5: Open Questions
Things where multiple valid approaches exist. Each question MUST present 2-3 concrete options with pros and cons.

## Step 4: Present and STOP

Present the design document. Say:
\`\`\`
Design discussion written to docs/designs/YYYY-MM-DD-feature-name.md

Please review. Specifically:
1. Are the patterns in Section 3 right?
2. Do you agree with the resolved decisions?
3. Pick an option for each open question.

Reply with your feedback. I will NOT proceed to decomposition until you have reviewed and approved.
\`\`\`

**CRITICAL: Do NOT proceed to \`\$joycraft-decompose\` or generate specs.** Wait for human review.

## After Human Review

- Update the design document with corrections
- Move answered questions to Resolved Design Decisions
- Present for final confirmation
- Only after explicit approval: "Design approved. Run \`\$joycraft-decompose\` with this brief to generate atomic specs."
`,

  "joycraft-implement-level5.md": `---
name: joycraft-implement-level5
description: Set up Level 5 autonomous development — autofix loop, holdout scenario testing, and scenario evolution from specs
---

# Implement Level 5 — Autonomous Development Loop

You are guiding the user through setting up Level 5: the autonomous feedback loop where specs go in, validated software comes out. This is a one-time setup that installs workflows, creates a scenarios repo, and configures the autofix loop.

## Before You Begin

Check prerequisites:

1. **Project must be initialized.** Search for \`.joycraft-version\`. If missing, tell the user to run \`npx joycraft init\` first.
2. **Project should be at Level 4.** Read \`docs/joycraft-assessment.md\` if it exists. If the project hasn't been assessed yet, suggest running \`\$joycraft-tune\` first. But don't block -- the user may know they're ready.
3. **Git repo with GitHub remote.** This setup requires GitHub Actions. Check for \`.git/\` and a GitHub remote.

If prerequisites aren't met, explain what's needed and stop.

## Step 1: Explain What Level 5 Means

Tell the user:

> Level 5 is the autonomous loop. When you push specs, three things happen automatically:
>
> 1. **Scenario evolution** -- An AI agent reads your specs and writes holdout tests in a private scenarios repo. These tests are invisible to your coding agent.
> 2. **Autofix** -- When CI fails on a PR, the agent automatically attempts a fix (up to 3 times).
> 3. **Holdout validation** -- When CI passes, your scenarios repo runs behavioral tests against the PR. Results post as PR comments.
>
> The key insight: your coding agent never sees the scenario tests. This prevents it from gaming the test suite -- like a validation set in machine learning.

## Step 2: Gather Configuration

Ask these questions **one at a time**:

### Question 1: Scenarios repo name

> What should we call your scenarios repo? It'll be a private repo that holds your holdout tests.
>
> Default: \`{current-repo-name}-scenarios\`

Accept the default or the user's choice.

### Question 2: GitHub App

> Level 5 needs a GitHub App to provide a separate identity for autofix pushes (this avoids GitHub's anti-recursion protection). Creating one takes about 2 minutes:
>
> 1. Go to https://github.com/settings/apps/new
> 2. Give it a name (e.g., "My Project Autofix")
> 3. Uncheck "Webhook > Active" (not needed)
> 4. Under **Repository permissions**, set:
>    - **Contents**: Read & Write
>    - **Pull requests**: Read & Write
>    - **Actions**: Read & Write
> 5. Click **Create GitHub App**
> 6. Note the **App ID** from the settings page
> 7. Scroll to **Private keys** > click **Generate a private key** > save the \`.pem\` file
> 8. Click **Install App** in the left sidebar > install it on your repo
>
> What's your App ID?

## Step 3: Run init-autofix

Run the CLI command with the gathered configuration:

\`\`\`bash
npx joycraft init-autofix --scenarios-repo {name} --app-id {id}
\`\`\`

Review the output with the user. Confirm files were created.

## Step 4: Walk Through Secret Configuration

Guide the user step by step:

### 4a: Add Secrets to Main Repo

> You should already have the \`.pem\` file from when you created the app in Step 2.

> Go to your repo's Settings > Secrets and variables > Actions, and add:
> - \`JOYCRAFT_APP_PRIVATE_KEY\` -- paste the contents of your \`.pem\` file
> - \`ANTHROPIC_API_KEY\` -- your Anthropic API key (or the appropriate AI provider key for your setup)

### 4b: Create the Scenarios Repo

> Create the private scenarios repo:
> \`\`\`bash
> gh repo create {scenarios-repo-name} --private
> \`\`\`
>
> Then copy the scenario templates into it:
> \`\`\`bash
> cp -r docs/templates/scenarios/* ../{scenarios-repo-name}/
> cd ../{scenarios-repo-name}
> git add -A && git commit -m "init: scaffold scenarios repo from Joycraft"
> git push
> \`\`\`

### 4c: Add Secrets to Scenarios Repo

> The scenarios repo also needs the App private key:
> - \`JOYCRAFT_APP_PRIVATE_KEY\` -- same \`.pem\` file as the main repo
> - \`ANTHROPIC_API_KEY\` -- same key (needed for scenario generation)

## Step 5: Verify Setup

Help the user verify everything is wired correctly:

1. **Check workflow files exist:** \`ls .github/workflows/autofix.yml .github/workflows/scenarios-dispatch.yml .github/workflows/spec-dispatch.yml .github/workflows/scenarios-rerun.yml\`
2. **Check scenario templates were copied:** Verify the scenarios repo has \`example-scenario.test.ts\`, \`workflows/run.yml\`, \`workflows/generate.yml\`, \`prompts/scenario-agent.md\`
3. **Check the App ID is correct** in the workflow files (not still a placeholder)

## Step 6: Update AGENTS.md

If the project's AGENTS.md doesn't already have an "External Validation" section, add one:

> ## External Validation
>
> This project uses holdout scenario tests in a separate private repo.
>
> ### NEVER
> - Access, read, or reference the scenarios repo
> - Mention scenario test names or contents
> - Modify the scenarios dispatch workflow to leak test information
>
> The scenarios repo is deliberately invisible to you. This is the holdout guarantee.

## Step 7: First Test (Optional)

If the user wants to test the loop:

> Want to do a quick test? Here's how:
>
> 1. Write a simple spec in \`docs/specs/\` and push to main -- this triggers scenario generation
> 2. Create a PR with a small change -- when CI passes, scenarios will run
> 3. Watch for the scenario test results as a PR comment
>
> Or deliberately break something in a PR to test the autofix loop.

## Step 8: Summary

Print a summary of what was set up:

> **Level 5 is live.** Here's what's running:
>
> | Trigger | What Happens |
> |---------|-------------|
> | Push specs to \`docs/specs/\` | Scenario agent writes holdout tests |
> | PR fails CI | Autofix agent attempts a fix (up to 3x) |
> | PR passes CI | Holdout scenarios run against PR |
> | Scenarios update | Open PRs re-tested with latest scenarios |
>
> Your scenarios repo: \`{name}\`
> Your coding agent cannot see those tests. The holdout wall is intact.

Update \`docs/joycraft-assessment.md\` if it exists -- set the Level 5 score to reflect the new setup.
`,

  "joycraft-interview.md": `---
name: joycraft-interview
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
> **Origin:** \$joycraft-interview session

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
- \$joycraft-new-feature — formalize this into a full Feature Brief with specs
- \$joycraft-decompose — break it directly into atomic specs if scope is clear
- Or just keep brainstorming — run \$joycraft-interview again anytime
\`\`\`

## Guidelines

- **This is NOT \$joycraft-new-feature.** Do not push toward formal briefs, decomposition tables, or atomic specs. The point is exploration.
- **Let the user lead.** Your job is to listen, clarify, and capture — not to structure or direct.
- **Mark everything as DRAFT.** The output is a starting point, not a commitment.
- **Keep it short.** The draft brief should be 1-2 pages max. Capture the essence, not every detail.
- **Multiple interviews are fine.** The user might run this several times as their thinking evolves. Each creates a new dated draft.
`,

  "joycraft-lockdown.md": `---
name: joycraft-lockdown
description: Generate constrained execution boundaries for an implementation session -- NEVER rules and deny patterns to prevent agent overreach
---

# Lockdown Mode

The user wants to constrain agent behavior for an implementation session. Your job is to interview them about what should be off-limits, then generate AGENTS.md NEVER rules and Codex configuration deny patterns they can review and apply.

## When Is Lockdown Useful?

Lockdown is most valuable for:
- **Complex tech stacks** (hardware, firmware, multi-device) where agents can cause real damage
- **Long-running autonomous sessions** where you won't be monitoring every action
- **Production-adjacent work** where accidental network calls or package installs are risky

For simple feature work on a well-tested codebase, lockdown is usually overkill. Mention this context to the user so they can decide.

## Step 1: Check for Tests

Before starting the interview, search the codebase for test files or directories (look for \`tests/\`, \`test/\`, \`__tests__/\`, \`spec/\`, or files matching \`*.test.*\`, \`*.spec.*\`).

If no tests are found, tell the user:

> Lockdown mode is most useful when you already have tests in place -- it prevents the agent from modifying them while constraining behavior to writing code and running tests. Consider running \`\$joycraft-new-feature\` first to set up a test-driven workflow, then come back to lock it down.

If the user wants to proceed anyway, continue with the interview.

## Step 2: Interview -- What to Lock Down

Ask these three questions, one at a time. Wait for the user's response before proceeding to the next question.

### Question 1: Read-Only Files

> What test files or directories should be off-limits for editing? (e.g., \`tests/\`, \`__tests__/\`, \`spec/\`, specific test files)
>
> I'll generate NEVER rules to prevent editing these.

If the user isn't sure, suggest the test directories you found in Step 1.

### Question 2: Allowed Commands

> What commands should the agent be allowed to run? Defaults:
> - Write and edit source code files
> - Run the project's smoke test command
> - Run the full test suite
>
> Any other commands to explicitly allow? Or should I restrict to just these?

### Question 3: Denied Commands

> What commands should be denied? Defaults:
> - Package installs (\`npm install\`, \`pip install\`, \`cargo add\`, \`go get\`, etc.)
> - Network tools (\`curl\`, \`wget\`, \`ping\`, \`ssh\`)
> - Direct log file reading
>
> Any specific commands to add or remove from this list?

**Edge case -- user wants to allow some network access:** If the user mentions API tests or specific endpoints that need network access, exclude those from the deny list and note the exception in the output.

**Edge case -- user wants to lock down file writes:** If the user wants to prevent ALL file writes, warn them:

> Denying all file writes would prevent the agent from doing any work. I recommend keeping source code writes allowed and only locking down test files, config files, or other sensitive directories.

## Step 3: Generate Boundaries

Based on the interview responses, generate output in this exact format:

\`\`\`
## Lockdown boundaries generated

Review these suggestions and add them to your project:

### AGENTS.md -- add to NEVER section:

- Edit any file in \`[user's test directories]\`
- Run \`[denied package manager commands]\`
- Use \`[denied network tools]\`
- Read log files directly -- interact with logs only through test assertions
- [Any additional NEVER rules based on user responses]

### Codex configuration -- suggested deny patterns:

Add these to your Codex sandbox configuration to restrict command execution:

["[command1]", "[command2]", "[command3]"]

---

Copy these into your project manually, or tell me to apply them now (I'll show you the exact changes for approval first).
\`\`\`

Adjust the content based on the actual interview responses:
- Only include deny patterns for commands the user confirmed should be denied
- Only include NEVER rules for directories/files the user specified
- If the user allowed certain network tools or package managers, exclude those

## Recommended Execution Model

After generating the boundaries above, also recommend a Codex execution configuration. Include this section in your output:

\`\`\`
### Recommended Execution Configuration

Codex runs in a sandboxed environment by default. To maximize safety during lockdown:

| Your situation | Configuration | Why |
|---|---|---|
| Autonomous spec execution | Sandbox with deny patterns above | Only pre-approved commands run |
| Long session with some trust | Default sandbox | Network-disabled sandbox prevents external access |
| Interactive development | Default with manual review | Review outputs before applying |

**For lockdown mode, we recommend the default sandboxed execution** combined with the deny patterns above. Codex's sandbox already disables network access by default -- the deny patterns add file-level and command-level restrictions on top.

If you need network access for specific commands (e.g., API tests), configure explicit network allowances in your Codex setup rather than disabling the sandbox entirely.
\`\`\`

## Step 4: Offer to Apply

If the user asks you to apply the changes:

1. **For AGENTS.md:** Read the existing AGENTS.md, find the Behavioral Boundaries section, and show the user the exact diff for the NEVER section. Ask for confirmation before writing.
2. **For Codex configuration:** Show the user what the deny patterns will look like after adding the new restrictions. Ask for confirmation before writing.

**Never auto-apply. Always show the exact changes and wait for explicit approval.**
`,

  "joycraft-new-feature.md": `---
name: joycraft-new-feature
description: Guided feature development — interview the user, produce a Feature Brief, then decompose into atomic specs
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
- [ ] Parallel (specs are independent)
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
3. Run \$joycraft-session-end to capture discoveries
4. Commit and PR

Ready to start?
\`\`\`

**Why:** A fresh session for execution produces better results. The interview session has too much context noise — a clean session with just the spec is more focused.

You can also use \`\$joycraft-decompose\` to re-decompose a brief if the breakdown needs adjustment, or run \`\$joycraft-interview\` first for a lighter brainstorm before committing to the full workflow.
`,

  "joycraft-research.md": `---
name: joycraft-research
description: Produce objective codebase research by isolating question generation from fact-gathering — subagent sees only questions, never the brief
---

# Research Codebase for a Feature

You are producing objective codebase research to inform a future spec or implementation. The key insight: the researching agent must never see the brief or ticket — only research questions. This prevents opinions from contaminating the facts.

**Guard clause:** If the user doesn't provide a brief path or inline description, ask:
"What feature or change are you researching? Provide a brief path or describe it."

---

## Phase 1: Generate Research Questions

Read the brief and identify which zones of the codebase are relevant. Generate 5-10 research questions that are:
- **Objective and fact-seeking** — "How does X work?" not "How should we build X?"
- **Specific to the codebase**
- **Answerable by reading code**

Write the questions to \`docs/research/.questions-tmp.md\`. **Do NOT include any content from the brief.**

---

## Phase 2: Spawn Research Subagent

Spawn a subagent to perform the research. Pass ONLY the research questions — never the brief.

Subagent prompt:
\`\`\`
You are researching a codebase to answer specific questions. You have NO context about why these questions are being asked.

RULES:
- Answer each question with FACTS ONLY: file paths, function signatures, data flows, patterns, dependencies
- Do NOT recommend, suggest, or opine
- Do NOT speculate about what should be built
- If a question cannot be answered, say "No existing code found for this"
- Search the codebase and read files thoroughly
- Include code snippets only when essential evidence

QUESTIONS:
[INSERT_QUESTIONS_HERE]

OUTPUT FORMAT:

# Codebase Research

**Date:** [today]
**Questions answered:** [N/total]

---

## Q1: [question]
[Facts only]

## Q2: [question]
[Facts only]
\`\`\`

## Phase 3: Write the Research Document

Write the subagent's response to \`docs/research/YYYY-MM-DD-feature-name.md\`. Delete the temporary questions file.

Present:
\`\`\`
Research complete: docs/research/YYYY-MM-DD-feature-name.md

This document contains objective facts — no opinions or recommendations.

Next steps:
- \$joycraft-decompose — break the feature into atomic specs
- \$joycraft-new-feature — formalize into a full Feature Brief first
- Read the research and add corrections manually
\`\`\`
`,

  "joycraft-session-end.md": `---
name: joycraft-session-end
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

## 1b. Update Context Documents

If \`docs/context/\` exists, quickly check whether this session revealed anything about:

- **Production risks** — did you interact with or learn about production vs staging systems? Update \`docs/context/production-map.md\`
- **Wrong assumptions** — did you assume something that turned out to be false? Update \`docs/context/dangerous-assumptions.md\`
- **Key decisions** — did you make an architectural or tooling choice? Add a row to \`docs/context/decision-log.md\`
- **Unwritten rules** — did you discover a convention or constraint not documented anywhere? Update \`docs/context/institutional-knowledge.md\`

Skip this if nothing applies. Don't force it — only update when there's genuine new context.

## 2. Run Validation

Run the project's validation commands. Check CLAUDE.md or AGENTS.md for project-specific commands. Common checks:

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

## 5. Push and PR (if autonomous git is enabled)

**Check CLAUDE.md or AGENTS.md for "Git Autonomy" in the Behavioral Boundaries section.** If it says "STRICTLY ENFORCED" or the ALWAYS section includes "Push to feature branches immediately after every commit":

1. **Push immediately.** Run \`git push origin <branch>\` — do not ask, do not hesitate.
2. **Open a PR if the feature is complete.** Check the parent Feature Brief's decomposition table — if all specs are done, run \`gh pr create\` with a summary of all completed specs. Do not ask first.
3. **If not all specs are done,** still push. The PR comes when the last spec is complete.

If CLAUDE.md or AGENTS.md does NOT have autonomous git rules (or has "ASK FIRST" for pushing), ask the user before pushing.

## 6. Report

\`\`\`
Session complete.
- Spec: [spec name] — [Complete / In Progress]
- Build: [passing / failing]
- Discoveries: [N items / none]
- Pushed: [yes / no — and why not]
- PR: [opened #N / not yet — N specs remaining]
- Next: [what the next session should tackle]
\`\`\`
`,

  "joycraft-tune.md": `---
name: joycraft-tune
description: Assess and upgrade your project's AI development harness — score 7 dimensions, apply fixes, show path to Level 5
---

# Tune — Project Harness Assessment & Upgrade

You are evaluating and upgrading this project's AI development harness.

## Step 1: Detect Harness State

Search the codebase for: CLAUDE.md (with meaningful content), \`docs/specs/\`, \`docs/briefs/\`, \`docs/discoveries/\`, \`.agents/skills/\`, and test configuration.

## Step 2: Route

- **No harness** (no CLAUDE.md or just a README): Recommend \`npx joycraft init\` and stop.
- **Harness exists**: Continue to assessment.

## Step 3: Assess — Score 7 Dimensions (1-5 scale)

Read CLAUDE.md and explore the project. Score each with specific evidence:

| Dimension | What to Check |
|-----------|--------------|
| Spec Quality | \`docs/specs/\` — structured? acceptance criteria? self-contained? |
| Spec Granularity | Can each spec be done in one session? |
| Behavioral Boundaries | ALWAYS/ASK FIRST/NEVER sections (or equivalent rules under any heading) |
| Skills & Hooks | \`.agents/skills/\` files, hooks config |
| Documentation | \`docs/\` structure, templates, referenced from CLAUDE.md |
| Knowledge Capture | \`docs/discoveries/\`, \`docs/context/*.md\` — existence AND real content |
| Testing & Validation | Test framework, CI pipeline, validation commands in CLAUDE.md |

Score 1 = absent, 3 = partially there, 5 = comprehensive. Give credit for substance over format.

## Step 4: Write Assessment

Write to \`docs/joycraft-assessment.md\` AND display it. Include: scores table, detailed findings (evidence + gap + recommendation per dimension), and an upgrade plan (up to 5 actions ordered by impact).

## Step 5: Apply Upgrades

Apply using three tiers — do NOT ask per-item permission:

**Tier 1 (silent):** Create missing dirs, install missing skills, copy missing templates, create AGENTS.md.

**Before Tier 2, ask TWO things:**

1. **Git autonomy:** Cautious (ask before push/PR) or Autonomous (push + PR without asking)?
2. **Risk interview (3-5 questions, one at a time):** What could break? What services connect to prod? Unwritten rules? Off-limits files/commands? Skip if \`docs/context/\` already has content.

From answers, generate: CLAUDE.md boundary rules, deny patterns configuration, \`docs/context/\` documents. Also recommend a permission mode (\`auto\` for most; \`dontAsk\` + allowlist for high-risk).

**Tier 2 (show diff):** Add missing CLAUDE.md sections (Boundaries, Workflow, Key Files). Draft from real codebase content. Append only — never reformat existing content.

**Tier 3 (confirm first):** Rewriting existing sections, overwriting customized files, suggesting test framework installs.

After applying, append to \`docs/joycraft-history.md\` and show a consolidated upgrade results table.

## Step 6: Show Path to Level 5

Show a tailored roadmap: Level 2-5 table, specific next steps based on actual gaps, and the Level 5 north star (spec queue, autofix, holdout scenarios, self-improving harness).

## Edge Cases

- **CLAUDE.md is just a README:** Treat as no harness.
- **Non-Joycraft skills:** Acknowledge, don't replace.
- **Rules under non-standard headings:** Give credit for substance.
- **Previous assessment exists:** Read it first. If nothing to upgrade, say so.
- **Non-Joycraft content in CLAUDE.md:** Preserve as-is. Only append.
`,

  "joycraft-verify.md": `---
name: joycraft-verify
description: Spawn an independent verifier subagent to check an implementation against its spec -- read-only, no code edits, structured pass/fail verdict
---

# Verify Implementation Against Spec

The user wants independent verification of an implementation. Your job is to find the relevant spec, extract its acceptance criteria and test plan, then spawn a separate verifier subagent that checks each criterion and produces a structured verdict.

**Why a separate subagent?** Research found that agents reliably skew positive when grading their own work. Separating the agent doing the work from the agent judging it consistently outperforms self-evaluation. The verifier gets a clean context window with no implementation bias.

## Step 1: Find the Spec

If the user provided a spec path (e.g., \`\$joycraft-verify docs/specs/2026-03-26-add-widget.md\`), use that path directly.

If no path was provided, scan \`docs/specs/\` for spec files. Pick the most recently modified \`.md\` file in that directory. If \`docs/specs/\` doesn't exist or is empty, tell the user:

> No specs found in \`docs/specs/\`. Please provide a spec path: \`\$joycraft-verify path/to/spec.md\`

## Step 2: Read and Parse the Spec

Read the spec file and extract:

1. **Spec name** -- from the H1 title
2. **Acceptance Criteria** -- the checklist under the \`## Acceptance Criteria\` section
3. **Test Plan** -- the table under the \`## Test Plan\` section, including any test commands
4. **Constraints** -- the \`## Constraints\` section if present

If the spec has no Acceptance Criteria section, tell the user:

> This spec doesn't have an Acceptance Criteria section. Verification needs criteria to check against. Add acceptance criteria to the spec and try again.

If the spec has no Test Plan section, note this but proceed -- the verifier can still check criteria by reading code and running any available project tests.

## Step 3: Identify Test Commands

Look for test commands in these locations (in priority order):

1. The spec's Test Plan section (look for commands in backticks or "Type" column entries like "unit", "integration", "e2e", "build")
2. The project's CLAUDE.md or AGENTS.md (look for test/build commands in the Development Workflow section)
3. Common defaults based on the project type:
   - Node.js: \`npm test\` or \`pnpm test --run\`
   - Python: \`pytest\`
   - Rust: \`cargo test\`
   - Go: \`go test ./...\`

Build a list of specific commands the verifier should run.

## Step 4: Spawn the Verifier Subagent

Spawn a concurrent subagent thread with the following prompt. Replace the placeholders with the actual content extracted in Steps 2-3.

**Important:** The subagent must be given read-only constraints. It may search the codebase, read files, and run the specified test/build commands, but it must NOT edit or create any files.

\`\`\`
You are a QA verifier. Your job is to independently verify an implementation against its spec. You have NO context about how the implementation was done -- you are checking it fresh.

RULES -- these are hard constraints, not suggestions:
- You may search the codebase and read any file
- You may RUN these specific test/build commands: [TEST_COMMANDS]
- You may NOT edit, create, or delete any files
- You may NOT run commands that modify state (no git commit, no npm install, no file writes)
- You may NOT install packages or access the network
- Report what you OBSERVE, not what you expect or hope

SPEC NAME: [SPEC_NAME]

ACCEPTANCE CRITERIA:
[ACCEPTANCE_CRITERIA]

TEST PLAN:
[TEST_PLAN]

CONSTRAINTS:
[CONSTRAINTS_OR_NONE]

YOUR TASK:
For each acceptance criterion, determine if it PASSES or FAILS based on evidence:

1. Run the test commands listed above. Record the output.
2. For each acceptance criterion:
   a. Check if there is a corresponding test and whether it passes
   b. If no test exists, read the relevant source files to verify the criterion is met
   c. If the criterion cannot be verified by reading code or running tests, mark it MANUAL CHECK NEEDED
3. For criteria about build/test passing, actually run the commands and report results.

OUTPUT FORMAT -- you MUST use this exact format:

VERIFICATION REPORT

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | [criterion text] | PASS/FAIL/MANUAL CHECK NEEDED | [what you observed] |
| 2 | [criterion text] | PASS/FAIL/MANUAL CHECK NEEDED | [what you observed] |
[continue for all criteria]

SUMMARY: X/Y criteria passed. [Z failures need attention. / All criteria verified.]

If any test commands fail to run (missing dependencies, wrong command, etc.), report the error as evidence for a FAIL verdict on the relevant criterion.
\`\`\`

## Step 5: Format and Present the Verdict

Take the subagent's response and present it to the user in this format:

\`\`\`
## Verification Report -- [Spec Name]

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | ... | PASS | ... |
| 2 | ... | FAIL | ... |

**Overall: X/Y criteria passed.**

[If all passed:]
All criteria verified. Ready to commit and open a PR.

[If any failed:]
N failures need attention. Review the evidence above and fix before proceeding.

[If any MANUAL CHECK NEEDED:]
N criteria need manual verification -- they can't be checked by reading code or running tests alone.
\`\`\`

## Step 6: Suggest Next Steps

Based on the verdict:

- **All PASS:** Suggest committing and opening a PR, or running \`\$joycraft-session-end\` to capture discoveries.
- **Some FAIL:** List the failed criteria and suggest the user fix them, then run \`\$joycraft-verify\` again.
- **MANUAL CHECK NEEDED items:** Explain what needs human eyes and why automation couldn't verify it.

**Do NOT offer to fix failures yourself.** The verifier reports; the human (or implementation agent in a separate turn) decides what to do. This separation is the whole point.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Spec has no Test Plan | Warn that verification is weaker without a test plan, but proceed by checking criteria through code reading and any available project-level tests |
| All tests pass but a criterion is not testable | Mark as MANUAL CHECK NEEDED with explanation |
| Subagent can't run tests (missing deps) | Report the error as FAIL evidence |
| No specs found and no path given | Tell user to provide a spec path or create a spec first |
| Spec status is "Complete" | Still run verification -- "Complete" means the implementer thinks it's done, verification confirms |
`,

};

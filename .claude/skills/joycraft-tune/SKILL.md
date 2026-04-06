---
name: joycraft-tune
description: Assess and upgrade your project's AI development harness — score 7 dimensions, apply fixes, show path to Level 5
---

# Tune — Project Harness Assessment & Upgrade

You are evaluating and upgrading this project's AI development harness. Follow these steps in order.

## Step 1: Detect Harness State

Check the following and note what exists:

1. **CLAUDE.md** — Read it if it exists. Check whether it contains meaningful content (not just a project name or generic README).
2. **Key directories** — Check for: `docs/specs/`, `docs/briefs/`, `docs/discoveries/`, `docs/templates/`, `.claude/skills/`
3. **Boundary framework** — Look for `Always`, `Ask First`, and `Never` sections in CLAUDE.md (or similar behavioral constraints under any heading).
4. **Skills infrastructure** — Check `.claude/skills/` for installed skill files.
5. **Test configuration** — Look for test commands in package.json, pyproject.toml, Cargo.toml, Makefile, or CI config files.

## Step 2: Route Based on State

### If No Harness (no CLAUDE.md, or CLAUDE.md is just a README with no structured sections):

Tell the user:
- Their project has no AI development harness
- Recommend running `npx joycraft init` to scaffold one
- Briefly explain what it sets up: CLAUDE.md with boundaries, spec/brief templates, skills, documentation structure
- **Stop here** — do not run the full assessment on a bare project

### If Harness Exists (CLAUDE.md has structured content — boundaries, commands, architecture, or domain rules):

Continue to Step 3 for the full assessment.

## Step 3: Score 7 Dimensions

Read CLAUDE.md thoroughly. Explore the project structure. Score each dimension on a 1-5 scale with specific evidence.

### Dimension 1: Spec Quality

Look in `docs/specs/` for specification files.

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

Look in `.claude/skills/` for skill files. Check for hooks configuration.

| Score | Criteria |
|-------|----------|
| 1 | No .claude/ directory |
| 2 | .claude/ exists but empty or minimal |
| 3 | A few skills installed, no hooks |
| 4 | Multiple relevant skills, basic hooks |
| 5 | Comprehensive skills covering workflow, hooks for validation |

### Dimension 5: Documentation

Examine `docs/` directory structure and content.

| Score | Criteria |
|-------|----------|
| 1 | No docs/ directory |
| 2 | docs/ exists with ad-hoc files |
| 3 | Some structure (subdirectories) but inconsistent |
| 4 | Structured docs/ with templates and clear organization |
| 5 | Full structure: briefs/, specs/, templates/, architecture docs, referenced from CLAUDE.md |

### Dimension 6: Knowledge Capture & Contextual Stewardship

Look for discoveries, decisions, session notes, and context documents.

| Score | Criteria |
|-------|----------|
| 1 | No knowledge capture mechanism |
| 2 | Ad-hoc notes or a discoveries directory with no entries |
| 3 | Discoveries directory with some entries, or context docs exist but empty |
| 4 | Active discoveries + at least 2 context docs with content (production-map, dangerous-assumptions, decision-log, institutional-knowledge) |
| 5 | Full contextual stewardship: discoveries with entries, all 4 context docs maintained, session-end workflow in active use |

**Check for:** `docs/discoveries/`, `docs/context/production-map.md`, `docs/context/dangerous-assumptions.md`, `docs/context/decision-log.md`, `docs/context/institutional-knowledge.md`. Score based on both existence AND whether they have real content (not just templates).

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

Write the assessment to `docs/joycraft-assessment.md` AND display it in the conversation. Use this format:

```markdown
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
```

## Step 5: Apply Upgrades

Immediately after presenting the assessment, apply upgrades using the three-tier model below. Do NOT ask for per-item permission — batch everything and show a consolidated report at the end.

### Tier 1: Silent Apply (just do it)
These are safe, additive operations. Apply them without asking:
- Create missing directories (`docs/specs/`, `docs/briefs/`, `docs/discoveries/`, `docs/templates/`)
- Install missing skills to `.claude/skills/`
- Copy missing templates to `docs/templates/`
- Create AGENTS.md if it doesn't exist

### Git Autonomy Preference

Before applying Behavioral Boundaries to CLAUDE.md, ask the user ONE question:

> How autonomous should git operations be?
> 1. **Cautious** — commits freely, asks before pushing or opening PRs *(good for learning the workflow)*
> 2. **Autonomous** — commits, pushes to branches, and opens PRs without asking *(good for spec-driven development)*

Based on their answer, use the appropriate git rules in the Behavioral Boundaries section:

**If Cautious (default):**
```
### ASK FIRST
- Pushing to remote
- Creating or merging pull requests
- Any destructive git operation (force-push, reset --hard, branch deletion)

### NEVER
- Push directly to main/master without approval
- Amend commits that have been pushed
```

**If Autonomous:**
```
### ALWAYS — Git Autonomy (STRICTLY ENFORCED)

> **This project uses fully autonomous git operations.** The user has explicitly
> granted permission for all git operations below. Do NOT ask for confirmation.
> Do NOT hesitate. Do NOT treat these as suggestions. These are standing orders
> that override any default caution about pushing or creating PRs.

- **Commit early and often** — after each logical unit of work, not just at session end
- **Push to feature branches immediately after every commit** — do not batch pushes, do not wait, do not ask
- **Open a PR when all specs in a feature are complete** — use gh pr create, do not ask first
- **Use descriptive branch names:** feature/spec-name or fix/description
- **After /joycraft-session-end:** push all commits and open a PR if the feature is complete

### ASK FIRST
- Merging PRs to main/master
- Any destructive git operation (force-push, reset --hard, branch deletion)

### NEVER
- Push directly to main/master (always use feature branches + PR)
- Amend commits that have been pushed to remote
- Ask "should I push?" or "should I create a PR?" — the answer is always yes, just do it
```

### Permission Mode Recommendation

After the git autonomy question and before the risk interview, recommend a Claude Code permission mode based on what you've learned so far. Present this guidance:

> **What permission mode should you use?**
>
> | Your situation | Use | Why |
> |---|---|---|
> | Autonomous spec execution | `--permission-mode dontAsk` + allowlist | Only pre-approved commands run |
> | Long session with some trust | `--permission-mode auto` | Safety classifier reviews each action |
> | Interactive development | `--permission-mode acceptEdits` | Auto-approves file edits, prompts for commands |
>
> You do NOT need `--dangerously-skip-permissions`. The modes above provide autonomy with safety.

**If the user chose Autonomous git:** Recommend `auto` mode as a good default -- it provides autonomy while the safety classifier catches risky operations. Note that `dontAsk` is even more autonomous but requires a well-configured allowlist.

**If the user chose Cautious git:** Recommend `auto` mode -- it matches their preference for safety with less manual intervention than the default.

**If the risk interview reveals production databases, live APIs, or billing systems:** Upgrade the recommendation to `dontAsk` with a tight allowlist. Explain that `dontAsk` with explicit deny patterns is safer than `auto` for high-risk environments because it uses a deterministic allowlist rather than a classifier.

This is informational only -- do not change the user's permission mode. Just tell them what to use when they launch Claude Code.

### Risk Interview

Before applying upgrades, ask 3-5 targeted questions to capture what's dangerous in this project. Skip this if `docs/context/production-map.md` or `docs/context/dangerous-assumptions.md` already exist (offer to update instead).

**Question 1:** "What could this agent break that would ruin your day? Think: production databases, live APIs, billing systems, user data, infrastructure."

From the answer, generate:
- NEVER rules for CLAUDE.md (e.g., "NEVER connect to production DB at postgres://prod.example.com")
- Deny patterns for .claude/settings.json (e.g., deny Bash commands containing production hostnames)

**Question 2:** "What external services does this project connect to? Which are production vs. staging/dev?"

From the answer, generate:
- `docs/context/production-map.md` documenting what's real vs safe to touch
- Include: service name, URL/endpoint, environment (prod/staging/dev), what happens if corrupted

**Question 3:** "What are the unwritten rules a new developer would need months to learn about this project?"

From the answer, generate:
- Additions to CLAUDE.md boundaries (new ALWAYS/ASK FIRST/NEVER rules)
- `docs/context/dangerous-assumptions.md` with "Agent might assume X, but actually Y"

**Question 4 (optional):** "What happened last time something went wrong with an automated tool or deploy?"

If the user has a story, capture the lesson as a specific NEVER rule and add to dangerous-assumptions.md.

**Question 5:** "Any files, directories, or commands that should be completely off-limits?"

From the answer, generate deny rules for .claude/settings.json and add to NEVER section.

**Rules for the interview:**
- Ask questions ONE AT A TIME, not all at once
- If the user says "nothing" or "skip", respect that and move on
- Keep it to 2-3 minutes total — don't interrogate
- Generate artifacts immediately after the interview, don't wait for all questions
- This is the SECOND and LAST set of questions during /joycraft-tune (first is git autonomy)

### Tier 2: Apply and Show Diff (do it, then report)
These modify important files but are additive (append-only). Apply them, then show what changed so the user can review. Git is the undo button.
- Add missing sections to CLAUDE.md (Behavioral Boundaries, Development Workflow, Getting Started with Joycraft, Key Files, Common Gotchas)
- Use the git autonomy preference from above when generating the Behavioral Boundaries section
- Draft section content from the actual codebase — not generic placeholders. Read the project's real rules, real commands, real structure.
- Only append — never modify or reformat existing content

### Tier 3: Confirm First (ask before acting)
These are potentially destructive or opinionated. Ask before proceeding:
- Rewriting or reorganizing existing CLAUDE.md sections
- Overwriting files the user has customized
- Suggesting test framework installation or CI setup (present as recommendations, don't auto-install)

### Reading a Previous Assessment

If `docs/joycraft-assessment.md` already exists, read it first. If all recommendations have been applied, report "nothing to upgrade" and offer to re-assess.

### After Applying

Append a history entry to `docs/joycraft-history.md` (create if needed):
```
| [date] | [new avg score] | [change from last] | [summary of what changed] |
```

Then display a single consolidated report:

```markdown
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
```

Update `docs/joycraft-assessment.md` with the new scores and today's date.

## Step 6: Show Path to Level 5

After the upgrade report, always show the Level 5 roadmap tailored to the project's current state:

```markdown
## Path to Level 5 — Autonomous Development

You're at Level [X]. Here's what each level looks like:

| Level | You | AI | Key Skill |
|-------|-----|-----|-----------|
| 2 | Guide direction | Multi-file changes | AI-native tooling |
| 3 | Review diffs | Primary developer | Code review at scale |
| 4 | Write specs, check tests | End-to-end development | Specification writing |
| 5 | Define what + why | Specs in, software out | Systems design |

### Your Next Steps Toward Level [X+1]:
1. [Specific action based on current gaps — e.g., "Write your first atomic spec using /joycraft-new-feature"]
2. [Next action — e.g., "Add vitest and write tests for your core logic"]
3. [Next action — e.g., "Use /joycraft-session-end consistently to build your discoveries log"]

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
```

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

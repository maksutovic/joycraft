---
name: joy
description: Assess and upgrade your project's AI development harness — score 7 dimensions, apply fixes, show path to Level 5
---

# Joy — Project Harness Assessment & Upgrade

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
- Recommend running `npx joysmith init` to scaffold one
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

Write the assessment to `docs/joysmith-assessment.md` AND display it in the conversation. Use this format:

```markdown
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

### Tier 2: Apply and Show Diff (do it, then report)
These modify important files but are additive (append-only). Apply them, then show what changed so the user can review. Git is the undo button.
- Add missing sections to CLAUDE.md (Behavioral Boundaries, Development Workflow, Getting Started with Joysmith, Key Files, Common Gotchas)
- Draft section content from the actual codebase — not generic placeholders. Read the project's real rules, real commands, real structure.
- Only append — never modify or reformat existing content

### Tier 3: Confirm First (ask before acting)
These are potentially destructive or opinionated. Ask before proceeding:
- Rewriting or reorganizing existing CLAUDE.md sections
- Overwriting files the user has customized
- Suggesting test framework installation or CI setup (present as recommendations, don't auto-install)

### Reading a Previous Assessment

If `docs/joysmith-assessment.md` already exists, read it first. If all recommendations have been applied, report "nothing to upgrade" and offer to re-assess.

### After Applying

Append a history entry to `docs/joysmith-history.md` (create if needed):
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

Update `docs/joysmith-assessment.md` with the new scores and today's date.

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

This is a significant journey. Most teams are at Level 2. Getting to Level 4 with Joysmith's workflow is achievable — Level 5 requires building validation infrastructure (scenario tests, spec queues, CI feedback loops) that goes beyond what Joysmith scaffolds today. But the harness you're building now is the foundation.
```

Tailor the "Next Steps" section based on the project's actual gaps — don't show generic advice.

## Edge Cases

- **Not a git repo:** Note this. Joysmith works best in a git repo.
- **CLAUDE.md is just a README:** Treat as "no harness."
- **Non-Joysmith skills already installed:** Acknowledge them. Do not replace — suggest additions.
- **Monorepo:** Assess the root CLAUDE.md. Note if component-level CLAUDE.md files exist.
- **Project has rules under non-standard headings:** Give credit. Suggest reformatting as Always/Ask First/Never but acknowledge the rules are there.
- **Assessment file missing when upgrading:** Run the full assessment first, then offer to apply.
- **Assessment is stale:** Warn and offer to re-assess before proceeding.
- **All recommendations already applied:** Report "nothing to upgrade" and stop.
- **User declines a recommendation:** Skip it, continue, include in "What Was Skipped."
- **CLAUDE.md does not exist at all:** Create it with recommended sections, but ask the user first.
- **Non-Joysmith content in CLAUDE.md:** Preserve exactly as-is. Only append or merge — never remove or reformat existing content.

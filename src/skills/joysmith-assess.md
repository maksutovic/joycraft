---
name: joysmith-assess
description: Deep assessment of project harness quality — score 7 dimensions with evidence and upgrade plan
---

# Joysmith — Detailed Harness Assessment

You are performing a deep assessment of this project's AI development harness. Score each of the 7 dimensions below on a 1-5 scale, with specific evidence and recommendations.

## Instructions

1. Read CLAUDE.md thoroughly
2. Explore the project structure: check docs/, .claude/, test config, CI config
3. Score each dimension using the rubrics below
4. Write the full assessment to `docs/joysmith-assessment.md`
5. Display the assessment in the conversation as well

## Dimension 1: Spec Quality

**What to check:** Look in `docs/specs/` for specification files.

| Score | Criteria |
|-------|----------|
| 1 | No specs directory or no spec files |
| 2 | Specs exist but are informal notes or TODOs |
| 3 | Specs have structure (sections, some criteria) but lack consistency |
| 4 | Specs are structured with clear acceptance criteria and constraints |
| 5 | Atomic specs: self-contained, acceptance criteria, constraints, edge cases, affected files |

**Evidence to capture:** Number of specs found, example of best/worst spec, whether acceptance criteria are present.

**Recommendation format:** "To improve spec quality, [specific action]. Use the spec template at `docs/templates/` or run `/new-feature` to generate a properly structured spec."

## Dimension 2: Spec Granularity

**What to check:** Examine spec scope — can each spec be completed in a single coding session?

| Score | Criteria |
|-------|----------|
| 1 | No specs |
| 2 | Specs cover entire features or epics (multi-day work) |
| 3 | Specs are feature-sized (multi-session but bounded) |
| 4 | Most specs are session-sized with clear scope |
| 5 | All specs are atomic — one session, one concern, clear done state |

**Evidence to capture:** Largest spec (by scope), smallest spec, average estimated scope.

**Recommendation format:** "To improve granularity, use `/decompose` to break large specs into atomic units. Each spec should affect 1-3 files and be completable in a single session."

## Dimension 3: Behavioral Boundaries

**What to check:** Read CLAUDE.md for explicit behavioral constraints.

| Score | Criteria |
|-------|----------|
| 1 | No CLAUDE.md or no behavioral guidance |
| 2 | CLAUDE.md exists with general instructions but no structured boundaries |
| 3 | Some boundaries exist but not organized as Always/Ask First/Never |
| 4 | Always/Ask First/Never sections present with reasonable coverage |
| 5 | Comprehensive boundaries covering code style, testing, deployment, dependencies, and dangerous operations |

**Evidence to capture:** Whether Always/Ask First/Never sections exist, number of rules in each, any obvious gaps.

**Recommendation format:** "To strengthen boundaries, add [specific missing rules] to the [Always/Ask First/Never] section in CLAUDE.md."

## Dimension 4: Skills & Hooks

**What to check:** Look in `.claude/skills/` for skill files. Check `.claude/settings.json` or similar for hooks.

| Score | Criteria |
|-------|----------|
| 1 | No .claude/ directory |
| 2 | .claude/ exists but empty or minimal |
| 3 | A few skills installed, no hooks |
| 4 | Multiple relevant skills, basic hooks |
| 5 | Comprehensive skill set covering workflow (new feature, decompose, session end), hooks for validation |

**Evidence to capture:** List of installed skills, whether hooks are configured, what workflows are covered.

**Recommendation format:** "To improve skills coverage, install [specific skills]. Joysmith provides: `/new-feature` for structured feature development, `/decompose` for breaking down work, `/session-end` for knowledge capture."

## Dimension 5: Documentation

**What to check:** Examine `docs/` directory structure and content.

| Score | Criteria |
|-------|----------|
| 1 | No docs/ directory |
| 2 | docs/ exists with ad-hoc files |
| 3 | Some structure (subdirectories) but inconsistent |
| 4 | Structured docs/ with templates and clear organization |
| 5 | Full documentation structure: briefs/, specs/, templates/, architecture docs, and CLAUDE.md references them |

**Evidence to capture:** Which docs/ subdirectories exist, whether templates are present, whether CLAUDE.md references documentation.

**Recommendation format:** "To improve documentation, create [missing directories]. Add templates to `docs/templates/` so new documents follow a consistent format."

## Dimension 6: Knowledge Capture

**What to check:** Look for mechanisms to capture discoveries, decisions, and session notes.

| Score | Criteria |
|-------|----------|
| 1 | No knowledge capture mechanism |
| 2 | Ad-hoc notes in random locations |
| 3 | A dedicated notes or decisions directory exists |
| 4 | Structured discoveries/decisions directory with some entries |
| 5 | Active knowledge capture: discoveries directory with entries, session-end workflow, decision log |

**Evidence to capture:** Whether docs/discoveries/ exists, number of entries, whether a session-end workflow is in place.

**Recommendation format:** "To improve knowledge capture, create `docs/discoveries/` and use `/session-end` to capture learnings at the end of each coding session."

## Dimension 7: Testing & Validation

**What to check:** Look for test configuration, CI setup, and validation commands in CLAUDE.md.

| Score | Criteria |
|-------|----------|
| 1 | No test configuration |
| 2 | Test framework installed but few/no tests |
| 3 | Tests exist with reasonable coverage |
| 4 | Tests + CI pipeline configured |
| 5 | Tests + CI + validation commands documented in CLAUDE.md + scenario/integration tests |

**Evidence to capture:** Test framework used, approximate test count, whether CI is configured, whether CLAUDE.md documents test/validation commands.

**Recommendation format:** "To improve testing, [specific action]. Add test commands to the CLAUDE.md so Claude always runs them before committing."

## Output Format

Write the assessment in this format (both to file and conversation):

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
**Evidence:** [what was found]
**Gap:** [what's missing]
**Recommendation:** [specific action]

[repeat for each dimension]

## Upgrade Plan

To reach Level [current + 1], complete these steps:

1. [Most impactful action] — addresses [dimension]
2. [Second action] — addresses [dimension]
3. [Third action] — addresses [dimension]
[up to 5 actions, ordered by impact]

## Available Joysmith Skills

These skills are installed and can help with upgrades:
- `/new-feature` — Start a structured feature with brief and specs
- `/decompose` — Break a large task into atomic specs
- `/session-end` — Capture discoveries and learnings
- `/joysmith-upgrade` — Apply specific upgrades to your harness
```

Write this assessment to `docs/joysmith-assessment.md`. Create the `docs/` directory if it doesn't exist.

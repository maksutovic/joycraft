---
name: joycraft-tune
description: Assess and upgrade your project's AI development harness — score 7 dimensions, apply fixes, show path to Level 5
instructions: 15
---

# Tune — Project Harness Assessment & Upgrade

You are evaluating and upgrading this project's AI development harness.

## Step 1: Detect Harness State

Check for: CLAUDE.md (with meaningful content), `docs/specs/`, `docs/briefs/`, `docs/discoveries/`, `.claude/skills/`, and test configuration.

## Step 2: Route

- **No harness** (no CLAUDE.md or just a README): Recommend `npx joycraft init` and stop.
- **Harness exists**: Continue to assessment.

## Step 3: Assess — Score 7 Dimensions (1-5 scale)

Read CLAUDE.md and explore the project. Score each with specific evidence:

| Dimension | What to Check |
|-----------|--------------|
| Spec Quality | `docs/specs/` — structured? acceptance criteria? self-contained? |
| Spec Granularity | Can each spec be done in one session? |
| Behavioral Boundaries | ALWAYS/ASK FIRST/NEVER sections (or equivalent rules under any heading) |
| Skills & Hooks | `.claude/skills/` files, hooks config |
| Documentation | `docs/` structure, templates, referenced from CLAUDE.md |
| Knowledge Capture | `docs/discoveries/`, `docs/context/*.md` — existence AND real content |
| Testing & Validation | Test framework, CI pipeline, validation commands in CLAUDE.md |

Score 1 = absent, 3 = partially there, 5 = comprehensive. Give credit for substance over format.

## Step 4: Write Assessment

Write to `docs/joycraft-assessment.md` AND display it. Include: scores table, detailed findings (evidence + gap + recommendation per dimension), and an upgrade plan (up to 5 actions ordered by impact).

## Step 5: Apply Upgrades

Apply using three tiers — do NOT ask per-item permission:

**Tier 1 (silent):** Create missing dirs, install missing skills, copy missing templates, create AGENTS.md.

**Before Tier 2, ask TWO things:**

1. **Git autonomy:** Cautious (ask before push/PR) or Autonomous (push + PR without asking)?
2. **Risk interview (3-5 questions, one at a time):** What could break? What services connect to prod? Unwritten rules? Off-limits files/commands? Skip if `docs/context/` already has content.

From answers, generate: CLAUDE.md boundary rules, `.claude/settings.json` deny patterns, `docs/context/` documents. Also recommend a permission mode (`auto` for most; `dontAsk` + allowlist for high-risk).

**Tier 2 (show diff):** Add missing CLAUDE.md sections (Boundaries, Workflow, Key Files). Draft from real codebase content. Append only — never reformat existing content.

**Tier 3 (confirm first):** Rewriting existing sections, overwriting customized files, suggesting test framework installs.

After applying, append to `docs/joycraft-history.md` and show a consolidated upgrade results table.

## Step 6: Show Path to Level 5

Show a tailored roadmap: Level 2-5 table, specific next steps based on actual gaps, and the Level 5 north star (spec queue, autofix, holdout scenarios, self-improving harness).

## Edge Cases

- **CLAUDE.md is just a README:** Treat as no harness.
- **Non-Joycraft skills:** Acknowledge, don't replace.
- **Rules under non-standard headings:** Give credit for substance.
- **Previous assessment exists:** Read it first. If nothing to upgrade, say so.
- **Non-Joycraft content in CLAUDE.md:** Preserve as-is. Only append.

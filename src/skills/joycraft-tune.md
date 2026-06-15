---
name: joycraft-tune
description: Assess and upgrade your project's AI development harness — score 7 dimensions, apply fixes, show path to Level 5
instructions: 15
---

# Tune — Project Harness Assessment & Upgrade

You are evaluating and upgrading this project's AI development harness.

## Step 1: Detect Harness State

Check for: {{boundary_file}} (with meaningful content), `docs/features/<slug>/` (briefs + specs), `docs/bugfixes/<area>/`, `docs/discoveries/`, `docs/context/*.md` fact-docs, `docs/context/reference/` long-form docs, `{{skills_dir}}/`, and test configuration.

## Step 2: Route

- **No harness** (no {{boundary_file}} or just a README): Recommend `npx joycraft init` and stop.
- **Harness exists**: Continue to assessment.

## Step 3: Assess — Score 7 Dimensions (1-5 scale)

Read {{boundary_file}} and explore the project. Score each with specific evidence:

| Dimension | What to Check |
|-----------|--------------|
| Spec Quality | `docs/features/<slug>/specs/` (scan recursively; also `docs/bugfixes/<area>/`) — structured? acceptance criteria? self-contained? |
| Spec Granularity | Can each spec be done in one session? |
| Behavioral Boundaries | ALWAYS/ASK FIRST/NEVER sections (or equivalent rules under any heading) |
| Skills & Hooks | `{{skills_dir}}/` files, hooks config |
| Documentation | `docs/` structure, templates, referenced from {{boundary_file}}. Reward a lean + pointered {{boundary_file}}. **Flag a {{boundary_file}} exceeding ~200 lines** — recommend extracting long sections into `docs/context/reference/` and replacing them with a `## Context Map` pointer table. This is advisory only; tune never auto-edits {{boundary_file}}. |
| Knowledge Capture | `docs/discoveries/`, `docs/context/*.md` fact-docs, `docs/context/reference/` long-form docs — existence AND real content |
| Testing & Validation | Test framework, CI pipeline, validation commands in {{boundary_file}} |

Score 1 = absent, 3 = partially there, 5 = comprehensive. Give credit for substance over format.

## Step 4: Write Assessment

Write to `docs{{skill_prefix}}assessment.md` AND display it. Include: scores table, detailed findings (evidence + gap + recommendation per dimension), and an upgrade plan (up to 5 actions ordered by impact).

## Step 5: Apply Upgrades

Apply using three tiers — do NOT ask per-item permission:

**Tier 1 (silent):** Create missing dirs, install missing skills, copy missing templates, create AGENTS.md.

**Before Tier 2, ask about git autonomy:** Cautious (ask before push/PR) or Autonomous (push + PR without asking)?

**First-run context onboarding:** On a first run (the context layer is empty or absent), invoke `{{skill_prefix}}gather-context` for the read-then-offer onboarding pass — it owns reading existing docs, offering a gap-only interview, and populating `docs/context/` (fact-docs and `docs/context/reference/`). Do NOT run a separate risk interview here; gather is the onboarding path. On a recurring run of an already-populated project, skip this — gather is the first-run path, not forced every time.

From git-autonomy and gather, generate: {{boundary_file}} boundary rules, `.claude/settings.json` deny patterns. Also recommend a permission mode (`auto` for most; `dontAsk` + allowlist for high-risk).

**Tier 2 (show diff):** Add missing {{boundary_file}} sections (Boundaries, Workflow, Key Files). Draft from real codebase content. Append only — never reformat existing content.

**Tier 3 (confirm first):** Rewriting existing sections, overwriting customized files, suggesting test framework installs.

After applying, append to `docs{{skill_prefix}}history.md` and show a consolidated upgrade results table.

## Step 6: Show Path to Level 5

Show a tailored roadmap: Level 2-5 table, specific next steps based on actual gaps, and the Level 5 north star (spec queue, autofix, holdout scenarios, self-improving harness).

**Tip:** Run `{{skill_prefix}}optimize` to audit your session's token overhead — plugins, MCP servers, and harness file sizes.

## Edge Cases

- **{{boundary_file}} is just a README:** Treat as no harness.
- **Non-Joycraft skills:** Acknowledge, don't replace.
- **Rules under non-standard headings:** Give credit for substance.
- **Previous assessment exists:** Read it first. If nothing to upgrade, say so.
- **Non-Joycraft content in {{boundary_file}}:** Preserve as-is. Only append.

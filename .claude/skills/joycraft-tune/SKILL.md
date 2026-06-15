---
name: joycraft-tune
description: Assess and upgrade your project's AI development harness — score 7 dimensions, apply fixes, show path to Level 5
instructions: 15
---

# Tune — Project Harness Assessment & Upgrade

You are evaluating and upgrading this project's AI development harness.

## Step 1: Detect Harness State

Check for: CLAUDE.md (with meaningful content), `docs/features/<slug>/` (briefs + specs), `docs/bugfixes/<area>/`, `docs/discoveries/`, `docs/context/*.md` fact-docs, `docs/context/reference/` long-form docs, `.claude/skills/`, and test configuration.

## Step 2: Route

- **No harness** (no CLAUDE.md or just a README): Recommend `npx joycraft init` and stop.
- **Harness exists**: Continue to assessment.

## Step 3: Assess — Score 7 Dimensions (1-5 scale)

Read CLAUDE.md and explore the project. Score each with specific evidence:

| Dimension | What to Check |
|-----------|--------------|
| Spec Quality | `docs/features/<slug>/specs/` (scan recursively; also `docs/bugfixes/<area>/`) — structured? acceptance criteria? self-contained? |
| Spec Granularity | Can each spec be done in one session? |
| Behavioral Boundaries | ALWAYS/ASK FIRST/NEVER sections (or equivalent rules under any heading) |
| Skills & Hooks | `.claude/skills/` files, hooks config |
| Documentation | `docs/` structure, templates, referenced from CLAUDE.md. Reward a lean + pointered CLAUDE.md. **Flag a CLAUDE.md exceeding ~200 lines** — recommend extracting long sections into `docs/context/reference/` and replacing them with a `## Context Map` pointer table. This is advisory only; tune never auto-edits CLAUDE.md. |
| Knowledge Capture | `docs/discoveries/`, `docs/context/*.md` fact-docs, `docs/context/reference/` long-form docs — existence AND real content |
| Testing & Validation | Test framework, CI pipeline, validation commands in CLAUDE.md |

Score 1 = absent, 3 = partially there, 5 = comprehensive. Give credit for substance over format.

## Step 4: Write Assessment

Write to `docs/joycraft-assessment.md` AND display it. Include: scores table, detailed findings (evidence + gap + recommendation per dimension), and an upgrade plan (up to 5 actions ordered by impact).

## Step 5: Apply Upgrades

Apply using three tiers — do NOT ask per-item permission:

**Tier 1 (silent):** Create missing dirs, install missing skills, copy missing templates, create AGENTS.md.

**Private-profile note:** If `.gitignore` ignores the harness dirs (`.claude/`, `.agents/`, `.pi/` — the `private` profile), teammates who clone won't get the skill files. Ensure CLAUDE.md and AGENTS.md each carry a one-line note — append if absent, idempotent (match on the phrase "After cloning, run"): `> **Private setup:** The harness dirs (.claude/, .agents/, .pi/) are gitignored in this repo, so they aren't committed. After cloning, run \`npx joycraft init\` to regenerate the skill files locally — it only creates missing files and leaves your committed \`CLAUDE.md\`, \`AGENTS.md\`, and \`docs/\` untouched (use \`--force\` only if you deliberately want to regenerate them).` Skip entirely under the `shared` profile.

**Already-tracked harness files (private profile):** If the project is on the `private` profile but `git ls-files` shows tracked files under `.claude/`, `.agents/`, or `.pi/`, those files were committed before the switch and the gitignore won't untrack them. Surface the copy-pasteable fix once, prominently, in your upgrade results — `git rm -r --cached .claude .agents .pi` — and note it's advisory (never run git yourself). Skip when no harness files are tracked, and skip entirely under `shared`.

**Before Tier 2, ask about git autonomy:** Cautious (ask before push/PR) or Autonomous (push + PR without asking)?

**First-run context onboarding:** On a first run (the context layer is empty or absent), invoke `/joycraft-gather-context` for the read-then-offer onboarding pass — it owns reading existing docs, offering a gap-only interview, and populating `docs/context/` (fact-docs and `docs/context/reference/`). Do NOT run a separate risk interview here; gather is the onboarding path. On a recurring run of an already-populated project, skip this — gather is the first-run path, not forced every time.

From git-autonomy and gather, generate: CLAUDE.md boundary rules, `.claude/settings.json` deny patterns. Also recommend a permission mode (`auto` for most; `dontAsk` + allowlist for high-risk).

**Tier 2 (show diff):** Add missing CLAUDE.md sections (Boundaries, Workflow, Key Files). Draft from real codebase content. Append only — never reformat existing content.

**Tier 3 (confirm first):** Rewriting existing sections, overwriting customized files, suggesting test framework installs.

After applying, append to `docs/joycraft-history.md` and show a consolidated upgrade results table.

## Step 6: Show Path to Level 5

Show a tailored roadmap: Level 2-5 table, specific next steps based on actual gaps, and the Level 5 north star (spec queue, autofix, holdout scenarios, self-improving harness).

**Tip:** Run `/joycraft-optimize` to audit your session's token overhead — plugins, MCP servers, and harness file sizes.

## Edge Cases

- **CLAUDE.md is just a README:** Treat as no harness.
- **Non-Joycraft skills:** Acknowledge, don't replace.
- **Rules under non-standard headings:** Give credit for substance.
- **Previous assessment exists:** Read it first. If nothing to upgrade, say so.
- **Non-Joycraft content in CLAUDE.md:** Preserve as-is. Only append.

# The Dark Factory Journey: From Level 2 to Level 5

**Date:** March 23, 2026
**Authors:** Max + Claude
**Audience:** Team (Max, Atharva, co-founders)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Research: What is a Dark Factory?](#2-the-research-what-is-a-dark-factory)
3. [Our Assessment: Where We Actually Stand](#3-our-assessment-where-we-actually-stand)
4. [The Pie Case Study: From Broken to All Green](#4-the-pie-case-study-from-broken-to-all-green)
5. [The Playbook: How We Set This Up for Every Project](#5-the-playbook-how-we-set-this-up-for-every-project)
6. [The Roadmap: Level 4 → 4.5 → 5](#6-the-roadmap-level-4--45--5)

---

## 1. Executive Summary

We spent a full session doing deep research into autonomous software development ("dark factories"), assessed our current workflow across all active projects, and then applied what we learned to fix a critical regression in Pie — the one that cost 3+ hours of frustrated debugging.

**Key findings:**
- We're operating at **Level 4** on Dan Shapiro's 5-level framework — significantly ahead of 90% of AI-native developers who plateau at Level 2
- Our spec-writing and session management are strong (150+ session notes across projects)
- Three consistent gaps hold us back: no automated validation, no behavioral boundaries, no custom skills/hooks
- We built a complete harness overhaul: templates, skills, boundary framework, and external scenario tests
- We fixed the Pie regression and got **all 4 external scenarios passing** in one session
- The path to Level 5 is incremental and achievable

---

## 2. The Research: What is a Dark Factory?

We ran 5 parallel research agents covering the entire landscape of autonomous software development. Here's what matters.

### Dan Shapiro's 5 Levels of Vibe Coding

Dan Shapiro (CEO of Glowforge) published this framework in January 2026. It's modeled after the 5 levels of self-driving cars.

| Level | Name | What You Do | What AI Does |
|-------|------|------------|-------------|
| 0 | Spicy Autocomplete | Write all code, AI suggests | Tab completion |
| 1 | Coding Intern | Delegate atomic tasks | Write functions/tests |
| 2 | Junior Developer | Guide direction | Multi-file changes |
| 3 | Developer as Manager | Review diffs all day | Primary developer |
| **4** | **Developer as PM** | **Write specs, check outcomes** | **End-to-end development** |
| 5 | Dark Factory | Define what + why only | Black box: specs in, software out |

**90% of "AI-native" developers are at Level 2** and think they've reached the ceiling. The psychological difficulty at Level 3 ("letting go of the code") is where most people get stuck.

Source: [Dan Shapiro's Blog](https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/)

### StrongDM's Software Factory: The Level 5 Example

Three engineers (Justin McCarthy, Jay Taylor, Navan Chauhan) have been running a dark factory since July 2025. Two rules: "Code must not be written by humans" and "Code must not be reviewed by humans."

**Key innovations:**
- **Attractor** — their open-source coding agent is literally just 3 markdown specification files. Zero code. The specs, when fed to AI agents, produced CXDB: 16K lines Rust + 9.5K Go + 6.7K TypeScript.
- **External Scenarios** — tests stored OUTSIDE the codebase so the AI can't game them. Like a holdout set in ML. This prevents the AI from "teaching to the test."
- **Digital Twin Universe** — behavioral clones of Okta, Jira, Slack, Google Docs for safe integration testing
- **$1,000/engineer/day** in AI compute — their benchmark for serious investment

Simon Willison called it "the most ambitious form of AI-assisted software development I've seen yet."

Source: [factory.strongdm.ai](https://factory.strongdm.ai/)

### The Productivity Paradox (Why Most Teams Get Slower)

The METR 2025 randomized control trial found that experienced developers using AI tools were **19% slower** — while believing they were **24% faster**. That's a 40-point perception gap.

**Why developers get slower:**
1. Evaluating AI suggestions (~9% of task time)
2. Correcting almost-right code (debugging spirals)
3. Context switching between coding mode and prompting mode
4. Sunk cost fallacy (30+ minutes hoping the LLM will crack it)
5. Enjoyment bias (it feels faster than it is)

**The J-Curve:** Productivity dips before it rises. Most organizations are stuck at the bottom. The ones who broke through (25-30%+ gains) redesigned their **entire workflow** — not just added tools. For every $1 on AI licenses, they spent $10 on process transformation.

**The critical quote:** "Generating code has become cheap. Owning code remains expensive. The cost hasn't disappeared; it has transferred from creation to comprehension, validation, and maintenance."

### The Core Insight

The bottleneck has shifted from **implementation speed** to **specification quality**. Spec quality is a function of how deeply you understand the system, your customer, and your problem. That understanding has always been the scarcest resource in software engineering. The dark factory doesn't reduce the demand for it — it makes it the only thing that matters.

---

## 3. Our Assessment: Where We Actually Stand

We analyzed the Claude Code harness (CLAUDE.md, docs/ structure, .claude/ configuration) across all 5 active projects plus Pie.

### Level Ratings

| Project | Level | CLAUDE.md | Session Notes | Best Strength |
|---------|-------|-----------|---------------|---------------|
| Diligent | 3.5 | 42 lines (excellent) | 1 | Most concise CLAUDE.md |
| Foodtrails | 4.0 | 538 lines (too long) | 28 | Spec quality = "industry template" |
| Shuffle | 4.0 | 258 lines (over target) | 13 | Design-first workflow |
| TrashBlitz | 4.0 | 130 lines (excellent) | 35+ | Auth gotcha = gold standard |
| Simmons | 4.0 | 244 lines (over target) | 80+ | 4 months of session continuity |
| Pie (MacOS) | 3.0 | ~300 lines | 5 | Good spec quality |
| Pie Server | 3.0 | 108 lines | 5 | Excellent handoff docs |

**We're solidly Level 4.** Our spec-driven development, session continuity, and layered documentation are genuine strengths.

### Consistent Strengths

1. **Session note discipline** — 150+ notes across all projects. This is our strongest differentiator.
2. **Layered documentation** — CLAUDE.md → docs/patterns/ → docs/claude-sessions/ → docs/superpowers/specs/. Claude loads context incrementally.
3. **Outstanding spec ceiling** — Our best specs (Foodtrails unknown-format-handler, TrashBlitz safe-brand-merge) were called "industry template quality."
4. **Domain knowledge capture** — Simmons MIDI gotchas, TrashBlitz auth patterns, Shuffle SuiteQL gotchas. Exactly what CLAUDE.md is for.
5. **Superpowers integration** — Multiple projects use `"REQUIRED SUB-SKILL: Use superpowers:executing-plans"` directives.

### Consistent Gaps (Every Project)

1. **No boundary tiers (Always / Ask First / Never)** — Claude doesn't know when to proceed vs. pause. This is THE difference between Level 4 and 5.
2. **No automated testing/validation** — Zero projects have test guidance in CLAUDE.md. Without automated validation, you can never let go of human review.
3. **No custom skills, hooks, or agents** — All projects have agent teams enabled but unused. The automation layer is unlocked but empty.
4. **Inconsistent spec quality floor** — The ceiling is excellent, the floor is bullet-point wish lists. Need a template to enforce minimum quality.
5. **CLAUDE.md bloat** — 3 of 7 projects over the 200-line target. Model adherence drops as the file grows.

---

## 4. The Pie Case Study: From Broken to All Green

This is the detailed story of how we applied the dark factory research to fix a real production regression.

### The Problem

After the Supabase migration (March 20-22), the Pie headless agent could no longer correctly use MCP tools. When asked "How are my DAUs looking?", instead of querying PostHog, the agent would say: "Your RevenueCat API access token has expired. Go to your dashboard and generate a new key."

Max spent 3+ hours debugging with vibe coding and couldn't identify the root cause.

### The Diagnosis

We ran analysis agents on both Pie repos (MacOS app + server). The findings:

**The regression was NOT caused by Supabase breaking MCP plumbing.** The architecture always had latent vulnerabilities that were masked when testing with known-good credentials via curl. Supabase changed the credential flow from "developer pastes known-good keys" to "keys resolved from Vault at runtime," which exposed the pre-existing fragility.

**Four root causes stacked:**

1. **All 26 built-in Claude Code tools were enabled.** When MCP tools failed, the agent fell back to ToolSearch, Bash, Grep, etc. instead of reporting the error. The `allowedTools` setting auto-approves tools but doesn't disable unlisted ones.

2. **No system prompt.** The agent had zero identity. No guidance that it's a "growth co-pilot." When MCP tools failed, it became a generic IT support assistant.

3. **MCP failures were completely silent.** The SDK reports connection status (`connected`/`failed`/`needs-auth`) but the server ignored it entirely. Bad credentials = invisible failure.

4. **CLAUDE.md poisoned the runtime agent.** Despite `settingSources: []`, the agent read CLAUDE.md from the working directory and thought it was a code assistant for the Pie server codebase.

**Why vibe coding couldn't fix it:** This is the textbook METR study case. Silent failure paths, context switching between "is it the Mac app? the server? Supabase? MCP?", sunk cost fallacy, and no automated tests to narrow the search.

### What We Built

**Design Spec** (`docs/superpowers/specs/2026-03-23-regression-fix-design.md`)
- Full problem statement with evidence from server logs
- 8 constraints with RFC 2119 language
- Two-phase approach: Phase 1 (demo-ready) + Phase 2 (hardened)
- Affected files manifest for both repos
- Data shapes for new response types
- Edge case table (8 scenarios)
- Verification checklist (10 items for Phase 1)

**Implementation Plan** (`docs/superpowers/plans/2026-03-23-level5-harness-plan.md`)
- 12 tasks across two tracks
- Track A (Tasks 1-6): Regression fix
- Track B (Tasks 7-12): Dark factory harness overhaul
- Each task: goal, files, steps, verification, commit message

**The Fixes (Track A — executed by Claude Code in a fresh session):**

| Task | What It Did |
|------|------------|
| 1. Credential Validator | Pre-validates each API key against the real service (PostHog, RevenueCat, Stripe) before creating a session |
| 2. Partial Sessions | Session creation succeeds even if some credentials fail. Returns `connected_integrations` + `credential_errors` |
| 3. System Prompt | Agent now has identity: "You are Pie, a growth analytics co-pilot." Rules about when to use MCP vs built-in tools |
| 4. MCP Status Detection | SSE stream now includes `mcp_status` event showing which servers connected/failed |
| 5. E2E Verification | Full flow tested: session → message → MCP tool call → data returned |
| 6. Session Note | Documented everything |

**The Harness Overhaul (Track B):**

| Task | What It Did |
|------|------------|
| 7-8. CLAUDE.md Rewrites | Both repos: boundaries, invariants, accurate Supabase architecture, under 200 lines |
| 9. Skills | `.claude/skills/` in both repos: new-feature, session-start, session-end, quick-fix |
| 10. Pattern Docs | `docs/patterns/` for MCP integration, credential flow, Vault operations, SSE events |
| 11. Cross-Repo Contract | Shared API contract in both repos with change protocol |
| 12. Docs Cleanup | Consolidated structure, added spec/plan templates |

### External Scenario Tests

This is the most important innovation from the session. Inspired by StrongDM's holdout evaluation approach.

**Location:** `~/Developer/scenarios/pie-server/` — lives OUTSIDE the pie-server repo. The agent building the server can never see these tests.

**4 scenarios:**

| Scenario | What It Tests | Why It Matters |
|----------|--------------|----------------|
| 01: Health & Session | Server responds, session creates, Vault resolves credentials, bad tokens rejected | Catches auth/infra regressions |
| 02: MCP Tool Usage | Agent uses MCP tools (not built-in), returns real data, no IT support instructions | **Catches the exact regression we had** |
| 03: Credential Failure | Errors reported explicitly (not silently), SSE includes mcp_status event | Catches the "invisible failure" pattern |
| 04: Agent Identity | Agent is growth co-pilot (not code assistant), doesn't explore filesystem | Catches CLAUDE.md poisoning and missing system prompt |

**How to run:**
```bash
cd ~/Developer/scenarios/pie-server
./setup.sh
```

First run prompts for config (Supabase URL, test user, project ID). After that, it loads saved config, fetches a fresh JWT, checks the server, and runs all 4 scenarios.

### The Results

**Before:**
- 3+ hours of frustrated debugging
- Agent giving IT support instructions instead of querying data
- Silent MCP failures with no visibility
- No way to verify if changes fixed anything

**After:**
```
========================================
  ALL 4 SCENARIOS PASSED
========================================
```

The agent now:
- Queries real PostHog data and produces DAU reports with week-over-week comparison
- Reports credential errors explicitly (not silently)
- Identifies as a growth co-pilot, not a code assistant
- Sends MCP connection status via SSE so the Mac app knows what's connected

### Timeline

| Time | What Happened |
|------|--------------|
| Hour 1 | Deep research (5 parallel agents on dark factory concepts) |
| Hour 2 | Cross-project assessment of all 7 repos |
| Hour 3 | Built universal templates (specs, plans, boundaries, skills) |
| Hour 4 | Diagnosed Pie regression from docs alone (no code reading) |
| Hour 5 | Wrote design spec + implementation plan via interview process |
| Hour 6 | Claude Code executed the plan in pie-server (fresh session) |
| Hour 7 | Built external scenario suite, iterated on failures, ALL GREEN |

---

## 5. The Playbook: How We Set This Up for Every Project

### Step 1: Install the Harness Infrastructure

For each project, copy these into the repo:

**Templates (in `docs/superpowers/specs/` and `docs/superpowers/plans/`):**
- `DESIGN_SPEC_TEMPLATE.md` — The "what and why" document. 4 required sections (Problem, Constraints, Files, Verification), 4 that scale with complexity.
- `IMPLEMENTATION_PLAN_TEMPLATE.md` — The "how" document. Task-by-task with file paths, verification, commit messages.
- `BOUNDARY_FRAMEWORK_TEMPLATE.md` — Always/Ask First/Never tier reference.

**Skills (in `.claude/skills/`):**
- `new-feature.md` — Full workflow: interview → design spec → implementation plan → fresh session
- `session-start.md` — Load latest session note, find active plans, report status
- `session-end.md` — Create session note, update plan, validate, commit
- `quick-fix.md` — Lightweight path for 1-3 file changes

All templates are in `~/Developer/Claude-Code-Chat-General/templates/`.

### Step 2: Rewrite CLAUDE.md

Every CLAUDE.md should follow this structure, in this order:

```markdown
# [Project Name]

## Behavioral Boundaries

### ALWAYS
- [Build/type-check command] before committing
- Create session note for work over 30 min
- Read most recent session note at start of new session
- Follow patterns in docs/patterns/

### ASK FIRST
- Adding new dependencies
- Modifying database schema / data models
- Changing auth flows
- Deviating from an approved plan

### NEVER
- Commit code that doesn't build
- Push to main without approval
- [Project-specific prohibitions]

## Invariants (Must Always Hold)
- [Critical properties that must never break]

## Architecture
[Brief — what the system is, how it works, 5-10 lines max]

## Commands
[Build, dev, test, lint — exact commands]

## Key Conventions
[Only non-inferable items — gotchas, business rules, hard-won knowledge]

## Documentation
[Pointers to docs/patterns/, docs/superpowers/, etc.]
```

**Target: under 200 lines.** If a section grows past 20 lines, extract it to `docs/patterns/`.

### Step 3: Build External Scenario Tests

This is the critical piece that enables Level 5. Scenarios live OUTSIDE the project repo.

**Directory structure:**
```
~/Developer/scenarios/
├── pie-server/          # Already done — 4 scenarios, all passing
├── foodtrails/          # TODO
├── trashblitz/          # TODO
├── shuffle/             # TODO
├── diligent/            # TODO
└── simmons/             # TODO (harder — hardware dependency)
```

**How to write a scenario:**

Each scenario answers ONE question: "Does this specific user journey work correctly?"

```bash
#!/bin/bash
# scenario-[name].sh
# QUESTION: [What user journey are you testing?]
# PASS CRITERIA:
# 1. [Observable behavior]
# 2. [Observable behavior]

# Setup: create the preconditions
# Execute: trigger the user journey
# Evaluate: check the criteria
# Report: pass/fail with details
```

**Key principles:**
- Scenarios live OUTSIDE the codebase — the agent can't see them
- Test behaviors, not implementation details
- Use "satisfaction" criteria (did the user get what they needed?) not just assertion checks
- Save full responses to /tmp for debugging
- Each scenario is independently runnable

**Per-project scenario ideas:**

| Project | Scenario Ideas |
|---------|---------------|
| Pie Server | MCP tool usage, credential failures, agent identity, partial sessions |
| Foodtrails | Import wizard processes real CSV, unknown format handled gracefully, pipeline data integrity |
| TrashBlitz | Brand merge doesn't delete items, org scoping isolation, admin portal CRUD |
| Shuffle | NetSuite data sync accuracy, reclassification creates correct journal entries |
| Diligent | Trial flow completes end-to-end, form validation, feature flag behavior |
| Simmons | MIDI round-trip accuracy (requires hardware mock or simulator) |

### Step 4: The Workflow (Per Feature)

```
1. /new-feature (skill triggers interview)
2. Claude interviews you about what to build
3. Claude writes design spec → you review and approve
4. Claude writes implementation plan → you review and approve
5. Start FRESH SESSION → point it at the plan
6. Claude executes task by task, commits after each
7. Claude says "done"
8. You run ./setup.sh in the scenarios directory
9. Scenarios pass? → Ship it
10. Scenarios fail? → Paste output back to Claude → It fixes → Re-run
11. Write a new scenario for anything that broke (grows the holdout suite)
```

### Step 5: The Feedback Loop

Every time something breaks, ask: "What scenario would have caught this?"

Write that scenario. Add it to the suite. The holdout set grows over time, getting harder and harder to game. This is how StrongDM built their evaluation infrastructure — one regression at a time.

---

## 6. The Roadmap: Level 4 → 4.5 → 5

### Level 4 (Where We Are Now)

```
Human → Interview → Spec → Claude executes →
Human runs scenarios → Human pastes failures →
Claude fixes → Human re-runs → Ship
```

**What we have:**
- Spec templates that enforce minimum quality
- Skills for session management and feature workflow
- Boundary framework in CLAUDE.md
- External scenario tests (Pie has 4, all passing)
- The interview → spec → fresh session pattern

**What's manual:**
- Running scenarios
- Feeding results back to Claude
- Deciding when to ship

### Level 4.5 (Next — Automate the Feedback Loop)

```
Human → Interview → Spec → Claude executes →
Scenarios run automatically → Results fed back automatically →
Claude iterates → All green → Human reviews → Ship
```

**How to get here:**

**Step 1: Add `--ci` mode to scenario scripts** (1 hour)
- No interactive prompts (loads from .env.test)
- JSON output format for machine parsing
- Non-zero exit code on failure

**Step 2: Add TaskCompleted hook to Claude Code** (30 min)
```json
// .claude/settings.json
{
  "hooks": {
    "TaskCompleted": [{
      "hooks": [{
        "type": "command",
        "command": "cd ~/Developer/scenarios/pie-server && ./setup.sh --ci",
        "timeout": 120000
      }]
    }]
  }
}
```

When Claude marks a task complete, scenarios auto-run. Exit code 2 sends the failure output back to Claude and prevents it from marking the task as done. It keeps iterating until green.

**Step 3: Add scenario results to the spec feedback loop** (1 hour)
- When scenarios fail, format the output as a bug spec
- Claude reads the failure, diagnoses, fixes, re-runs
- The loop continues until all scenarios pass

**Estimated time to Level 4.5: one afternoon of setup.**

### Level 5 (The Dark Factory)

```
Spec drops into queue → Agent picks it up → Implements →
Scenarios run → Failures fed back → Agent iterates →
All green → PR created → CI validates → Deployed
```

**No human between spec and ship.**

**How to get here (from 4.5):**

**Step 1: Spec queue** — A directory or system where specs are queued for execution. Could be as simple as a `docs/queue/` directory that a cron job monitors.

**Step 2: Autonomous agent loop** — Claude Code in non-interactive mode (`claude -p`) reading specs from the queue, executing plans, running scenarios, iterating.

**Step 3: PR automation** — When all scenarios pass, auto-create a PR with the changes. CI runs the scenario suite (and any traditional tests). Green CI → auto-merge or human review gate.

**Step 4: Observability** — Logging, metrics, cost tracking on every agent run. Know when agents are spinning (high token cost, low progress) and intervene.

**Step 5: Scenario evolution** — Use a SEPARATE agent to write new scenarios based on user feedback, production bugs, and feature requirements. The evaluation suite grows autonomously.

### The StrongDM Benchmark

You'll know you're at Level 5 when:
- You haven't personally written code in weeks
- You write specs and evaluate outcomes
- The scenarios catch regressions before you notice them
- New features go from spec to PR without human code review
- You're spending $1,000+/day in AI compute per engineer (and it's worth it)

### What We're NOT Doing (Yet)

- **Digital Twin Universe** — Building behavioral clones of PostHog/RevenueCat/Stripe for testing. High effort, high reward, but not needed until we have more complex integration scenarios.
- **LLM-as-Judge** — Using a separate Claude instance to evaluate response quality (not just mechanical checks). Valuable for "is this report actually useful?" evaluation.
- **Spec-as-Source** — The pure Level 5 pattern where humans only edit specs, never code. We're not there yet, but the spec templates are the foundation.

---

## Artifacts Reference

All artifacts from this session are in `~/Developer/Claude-Code-Chat-General/`:

| File | Purpose |
|------|---------|
| `dark-factory-research.md` | Full research synthesis (50+ sources) |
| `harness-assessment.md` | Cross-project assessment (shareable) |
| `pie-regression-fix-design.md` | Design spec for Pie regression |
| `pie-level5-harness-plan.md` | 12-task implementation plan |
| `templates/DESIGN_SPEC_TEMPLATE.md` | Universal design spec template |
| `templates/IMPLEMENTATION_PLAN_TEMPLATE.md` | Universal plan template |
| `templates/BOUNDARY_FRAMEWORK.md` | Always/Ask First/Never framework |
| `templates/claude-kit/skills/` | 4 reusable skills |
| `dark-factory-journey.md` | This document |

External scenarios: `~/Developer/scenarios/pie-server/` (4 scenarios, all passing)

Both Pie repos have been scaffolded with templates, skills, and the implementation plan.

---

*"The dark factory does not need more engineers, but it desperately needs better ones. And better means something different than it did a few years ago. It means people who can think clearly about what should exist, describe it precisely enough that machines can build it, and evaluate whether what got built actually serves the real humans it was built for."*

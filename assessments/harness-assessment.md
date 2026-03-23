# Claude Code Harness Assessment: Cross-Project Analysis

**Date:** March 23, 2026
**Projects Analyzed:** 5 active projects
**Goal:** Evaluate current AI-assisted development workflow against Dan Shapiro's 5 Levels of Vibe Coding framework and identify path to Level 5 (Dark Factory)

---

## Executive Summary

We are operating at **Level 4 (Developer as Product Manager)** across all active projects — significantly ahead of the 90% of AI-native developers who plateau at Level 2. Our spec-driven development workflow, session continuity discipline, and layered documentation architecture are genuine strengths. Three specific gaps prevent advancement to Level 5: no automated validation infrastructure, no agent automation layer (skills/hooks/agents), and inconsistent spec quality floor.

---

## Level Ratings by Project

| Project | Level | CLAUDE.md Lines | Session Notes | Spec Quality | Top Strength |
|---------|-------|----------------|---------------|--------------|--------------|
| Diligent | 3.5 | 42 | 1 | Phase 2 excellent | Most concise CLAUDE.md |
| Foodtrails | 4.0 | 538 | 28 | "Industry template" | Spec quality ceiling |
| Shuffle | 4.0 | 258 | 13 | Strong design-first | Domain knowledge capture |
| TrashBlitz | 4.0 | 130 | 35+ | Best specs outstanding | Auth gotcha = gold standard |
| Simmons | 4.0 | 244 | 80+ | Strong domain capture | 80+ session notes over 4 months |

---

## Context: Dan Shapiro's 5 Levels of Vibe Coding

| Level | Name | Human Role | Where We Sit |
|-------|------|-----------|--------------|
| 0 | Spicy Autocomplete | Writes all code, AI suggests | - |
| 1 | Coding Intern | Delegates atomic tasks | - |
| 2 | Junior Developer | Guides direction, reviews everything | 90% of "AI-native" devs are here |
| 3 | Developer as Manager | Reviews diffs, AI is primary developer | - |
| **4** | **Developer as PM** | **Writes specs, checks outcomes** | **We are here** |
| 5 | Dark Factory | Defines what + why, factory runs autonomously | Target |

Key insight from the research: "Specification writing becomes the most valuable technical skill" at Level 4+. We have this skill — it just needs to be systematized and combined with automation.

---

## What We're Doing Well (Consistent Across Projects)

### 1. Session Note Discipline (150+ notes across 5 projects)
This is our strongest differentiator. Every project maintains chronological session logs with structured templates covering objectives, decisions, files changed, and next steps. The Simmons project alone has 80+ notes spanning 4 months of daily work. This creates genuine institutional memory across Claude Code sessions.

### 2. Layered Documentation Architecture
Every project follows the same proven pattern:
```
CLAUDE.md           -> Quick reference (what Claude needs immediately)
docs/patterns/      -> Deep reference (reusable code patterns)
docs/claude-sessions/ -> History (session continuity)
docs/plans/ or docs/superpowers/specs/ -> Execution specs
```
This lets Claude load context incrementally rather than consuming everything upfront.

### 3. Outstanding Spec Ceiling
Our best specs are exemplary:
- **Foodtrails unknown-format-handler**: Problem statement, constraints, canonical field schema, 4-tier architecture, DB schema, API endpoints, test plan with accuracy targets
- **TrashBlitz safe-brand-merge**: Task-by-task breakdown with exact file paths, line numbers, literal code to write, verification steps, commit messages
- **Shuffle row-exit-animation**: Trigger conditions, animation sequence with exact timings, data flow, edge cases, CSS approach, then implementation plan with code diffs

These were independently called "industry template quality" by the analysis agents.

### 4. Domain Knowledge Capture
Hard-won, non-obvious knowledge that prevents real bugs:
- Simmons: MIDI bit-packing gotchas (`midiValue = (bank << 3) | group`)
- TrashBlitz: Supabase auth common mistake (createAdminClient can't see cookies)
- Shuffle: SuiteQL gotchas (transaction type names, date formats, table aliases)
- Foodtrails: Auth0 signing cert issue, tag filtering AND logic

### 5. Superpowers Integration
Multiple projects include directives like `"REQUIRED SUB-SKILL: Use superpowers:executing-plans"` — showing understanding of Claude's execution model and how to leverage it.

---

## What's Holding Us Back (Consistent Gaps)

### Gap 1: No Boundary Tiers (Always / Ask First / Never)
**Impact: HIGH — this is what separates Level 4 from Level 5**

Every project has some prohibitions, but none have structured behavioral boundaries. Without explicit tiers, Claude doesn't know when to proceed autonomously vs. pause and ask. Example of what's needed:

| Tier | Example Rules |
|------|--------------|
| **Always** | Run type-check and lint before committing. Create session note for multi-hour work. |
| **Ask First** | Adding new dependencies. Modifying database schema. Changing auth flow. |
| **Never** | Push to production. Delete session notes. Modify shared protocols without review. |

### Gap 2: No Automated Testing/Validation
**Impact: HIGH — you can't let go of human review without this**

Zero projects have test guidance in CLAUDE.md. No test frameworks specified, no "run tests before committing" hard rules. Manual QA in plan docs does not scale. Without automated validation, the human must remain in the review loop for every change — which is what prevents Level 5 operation.

### Gap 3: No Custom Skills, Hooks, or Agent Definitions
**Impact: MEDIUM-HIGH — low-hanging fruit for automation**

All 5 projects have `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` enabled, but none have:
- `.claude/skills/` (reusable workflows)
- `.claude/hooks/` (automated pre/post-tool validation)
- `AGENTS.md` (multi-agent role definitions)

The capability is unlocked but unused.

### Gap 4: Inconsistent Spec Quality Floor
**Impact: MEDIUM — the ceiling is excellent, the floor is task lists**

The gap between our best specs (implementation-ready with file paths, code diffs, verification steps) and our weakest (bullet-point wish lists) is large. A standardized spec template would raise the floor without limiting creativity at the ceiling.

### Gap 5: CLAUDE.md Bloat (3 of 5 projects)
**Impact: MEDIUM — model adherence drops as file grows**

| Project | Lines | Target | Issue |
|---------|-------|--------|-------|
| Foodtrails | 538 | <200 | 3x over target |
| Shuffle | 258 | <200 | Project structure trees, code examples |
| Simmons | 244 | <200 | Key files table, Quick MIDI reference |
| TrashBlitz | 130 | <200 | Good |
| Diligent | 42 | <200 | Excellent |

Common noise: project structure trees (Claude can `ls`), tech stack lists (inferable from package.json), code examples that duplicate pattern docs.

---

## The Path from Level 4 to Level 5

| What We Have | What Level 5 Needs |
|---|---|
| Specs written before implementation | Specs **complete enough** Claude never needs to ask |
| Manual review of Claude's output | **Automated validation** replacing human review |
| Session notes for continuity | **Hooks and skills** automating session bootstrap |
| Pattern docs as reference | **External scenarios** (holdout tests) evaluating without Claude seeing them |
| Agent teams flag enabled | **AGENTS.md with defined roles** and specialized subagents |
| "What NOT to Do" lists | **Always/Ask First/Never tiers** enabling true autonomous operation |

### Three Workstreams to Close the Gap

**A. Universal Spec Template** — Based on our best work (Foodtrails unknown-format-handler, TrashBlitz safe-brand-merge). Enforces minimum quality: problem statement, constraints, architecture, file manifest, verification steps, commit messages.

**B. Automation Layer** — Custom `.claude/skills/` for repeatable workflows, hooks for pre/post-validation, AGENTS.md for multi-agent coordination. Reusable across all projects.

**C. Boundary Framework** — Always/Ask First/Never tiers designed for our consulting context. Enables Claude to operate autonomously within guardrails.

---

## Research Context

This assessment is grounded in deep research into:
- **Dan Shapiro's 5 Levels of Vibe Coding** (Jan 2026) — the framework for AI coding maturity
- **StrongDM's Software Factory** — the definitive Level 5 example (3 engineers, zero human-written code)
- **METR 2025 RCT** — experienced developers are 19% slower with AI while believing they're 24% faster
- **Boris Cherny's workflow** (Head of Claude Code) — "Interview me, write a spec, fresh session to execute"
- **Anthropic's dual-agent harness** — initializer agent + coding agent + progress file
- **Palisade Research** — reasoning models actively game visible test suites (proving need for external scenarios)

Full research synthesis: `dark-factory-research.md`

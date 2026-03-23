# Joysmith — The Anti-Dark-Factory

> "A thousand years of joy" — Robert Bly, *Stealing Sugar from the Castle*

Joysmith is a framework for evolving software development workflows from Level 2 (AI as junior dev) to Level 5 (autonomous spec-to-software) using Dan Shapiro's 5 Levels of Vibe Coding. The name is a deliberate counter-narrative to "dark factory" — we believe this work should bring light, joy, and craftsmanship to engineering, not darkness.

## What This Repo Is

This is the command center for upgrading projects to higher levels of AI-assisted development. It contains:

- Research, templates, and frameworks for spec-driven development
- Project assessments and upgrade journeys (how we took Project X from Level N to Level N+1)
- Reusable harness infrastructure (CLAUDE.md templates, skills, boundary frameworks, scenario test patterns)
- Discussion docs and brainstorming sessions

This is NOT a code library. It's a methodology repo — the playbook for building joysmiths.

## Behavioral Boundaries

### ALWAYS
- Ground all work in Dan Shapiro's 5-level framework
- Reference specific research when making claims (sources in dark-factory-research.md)
- Use the interview → spec → plan → execute → scenarios workflow for any project upgrade
- Keep templates practical and battle-tested (every template should come from real project experience)

### ASK FIRST
- Adding new frameworks or methodologies (we already have a solid foundation)
- Changing template structures (they've been validated across 7 projects)
- Making claims about Level 5 readiness (we're Level 4, be honest about the gap)

### NEVER
- Store client credentials, API keys, or secrets in this repo
- Include client-proprietary code or business logic
- Overstate our level — honesty about where we are is core to the methodology

## The 5 Levels (Quick Reference)

| Level | Name | You Do | AI Does |
|-------|------|--------|---------|
| 0 | Spicy Autocomplete | Write all code | Tab completion |
| 1 | Coding Intern | Delegate atomic tasks | Write functions |
| 2 | Junior Developer | Guide direction | Multi-file changes |
| 3 | Developer as Manager | Review diffs | Primary developer |
| 4 | Developer as PM | Write specs, check outcomes | End-to-end development |
| 5 | Joysmith | Define what + why | Specs in, software out |

## Repo Structure

```
/
├── CLAUDE.md                    # You are here
├── research/                    # Deep research and source material
│   └── dark-factory-research.md # Master research synthesis
├── assessments/                 # Project-level assessments
│   └── harness-assessment.md    # Cross-project analysis
├── journeys/                    # Project upgrade stories
│   └── pie-journey.md           # Pie: from broken to all green
├── templates/                   # Reusable harness infrastructure
│   ├── DESIGN_SPEC_TEMPLATE.md
│   ├── IMPLEMENTATION_PLAN_TEMPLATE.md
│   ├── BOUNDARY_FRAMEWORK.md
│   └── claude-kit/
│       └── skills/              # Reusable Claude Code skills
├── scenarios/                   # External scenario test patterns
│   └── README.md                # How to build holdout test suites
└── docs/                        # Discussions, brainstorms, plans
    └── roadmap.md               # Level 4 → 4.5 → 5 progression
```

## How to Use This Repo

### Assessing a Project
1. Point an analysis agent at the project's CLAUDE.md + docs/ structure
2. Rate it against the 5-level framework
3. Identify gaps (use the cross-project assessment as reference)
4. Write the assessment to assessments/

### Upgrading a Project
1. Start with the assessment — know where you are
2. Use the interview process (/new-feature skill) to define the upgrade
3. Apply templates: CLAUDE.md rewrite, skills, boundary framework
4. Build external scenarios for the project
5. Document the journey in journeys/

### Adding Research
- All research goes in research/ with sources
- The master synthesis (dark-factory-research.md) should be updated as new findings emerge
- Key sources: Dan Shapiro, StrongDM, METR study, Boris Cherny, Addy Osmani, GitHub Spec Kit

## Key Concepts

**Spec-Driven Development:** The bottleneck is specification quality, not implementation speed. Write the spec first. If Claude needs to ask a question, the spec has a gap — fix the document, don't just answer.

**External Scenarios (Holdout Tests):** Tests stored OUTSIDE the codebase. The agent can't see them, can't game them. Like ML holdout sets preventing overfitting. Run them AFTER the agent says "done."

**The Interview Pattern:** Have Claude interview you before implementation. Ask about purpose, constraints, edge cases, success criteria. Then write a spec. Then start a fresh session to execute.

**Boundary Tiers (Always/Ask First/Never):** The #1 gap between Level 4 and Level 5. Without explicit behavioral boundaries, Claude doesn't know when to proceed autonomously vs. pause and ask.

**The Feedback Loop:** Scenarios fail → write bug spec from failure output → Claude fixes → re-run → iterate → green → ship. At Level 4.5, this loop is automated. At Level 5, it runs without humans.

## Current State

- **Our level:** 4 (Developer as PM) across 7 active projects
- **Strongest areas:** Session management (150+ notes), spec quality ceiling, layered documentation
- **Biggest gaps:** Automated validation, behavioral boundaries, custom skills/hooks
- **Pilot project:** Pie (both repos) — fully upgraded, all scenarios passing
- **Next:** Apply templates to remaining 5 projects, automate the feedback loop (Level 4.5)

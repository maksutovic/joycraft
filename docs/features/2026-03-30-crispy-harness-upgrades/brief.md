# Feature Brief: CRISPY-Informed Harness Upgrades

**Date:** 2026-03-30
**Status:** Complete
**Origin:** Dex Horthy's "RPI to CRISPY" talk (HumanLayer, March 2026)
**Component:** Joycraft skills + templates

---

## Problem Statement

Joycraft's current pipeline (Interview → Brief → Specs → Implement) works well but has three gaps identified by HumanLayer's field research with thousands of engineering teams:

1. **Research contamination** — When the agent researches the codebase while knowing what it's building, the research gets polluted with opinions. Good research is pure facts; knowing the goal biases what gets reported.

2. **No design checkpoint** — Joycraft jumps from Brief → Atomic Specs without an explicit step where the agent shows what patterns it found, what decisions it's making, and what it's uncertain about. Wrong assumptions propagate silently into specs.

3. **Instruction budget unawareness** — Skills haven't been audited against the ~150-200 instruction ceiling. `joycraft-tune` alone is 380 lines. Combined with CLAUDE.md + system prompt + tools, skills may be in the "dumb zone" where instruction adherence degrades.

## Solution

Three independent improvements to the Joycraft harness:

### Upgrade 1: Research Isolation (`/joycraft-research`)

New skill that separates "generate questions" from "gather facts."

**Flow:**
```
Brief/ticket → [Context 1: generate research questions] → questions.md
                                                              ↓
              [Context 2: research codebase with questions only, NO brief] → research.md
```

- Context 1 sees the brief and generates 5-10 objective questions about the codebase
- Context 2 (subagent) sees ONLY the questions, never the brief/ticket
- Output: `docs/research/YYYY-MM-DD-feature-name.md` — pure facts, no opinions
- Research doc feeds into decompose and implement phases

**Why two contexts:** If the researcher knows "we're adding a spline reticulation endpoint," it will editorialize about how endpoints should work instead of just documenting how they DO work. Hiding the ticket keeps research objective.

### Upgrade 2: Design Discussion Step (`/joycraft-design`)

New skill that produces a ~200-line design artifact between research and decompose.

**Flow:**
```
Brief + Research → [design discussion skill] → design.md (~200 lines)
                                                    ↓
                                              Human reviews/corrects
                                                    ↓
                                              design.md + brief → decompose → specs
```

**Design doc contains:**
- **Current state** — What exists today (from research)
- **Desired end state** — What it should look like when done
- **Patterns to follow** — Which existing patterns the agent found and plans to use (human catches wrong pattern choices here)
- **Resolved design decisions** — Options considered, choice made, rationale
- **Open questions** — Things the agent doesn't know, with options for human to pick

**Why this helps:** This is the 200-line doc the human reviews instead of the 1000-line plan. It's where you catch "that's not how we do atomic SQL updates — go find the pattern in /services/billing" before 2000 lines of code follow the wrong pattern.

### Upgrade 3: Instruction Budget Audit

Audit and trim all existing skills to stay under 40 instructions per skill.

**Actions:**
- Count instructions in each skill (each imperative sentence = 1 instruction)
- `joycraft-tune` (380 lines, ~80+ instructions) → split into `tune-assess` and `tune-upgrade` (which already exist but tune.md is the monolith)
- Remove hedging, duplicate instructions, and "nice to have" guidance
- Move conditional logic out of prompts → use skill routing instead
- Document instruction count in a comment at top of each skill

---

## Updated Pipeline

```
Before:  Interview → Brief → Decompose → Specs → Implement → Verify
After:   Interview → Brief → Research → Design → Decompose → Specs → Implement → Verify
```

The new steps (Research, Design) add ~15 minutes of human review time but prevent hours of rework from wrong patterns/assumptions propagating into code.

---

## Decomposition Table

| Spec | Phase | Effort | Dependencies |
|------|-------|--------|--------------|
| research-skill | 1 | Small | None |
| design-skill | 1 | Small | None (can use without research) |
| instruction-audit | 2 | Medium | None (can run in parallel) |

All three are independent and can be built in any order.

---

## Success Criteria

1. `/joycraft-research` produces a research doc with zero implementation opinions
2. `/joycraft-design` produces a ~200 line design artifact that humans can review in <10 minutes
3. No skill exceeds 40 instructions after audit
4. Existing tests continue to pass
5. `npx joycraft init` installs the new skills alongside existing ones

## Non-Goals

- Changing the atomic spec format
- Changing the implementation workflow
- Adding mandatory steps (research and design should be optional/skippable)
- Building an IDE/orchestrator (these are just skills)

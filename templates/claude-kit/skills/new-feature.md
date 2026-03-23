---
name: new-feature
description: Guided feature development — interview, design spec, implementation plan, execute
---

# New Feature Workflow

You are starting a new feature. Follow this process in order. Do not skip steps.

## Phase 1: Interview (this session)

Interview the user about what they want to build. Ask about:
- What problem does this solve? Who is affected?
- What are the hard constraints? (business rules, tech limitations, deadlines)
- What does "done" look like? How will we verify it works?
- What is explicitly NOT in scope?
- Are there edge cases or error conditions we need to handle?
- What existing code/patterns should this follow?

Keep asking until you have enough to write a complete spec. When ready, say:
"I have enough context to write the design spec. Shall I proceed?"

## Phase 2: Design Spec (this session)

Write a design spec to `docs/superpowers/specs/YYYY-MM-DD-$ARGUMENTS-design.md` using the template structure:
1. Problem Statement
2. Constraints (as checkboxes — these become verification items)
3. Approach (architecture, data flow, key decisions + rejected alternatives)
4. Affected Files (create/modify/delete manifest)
5. Data Shapes (if applicable)
6. Edge Cases & Error Handling (if applicable)
7. Out of Scope
8. Verification (observable behaviors as checkboxes)

Present the spec to the user for review. Iterate until approved.

## Phase 3: Implementation Plan (this session)

Write an implementation plan to `docs/superpowers/plans/YYYY-MM-DD-$ARGUMENTS-plan.md`:
- Break into tasks, each independently committable
- Include exact file paths, line numbers where applicable
- Each task has: Goal, Files, Steps, Verification, Commit message
- Include the execution directive: "REQUIRED SUB-SKILL: Use superpowers:executing-plans"

Present the plan to the user for review. Iterate until approved.

## Phase 4: Execute (NEW SESSION RECOMMENDED)

Tell the user:
"Spec and plan are ready. I recommend starting a fresh session to execute the plan with clean context. Run: `/feature-dev` or open a new Claude session and point it at the plan file."

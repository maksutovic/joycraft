---
name: joycraft-design
description: Design discussion before decomposition — produce a ~200-line design artifact for human review, catching wrong assumptions before they propagate into specs
---

# Design Discussion

You are producing a design discussion document for a feature. This sits between research and decomposition — it captures your understanding so the human can catch wrong assumptions before specs are written.

**Guard clause:** If no brief path is provided and no brief exists in `docs/briefs/`, say:
"No feature brief found. Run `$joycraft-new-feature` first to create one, or provide the path to your brief."
Then stop.

---

## Step 1: Read Inputs

Read the feature brief at the path the user provides. If the user also provides a research document path, read that too.

## Step 2: Explore the Codebase

Spawn concurrent subagent threads to explore the codebase for patterns relevant to the brief. Focus on:

- Files and functions that will be touched or extended
- Existing patterns this feature should follow
- Similar features already implemented that serve as models
- Boundaries and interfaces the feature must integrate with

Each subagent should search the codebase and read files to gather file paths, function signatures, and code snippets.

## Step 3: Write the Design Document

Create `docs/designs/` directory if it doesn't exist. Write to `docs/designs/YYYY-MM-DD-feature-name.md`.

The document has exactly five sections:

### Section 1: Current State
What exists today in the codebase. Include file paths, function signatures, data flows. Be specific.

### Section 2: Desired End State
What the codebase should look like when this feature is complete.

### Section 3: Patterns to Follow
Existing patterns in the codebase that this feature should match. Include code snippets and `file:line` references.

### Section 4: Resolved Design Decisions
Decisions made with rationale. Format: Decision, Rationale, Alternative rejected.

### Section 5: Open Questions
Things where multiple valid approaches exist. Each question MUST present 2-3 concrete options with pros and cons.

## Step 4: Present and STOP

Present the design document. Say:
```
Design discussion written to docs/designs/YYYY-MM-DD-feature-name.md

Please review. Specifically:
1. Are the patterns in Section 3 right?
2. Do you agree with the resolved decisions?
3. Pick an option for each open question.

Reply with your feedback. I will NOT proceed to decomposition until you have reviewed and approved.
```

**CRITICAL: Do NOT proceed to `$joycraft-decompose` or generate specs.** Wait for human review.

## After Human Review

- Update the design document with corrections
- Move answered questions to Resolved Design Decisions
- Present for final confirmation
- Only after explicit approval: "Design approved. Run `$joycraft-decompose` with this brief to generate atomic specs."

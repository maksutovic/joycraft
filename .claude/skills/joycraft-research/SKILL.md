---
name: joycraft-research
description: Produce objective codebase research by isolating question generation from fact-gathering — subagent sees only questions, never the brief
---

# Research Codebase for a Feature

You are producing objective codebase research to inform a future spec or implementation. The key insight: the researching agent must never see the brief or ticket — only research questions. This prevents opinions from contaminating the facts.

**Guard clause:** If the user doesn't provide a brief path or inline description, ask:
"What feature or change are you researching? Provide a brief path (e.g., `docs/briefs/2026-03-30-my-feature.md`) or describe it in a few sentences."

---

## Phase 1: Generate Research Questions

Read the brief file (if a path was provided) or use the user's inline description.

Identify which zones of the codebase are relevant to this feature. Then generate 5-10 research questions that are:

- **Objective and fact-seeking** — "How does X work?" not "How should we build X?"
- **Specific to the codebase** — reference concrete systems, files, or flows
- **Answerable by reading code** — no questions about business strategy or user preferences

Good examples:
- "How does endpoint registration work in the current router?"
- "What patterns exist for input validation across existing handlers?"
- "Trace the data flow from API request to database write for entity X."
- "What test infrastructure exists? Where are fixtures, mocks, and helpers?"
- "What dependencies does module Y import, and what does its public API look like?"

Bad examples (do NOT generate these):
- "What's the best way to implement this feature?" (opinion)
- "Should we use library X or Y?" (recommendation)
- "What would a good architecture look like?" (design, not research)

Write the questions to a temporary file at `docs/research/.questions-tmp.md`. Create the `docs/research/` directory if it doesn't exist.

**Do NOT include any content from the brief in this file — only the questions.**

---

## Phase 2: Spawn Research Subagent

Use Claude Code's Agent tool to spawn a subagent. Pass ONLY the research questions — never the brief path, brief content, or feature description.

Build the subagent prompt by reading the questions file you just wrote, then use this template:

```
You are researching a codebase to answer specific questions. You have NO context about why these questions are being asked — you are simply gathering facts.

RULES — these are hard constraints:
- Answer each question with FACTS ONLY: file paths, function signatures, data flows, patterns, dependencies
- Do NOT recommend, suggest, or opine on anything
- Do NOT speculate about what should be built or how
- If a question cannot be answered (no relevant code exists), say "No existing code found for this"
- Use the Read tool and Grep tool to explore the codebase thoroughly
- Include code snippets only when they are essential evidence (e.g., a function signature, a config block)

QUESTIONS:
[INSERT_QUESTIONS_HERE]

OUTPUT FORMAT — write your findings as a single markdown document using this structure:

# Codebase Research

**Date:** [today's date]
**Questions answered:** [N/total]

---

## Q1: [question text]

[Facts, file paths, function signatures, data flows. No opinions.]

## Q2: [question text]

[Facts, file paths, function signatures, data flows. No opinions.]

[Continue for all questions]
```

## Phase 3: Write the Research Document

Take the subagent's response and write it to `docs/research/YYYY-MM-DD-feature-name.md`. Derive the feature name from the brief filename or the user's description (lowercase, hyphenated).

Delete the temporary questions file (`docs/research/.questions-tmp.md`).

Present the research document path to the user:

```
Research complete: docs/research/YYYY-MM-DD-feature-name.md

This document contains objective facts about your codebase — no opinions or recommendations.

Next steps:
- /joycraft-decompose — break the feature into atomic specs (research will inform the specs)
- /joycraft-new-feature — formalize into a full Feature Brief first
- Read the research and add any corrections or missing context manually
```

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No brief provided | Accept inline description, generate questions from that |
| Codebase is empty or new | Research doc reports "no existing patterns found" per question |
| User runs research twice for same feature | Overwrites previous research doc (same filename) |
| Brief is very short (1-2 sentences) | Still generate questions — even simple features benefit from understanding existing patterns |
| `docs/research/` doesn't exist | Create it |

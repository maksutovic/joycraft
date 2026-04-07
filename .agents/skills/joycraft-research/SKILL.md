---
name: joycraft-research
description: Produce objective codebase research by isolating question generation from fact-gathering — subagent sees only questions, never the brief
---

# Research Codebase for a Feature

You are producing objective codebase research to inform a future spec or implementation. The key insight: the researching agent must never see the brief or ticket — only research questions. This prevents opinions from contaminating the facts.

**Guard clause:** If the user doesn't provide a brief path or inline description, ask:
"What feature or change are you researching? Provide a brief path or describe it."

---

## Phase 1: Generate Research Questions

Read the brief and identify which zones of the codebase are relevant. Generate 5-10 research questions that are:
- **Objective and fact-seeking** — "How does X work?" not "How should we build X?"
- **Specific to the codebase**
- **Answerable by reading code**

Write the questions to `docs/research/.questions-tmp.md`. **Do NOT include any content from the brief.**

---

## Phase 2: Spawn Research Subagent

Spawn a subagent to perform the research. Pass ONLY the research questions — never the brief.

Subagent prompt:
```
You are researching a codebase to answer specific questions. You have NO context about why these questions are being asked.

RULES:
- Answer each question with FACTS ONLY: file paths, function signatures, data flows, patterns, dependencies
- Do NOT recommend, suggest, or opine
- Do NOT speculate about what should be built
- If a question cannot be answered, say "No existing code found for this"
- Search the codebase and read files thoroughly
- Include code snippets only when essential evidence

QUESTIONS:
[INSERT_QUESTIONS_HERE]

OUTPUT FORMAT:

# Codebase Research

**Date:** [today]
**Questions answered:** [N/total]

---

## Q1: [question]
[Facts only]

## Q2: [question]
[Facts only]
```

## Phase 3: Write the Research Document

Write the subagent's response to `docs/research/YYYY-MM-DD-feature-name.md`. Delete the temporary questions file.

Present:
```
Research complete: docs/research/YYYY-MM-DD-feature-name.md

This document contains objective facts — no opinions or recommendations.

Recommended next step:
- $joycraft-design — translate research findings into architectural decisions before building

If the scope is simple (< 5 files, well-understood area, no architectural decisions):
- $joycraft-decompose — skip design and break directly into atomic specs

Other options:
- $joycraft-new-feature — formalize into a full Feature Brief first
- Read the research and add corrections manually
```

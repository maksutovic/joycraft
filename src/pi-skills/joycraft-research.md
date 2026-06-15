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

**Output path:**
- If a brief exists at `docs/features/<slug>/brief.md`, write to `docs/features/<slug>/research.md` (per-feature layout).
- If no brief exists (inline description only), write to `docs/research/YYYY-MM-DD-feature-name.md` (flat layout).

Write the questions to `docs/features/<slug>/.questions-tmp.md`. **Do NOT include any content from the brief.**

---

## Phase 2: Deploy Research Subagent

Use the `subagent` tool with agent `joycraft-researcher` to perform the research. Pass ONLY the research questions — never the brief. Build the prompt from the questions file you just wrote.

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

Write the subagent's response to `docs/features/<slug>/research.md`. Delete the temporary questions file.

### Update the Feature Brief

After writing the research document, update the parent brief with a back-reference:
1. Read `docs/features/<slug>/brief.md`
2. In the header blockquote (the `>` lines at the top), add or update:
   `> **Research:** docs/features/<slug>/research.md`
3. If a `> **Research:**` line already exists, replace it — do NOT add a duplicate
4. Write the brief back

Present:
```
Research complete: docs/features/<slug>/research.md

This document contains objective facts — no opinions or recommendations.

Recommended next step:
- /skill:joycraft-design — translate research findings into architectural decisions before building

If the scope is simple (< 5 files, well-understood area, no architectural decisions):
- /skill:joycraft-decompose — skip design and break directly into atomic specs

Other options:
- /skill:joycraft-new-feature — formalize into a full Feature Brief first
- Read the research and add corrections manually
```

## Phase 4: Reconcile Brief with Findings

You've just written `docs/features/<slug>/research.md`. Before hand-off, the parent brief at `docs/features/<slug>/brief.md` may now disagree with what you discovered. Re-read it and check each of these sections:

| Brief section | What to look for |
|---|---|
| Vision | Did your findings refine or contradict the framing? |
| Hard Constraints | Are any constraints now obsolete, missing, or refined? |
| Out of Scope | Did your findings push something in or out of scope? |
| Decomposition | Are spec counts, names, or dependencies still accurate? |
| Test Strategy | Do your findings change what or how to test? |
| Success Criteria | Are the criteria still observable and still match the goal? |

**For each section, choose one:**

- **Edit in place** — small, mechanical updates: line-number corrections, clarifications, additions consistent with brief intent. No user approval needed.
- **Diff + stop** — non-trivial changes: counts flipping, decomposition restructure, scope changes, contradiction with original brief intent. Present a diff of the proposed change, STOP, and wait for user approval before continuing.

If you make changes, note them at the bottom of `research.md` under a "Brief updates" subsection. If the brief is already in sync, note: "Reconciliation checked, no changes required." If no parent brief exists (feature was described inline), note that and skip this step.

**Why this step exists:** the silent-drift gap. Without reconciliation, the brief and downstream artifacts diverge — and later decomposition is sized against the stale brief. This feature ("single-source-skills") hit exactly this: brief said "11 clean / 9 dirty" until the research re-audit forced a re-decomposition. Don't let it happen again.

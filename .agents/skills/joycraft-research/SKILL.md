---
name: joycraft-research
description: Invoked by design/decompose or the human directly — produce objective codebase research by isolating question generation from fact-gathering
---

# Research Codebase for a Feature

You are producing objective codebase research to inform a future spec or implementation. The key insight: the researching agent must never see the brief or ticket — only research questions. This prevents opinions from contaminating the facts.

**Guard clause:** If the user doesn't provide a brief path or inline description, ask:
"What feature or change are you researching? Provide a brief path or describe it."

## Step 0: Retrieve Before You Reason (PROTOCOL)

Before generating a single research question, run a bounded grep-first retrieval pass over the durable knowledge layer — a capped lookup, not a reading assignment:

1. Derive **3-6 search terms** from the brief's (or inline description's) key concepts.
2. Grep, in priority order: `docs/context/decision-log.md`, `docs/context/shipped.md`, `docs/discoveries/`, remaining `docs/context/*.md`.
3. Read **at most 5 files/rows** total; if a term returns dozens of hits, read only the newest within the cap and say the result was truncated.
4. Empty or missing knowledge layer (fresh project): report "nothing to retrieve" in one line and proceed — never block.

**Output contract:** the research document MUST include a **"Prior knowledge reused"** section — a list citing each reused doc + row date/heading, or the explicit line "retrieval ran (terms: …), nothing relevant found."

**Contradictions:** if a retrieved decision or discovery contradicts the brief's direction, surface it explicitly in your handoff — never silently pick a side.

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

Write the subagent's response to `docs/features/<slug>/research.md`, adding a **"Prior knowledge reused"** section at the top from Step 0's retrieval pass (or the line "retrieval ran (terms: …), nothing relevant found"). Delete the temporary questions file.

### Update the Feature Brief

After writing the research document, update the parent brief with a back-reference:
1. Read `docs/features/<slug>/brief.md`
2. In the header blockquote (the `>` lines at the top), add or update:
   `> **Research:** docs/features/<slug>/research.md`
3. If a `> **Research:**` line already exists, replace it — do NOT add a duplicate
4. Write the brief back

At this gate, your chat message is EXACTLY this template — nothing outside it.
The content lives in the artifact, not the chat. Findings go in the research
document — never paste them into chat.

```markdown
**Research complete: <the finding that changes what we build, one line>**
Artifact: <absolute path> (opened) · canonical: docs/features/<slug>/research.md
Decisions needed: <N> — <ids/titles, comma-separated>
<one-line summary per decision, only if N ≤ 4>
Next: <the single action you want from the human>

Ten lines maximum. If you are about to write an eleventh line, the content
belongs in the artifact — move it there.
```

Keep it inline here on purpose: inline placement is load-bearing — referenced
docs get partially read or skipped at output time (Anthropic skill-authoring
guidance; observed live 2026-07-29).

The block below is the artifact's content, not your chat message.

Present:
```
Research complete: docs/features/<slug>/research.md

This document contains objective facts — no opinions or recommendations.

Recommended next step:
- $joycraft-design — translate research findings into architectural decisions before building

If the scope is simple (< 5 files, well-understood area, no architectural decisions):
- $joycraft-decompose — skip design and break directly into atomic specs

Other options:
- $joycraft-new-feature — formalize into a full Feature Brief first
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

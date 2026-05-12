---
name: joycraft-research
description: Produce objective codebase research by isolating question generation from fact-gathering — subagent sees only questions, never the brief
---

# Research Codebase for a Feature

You are producing objective codebase research to inform a future spec or implementation. The key insight: the researching agent must never see the brief or ticket — only research questions. This prevents opinions from contaminating the facts.

**Guard clause:** If the user doesn't provide a brief path or inline description, ask:
"What feature or change are you researching? Provide a brief path (e.g., `docs/features/2026-03-30-my-feature/brief.md`) or describe it in a few sentences."

## Scanning Prior Research (Status Filter)

Before generating fresh questions, scan `docs/features/*/research.md` for prior research on similar topics. Read the YAML frontmatter at the top of each file:

- Treat each file as `status: active` unless its frontmatter explicitly says otherwise.
- **Skip / ignore** any file whose `status:` is `shipped`, `deprecated`, or `superseded` — they are no longer load-bearing.
- Also ignore anything under `docs/archive/` entirely — archived research is out-of-scope.

Files without frontmatter at all are treated as `status: active` (legacy artifacts).

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

Derive a slug `YYYY-MM-DD-<feature-name>`. Lazy-create the folder `docs/features/<slug>/`.
Write the questions to a temporary file at `docs/features/<slug>/.questions-tmp.md`.

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

Take the subagent's response and write it to `docs/features/<slug>/research.md`. The file MUST start with YAML frontmatter — the 4-field personal schema:

```yaml
---
status: active
owner: <resolved name>
created: YYYY-MM-DD
feature: <slug>
---
```

**Owner resolution:** look up the owner name in this order — (1) `git config user.name`, (2) value in your auto-memory `joycraft-owner.txt` if present, (3) ask the user once and persist.

Delete the temporary questions file (`docs/features/<slug>/.questions-tmp.md`).

End with the canonical Handoff block.

## Recommended Next Steps

Next:
```bash
/joycraft-design docs/features/<slug>/research.md
```
Run /clear first.

If the scope is simple (< 5 files, well-understood area, no architectural decisions), instead hand off to `/joycraft-decompose docs/features/<slug>/brief.md` to skip design and break directly into atomic specs.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No brief provided | Accept inline description, generate questions from that |
| Codebase is empty or new | Research doc reports "no existing patterns found" per question |
| User runs research twice for same feature | Overwrites previous research doc (same filename) |
| Brief is very short (1-2 sentences) | Still generate questions — even simple features benefit from understanding existing patterns |
| `docs/features/<slug>/` doesn't exist | Lazy-create it |

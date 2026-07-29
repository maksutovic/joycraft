---
name: joycraft-research
<!-- harness:claude -->
entry: agent
<!-- /harness -->
description: Invoked by design/decompose or the human directly — produce objective codebase research by isolating question generation from fact-gathering
---

# Research Codebase for a Feature

<!-- harness:claude -->
You are producing objective codebase research to inform a future spec or implementation. The key insight: the researching agent must never see the brief or ticket — only research questions. This prevents opinions from contaminating the facts.

**Guard clause:** If the user doesn't provide a brief path or inline description, ask:
"What feature or change are you researching? Provide a brief path (e.g., `docs/features/2026-03-30-my-feature/brief.md`) or describe it in a few sentences."

## Step 0: Retrieve Before You Reason (PROTOCOL)

Before generating a single research question, run a bounded grep-first retrieval pass over the durable knowledge layer. This is not optional and it is not open-ended — it is a capped lookup, not a reading assignment.

1. Derive **3-6 search terms** from the brief's (or inline description's) nouns and verbs — the feature's key concepts, not generic words.
2. Grep the knowledge layer for those terms, in priority order:
   - `docs/context/decision-log.md` (why past choices were made)
   - `docs/context/shipped.md` (what/where already exists)
   - `docs/discoveries/` (negative knowledge — things that didn't work)
   - remaining `docs/context/*.md` files
3. Read **at most 5 files/rows** total — the matches, not the surrounding context. If a grep term returns dozens of hits, read only the newest matches within the cap and say the result was truncated.
4. If the knowledge layer is empty or missing (fresh project), report "nothing to retrieve" in one line and proceed — never block.

**Output contract:** the research document (Phase 3) MUST include a **"Prior knowledge reused"** section — either a list citing each reused doc + row date/heading, or the explicit line "retrieval ran (terms: …), nothing relevant found." Silently skipping this section is not compliant.

**Contradictions:** if a retrieved decision or discovery contradicts the direction implied by the brief, surface it explicitly to the human in your handoff — do not silently pick a side or omit the conflict.

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

**Output path:**
- If a brief exists at `docs/features/<slug>/brief.md`, write to `docs/features/<slug>/research.md` (per-feature layout).
- If no brief exists (inline description only), write to `docs/research/YYYY-MM-DD-feature-name.md` (flat layout).
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

Immediately below the frontmatter, add a **"Prior knowledge reused"** section from Step 0's retrieval pass: a list citing each reused doc + row date/heading, or the line "retrieval ran (terms: …), nothing relevant found." Never omit this section.

Delete the temporary questions file (`docs/features/<slug>/.questions-tmp.md`).

### Update the Feature Brief

After writing the research document, update the parent brief with a back-reference:
1. Read `docs/features/<slug>/brief.md`
2. In the header blockquote (the `>` lines at the top), add or update:
   `> **Research:** docs/features/<slug>/research.md`
3. If a `> **Research:**` line already exists, replace it — do NOT add a duplicate
4. Write the brief back

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

### Decide first — the pre-presentation rule

If the artifact contains any open question, or any load-bearing claim anchored
≤50, invoke `{{skill_prefix}}decide` on it NOW — before presenting. The Block Rule
(`docs/context/anchors.md`) fires pre-approval, every time; presenting
an artifact with open questions asks the human to approve an incomplete
artifact.
If the human already answered them in conversation, that counts as termination:
stamp the `decisions:` frontmatter and proceed — no dossier required. Zero open
questions and no ≤50 claims → the gate passes silently.

### Render and open the research

`docs/features/<slug>/research.md` is written first and stays **canonical** —
agents read the md, never the HTML. The HTML is a render of it and never invents
content.

1. Read `docs/templates/REVIEW_GATE_TEMPLATE.html`. Fill ONLY the
   `<!-- SLOT:name — … -->` regions per each slot's inline guidance; the
   template's structure, class names, CSS, and theme script stay
   **byte-identical** — never generate freeform gate HTML.
2. Write it to `docs/features/<slug>/research.html` (committed later — the path
   is already linguist-generated, so PRs collapse it). Re-running the gate
   overwrites the same file; the md is the record.
3. Open it before asking anything: `open <path>` on darwin, `xdg-open <path>`
   otherwise. If both fail, print the absolute path and continue — headless, CI,
   and isolated mode are a no-op here, never a failure.
4. Offer — don't push — an optional extra render: "I can also publish this
   research as a hosted artifact for a shareable link." Only publish if the human
   says yes; the local file remains the canonical render. If declined, no retry.

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

End with the canonical Handoff block.

## Recommended Next Steps

Next:
```bash
{{skill_prefix}}design docs/features/<slug>/research.md
```
Run /clear first.

Then hand off with a briefing, not a bare command — a prompt the human pastes into the fresh session after /clear. Fill every line; a cold agent must be able to act on this block alone without re-deriving context.

```
{{skill_prefix}}design docs/features/<slug>/research.md

You are picking up codebase research for <slug>, researched <date>.
Findings <ids> are recorded in research.md — do not reopen them.
Start: draft the design against those findings. Order: research.md's question order.
Hazard: <the one known trap, or "none known">.
Done when: docs/features/<slug>/design.md exists and the human has approved it.
```

Filled example:

```
{{skill_prefix}}design docs/features/2026-07-29-succinct-gates/research.md

You are picking up codebase research for 2026-07-29-succinct-gates, researched 2026-07-29.
Findings Q1-Q5 are recorded in research.md — do not reopen them.
Start: draft the design against those findings. Order: research.md's question order.
Hazard: skill sources fan out to four generated harness trees.
Done when: docs/features/2026-07-29-succinct-gates/design.md exists and the human has approved it.
```

If the scope is simple (< 5 files, well-understood area, no architectural decisions), instead hand off to `{{skill_prefix}}decompose docs/features/<slug>/brief.md` to skip design and break directly into atomic specs.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No brief provided | Accept inline description, generate questions from that |
| Codebase is empty or new | Research doc reports "no existing patterns found" per question |
| User runs research twice for same feature | Overwrites previous research doc (same filename) |
| Brief is very short (1-2 sentences) | Still generate questions — even simple features benefit from understanding existing patterns |
| `docs/features/<slug>/` doesn't exist | Lazy-create it |
<!-- /harness -->
<!-- harness:codex|copilot -->
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

### Decide first — the pre-presentation rule

If the artifact contains any open question, or any load-bearing claim anchored
≤50, invoke `{{skill_prefix}}decide` on it NOW — before presenting. The Block Rule
(`docs/context/anchors.md`) fires pre-approval, every time; presenting
an artifact with open questions asks the human to approve an incomplete
artifact.
If the human already answered them in conversation, that counts as termination:
stamp the `decisions:` frontmatter and proceed — no dossier required. Zero open
questions and no ≤50 claims → the gate passes silently.

### Render and open the research

`docs/features/<slug>/research.md` is written first and stays **canonical** —
agents read the md, never the HTML. The HTML is a render of it and never invents
content.

1. Read `docs/templates/REVIEW_GATE_TEMPLATE.html`. Fill ONLY the
   `<!-- SLOT:name — … -->` regions per each slot's inline guidance; the
   template's structure, class names, CSS, and theme script stay
   **byte-identical** — never generate freeform gate HTML.
2. Write it to `docs/features/<slug>/research.html` (committed later — the path
   is already linguist-generated, so PRs collapse it). Re-running the gate
   overwrites the same file; the md is the record.
3. Open it before asking anything: `open <path>` on darwin, `xdg-open <path>`
   otherwise. If both fail, print the absolute path and continue — headless, CI,
   and isolated mode are a no-op here, never a failure.
4. Offer — don't push — an optional extra render: "I can also publish this
   research as a hosted artifact for a shareable link." Only publish if the human
   says yes; the local file remains the canonical render. If declined, no retry.

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
- {{skill_prefix}}design — translate research findings into architectural decisions before building

If the scope is simple (< 5 files, well-understood area, no architectural decisions):
- {{skill_prefix}}decompose — skip design and break directly into atomic specs

Other options:
- {{skill_prefix}}new-feature — formalize into a full Feature Brief first
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
<!-- /harness -->
<!-- harness:pi -->
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

Write the subagent's response to `docs/features/<slug>/research.md`, adding a **"Prior knowledge reused"** section at the top from Step 0's retrieval pass (or the line "retrieval ran (terms: …), nothing relevant found"). Delete the temporary questions file.

### Update the Feature Brief

After writing the research document, update the parent brief with a back-reference:
1. Read `docs/features/<slug>/brief.md`
2. In the header blockquote (the `>` lines at the top), add or update:
   `> **Research:** docs/features/<slug>/research.md`
3. If a `> **Research:**` line already exists, replace it — do NOT add a duplicate
4. Write the brief back

### Decide first — the pre-presentation rule

If the artifact contains any open question, or any load-bearing claim anchored
≤50, invoke `{{skill_prefix}}decide` on it NOW — before presenting. The Block Rule
(`docs/context/anchors.md`) fires pre-approval, every time; presenting
an artifact with open questions asks the human to approve an incomplete
artifact.
If the human already answered them in conversation, that counts as termination:
stamp the `decisions:` frontmatter and proceed — no dossier required. Zero open
questions and no ≤50 claims → the gate passes silently.

### Render and open the research

`docs/features/<slug>/research.md` is written first and stays **canonical** —
agents read the md, never the HTML. The HTML is a render of it and never invents
content.

1. Read `docs/templates/REVIEW_GATE_TEMPLATE.html`. Fill ONLY the
   `<!-- SLOT:name — … -->` regions per each slot's inline guidance; the
   template's structure, class names, CSS, and theme script stay
   **byte-identical** — never generate freeform gate HTML.
2. Write it to `docs/features/<slug>/research.html` (committed later — the path
   is already linguist-generated, so PRs collapse it). Re-running the gate
   overwrites the same file; the md is the record.
3. Open it before asking anything: `open <path>` on darwin, `xdg-open <path>`
   otherwise. If both fail, print the absolute path and continue — headless, CI,
   and isolated mode are a no-op here, never a failure.
4. Offer — don't push — an optional extra render: "I can also publish this
   research as a hosted artifact for a shareable link." Only publish if the human
   says yes; the local file remains the canonical render. If declined, no retry.

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
- {{skill_prefix}}design — translate research findings into architectural decisions before building

If the scope is simple (< 5 files, well-understood area, no architectural decisions):
- {{skill_prefix}}decompose — skip design and break directly into atomic specs

Other options:
- {{skill_prefix}}new-feature — formalize into a full Feature Brief first
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
<!-- /harness -->

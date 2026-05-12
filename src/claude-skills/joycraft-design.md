---
name: joycraft-design
description: Design discussion before decomposition — produce a ~200-line design artifact for human review, catching wrong assumptions before they propagate into specs
---

# Design Discussion

You are producing a design discussion document for a feature. This sits between research and decomposition — it captures your understanding so the human can catch wrong assumptions before specs are written.

**Guard clause:** If no brief path is provided and no brief exists at `docs/features/<slug>/brief.md`, say:
"No feature brief found. Run `/joycraft-new-feature` first to create one, or provide the path to your brief."
Then stop.

---

## Step 1: Read Inputs

Read the feature brief at the path the user provides. If the user also provides a research document path, read that too. Research is optional — if none exists, note that you'll explore the codebase directly.

## Step 2: Explore the Codebase

Spawn subagents to explore the codebase for patterns relevant to the brief. Focus on:

- Files and functions that will be touched or extended
- Existing patterns this feature should follow (naming, data flow, error handling)
- Similar features already implemented that serve as models
- Boundaries and interfaces the feature must integrate with

Gather file paths, function signatures, and code snippets. You need concrete evidence, not guesses.

## Step 3: Write the Design Document

Derive the slug from the brief path (`docs/features/<slug>/brief.md`).
Lazy-create the folder `docs/features/<slug>/` if needed.
Write the design document to `docs/features/<slug>/design.md`.

The file MUST start with YAML frontmatter — the 4-field personal schema:

```yaml
---
status: active
owner: <resolved name>
created: YYYY-MM-DD
feature: <slug>
---
```

**Owner resolution:** look up the owner name in this order — (1) `git config user.name`, (2) value in your auto-memory `joycraft-owner.txt` if present, (3) ask the user once and persist.

The document has exactly five sections:

### Section 1: Current State

What exists today in the codebase that is relevant to this feature. Include file paths, function signatures, and data flows. Be specific — reference actual code, not abstractions. If no research doc was provided, note that and describe what you found through direct exploration.

### Section 2: Desired End State

What the codebase should look like when this feature is complete. Describe the change at a high level — new files, modified interfaces, new data flows. Do NOT include implementation steps. This is the "what," not the "how."

### Section 3: Patterns to Follow

Existing patterns in the codebase that this feature should match. Include short code snippets and `file:line` references. Show the pattern, don't just name it.

If this is a greenfield project with no existing patterns, propose conventions and note that no precedent exists.

### Section 4: Resolved Design Decisions

Decisions you have already made, with brief rationale. Format each as:

> **Decision:** [what you decided]
> **Rationale:** [why, referencing existing code or constraints]
> **Alternative rejected:** [what you considered and why you rejected it]

### Section 5: Open Questions

Things you don't know or where multiple valid approaches exist. Each question MUST present 2-3 concrete options with pros and cons. Format:

> **Q: [question]**
> - **Option A:** [description] — Pro: [benefit]. Con: [cost].
> - **Option B:** [description] — Pro: [benefit]. Con: [cost].
> - **Option C (if applicable):** [description] — Pro: [benefit]. Con: [cost].

Do NOT ask vague questions like "what do you think?" Every question must have actionable options the human can choose from.

## Step 4: Present and STOP — Pre-Approval Hold

Present the design document to the user. Say:

```
Design discussion written to docs/features/<slug>/design.md

Please review the document above. Specifically:
1. Are the patterns in Section 3 the right ones to follow, or should I use different ones?
2. Do you agree with the resolved decisions in Section 4?
3. Pick an option for each open question in Section 5 (or propose your own).

Reply with your feedback. I will NOT proceed to decomposition until you have reviewed and approved this design.
```

**CRITICAL: Do NOT emit the canonical Handoff block at this point.** The Handoff block emits ONLY after human approval (see "Step 5: Hand Off (Post-Approval Only)" below). The entire value of this skill is the pause — it forces a human checkpoint before mistakes propagate.

## Offer to Capture Deferred Items to Backlog

If during the design discussion the user mentions deferred work — "let's not do X yet," "save Y for later" — ASK before writing:

> "This looks like deferred work — want me to capture it to `docs/backlog/`?"

Only on user confirmation, write a backlog entry at `docs/backlog/YYYY-MM-DD-<short-name>.md` with backlog frontmatter:

```yaml
---
status: backlog
owner: <resolved name>
created: YYYY-MM-DD
source: docs/features/<slug>/brief.md
---
```

**Never auto-write to `docs/backlog/`.** Every backlog entry is user-confirmed.

## Step 5: Hand Off (Post-Approval Only)

Once the human approves the design:
- Update the design document with their corrections and chosen options
- Move answered questions from "Open Questions" to "Resolved Design Decisions"
- Present the updated document for final confirmation
- Once the user gives explicit approval, AND ONLY THEN, emit the canonical Handoff block:

## Recommended Next Steps

Next:
```bash
/joycraft-decompose docs/features/<slug>/brief.md
```
Run /clear first.

Include any backlog paths produced as a side effect.

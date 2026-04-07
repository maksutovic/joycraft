---
name: joycraft-interview
description: Brainstorm freely about what you want to build — yap, explore ideas, and get a structured summary you can use later
instructions: 18
---

# Interview — Idea Exploration

You are helping the user brainstorm and explore what they want to build. This is a lightweight, low-pressure conversation — not a formal spec process. Let them yap.

## How to Run the Interview

### 1. Open the Floor

Start with something like:
"What are you thinking about building? Just talk — I'll listen and ask questions as we go."

Let the user talk freely. Do not interrupt their flow. Do not push toward structure yet.

### 2. Ask Clarifying Questions

As they talk, weave in questions naturally — don't fire them all at once:

- **What problem does this solve?** Who feels the pain today?
- **What does "done" look like?** If this worked perfectly, what would a user see?
- **What are the constraints?** Time, tech, team, budget — what boxes are we in?
- **What's NOT in scope?** What's tempting but should be deferred?
- **What are the edge cases?** What could go wrong? What's the weird input?
- **What exists already?** Are we building on something or starting fresh?

### 3. Play Back Understanding

After the user has gotten their ideas out, reflect back:
"So if I'm hearing you right, you want to [summary]. The core problem is [X], and done looks like [Y]. Is that right?"

Let them correct and refine. Iterate until they say "yes, that's it."

### 4. Write a Draft Brief

Create a draft file at `docs/briefs/YYYY-MM-DD-topic-draft.md`. Create the `docs/briefs/` directory if it doesn't exist.

Use this format:

```markdown
# [Topic] — Draft Brief

> **Date:** YYYY-MM-DD
> **Status:** DRAFT
> **Origin:** /joycraft-interview session

---

## The Idea
[2-3 paragraphs capturing what the user described — their words, their framing]

## Problem
[What pain or gap this addresses]

## What "Done" Looks Like
[The user's description of success — observable outcomes]

## Constraints
- [constraint 1]
- [constraint 2]

## Open Questions
- [things that came up but weren't resolved]
- [decisions that need more thought]

## Out of Scope (for now)
- [things explicitly deferred]

## Raw Notes
[Any additional context, quotes, or tangents worth preserving]
```

### 5. Hand Off

After writing the draft, tell the user:

```
Draft brief saved to docs/briefs/YYYY-MM-DD-topic-draft.md

When you're ready to move forward:
- /joycraft-new-feature — formalize this into a full Feature Brief with specs
- /joycraft-decompose — break it directly into atomic specs if scope is clear
- Or just keep brainstorming — run /joycraft-interview again anytime

Run /clear before your next step — your artifacts are saved to files.
```

## Guidelines

- **This is NOT /joycraft-new-feature.** Do not push toward formal briefs, decomposition tables, or atomic specs. The point is exploration.
- **Let the user lead.** Your job is to listen, clarify, and capture — not to structure or direct.
- **Mark everything as DRAFT.** The output is a starting point, not a commitment.
- **Keep it short.** The draft brief should be 1-2 pages max. Capture the essence, not every detail.
- **Multiple interviews are fine.** The user might run this several times as their thinking evolves. Each creates a new dated draft.

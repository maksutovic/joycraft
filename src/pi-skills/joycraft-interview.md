---
name: joycraft-interview
description: Brainstorm freely about what you want to build — yap, explore ideas, and get a structured summary you can use later
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

Derive a slug `YYYY-MM-DD-<topic>` (today's date + kebab-case topic — no `-draft` suffix).
Create a draft file at `docs/features/<slug>/brief.md`. Lazy-create `docs/features/<slug>/` if it doesn't exist.

The file MUST start with YAML frontmatter — the 4-field personal schema with `status: draft`:

```yaml
---
status: draft
owner: <resolved name>
created: YYYY-MM-DD
feature: <slug>
---
```

**Owner resolution:** look up the owner name in this order — (1) `git config user.name`, (2) value in your auto-memory `joycraft-owner.txt` if present, (3) ask the user once and persist. If you can't get a name, leave the field as `<resolved name>` and note it for the user.

Use this format for the body:

```markdown
# [Topic] — Draft Brief

> **Date:** YYYY-MM-DD
> **Origin:** /skill:joycraft-interview session

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
- [things explicitly deferred — see also: deferred work goes to `docs/backlog/`]

## Raw Notes
[Any additional context, quotes, or tangents worth preserving]
```

### 5. Offer to Capture Deferred Items to Backlog

If during the conversation deferred work surfaces (a tangent, a "later" item, a "out-of-scope but tempting" idea), ASK the user:

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

### 6. Hand Off

After writing the draft (and any backlog entries), present the canonical Handoff block.
Include any backlog paths produced as a side effect.

## Recommended Next Steps

Next:
```bash
/skill:joycraft-new-feature docs/features/<slug>/brief.md
```
Run /new first.

If the idea sounds complex — touches many files, involves architectural decisions, or the user is working in an unfamiliar area — nudge them toward research and design (e.g., `/skill:joycraft-research` then `/skill:joycraft-design`). But present it as a recommendation, not a gate.

## Guidelines

- **This is NOT /skill:joycraft-new-feature.** Do not push toward formal briefs, decomposition tables, or atomic specs. The point is exploration.
- **Let the user lead.** Your job is to listen, clarify, and capture — not to structure or direct.
- **Mark everything as DRAFT.** The output is a starting point, not a commitment.
- **Keep it short.** The draft brief should be 1-2 pages max. Capture the essence, not every detail.
- **Multiple interviews are fine.** The user might run this several times as their thinking evolves. Each creates a new dated draft.

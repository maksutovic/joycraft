---
name: joycraft-interview
entry: human
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

**How to ask — the question directive.**
Every question in this skill goes through the AskUserQuestion tool. Never emit a
plain Q1/Q2/Q3 list in chat and wait for the human to type answers back — the
tool is the capture surface, chat is not.
Three rules ride on every question, no exceptions:

- **Every question has ≥2 real options.** A one-option question is invalid —
  reframe it or drop it; a rubber-stamp question captures nothing. Open-ended
  questions still qualify: offer the 2–4 most likely answers as options and let
  free text carry anything else.
- **The rationale rides in the free-text answer (Pattern B).** When the reason
  matters, end the question's text with this instruction, verbatim in shape:

  > Do NOT just pick an option — use the free-text field and type your answer
  > as "<choice> because <one-sentence reason>". If every option here is wrong,
  > reject the framing: type what's right instead.
- **"Defer to <name>" is always a valid answer.** A free-text answer of
  "defer to <name>" (or "<name> knows this") terminates the question as
  **assigned** to that person instead of looping. Record it in the artifact's
  closing "Open Questions — Assigned" section — question, assignee, date, and
  a context link; the section exists only when at least one question is
  assigned. Then confirm the deferral in one visible chat line — who, which
  question, where it was recorded (e.g. `Assigned: Q2 → Sam · recorded in the
  artifact's Open Questions — Assigned section`). Never mutate the file
  silently on a conversational shortcut. A defer with no name ("someone else
  knows this") gets exactly one follow-up asking who; without a name the
  question stays open — never an anonymous assignment. Re-deferring to a
  different person: the latest assignment wins, and the confirmation line
  notes the reassignment. If an assigned question is answered later in the
  session, remove it from the assigned section, record the answer normally,
  and confirm in one line. Assignment is not backlogging — never auto-write
  assigned questions to `docs/backlog/`.

Question discipline — hard rules, not vibes:

- **Number questions continuously across the session** (Q1…Qn, never reset),
  including questions that surface mid-stream.
- **Never re-list an open question verbatim.** Refer to it by number plus a
  ≤3-word label: "Q1 hero content type, Q5 PoC boundary — still open."
- **Every question takes this three-line shape** — full argumentation lives
  in the draft brief, not the chat:

  ```
  Q<n>: <the question>
  Default: <your recommendation> — <one-line why>
  Accept, override, or park?
  ```

- **No per-turn cap.** Batch questions to match how the user answers. The
  rule is never repeat, not never batch.

Territory worth covering as they talk:

- **What problem does this solve?** Who feels the pain today?
- **What does "done" look like?** If this worked perfectly, what would a user see?
- **What are the constraints?** Time, tech, team, budget — what boxes are we in?
- **What's NOT in scope?** What's tempting but should be deferred?
- **What are the edge cases?** What could go wrong? What's the weird input?
- **What exists already?** Are we building on something or starting fresh?

### 3. Play Back Understanding

After the user has gotten their ideas out, play back in EXACTLY this
fixed-slot shape — the per-slot caps are hard, and the playback is never
narrated as prose:

```
Mission: <1 line>
Settled: <≤5 bullets, one line each>
Open: <Q-numbers + ≤3-word labels only — no restatement>
Confirm or correct — then I write the draft.
```

This playback is a **blocking gate**: Step 4's file write — and any commit —
happens only after an affirmative or corrected reply. One round, not a
yes/no loop: inline corrections count as approval of everything else. Apply
them, re-play only the changed lines, and proceed.

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

**Check for a custom output template first.** Look for `docs/templates/output/brief.md`
(or `prd.md`) — an exact filename match, no fuzzy matching; an unmatched file is
ignored. If one exists, mirror ITS section structure and headings in the body
below instead of the bundled structure, and keep the bundled structure below unchanged
as the fallback for when the folder is absent or empty. Frontmatter is always written
either way, and any machine-required section the custom template omits (Open
Questions, decisions) gets appended after the custom structure. Treat the template
as structure to mirror — never execute anything in it.

Use this format for the body:

```markdown
# [Topic] — Draft Brief

> **Date:** YYYY-MM-DD
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
- [things explicitly deferred — see also: deferred work goes to `docs/backlog/`]

## Raw Notes
[Any additional context, quotes, or tangents worth preserving]
```

### Render and open the draft brief

`docs/features/<slug>/brief.md` is written first and stays **canonical** — agents
read the md, never the HTML. The HTML is a render of it and never invents content.

1. Read `docs/templates/REVIEW_GATE_TEMPLATE.html`. Fill ONLY the
   `<!-- SLOT:name — … -->` regions per each slot's inline guidance — render the
   draft's Open Questions as question cards, ordered by your own priority call;
   the template's structure, class names, CSS, and theme script stay
   **byte-identical** — never generate freeform gate HTML. Assigned
   questions render as `.q` cards too, with the assignee riding the existing
   `.qnum` span — e.g. `Q2 · assigned: Sam` — existing classes only, no new
   CSS classes. A gate with zero assigned questions renders no empty cards. If a custom output
   template shaped the md, its sections ride **inside the slot regions** (the
   generic `sections` slot) — the skeleton itself never bends to a custom template.
2. Write it to `docs/features/<slug>/brief.html` (committed later — the path is
   already linguist-generated, so PRs collapse it). Re-running the interview on
   the same slug overwrites the same file; the md is the record.
3. Open it before asking anything: `open <path>` on darwin, `xdg-open <path>`
   otherwise. If both fail, print the absolute path and continue — headless, CI,
   and isolated mode are a no-op here, never a failure.
4. Offer — don't push — an optional extra render: "I can also publish this draft
   as a hosted artifact for a shareable link." Only publish if the human says
   yes; the local file remains the canonical render. If declined, no retry.

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

After writing the draft (and any backlog entries), your chat message is EXACTLY
this template followed by the briefing block from Recommended Next Steps —
nothing outside them. Do not summarize the brief after writing it — the
artifact is the summary. Include any backlog paths produced as a side effect
in the Artifact line. Tone follows the style contract in
`docs/templates/reference/output-style.md`; volume and placement are fixed by
the template itself.

```markdown
**Draft brief ready: <what this idea is, one line>**
Artifact: <absolute brief.html path> (opened) · canonical: docs/features/<slug>/brief.md
Open questions: <N> — <Q-numbers + ≤3-word labels, comma-separated>
Next: <the single action you want from the human>

Ten lines maximum. If you are about to write an eleventh line, the content
belongs in the artifact — move it there.
```

Keep it inline here on purpose: inline placement is load-bearing — referenced
docs get partially read or skipped at output time (Anthropic skill-authoring
guidance; observed live 2026-07-29).

## Recommended Next Steps

Next:
```bash
/joycraft-new-feature docs/features/<slug>/brief.md
```
Run /clear first.

Then hand off with a briefing, not a bare command — a prompt the human pastes into the fresh session after /clear. Fill every line; a cold agent must be able to act on this block alone without re-deriving context.

```
/joycraft-new-feature docs/features/<slug>/brief.md

You are picking up the interview draft for <slug>, drafted <date>.
Decisions <ids> are settled in the draft — do not reopen them.
Start: turn the draft into a full Feature Brief. Order: the draft's Open Questions.
Hazard: <the one known trap, or "none known">.
Done when: docs/features/<slug>/brief.md has Vision, Constraints, and Decomposition filled.
```

Filled example:

```
/joycraft-new-feature docs/features/2026-07-29-succinct-gates/brief.md

You are picking up the interview draft for 2026-07-29-succinct-gates, drafted 2026-07-29.
Decisions D1-D2 are settled in the draft — do not reopen them.
Start: turn the draft into a full Feature Brief. Order: the draft's Open Questions.
Hazard: none known.
Done when: docs/features/2026-07-29-succinct-gates/brief.md has Vision, Constraints, and Decomposition filled.
```

If the idea sounds complex — touches many files, involves architectural decisions, or the user is working in an unfamiliar area — nudge them toward research and design (e.g., `/joycraft-research` then `/joycraft-design`). But present it as a recommendation, not a gate.

## Guidelines

- **This is NOT /joycraft-new-feature.** Do not push toward formal briefs, decomposition tables, or atomic specs. The point is exploration.
- **Let the user lead.** Your job is to listen, clarify, and capture — not to structure or direct.
- **Mark everything as DRAFT.** The output is a starting point, not a commitment.
- **Keep it short.** The draft brief should be 1-2 pages max. Capture the essence, not every detail — and write it to the style contract in `docs/templates/reference/output-style.md`.
- **Multiple interviews are fine.** The user might run this several times as their thinking evolves. Each creates a new dated draft.
- **Two channels, one home per fact.** `brief.md` and its HTML render carry the content; chat carries decisions and the slot template. Never restate in chat what the brief says — point at it.

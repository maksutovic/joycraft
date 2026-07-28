---
name: joycraft-design
description: Design discussion before decomposition — produce a ~200-line design artifact for human review, catching wrong assumptions before they propagate into specs
---

# Design Discussion

You are producing a design discussion document for a feature. This sits between research and decomposition — it captures your understanding so the human can catch wrong assumptions before specs are written.

**Guard clause:** If no brief path is provided and no brief exists at `docs/features/<slug>/brief.md`, say:
"No feature brief found. Run `$joycraft-new-feature` first to create one, or provide the path to your brief."
Then stop.

---

## Step 0: Retrieve Before You Reason (PROTOCOL)

Before exploring the codebase or writing anything, run a bounded grep-first retrieval pass over the durable knowledge layer. This is not optional and it is not open-ended — it is a capped lookup, not a reading assignment.

1. Derive **3-6 search terms** from the brief's (and research doc's, if present) nouns and verbs — the feature's key concepts, not generic words.
2. Grep the knowledge layer for those terms, in priority order:
   - `docs/context/decision-log.md` (why past choices were made)
   - `docs/context/shipped.md` (what/where already exists)
   - `docs/discoveries/` (negative knowledge — things that didn't work)
   - remaining `docs/context/*.md` files
3. Read **at most 5 files/rows** total — the matches, not the surrounding context. If a grep term returns dozens of hits, read only the newest matches within the cap and say the result was truncated.
4. If the knowledge layer is empty or missing (fresh project), report "nothing to retrieve" in one line and proceed — never block.

**Output contract:** Section 1 (Current State) of the design document MUST include a **"Prior knowledge reused"** list — each entry citing doc + row date/heading — or the explicit line "retrieval ran (terms: …), nothing relevant found." Silently skipping this is not compliant.

**Contradictions:** if a retrieved decision contradicts the direction implied by the brief, surface it explicitly in Section 5 (Open Questions) for the human to resolve — do not silently pick a side or omit the conflict.

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

Open this section with the **"Prior knowledge reused"** list from Step 0's retrieval pass (or the explicit nothing-found line).

### Section 2: Desired End State

What the codebase should look like when this feature is complete. Describe the change at a high level — new files, modified interfaces, new data flows. Do NOT include implementation steps. This is the "what," not the "how."

**Self-score load-bearing claims.** Every **load-bearing** claim in this section — one where downstream work would need to change if the claim turned out false, per `docs/context/anchors.md`'s definition — gets a discrete confidence anchor written inline as `(anchor: N)`, where `N` is one of `{0, 25, 50, 75, 100}` from `docs/context/anchors.md`. Self-score against that file's anchor meanings; never write a free-form numeric estimate outside that set, and never restate the anchor definitions here — `docs/context/anchors.md` is the one home for them. Descriptive color (background, motivation, "why this matters") is not load-bearing and does not get scored. If `docs/context/anchors.md` is missing (the knowledge-substrate spec hasn't run yet), seed it from `docs/templates/context/anchors.md` — or if that template is absent too, say so loudly and skip scoring. Never invent anchor definitions inline.

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

### Update the Feature Brief

After writing the design document, update the parent brief with a back-reference:
1. Read `docs/features/<slug>/brief.md`
2. In the header blockquote (the `>` lines at the top), add or update:
   `> **Design:** docs/features/<slug>/design.md`
3. If a `> **Design:**` line already exists, replace it — do NOT add a duplicate
4. Write the brief back

## Step 3.5: Reconcile Brief with Findings

You've just written `docs/features/<slug>/design.md`. Before hand-off, the parent brief at `docs/features/<slug>/brief.md` may now disagree with what you discovered. Re-read it and check each of these sections:

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

If you make changes, note them at the bottom of `design.md` under a "Brief updates" subsection. If the brief is already in sync, note: "Reconciliation checked, no changes required." If no parent brief exists (feature was described inline), note that and skip this step.

**Why this step exists:** the silent-drift gap. Without reconciliation, the brief and downstream artifacts diverge — and later decomposition is sized against the stale brief. This feature ("single-source-skills") hit exactly this: brief said "11 clean / 9 dirty" until the research re-audit forced a re-decomposition. Don't let it happen again.

## Step 4: Present and STOP — Pre-Approval Hold

Write this presentation to the style contract in `docs/templates/reference/output-style.md`.

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
- Run the deposition checkpoint: invoke `$joycraft-decide <design path>` so every
  remaining open question terminates (clarified / backlogged / discarded) — the
  decompose gate stays closed while any decision is `open`.
- Once the user gives explicit approval, AND ONLY THEN, emit the canonical Handoff block:

## Recommended Next Steps

Next:
```bash
$joycraft-decompose docs/features/<slug>/brief.md
```
Run run `/clear` in the CLI, or press Cmd+N (Ctrl+N on Windows/Linux) for a new thread in the desktop/IDE app first.

Include any backlog paths produced as a side effect.

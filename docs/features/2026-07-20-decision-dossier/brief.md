---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-20
source: reading-fatigue panel (docs/research/2026-07-20-reading-fatigue-panel.md) + interview 2026-07-20
---

# Feature Brief — decision dossier: deliberate decisions in the core loop

> **Origin:** The reading-fatigue panel's #4 survivor (Deposition Checkpoint)
> plus a validated instinct: HTML renders are easier for humans than markdown
> walls. Today's Open Questions sections fail ergonomically — answering them
> means context-switching back to the chat window while the context needed to
> answer well lives elsewhere. Questions linger in limbo forever. This feature
> replaces reading-as-review with deciding-as-review at the design bookend.

## TL;DR for the implementer

When a brief/design is produced, the loop no longer hands the human a document
and hopes. It hands them a **decision dossier** (HTML, auto-opened — brings
the context TO the decision) and captures answers via the **native question
UI** (forced choice + one-sentence typed rationale). Every open question
terminates in exactly one of three states: **clarified into the spec queue,
backlogged, or discarded**. Decompose gates on unresolved decisions.

Markdown stays source-of-truth for agents. HTML is a generated, human-only
view. (RF-DIET-1)

## The loop (v1, design bookend only)

1. `joycraft-design` / `joycraft-new-feature` finishes its artifact as today.
2. From Resolved Decisions + Open Questions it derives **≤5 forced-choice
   questions**, risk-ordered. Any decision touching an ASK FIRST / NEVER
   boundary becomes a mandatory question outside the cap, regardless of
   agent confidence.
3. It renders the **dossier** (HTML) and opens it: per-question option cards
   with tradeoffs, blast-radius map, before/after diagram per option, and the
   **assumptions-asserted-as-fact manifest** (every load-bearing claim the
   agent did NOT question, with UNVERIFIED markers).
4. It asks the questions via the native question UI. Every question includes
   a **reject-this-framing escape** to free text (RF-KILL-6). Every answer
   requires a one-sentence typed rationale; failure to produce one means the
   human lacks context — auto-expand the dossier section, don't proceed.
5. Answers are stamped as **decision-log rows** and injected into the brief's
   Hard Constraints. Each open question's terminal state is recorded:
   `clarified → spec` | `backlogged → docs/backlog/` | `discarded (reason)`.
6. **Gate:** `joycraft-decompose` refuses to run while any decision is
   unresolved — unless the human explicitly defers ("backlog it", "don't
   worry", "skip for now"), which backlogs the question and records that.

## Decisions (locked — from the 2026-07-20 interview)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Round-trip architecture | Hybrid: HTML dossier for display + native question UI for capture | Artifacts can't POST back (CSP); hybrid ships now with zero new runtime |
| 2 | Checkpoint scope v1 | Design/brief bookend only | Where wrong assumptions propagate hardest; human always present; RF-KILL-11 forbids session-end HTML |
| 3 | Concreteness bar | Forced choice + one-sentence typed rationale, every pick | Generation-not-recognition is the one complacency mitigation that survives (RF-2) |
| 4 | Dossier visuals | Tradeoff cards + blast-radius map + per-option diagram + assumptions manifest | All four earn their pixels; diagrams carry UNVERIFIED labels (RF-5) |
| 5 | Gate semantics | Hard gate on decompose, explicit-defer escape (backlog/discard) | Question limbo is the current failure; three-way terminal state kills it |
| 6 | Where answers land | decision-log.md rows + brief Hard Constraints | decision-log is the most re-read doc in the repo (RF-4) |
| 7 | Rollout | Dogfood on Joycraft first, 4-week pilot, kill criterion below | Skill/template changes are ASK FIRST; earn it before shipping to users |

## Constraints (from the panel — MUST NOT)

- No interactive HTML at session-end or any headless step (RF-KILL-11).
- No pick-string/paste-back round-trips; reject-framing escape is mandatory
  on every question (RF-KILL-6).
- HTML is never source-of-truth; agents read markdown/JSON only (RF-DIET-1).
- The manifest and diagrams must label unverified claims — a persuasive
  diagram is still a persuasive artifact (RF-5).
- The agent never certifies its own framing as complete; the manifest exists
  precisely because the reviewee filters the review channel (RF-KILL-3).

## Pilot & kill criterion

Run on Joycraft's own next two features. **Kill the format if Max bypasses
the questions into free chat by the second feature** — keep only
decision-stamping into the brief. Only after the pilot survives does this
propagate to user-facing skills/templates (ASK FIRST at that point).

## Open decisions — resolve via the dossier before decompose

- **D1 — Skill shape:** extend `joycraft-design`, extend `joycraft-new-feature`,
  or new shared `joycraft-decide` skill both call?
- **D2 — Dossier persistence:** committed to the feature folder, gitignored
  local file, or ephemeral artifact-only?
- **D3 — Headless/gate encoding:** how decompose detects unresolved decisions
  (frontmatter block in the brief vs decisions.json next to the queue).

## Out of scope

Codex/pi skill variants (Claude variant must survive real use first), the
Cockpit, `joycraft decide` local-server capture (revisit only if the hybrid's
terminal capture proves too weak), session-end anything.

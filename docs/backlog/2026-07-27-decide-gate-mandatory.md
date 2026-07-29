---
status: superseded
superseded_by: docs/features/2026-07-29-succinct-gates/brief.md
owner: Maximilian Maksutovic
created: 2026-07-27
source: docs/features/2026-07-27-human-readable-output-style/design.md
---

# Mandatory decide gate — any artifact with open questions MUST invoke decide

## The gap

Observed live on 2026-07-27 in this repo: `joycraft-design` produced a design
doc with five open questions and an explicitly load-bearing `anchor: 50` claim,
then presented for human approval **without** invoking `/joycraft-decide`.

Root cause is an ordering ambiguity in the skill text, not agent whim.
`joycraft-design` Step 4 says "Present and STOP — Pre-Approval Hold." Step 5
("Hand Off — Post-Approval Only") is where the decide invocation lives, gated
on "once the human approves the design." Read literally, decide is
post-approval — so an agent presents an artifact whose open questions are still
open and asks the human to approve it.

That reading is wrong on two counts:

1. `joycraft-decide` is the skill that *produces* the answers to the open
   questions. Asking a human to approve a design with five unresolved
   forced-choice questions is asking approval of an incomplete artifact.
2. The Block Rule in `docs/context/anchors.md` is independent of the approval
   gate. It fires the moment a claim is both load-bearing and scored ≤50 —
   "must either be deepened … or surfaced as a dossier question
   (`joycraft-decide`) so a human resolves it explicitly." Nothing in that rule
   says "after approval."

## Desired behavior

Any Joycraft skill that produces an artifact containing open questions — or any
load-bearing claim scored ≤50 — MUST invoke `/joycraft-decide` before
presenting that artifact for approval. Every time, not as a judgment call.

Candidate surfaces (verify the full list during implementation):
`joycraft-design` (§5 Open Questions), `joycraft-research` (Open questions
section), `joycraft-new-feature`, `joycraft-decompose` (already has a decision
gate — confirm it fires on ≤50 claims too), `joycraft-bugfix`.

## Open design questions for this item

- Does decide run *before* the human sees the artifact, or is the artifact
  presented and decide invoked in the same turn without waiting? The current
  Step 4/Step 5 split assumes a `/clear` boundary between them.
- Is this enforced by a content test (each artifact-producing skill must cite
  decide near its open-questions section) or only by skill prose?
- Interaction with the existing decompose decision gate — that gate reads
  `decisions:` frontmatter; do design docs need the same stamped block?

## Why it matters

The decompose gate is supposed to stay closed while any decision is `open`. If
design can hand off without running decide, the gate depends on an agent
remembering a cross-step instruction — which is exactly what failed here.

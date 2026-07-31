---
name: joycraft-decide
<!-- harness:claude -->
entry: agent
<!-- /harness -->
description: Invoked at the design bookend by decompose's decision gate or the human directly — turn open questions into a decision dossier; every decision terminates clarified, backlogged, discarded, or assigned
---

# Decide (Deposition Checkpoint)

You are running the decision checkpoint at the design bookend. The human does
not read-and-hope; they get a decision dossier (context brought TO the
decision) and answer forced-choice questions with a one-sentence typed
rationale each. Every open question leaves this skill in exactly one terminal
state: **clarified**, **backlogged**, **discarded**, or **assigned** (deferred
to a named person). The decompose gate stays closed while any decision is
still `open`.

Two hard rules frame everything below:

- **The dossier is display-only.** All capture happens in the native question
  flow (<!-- harness:claude -->the AskUserQuestion tool<!-- /harness --><!-- harness:codex|pi -->structured forced-choice questions asked directly in chat<!-- /harness -->) — never via interactive HTML, pick-strings, or
  paste-backs.
- **Never certify your own framing as complete** (RF-KILL-3). The questions
  are YOUR framing of what's open; the assumptions manifest exists to expose
  what you did NOT ask. Label every unchecked load-bearing claim UNVERIFIED
  (RF-5) — when in doubt, Unverified.

## Step 1: Locate the brief

- **Path given** (`{{skill_prefix}}decide <brief-or-design path>`): use it. If it's
  a design doc, also read the sibling/parent `brief.md` — the brief's
  frontmatter is where decisions stamp.
- **No path given**: scan `docs/features/*/brief.md` for briefs with open
  decisions — a frontmatter `decisions:` entry with `status: open`, or an
  `## Open Questions` section with unresolved items. One match → use it and
  say so. Several → list them and ask which. None → report "no open decisions
  found" and stop.

**Zero open questions in the target brief:** say so, make sure the
frontmatter `decisions:` block exists and reflects that resolved state
(create it if absent), and exit WITHOUT rendering a dossier. Nothing to
decide is a valid, terse outcome.

## Step 2: Derive the questions

1. Read the brief's Open Questions and Resolved Decisions, plus the design
   doc if one exists.
2. Read the project boundaries: the ASK FIRST and NEVER lists in
   {{boundary_file}}.
3. Build the question list:
   - **Mandatory (exempt from the cap):** any open question or
     resolved-but-assumed decision that touches an ASK FIRST / NEVER boundary
     becomes a question regardless of your confidence in the answer.
   - **Capped (≤5):** the remaining open questions, **risk-ordered** — rank
     by blast radius and cost-of-wrong (files/surfaces affected, reversibility,
     how much downstream work builds on the answer). Take the top 5.
   - **Overflow (visible residue, never a silent cut):** questions beyond the
     cap are pre-backlogged: stamp each into the brief's `decisions:` block as
     `status: backlogged` with a note that the cap deferred it, add them to a
     `docs/backlog/` entry (Step 6 format), and NAME THEM OUT LOUD in your
     summary so the human can pull one back into the round if they disagree
     with your risk ranking.

Each question gets an id (`D1`, `D2`, … continuing from any existing
`decisions:` ids), a one-line framing as a question, and 2–4 genuinely
different candidate options with honest tradeoffs.

## Step 3: Build the assumptions manifest

List the load-bearing claims your framing rests on that you are NOT asking
about — from the brief, the design, and your own reasoning while deriving
questions. For each: **Verified** only if you actually checked it (say how);
otherwise **Unverified** with what would verify it. An empty manifest is
almost certainly under-labeling, not cleanliness.

## Step 3.5: Audit Confidence Anchors (PROTOCOL)

The brief and design may already carry self-scored anchors on load-bearing
claims (`(anchor: N)`, written by `joycraft-design` / `joycraft-new-feature`
against the discrete set `{0, 25, 50, 75, 100}` — see
`docs/context/anchors.md` for the anchor meanings, the load-bearing
definition, and the block rule; this skill does not restate those numbers,
only enforces them). You are the **auditor**, not the author:

1. **Review, don't originate.** For every self-scored load-bearing claim you
   encounter while building the dossier, sanity-check the score against the
   evidence cited. Do not invent scores for claims you have not read.
2. **Re-anchoring is allowed and must be visible.** If your audit disagrees
   with the author's score, change it and leave a note inline in the exact
   form `(anchor: N→M — <reason>)` — never silently overwrite a score.
3. **Auditor never self-certifies a claim it also turned into a question**
   (RF-KILL-3): if a load-bearing claim became one of this skill's own
   dossier questions, do not also assign it a first-pass score — it is
   inherently unresolved, not scored.
4. **Legacy/unscored claims**: if a load-bearing claim reaches this audit
   with no self-score (an older brief, or a claim the authoring skill missed),
   score it now and mark it `(anchor: N — audit-scored, no self-score)` so
   the gap is visible rather than silently backfilled.
5. **The block rule (PROTOCOL):** a load-bearing claim scored **≤50** cannot
   propagate past this deposition as-is. It must either be deepened (do the
   verification that would raise the score) before the dossier renders, or
   it becomes one of this step's dossier questions so the human resolves it
   explicitly. A claim scored 75+ propagates normally; non-load-bearing
   claims propagate regardless of score — the block only fires on the
   intersection of both conditions (see `docs/context/anchors.md`).
6. **Reject-framing escape preserved.** The human may reject a block verdict
   in Step 5 and force propagation anyway — if they do, stamp the claim
   visibly as `(anchor: ≤50, propagated by human override)` rather than
   silently dropping the block note.
7. If `docs/context/anchors.md` is missing, seed it from
   `docs/templates/context/anchors.md` — or if that template is absent too, say
   so loudly in your summary and skip the audit. Never invent anchor
   definitions or thresholds inline.

## Step 4: Render and open the dossier

1. Read `docs/templates/DECISION_DOSSIER_TEMPLATE.html`. Fill ONLY the
   `<!-- SLOT:name — … -->` regions per each slot's inline guidance; the
   template's structure, class names, CSS, and theme script stay
   **byte-identical** — never generate freeform dossier HTML. Repeat the
   decision section once per question (copy-per-decision); mark your
   recommended option `rec`; include the per-decision flow diagram only when
   a before/after shape genuinely clarifies (diagrams carry the same
   VERIFIED/UNVERIFIED honesty as the manifest).
2. Write it to `docs/features/<slug>/dossier.html` (committed later —
   the path is already linguist-generated, so PRs collapse it).
3. Stamp the render: a generation timestamp and a revision integer, riding
   the existing eyebrow/context-strip and footer slot regions — no new markup,
   no CSS change. Read the previous render's footer first: its revision
   integer + 1 is this render's revision. No previous file → revision 1;
   footer unparseable (hand-edited) → fall back to revision 1 and note the
   reset in the footer — never fail the render. The filename never changes —
   the revision lives inside the artifact.
4. Check `autoOpen` in `docs/.joycraft/state.json` (missing file or key =
   true). When it is false, skip opening silently and print the absolute path
   instead — the setting is never a failure. Otherwise open it before asking
   anything: `open <path>` on darwin, `xdg-open <path>` otherwise. If both
   fail, print the absolute path and continue.
5. Offer — don't push — an optional extra render: "I can also publish this
   dossier as a hosted artifact for a shareable link." Only publish if the
   human says yes; the local file remains the canonical render.

## Step 5: Ask — native UI, forced choice, typed rationale

<!-- harness:claude -->
Ask with the AskUserQuestion tool, one decision at a time, in risk order
(mandatory boundary questions first).
<!-- /harness -->
<!-- harness:codex|pi -->
Ask directly in chat, one decision at a time, in risk order (mandatory
boundary questions first): present the numbered options, then wait for the
answer before asking the next question.
<!-- /harness -->
Mechanics that are load-bearing:

- **Every question has ≥2 real options.** A one-option question is invalid —
  reframe it or drop it; a rubber-stamp question captures nothing.
- **The rationale rides in the free-text answer (Pattern B).** End every
  question's text with this instruction, verbatim in shape:

  > Do NOT just pick an option — use the free-text field and type your answer
  > as "<choice> because <one-sentence reason>". If every option here is
  > wrong, reject the framing: type what's right instead. "backlog because …"
  > and "discard because …" are always valid answers.

  The free-text row IS the reject-this-framing escape (RF-KILL-6) — every
  question must carry it.
- **"Defer to <name>" is always a valid answer.** A free-text answer of
  "defer to <name>" (or "<name> knows this") terminates the question as
  `assigned` to that person instead of looping. Record it in the artifact's
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
  session, remove it from the assigned section, stamp the decision normally,
  and confirm in one line. Assignment is not backlogging — never auto-write
  assigned questions to `docs/backlog/`.
- **Exactly one re-prompt.** If an answer arrives without a rationale (a bare
  option pick, or free text with no "because"/reason), the human may lack
  context: point them at that decision's dossier section, then re-ask the
  SAME question ONCE, asking only for the missing one-sentence reason. If it's
  still absent, keep the choice, record
  `rationale: (not given after re-prompt)`, and flag it in the summary —
  never loop.
- **Rejected framings are confirmed before stamping.** When the human rejects
  the offered options (including rejecting every question's framing), capture
  their free text verbatim, restate each as a decision row
  (choice + rationale), and confirm the restatement with them before writing
  anything.
- **The human may stop.** Escaping to chat and saying stop/later is allowed:
  stamp the decisions already answered, leave the rest `open`, and state
  plainly that the decompose gate remains closed until they terminate.

## Step 6: Stamp — three surfaces, terminal states enforced

Every asked question ends `clarified`, `backlogged`, `discarded`, or
`assigned` (only a Step-5 explicit stop may leave `open` behind). Assigned
questions are non-blocking in a specific sense: the decompose gate treats
`assigned` like `backlogged` only when the human explicitly proceeds — by
default assigned questions surface at the gate until answered. Stamp each
decision into:

1. **The brief's frontmatter `decisions:` block** (single source for the
   decompose gate — create the block if the brief lacks one):

   ```yaml
   decisions:
     - id: D4
       question: export file format
       status: clarified        # clarified | backlogged | discarded | assigned
       choice: JSON, no runtime dep
       rationale: because zero deps beats annotatability for a machine file
   ```

   Backlogged rows: `choice: backlogged`, rationale = the human's reason (or
   the cap-overflow note). Discarded rows: `choice: discarded`, rationale =
   the recorded reason. Assigned rows: `choice: assigned to <name>`,
   rationale = why that person owns the answer; the row mirrors the
   artifact's "Open Questions — Assigned" section, which stays the canonical
   record the assignee reads.

2. **The brief's `## Hard Constraints`** (create the section if absent):
   append one bullet per clarified choice that constrains implementation.
   Skip choices that constrain nothing; never rewrite existing bullets.

3. **`docs/context/decision-log.md`**: one row per terminated decision in the
   existing table format (`| Date | Decision | Why | Alternatives Rejected |
   Revisit When |`) — Why = the typed rationale; Alternatives Rejected = the
   options not chosen; backlogged/discarded decisions note that in Revisit
   When.
   Prepend the row directly under the header/separator (newest-first, never
   append at the bottom). Update the file's `last_updated` frontmatter.

**Backlogged decisions additionally** get a `docs/backlog/YYYY-MM-DD-<topic>.md`
entry (create it, or update the feature's existing one): the question, the
context needed to answer it later, and why it was deferred.

## Step 7: Report

Write this summary, and the dossier prose in Step 4, to the style contract in `docs/templates/reference/output-style.md`.

At this gate, your chat message is EXACTLY this template — nothing outside it.
The content lives in the artifact, not the chat. The per-decision table goes in
the dossier — never paste it into chat.

```markdown
**Decisions terminated: <N> of <M> — <gate open | gate CLOSED>**
Artifact: <absolute path> (opened) · canonical: <dossier md path>
Decisions needed: <N> — <ids/titles still open, comma-separated>
<one-line summary per decision, only if N ≤ 4>
Next: <the single action you want from the human>

Ten lines maximum. If you are about to write an eleventh line, the content
belongs in the artifact — move it there.
```

Keep it inline here on purpose: inline placement is load-bearing — referenced
docs get partially read or skipped at output time (Anthropic skill-authoring
guidance; observed live 2026-07-29).

The summary below is the artifact's content, not your chat message:

- Table: id · question · terminal state · choice · rationale (flag any
  rationale that survived only via the re-prompt rule, and any `(not given)`)
- Pre-backlogged overflow questions, named individually (if any)
- Files stamped (brief, decision-log, backlog entries, dossier path)
- **Gate status:** "all decisions terminated — decompose gate open" or
  "N decisions still open — decompose gate CLOSED" (after an explicit stop)

## Recommended Next Steps

Only once the gate is open. If any decision is still `open`, stop here instead — the next step does not start.

Next:
```bash
{{skill_prefix}}decompose docs/features/<slug>/brief.md
```
Run {{clear}} first.

Then hand off with a briefing, not a bare command — a prompt the human pastes into the fresh session after {{clear}}. Fill every line; a cold agent must be able to act on this block alone without re-deriving context.

```
{{skill_prefix}}decompose docs/features/<slug>/brief.md

You are picking up the decision dossier for <slug>, decided <date>.
Decisions <ids> are stamped in the brief and decision-log — do not reopen them.
Start: decompose the brief. Order: the brief's Decomposition section.
Hazard: <the one known trap, or "none known">.
Done when: docs/features/<slug>/specs/ holds one file per spec plus README.md.
```

Filled example:

```
{{skill_prefix}}decompose docs/features/2026-07-29-succinct-gates/brief.md

You are picking up the decision dossier for 2026-07-29-succinct-gates, decided 2026-07-29.
Decisions D1-D7 are stamped in the brief and decision-log — do not reopen them.
Start: decompose the brief. Order: the brief's Decomposition section.
Hazard: none known.
Done when: docs/features/2026-07-29-succinct-gates/specs/ holds one file per spec plus README.md.
```

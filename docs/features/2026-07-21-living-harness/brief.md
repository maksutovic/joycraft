---
status: done
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
decisions:
  - id: D1
    question: exhaust deletion — trigger point and survivors
    status: clarified
    choice: Reaper deletes post-merge; session-end writes ledger row + marks reap-eligible; dossier dies with the folder
    rationale: because deletion never outruns review and deletion commits piggyback the next feature branch on protected mains
  - id: D2
    question: ledger shape — single file vs directory, name, row schema
    status: clarified
    choice: live-head docs/context/shipped.md (newest-first, 200-line budget) + numbered shards + pointer-only JSON manifest created at first rotation
    rationale: because numbered shards rotate exactly at the budget and a pointer-only lookup serves machines without duplicating rows
  - id: D3
    question: harden pass home — tune, lockdown, or new skill
    status: clarified
    choice: new joycraft-harden skill with entry:agent — an internal, never a human door; skill taxonomy rides S8
    rationale: because the scarce resource is human doors and the always-loaded description budget, not skill count — internals with terse descriptions cost almost nothing
  - id: D4
    question: harness config surface — where it lives; must satisfy model-tiering carry-forward
    status: clarified
    choice: committed docs/.joycraft/config.json beside gitignored state.json
    rationale: because docs/.joycraft silos harness machinery away from human docs while staying shared and reviewable
  - id: D5
    question: confidence scoring — self-scored by design/new-feature vs derived by decide
    status: clarified
    choice: authoring skills self-score against docs/context/anchors.md; decide audits
    rationale: because author and judge should be separated as much as possible and the downsides are minor
  - id: D6
    question: Reaper disposal of undead (never-built) feature folders
    status: clarified
    choice: archive-move to docs/archive/features/, proposed per folder and human-approved
    rationale: because drafts are often parked-not-abandoned and archive-move is the only recoverable disposal for never-extracted content
  - id: D7
    question: flip decision-log.md to newest-first and amend add-fact's append-only rule
    status: clarified
    choice: flip now — one-time reversal, prepend-only rule, add-fact + decide amended same-commit
    rationale: because one-time churn is a fair price for making the most-read harness doc partial-read-safe
reap: eligible
---

# Living Harness — Draft Brief

> **Date:** 2026-07-21
> **Design:** docs/features/2026-07-21-living-harness/design.md
> **Origin:** /joycraft-interview session (catch-up on CE-parity + living-harness research)
> **Sources:** `docs/features/2026-06-18-compound-engineering-parity/convergence.md` (+ the three
> research passes — convergence is lossy, see Raw Notes), `docs/research/2026-07-16-nate-jones-harness-cleaner.md`,
> `docs/research/2026-07-20-reading-fatigue-panel.md`, `docs/backlog/2026-07-16-living-harness-audit-loop.md`,
> `docs/backlog/2026-07-20-model-tiering.md`

---

## The Idea

Converge the compound-engineering track and the living-harness audit loop into one
sprint — they are two halves of one system (a harness that grows every session needs
an immune system), and the filter that keeps "best of all worlds" from becoming
"import everything" is Joycraft's core promise: **anti-vibe-coding — after the harness
is set up, you know precisely what will be built.**

Max's read after dozens of projects: the core loop (interview → brief → research/design
→ specs → implement) is ~70% of the way to that promise. The last 30% is Pareto-hard
and fails in two ways today: (1) the harness is too static — artifacts accrete, nothing
prunes or feeds back, and the pile pollutes agent context; (2) tiny details get decided
silently — micro-choices inside brief/design/spec authoring that never present as
decisions, then steer entire implementations wrong.

## Problem

Every source of variance between "what the human approved" and "what got built":
the agent re-deciding settled questions differently across sessions (no read-back),
duplicate/stale knowledge holding several versions of the truth, agent-invented
premises crystallizing unreviewed in specs, prose boundaries the model merely hopes
to follow, harness crud accumulating as context noise, rules outliving the model or
failure that created them, and session lessons evaporating instead of landing
somewhere enforceable.

## The Ten Statements (scope of the sprint)

Each one passed the filter: it reduces approved-vs-built variance. Sources in
parentheses.

**Half A — decide precisely (kill silent variance before it propagates)**

- **S1. Nothing enters a spec without provenance.** Every spec constraint and AC
  traces to a stamped decision, design line, or brief statement; untraceable items
  are flagged as agent-invented premises before implementation. (ce-doc-review
  premise-dependency linking + RF Intent Tripwire — 3-way convergent.)
- **S2. Load-bearing claims carry discrete confidence anchors {0,25,50,75,100};
  low-confidence + load-bearing blocks propagation** — deepen or become a dossier
  question. Upgrades joycraft-decide's assumptions manifest from vibes-list to
  scored gate. (ce-plan confidence-gap deepening + Phase-0 anchors.)
- **S3. Past decisions are retrieved before new ones are made.** Research, design,
  and decompose run a grep-first retrieval pass over the durable knowledge layer
  before producing anything. (Unanimous CE gap #2 — the missing read half.)
- **S4. Knowledge has one home, enforced at write time.** Captures do an overlap
  check and update the existing doc rather than create a near-duplicate.
  (CE grep-first update-vs-create + Nate Rule 3.)
- **S5. Distill, then delete — the three-layer knowledge model.**
  *Layer 1:* code + tests are the living history of WHAT/HOW (nothing may duplicate
  what is greppable there). *Layer 2 — durable distillate:* a new thin **shipped
  ledger** (what shipped, when, by whom, where it lives in the code, PR link) +
  decision-log (why / rejected alternatives) + discoveries/solutions (negative
  knowledge), maintained by a refresh lifecycle (Keep/Update/Consolidate/Replace/
  Delete, deletion gated by inbound-link check, contradictions surfaced).
  *Layer 3 — exhaust:* briefs/designs/specs/dossiers are scaffolding; once a feature
  is `done` and merged, session-end writes the ledger row, confirms decision rows
  landed, then **deletes the feature folder**. Resolves CE "delete-don't-archive"
  vs RF-KILL-7 "archive-move": both reasoned about deletion *without extraction*.
  The ledger row is what survives the squash merge. Undead (never-built) folders
  remain the Reaper's job, separately.

**Half B — keep the harness true (the installed harness stays the approved harness)**

- **S6. Machine-checkable boundaries become machine-checked.** Harden pass converts
  eligible ALWAYS/NEVER prose into hooks / permission deny-patterns. (Nate Rule 5 —
  prose hopes, locks enforce.)
- **S7. Every rule carries provenance and faces probation.** Origin failure + date
  per boundary rule; model upgrades trigger probation review; tune labels boundaries
  declared vs verified. (Nate provenance + model-upgrade ritual.)
- **S8. The harness audits itself semantically.** Optimize v2: six dispositions
  (KEEP / ONE_HOME / LOAD_LATER / MAKE_A_CHECK / PROBATION / RETIRE) per material
  control, cross-file duplication detection; Reaper archives undead feature folders.
  (Nate audit loop + RF-4.)
- **S9. Sessions feed the harness, with human approval.** Session-end proposes —
  never silently applies — repeated discoveries/corrections as boundary rule,
  context fact, or project skill. (The growth loop; how the last 30% compounds.)
- **S10. Harness changes are built to an evaluated bar.** Thin Phase-0 spine:
  anchors defined once (S2 consumes them), PROTOCOL-vs-JUDGMENT authoring rule,
  minimal fresh-subagent eval (N≥3) for new/changed skills. (Claude meta-gap,
  confirmed in convergence.)

## What "Done" Looks Like

- A feature can run the full loop and leave behind: merged code, one ledger row,
  decision-log rows, any discoveries — and **no feature folder**.
- An agent starting new work retrieves prior decisions/solutions before proposing
  anything (S3 observable in research/design/decompose output).
- A spec's constraints each cite their upstream source; an invented premise is
  visibly flagged (S1).
- At least one prose boundary in this repo converted to a working hook (S6), with
  provenance recorded (S7).
- Optimize v2 produces a disposition table over this repo's own harness (S8).
- The dogfood standard from the dossier pilot applies: repo-local first, kill
  criteria explicit, propagate to `src/` templates only after survival (ASK FIRST).

## Constraints

- **Model-tiering carry-forward (hard):** whatever config surface S6–S9 create must
  express per-stage model tiers, per-harness maps, tier-intent names, and a
  degradation ladder. (`docs/backlog/2026-07-20-model-tiering.md`)
- RF-KILL constraints hold: no session-end interactive HTML (11), reject-framing
  escape on every decision UI (6), no self-reported "nominal" (3), no word-caps
  with silent cutting (2). Silence must be earned by an independent verifier.
- RF-DIET-2: a doc enters the human channel only if it requires a decision.
- Ledger rows are factual and thin — when/what/who/where/PR; no narrative. If it
  needs prose, it's a decision-log row or a discovery instead.
- **Durable docs are built for retrieval, not reading** (amends RF-DIET-1: agent
  docs are NOT uncapped). Agents read partially by default — top-sampled, offset
  reads, lost-in-the-middle — so every layer-2 doc must be: (a) grep-addressable
  (typed frontmatter / one-line keyed rows / stable vocabulary; prefer many small
  files behind a thin index over one large file), (b) **newest-first** when
  time-ordered (prepend — append-only chronological logs put the most relevant
  rows exactly where a partial read never reaches), (c) under a hard line budget
  (~200) enforced by a machine check (MAKE_A_CHECK via optimize v2 or a hook),
  where over-budget triggers the S5 refresh lifecycle to Consolidate/shard older
  rows behind an index — never silent truncation.
- Only `status: done` + merged features are deletion-eligible (S5).
- Skill/template changes are ASK FIRST per AGENTS.md; this sprint follows the
  dossier-pilot pattern (repo-local divergence markers before src/ propagation).

## Hard Constraints

(Stamped by `/joycraft-decide`, 2026-07-21.)

- Feature folders are deleted only by the Reaper after verified merge (`gh`); session-end
  writes the ledger row and marks reap-eligible; deletion commits ride the next feature
  branch; `dossier.html` is deleted with its folder. (D1)
- Shipped ledger = live-head `docs/context/shipped.md`, newest-first, 200-line budget;
  over-budget rotates oldest rows to numbered shards (`shipped-001.md`, …) with a
  pointer-only JSON manifest created mechanically at first rotation; decision-log shards
  the same way. (D2)
- Harness config lives in committed `docs/.joycraft/config.json` (state.json stays
  gitignored/machine-owned); it must encode tiers as `{stage: {intent, model}}`,
  per-harness maps, and the degradation ladder. (D4)
- Confidence anchors are self-scored by authoring skills against `docs/context/anchors.md`;
  decide audits and may re-anchor with a note. (D5)
- The Reaper archive-moves undead folders to `docs/archive/features/` — proposed per
  folder, human-approved; it never deletes unextracted content. (D6)
- `docs/context/decision-log.md` flips to newest-first; the write rule for time-ordered
  context docs is prepend-only (add-fact and decide amended same-commit). (D7)
- The harden pass lives in a new `joycraft-harden` skill with `entry: agent` — invoked
  from tune's roadmap, optimize v2 dispositions, and S9 promote; it still shows diffs
  and requires explicit approval before touching settings. (D3)
- Skill taxonomy rides S8: every skill declares `entry: human | agent | situational` in
  frontmatter; internals get terse anti-discovery descriptions ("Invoked by X after Y —
  not a user entry point"); optimize v2 checks the declaration, a human-door budget
  (≤9), and the description budget; S9 proposals default new skills to `entry: agent`.
  No renames — presentation/discovery only; the /clear handoff boundary is untouched
  (that's the headless track). (D3)

## Open Questions

(Terminated 2026-07-21 via `/joycraft-decide` — see frontmatter `decisions:` and
`## Hard Constraints` above. All seven clarified; D3 was punted mid-deposition, then
resolved by the in-session skill-taxonomy discussion. Original questions kept for
context.)

- **D1:** Exhaust deletion trigger — at session-end `done`-graduation, or only
  post-merge? And survivors: does dossier.html die with the folder (its own D2
  said "committed so later readers see what the decider saw")?
- **D2:** Ledger shape — recommend single `docs/context/shipped.md` (decision-log
  pattern: smallest + most re-read); alternative `docs/ledger/` per-feature files.
- **D3:** Harden pass home — tune, lockdown, or a new skill?
- **D4:** Where harness config state lives (extend `docs/.joycraft/`?) — must
  satisfy the model-tiering carry-forward.
- **D5:** Who scores confidence (S2) — design/new-feature self-score at authoring,
  or decide derives scores when building the dossier?

## Out of Scope (for now)

- Multi-persona **code** review (`joycraft-review-code`) — doc-side S1/S2 first;
  risk-gated code review is a later track.
- Strategy anchor, external/web research, single-source converter (Phase 3),
  headless/JSON contracts, Cockpit, Strata, all CE optional packs.
- Codex/pi variants of anything new until the Claude variant survives real use.

## Execution Strategy

(Decomposed 2026-07-21 — 10 atomic specs in `specs/`, queue in `specs/.joycraft-spec-queue.json`,
implementer guide in `specs/README.md`.)

- **Wave 1 (parallel-safe):** 1 `scaffold-knowledge-substrate`, 2 `create-harness-config`,
  7 `create-harden-skill` — disjoint files (context docs / docs/.joycraft / harden+tune+AGENTS.md).
- **Wave 2 (parallel-safe, after 1):** 3 `add-retrieval-pass`, 6 `build-ledger-lifecycle`.
- **Wave 3 (parallel-safe, after 3):** 4 `add-provenance-gate`, 5 `add-confidence-scoring`.
- **Wave 4 (after 4, 5, 6, 7):** 8 `upgrade-optimize-v2` — sequential; its taxonomy sweep
  touches every skill file, so it runs after all skill-editing specs.
- **Wave 5 (after 8):** 9 `add-reaper-pass` — same file as 8.
- **Wave 6 (after 9):** 10 `run-gate-evals` — N≥3 fresh-subagent evals of the three gates.

Modes (human-approved): specs 1–5, 9, 10 → `checkpoint`; specs 6, 7, 8 → `isolated`.
S10's Phase-0 spine (anchors.md + PROTOCOL-vs-JUDGMENT rule) lands in spec 1 so S2 can
consume it early; the evals stay an independent final pass (RF-KILL-3).

## Raw Notes

- Filter used on the research: "does this reduce the gap between what the human
  approved and what got built?" — not "is this a good CE idea."
- convergence.md is **lossy** where this sprint lives: premise-dependency linking,
  confidence-gap deepening, audit-before-hypothesis ordering, grep-first
  update-vs-create, and the inbound-link deletion gate all appear only in the
  research passes. Decompose from this brief + the passes, not convergence alone.
- Evidence anchors: RF-4 (29/43 feature folders never built; decision-log =
  smallest, most re-read), RF-6 (Naur — the theory lives outside the code),
  RF-KILL-7 (squash merges are why the ledger row must exist).
- Max's framing to keep: "anti vibe coding — you know *precisely* what will be
  built." ~70% there; this sprint is aimed at the Pareto-hard remainder.
- File-length protection by layer: layer 1 (code) is already partial-read-safe —
  grep/LSP navigation + tests as external verifier (RF-3); a per-project
  "no source file past N lines" rule is a boundary *candidate* for S9
  promote-to-harness → S6 harden, not a Joycraft-global imposition. Layer 3
  (exhaust) is bounded by S5 deletion — after this sprint the only
  unbounded-growth files are ledger + decision-log, which is where the
  budget/shard check points.
- Design guidance (not a dossier question — settle in /joycraft-design): exact
  budget number, shard granularity (by year vs by area), and index shape for
  decision-log + ledger.

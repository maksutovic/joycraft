---
status: active
reap: eligible
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
decisions:
  - id: D1
    question: one parameterized review-gate template, or per-gate templates?
    status: clarified
    choice: one generic template
    rationale: because the dossier tokens generalized cleanly to a brief review on 2026-07-29 (live evidence), and per-gate templates multiply the render-check surface for no structural gain
  - id: D2
    question: chat-cap number and slot set?
    status: clarified
    choice: ~10 lines — slots outcome / artifact path / questions-count / next action, per-slot caps inline
    rationale: because caps only work as slot attributes (gameable standalone), and ten lines makes overflow visually obvious
  - id: D3
    question: do tune and optimize join the artifact gates now?
    status: clarified
    choice: yes — both join in this feature
    rationale: because the human said "sure why not, let's try it" — their reports are heavily human-read despite entry: agent, and the artifact decides, not the door (same logic as prior D7)
  - id: D4
    question: rendered gate artifacts committed or transient?
    status: clarified
    choice: committed + linguist-collapsed, AND the markdown stays canonical — agents read .md, humans get HTML
    rationale: because the two-channel split runs all the way down — HTML never replaces the agent-readable record, it renders it; dossier.html precedent plus .gitattributes already solves PR noise
  - id: D5
    question: what replaces the bare "/clear + command" handoff at the end of each gate?
    status: clarified
    choice: a fenced copy-pasteable briefing prompt — command, pickup sentence, decided/don't-reopen, Start, Hazard, Done-when
    rationale: because the human has been hand-writing these and finds a cold agent briefed in-prompt outperforms one told only which command to run (stamped 2026-07-29, format chosen from three previews)
  - id: D6
    question: where does the per-project execution profile live (swarm opt-in + per-harness model/effort)?
    status: clarified
    choice: a small "## Execution Profile" section in AGENTS.md, generated at init, adjustable via tune
    rationale: because every harness already reads AGENTS.md each session — no pointer to follow (the failure mode this feature kills), hand-editable, team-shared via git
  - id: D7
    question: does this revive the backlogged model-tiering feature?
    status: clarified
    choice: profile as data only — briefings inject whatever the profile says; the stage-tiering defaults stay backlogged
    rationale: because tuneable configuration was model-tiering's stated blocker and this ships it, but opinionated routing defaults remain a separate decision the human hasn't made
---

# Succinct Gates — Feature Brief

> **Date:** 2026-07-29
> **Project:** Joycraft
> **Research:** web-verified mechanism evidence, 2026-07-29 (see Vision)
> **Specs:** `docs/features/2026-07-29-succinct-gates/specs/`

---

## Vision

Every Joycraft approval bookend — new-feature brief, design, decompose,
research, decide — plus the tune and optimize reports (D3) delivers its
content as an auto-opened HTML artifact and its chat message as a fixed-slot
template of roughly ten lines (D2). The human channel carries decisions; the
artifact carries everything else. The markdown artifact stays canonical and
agent-readable; the HTML is a human-facing render of it, never a replacement
(D4).

This replaces 0.7.2's mechanism, which failed live on 2026-07-29: thirteen
skills point at `docs/templates/reference/output-style.md`, yet a decompose
review still arrived as a multi-page chat wall with three buried decision
prompts and no artifact (anchor: 100 — observed transcript). The failure is
structural, not agent whim: Anthropic's skill-authoring guidance documents
that referenced files get partially read or skipped at output time, so a
pointer governs tone at best, never volume or placement (anchor: 75).

The replacement mechanism is grounded in what works in the real world:
fill-in-the-slots templates written inline at the checkpoint step (Anthropic's
canonical "Template pattern"), plus the two-surface split that Artifacts,
Canvas, and Devin's plan-review all converged on — dense reviewable doc, thin
chat pointer (anchor: 75 — multi-source web research, not yet tested in this
harness). The `i-have-adhd` skill's observed "magic" is the same ingredient:
concrete structural rules in context at the output moment, not a citation.

## User Stories

- As the reviewing human, I want every gate to open a scannable artifact in my
  browser so review costs seconds, not a transcript excavation.
- As the reviewing human, I want open questions rendered as forced-choice
  cards inside the artifact so I answer "approve/reword/drop" instead of
  parsing prose.
- As a downstream agent, I want the canonical record to stay markdown so I
  never have to parse HTML to learn what was decided (D4).
- As a Joycraft maintainer, I want the contract test-enforced so it cannot
  silently regress the way the 0.7.3 stale-skill ship did.

## Hard Constraints

- MUST: the chat message at every gate is a fixed-slot template written
  **inline in the skill at that step** — never delegated to a referenced doc.
  Slot set per D2: outcome / artifact path / questions-count / next action,
  ~10 lines, per-slot line caps inside the template.
- MUST: gate content (tables, corrections, wave plans, evidence) lives in the
  artifact; the chat turn is the slot template only.
- MUST: one generic review-gate HTML template serves all gates (D1), on the
  dossier discipline — fill only `<!-- SLOT:… -->` regions, structure
  byte-identical, `open`/`xdg-open` before asking, print the path and continue
  if headless (anchor: 100 — pattern shipped and render-checked in
  joycraft-decide).
- MUST: every rendered HTML derives from a committed markdown artifact that
  remains the canonical, agent-readable record (D4). HTML is committed and
  linguist-collapsed like `dossier.html`.
- MUST: any gate artifact with open questions, or a load-bearing claim
  anchored ≤50, invokes `/joycraft-decide` **before** presentation — the
  Block Rule fires pre-approval, every time.
- MUST: the new HTML template passes the mechanical render check (headless
  Chrome `--dump-dom` + computed-style probe) per the 2026-07-20 dossier
  discovery.
- MUST: every skill edit regenerates bundles and syncs installed copies in
  the same commit (`pnpm sync-skills`).
- MUST NOT: add runtime dependencies (no markdown→HTML library — agents
  hand-fill the template as decide already does).
- MUST NOT: ship persona/compression styles (caveman-class) — measured no
  better than one line of instruction and degrades multi-turn context.
- MUST NOT: break the position-fragile windowed tests
  (`retrieval-pass-skill`, `confidence-scoring-skill`) — relocate pointers in
  `src/skills/` and regenerate, never widen a window.

Boundary note: AGENTS.md marks skill and template content ASK FIRST. The
2026-07-29 interview and the four stamped decisions are that ask — same
posture as the prior feature's B1/B2 approvals.

## Out of Scope

- NOT: prose-quality assertions in tests (no mechanical oracle — RF-KILL-2).
- NOT: bundling `i-have-adhd` verbatim — we adopt its structural mechanism,
  not the skill.
- NOT: interactive HTML answering — decisions still flow through
  AskUserQuestion / structured chat (decide's existing ban on pick-strings).
- NOT: deleting the output-style doc — it remains the tone contract for
  non-gate output; gate moments get the stronger inline mechanism.

## Absorbed backlog

`docs/backlog/2026-07-27-auto-open-review-artifacts.md` and
`docs/backlog/2026-07-27-decide-gate-mandatory.md` are this feature — both
marked superseded by this brief at decomposition (2026-07-29).

## Test Strategy

- **Existing setup:** vitest (`pnpm test`), typecheck, 3-way harness parity +
  installed-copy byte-match tests, dossier render-check precedent.
- **User expertise:** comfortable.
- **Test types:** content tests over `src/skills/` (slot template + artifact
  step presence, heading-anchored), template static-shape tests, existing
  parity.
- **Smoke test budget:** seconds — content tests are string assertions.
- **Lockdown mode:** no.

## Decomposition

Specs 2–4 all edit the same gate-skill bodies, so no wave is parallel —
execution is strictly sequential (corrected from the pre-decision draft,
which wrongly marked wave 1 parallel).

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | write-gate-artifact-template | Author the single generic `REVIEW_GATE_TEMPLATE.html` (D1) on the dossier slot-fill pattern, incl. decision cards; mechanical render verification | None | M |
| 2 | inline-gate-slot-contracts | Write the D2 fixed-slot chat template inline at the gate step of the 7 skills (new-feature, design, decompose, research, decide, tune, optimize) | None | M |
| 3 | add-artifact-render-steps | Add render + auto-open artifact steps (md stays canonical per D4, headless no-op) to the 6 skills without one (all but decide) | 1, 2 | M |
| 4 | enforce-decide-pre-presentation | Open questions or ≤50 load-bearing claims invoke decide before any gate presentation; fix design's Step 4/5 ordering ambiguity | 3 | S |
| 5 | gate-contract-tests | Content tests asserting each gate skill carries the inline slot template, artifact step, and handoff briefing; static-shape test for the template | 1, 2, 3, 4, 7 | M |
| 6 | regen-and-sync | Terminal bundle regeneration + installed-copy sync in one reviewable commit | 1–5, 7 | S |
| 7 | handoff-briefing-prompts | Replace the bare `/clear + command` handoff with the D5 fenced briefing prompt in every skill that ends with a handoff | 4 | M |
| 8 | capture-execution-profile | Init asks (per selected harness) swarm opt-in + model/effort and writes the D6 `## Execution Profile` AGENTS.md section; tune offers it when missing | None | M |
| 9 | inject-profile-into-briefings | Decompose and implement-feature briefings read the Execution Profile and inject swarm/model/effort instruction lines (D7) | 7, 8 | S |

## Execution Strategy

- [x] Sequential — nine waves of one spec each (order 1, 2, 3, 4, 7, 8, 9,
  5, 6). Spec 6 is terminal and derives from every preceding spec's output;
  specs 2–4, 7, and 9 share Affected Files. Spec 8 is the one code spec
  (init/tune/agents-md) and could in principle run parallel to 2–4, but the
  sequential default keeps the queue simple.

## Success Criteria

- [ ] Running decompose on a real feature produces an auto-opened HTML
  artifact and a chat message within the slot template — the 2026-07-29
  payflow wall-of-text cannot recur within contract.
- [ ] Decision prompts render as cards in the artifact, never as inline prose
  paragraphs in chat.
- [x] Every gate's canonical record is a committed `.md` an agent can read
  without touching HTML (D4).
- [x] A gate skill missing its slot template or artifact step fails
  `pnpm test` (mutation-verified per assertion group in
  `tests/gate-contract.test.ts`).
- [x] `pnpm test && pnpm typecheck` green, parity + byte-match included.
- [x] No change to any `entry: agent` artifact contract (specs, queue JSON,
  frontmatter stay dense).

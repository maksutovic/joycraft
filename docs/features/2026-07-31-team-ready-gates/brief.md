---
status: active
owner: Maximilian Maksutovic
created: 2026-07-31
feature: 2026-07-31-team-ready-gates
decisions:
  - { id: D1, status: clarified, choice: "AskUserQuestion directive in all gate skills (interview, new-feature, tune, design, bugfix), codex/pi structured-chat fallback", rationale: "settled in-session 2026-07-31" }
  - { id: D2, status: clarified, choice: "Defer-to-person is a first-class answer; assignee-tagged section in md + cards in HTML", rationale: "settled in-session 2026-07-31" }
  - { id: D3, status: clarified, choice: "Custom output templates live in docs/templates/output/; checked before bundled templates", rationale: "settled in-session 2026-07-31" }
  - { id: D4, status: clarified, choice: "Agent-handoff-prompt slot added to brief/PRD output", rationale: "settled in-session 2026-07-31" }
  - { id: D5, status: clarified, choice: "Model/effort-question skip is a bug; reproduce and fix in this revision", rationale: "settled in-session 2026-07-31" }
  - { id: D6, status: clarified, choice: "Gate HTML gets timestamp + revision banner; auto-open becomes a persisted on/off setting", rationale: "settled in-session 2026-07-31" }
  - { id: D7, status: clarified, choice: "README restructure (install-first + TOC) and thin SECURITY.md in this revision", rationale: "settled in-session 2026-07-31" }
  - { id: D8, status: backlogged, choice: "Cursor skill discovery", rationale: "docs/backlog/2026-07-31-cursor-skill-discovery.md" }
  - { id: D9, status: backlogged, choice: "Linear ticket creation from PRD", rationale: "docs/backlog/2026-07-31-linear-ticket-creation.md" }
  - { id: D10, status: clarified, choice: "Gate question directives require >=2 real options and route free-text answers as '<choice> because <reason>' (Pattern B)", rationale: "approved at decompose gate 2026-07-31; source decision-log 2026-07-20 (3/3 native-UI trials)" }
  - { id: D11, status: clarified, choice: "Every defer-to-person action confirms visibly in one line: who, which question, where recorded", rationale: "approved at decompose gate 2026-07-31; source discovery 2026-07-20 (silent file-mutating branches)" }
  - { id: D12, status: clarified, choice: "Auto-open on/off setting persists in docs/.joycraft/state.json", rationale: "approved at decompose gate 2026-07-31; reuses existing version-state file, no new config surface" }
  - { id: D13, status: clarified, choice: "Revision marker is an integer in the rendered HTML footer, read from the previous render and incremented; no new state file", rationale: "approved at decompose gate 2026-07-31; state stays local to the artifact" }
---

# Team-Ready Gates — Feature Brief

> **Date:** 2026-07-31
> **Project:** Joycraft
> **Origin:** /joycraft-interview session — Praful feedback call transcript, 2026-07-31

---

## Vision

Praful's usage has shifted from solo spec-writing to running Joycraft as a team
documentation engine: he drafts PRDs across ~6 projects, shares the HTML + md
into Notion, collects answers from people on other teams (support, product,
engineering), and hands the finished doc plus an agent prompt to an engineer who
pastes it straight into Claude Code. The gates are the product surface now — and
three things get in the way: the question/answer picker only appears
intermittently, there's no way to defer a question to a named person, and the
output shape is fixed when he wants to feed in his own PRD template.

This revision makes the gates team-ready: deterministic question UI, defer-to-
person as a first-class answer, user-supplied output templates, an agent-handoff
prompt slot in the output, timestamped/trackable HTML artifacts, and the public
docs (README, SECURITY.md) brought up to what enterprise adopters expect.

Two code facts ground the top of the queue:

- **Intermittent question picker (D1).** Only `joycraft-decide.md` references
  the AskUserQuestion tool anywhere in `src/skills/` — every other gate
  (interview, new-feature, tune, design, bugfix) leaves question format to the
  model, so users sometimes get a plain Q1/Q2/Q3 list (anchor: 100 — grep
  verified 2026-07-31).
- **Model-question bug (D5).** The per-harness model + effort prompt lives
  inside the execution-profile offer at `src/skills/joycraft-tune.md:97`
  (rendered by `src/execution-profile.ts`), bundled into one prose block with
  the two swarm y/n questions and only firing when the
  `<!-- joycraft:execution-profile -->` sentinel is absent (anchor: 100 —
  read 2026-07-31). Praful received the swarm questions but never the
  model/effort ones; the likely mechanism is that the free-text questions get
  dropped when the model reformats the bundled block (anchor: 75 — consistent
  with the code shape, not yet reproduced).

## User Stories

- As a PM running multiple projects, I want every gate question to arrive
  through the structured question picker so that answering is fast and nothing
  gets lost in prose.
- As a PM whose team holds the answers, I want to defer a question to a named
  person so that the brief carries an assigned-questions section I can paste
  into Notion for them.
- As a team with an existing PRD template, I want Joycraft's output to follow
  our template so that the docs slot into our existing process.
- As a PM handing work to an engineer, I want the brief to include a
  ready-to-paste agent prompt so that I stop writing it by hand.
- As a reviewer with many gate tabs open, I want each HTML artifact to show a
  timestamp and revision so that I always know which is latest.
- As an enterprise evaluator, I want an install-first README and a SECURITY.md
  so that I can assess Joycraft quickly and answer the "how do I keep this from
  going rogue" question.

## Hard Constraints

- MUST NOT: add runtime dependencies (AGENTS.md NEVER) — template rendering
  stays agent-hand-filled, no md→HTML library.
- MUST: keep gate HTML skeletons byte-identical outside `SLOT` regions; custom
  output templates must not break the locked-skeleton contract for the
  built-in gates.
- MUST: run `pnpm sync-skills` after any `src/skills/` edit and commit
  regenerated + installed copies in the same commit — a stale installed tree
  shipped twelve wrong copilot skills in 0.7.3 (anchor: 100 — AGENTS.md
  boundary).
- MUST: keep auto-open a no-op in headless/CI/isolated mode, never a failure.
- MUST: keep all template and skill paths project-relative — they're copied
  into user projects.
- Known trap: `REVIEW_GATE_TEMPLATE.html` lives at `src/templates/`, not
  `docs/templates/` as the new-feature skill's render step claims (anchor:
  100 — `ls` verified 2026-07-31). Specs touching gate HTML must reference the
  real path, and D6's spec should fix the skill's stale reference while in
  there.

## Out of Scope

- NOT: Cursor slash-command discovery — backlogged at
  `docs/backlog/2026-07-31-cursor-skill-discovery.md` (D8).
- NOT: PRD → Linear ticket automation — backlogged at
  `docs/backlog/2026-07-31-linear-ticket-creation.md` (D9).
- NOT: YC multiplayer-agent tool evaluation — mentioned, not backlogged;
  revisit if it comes up again.
- NOT: model/tier routing recommendations — that is the backlogged
  model-tiering feature's scope (`docs/backlog/2026-07-20-model-tiering.md`).
- NOT: remembering answers across projects (context map) — existing tune →
  context map path covers it; only the docs mention lands here via D7.

## Test Strategy

- **Existing setup:** vitest via `pnpm test` (runs once and exits) +
  `pnpm typecheck`; skill-content tests exist (e.g.
  `tests/retrieval-pass-skill.test.ts` slices character windows of skill
  bodies).
- **User expertise:** comfortable.
- **Test types:** unit tests on skill content (directive present in every gate
  skill), unit tests on `execution-profile.ts`, template-content assertions
  for the timestamp/revision slots, fixture-based init/upgrade tests for the
  custom-template lookup.
- **Smoke test budget:** seconds — `pnpm test` already fits.
- **Lockdown mode:** no.

## Settled Decisions (D1–D9, via AskUserQuestion 2026-07-31)

- **D1** AskUserQuestion directive added to ALL gate skills (interview,
  new-feature, tune, design, bugfix), with codex/pi chat fallback (decide's
  pattern).
- **D2** Defer-to-person: first-class answer, assignee-tagged section in md +
  cards in HTML.
- **D3** Custom output templates live in `docs/templates/output/`; skills check
  there before bundled templates.
- **D4** Agent-handoff-prompt slot added to brief/PRD output.
- **D5** Model/effort-question skip is treated as a bug; reproduce and fix in
  this revision.
- **D6** Gate HTML gets timestamp + revision banner; auto-open becomes a
  persisted on/off setting.
- **D7** README restructure (install-first + TOC) and thin SECURITY.md included
  in this revision.
- **D8** Cursor skill discovery → backlog.
- **D9** Linear ticket creation from PRD → backlog (own scope).
- **D10** (decompose gate, 2026-07-31) Gate question directives require ≥2 real
  options and route free-text answers as "<choice> because <reason>" (Pattern
  B, decision-log 2026-07-20).
- **D11** (decompose gate, 2026-07-31) Every defer-to-person action confirms
  visibly in one line: who, which question, where recorded.
- **D12** (decompose gate, 2026-07-31) Auto-open setting persists in
  `docs/.joycraft/state.json`.
- **D13** (decompose gate, 2026-07-31) Revision marker = integer in the HTML
  footer, incremented per re-render; no new state file.

## Open Questions

None — all nine decisions were settled in-session.

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | harden-question-directive | Add the explicit AskUserQuestion directive (with codex/pi structured-chat fallback, decide's pattern) to interview, new-feature, tune, design, and bugfix skills. | None | M |
| 2 | fix-model-question-skip | Restructure the execution-profile offer in tune/init so the model/effort questions cannot be dropped — split them from the swarm y/n block and route them through the hardened question directive. | 1 | S |
| 3 | add-defer-to-person | Make "defer to <name>" a first-class answer at every gate: "Open Questions — Assigned" section in md, assignee-tagged question cards in gate HTML. | 1 | M |
| 4 | support-custom-output-templates | Skills check `docs/templates/output/` for a user template before bundled defaults, md + HTML, without breaking the locked-skeleton contract. | None | M |
| 5 | add-agent-handoff-slot | Add a "prompt for the implementing agent" slot to brief/PRD output, md + HTML. | 4 | S |
| 6 | stamp-gate-artifacts | Timestamp + revision banner in every gate HTML (stable filenames); auto-open becomes a persisted on/off setting; fix the skills' stale `docs/templates/REVIEW_GATE_TEMPLATE.html` path reference. | None | M |
| 7 | restructure-public-docs | README leads with what-it-is + install + TOC, details move to linked docs (incl. setup-steps clarity); add thin SECURITY.md pointing at Claude Code's safety docs. | None | M |

## Execution Strategy

- [ ] Sequential (specs have chain dependencies)
- [ ] Parallel worktrees (specs are independent)
- [x] Mixed

Wave plan (decomposed 2026-07-31, mode `batch` for all specs — human-approved):

- **Wave 1: specs 1, 7** — parallel-safe (disjoint files: gate skills vs
  README/SECURITY.md).
- **Wave 2: specs 2, 4** (after 1) — parallel-safe (disjoint per-skill files:
  tune + execution-profile vs the other gate skills' output steps).
- **Wave 3: specs 3 → 5 → 6** — NOT parallel-safe (all touch
  `src/templates/REVIEW_GATE_TEMPLATE.html` contract comments and the same
  gate-skill render steps); sequential.

Every skill-editing spec regenerates bundles + installed copies in its own
commit; spec 6 carries a final zero-drift verification AC.

Hazard for every skill-touching spec: `pnpm sync-skills` + regenerated copies
committed in the same commit, and skill-body edits can shift the character
windows sliced by `tests/retrieval-pass-skill.test.ts`.

## Success Criteria

- [ ] Every gate question in Claude Code arrives through the AskUserQuestion
  picker, every time; codex/pi get the structured chat fallback.
- [ ] Any question can be answered "defer to <name>"; the brief ends with an
  "Open Questions — Assigned" section and the HTML renders assignee-tagged
  cards ready to paste into Notion.
- [ ] A user template in `docs/templates/output/` shapes gate output (md +
  HTML); absent one, bundled defaults apply unchanged.
- [ ] Brief/PRD output includes the agent-handoff prompt slot.
- [ ] Every gate HTML shows a generated timestamp + revision banner; auto-open
  honors a persisted on/off setting; headless stays a no-op.
- [ ] Running init/tune reliably asks model/effort wherever it asks the swarm
  questions.
- [ ] README leads with what-it-is, install, TOC; SECURITY.md exists.
- [ ] `pnpm test && pnpm typecheck` pass; no regressions in existing gates.

## Raw Notes (from the interview draft)

- Praful on the HTML artifacts: "with Markdown it's very, very hard to scroll
  through… now it's just HTML and I can read it… much better format now." The
  fatigue fix landed; the remaining pain is tracking revisions across tabs.
- His team flow: draft PRD per project → embed HTML + md in Notion → teammates
  answer assigned questions → iterate → engineer pastes the agent prompt into
  Claude Code. Six projects run in parallel this way.
- Context map came up: he wants prior answers remembered across projects —
  pointed him at tune → context map; also flagged the setup steps need a video
  and clearer docs (folded into D7's README work).
- Quote worth keeping: "Joycraft asks you questions that you don't think about
  when you're building a product… everything else I told you is window
  dressing now."
- Notion now supports embedded HTML — that's why the dual md+HTML output
  matters to him (anchor: 75 — Praful's report, not checked against Notion).

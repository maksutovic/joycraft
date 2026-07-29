# Succinct Gates — Feature Specs

> **Parent Brief:** `docs/features/2026-07-29-succinct-gates/brief.md`
> **Status:** Decomposed 2026-07-29, ready for implementation

## What this feature does

Every approval bookend — new-feature, design, decompose, research, decide,
plus the tune and optimize reports (D3) — delivers its content as an
auto-opened HTML artifact filled from one generic template (D1), and its chat
message as a ~10-line fixed-slot template written inline in the skill (D2).
The markdown artifact stays canonical for agents; HTML is the human render
(D4). Decide fires before presentation whenever open questions or ≤50
load-bearing claims exist. All of it is test-enforced.

Replaces 0.7.2's pointer mechanism, which failed live 2026-07-29. Absorbs and
supersedes `docs/backlog/2026-07-27-auto-open-review-artifacts.md` and
`docs/backlog/2026-07-27-decide-gate-mandatory.md`.

## Specs

| # | Spec | Depends On | Mode | Notes |
|---|------|-----------|------|-------|
| 1 | [write-gate-artifact-template.md](write-gate-artifact-template.md) | — | checkpoint | One generic `REVIEW_GATE_TEMPLATE.html` on the dossier tokens; slot regions for sections, tables, question cards; render-checked. |
| 2 | [inline-gate-slot-contracts.md](inline-gate-slot-contracts.md) | — | isolated | The 10-line fixed-slot chat template, inline at 7 skills' gate steps. |
| 3 | [add-artifact-render-steps.md](add-artifact-render-steps.md) | 1, 2 | isolated | Render + auto-open steps (decide's Step 4 pattern) in the 6 skills without one; md stays canonical. |
| 4 | [enforce-decide-pre-presentation.md](enforce-decide-pre-presentation.md) | 3 | batch | Decide fires pre-presentation in 5 question-bearing skills; fixes design's Step 4/5 ordering. |
| 5 | [gate-contract-tests.md](gate-contract-tests.md) | 1, 2, 3, 4, 7 | batch | `tests/gate-contract.test.ts`: presence + heading anchoring for template, render step, decide rule, handoff briefing; setup as negative control. |
| 6 | [regen-and-sync.md](regen-and-sync.md) | 1–5, 7 | checkpoint | Terminal: generate all four harness trees + registry, sync installed copies, one commit. |
| 7 | [handoff-briefing-prompts.md](handoff-briefing-prompts.md) | 4 | batch | D5 fenced briefing prompt (pickup / decided / start / hazard / done-when) replaces the bare `/clear + command` handoff in 8 skills. |

## Execution waves

Strictly sequential — seven waves of one spec each, in order
**1, 2, 3, 4, 7, 5, 6**. Specs 2, 3, 4, and 7 edit the same gate-skill
bodies (overlapping Affected Files), so no wave is parallel-safe. Spec 6 is
terminal and derives from everything before it.

## Known hazard: the windowed tests

`tests/retrieval-pass-skill.test.ts` slices a 1500-char window from the
`Retrieve Before You Reason` heading in research, design, and decompose.
`tests/confidence-scoring-skill.test.ts` slices between fences from
`Use this structure for each spec body:` in design and new-feature, and bans
the word `percentage` file-wide in design, new-feature, and decide.

Both suites read **installed** copies, which stay stale until spec 6 syncs —
a placement mistake in specs 2–4 surfaces at spec 6. The fix is always to
relocate the edit in `src/skills/` and regenerate; never widen a window or
edit an assertion.

## Decisions stamped at decomposition

All five interview questions terminated 2026-07-29, recorded in the brief's
`decisions:` block: **D1** one generic template; **D2** ~10-line slot set
(outcome / artifact path / decisions / next); **D3** tune + optimize join the
gates; **D4** HTML committed + linguist-collapsed, markdown stays the
canonical agent-readable record; **D5** the handoff is a fenced briefing
prompt (pickup / decided / start / hazard / done-when), not a bare command.

## How to use this file

Run the whole queue with
`/joycraft-implement-feature docs/features/2026-07-29-succinct-gates/` — it
executes the specs in order and finishes with session-end. Or run one at a
time with
`/joycraft-implement docs/features/2026-07-29-succinct-gates/specs/write-gate-artifact-template.md`.
Each spec is self-contained; this README provides ordering context only.

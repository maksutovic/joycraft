# Team-Ready Gates — Decomposition

> **Parent Brief:** `docs/features/2026-07-31-team-ready-gates/brief.md`
> **Date:** 2026-07-31
> **Status:** Approved 2026-07-31 — I1–I4 approved as D10–D13 (via AskUserQuestion); mode = `batch` for all specs (human override of the checkpoint recommendation)

---

## Prior knowledge reused

- `docs/context/decision-log.md` 2026-07-20 — AskUserQuestion rejects single-option questions; Pattern B ("<choice> because <one-sentence reason>" through the free-text row) is the proven capture pattern, Pattern C the fallback. Feeds specs 1 and 2: the model/effort free-text questions must never become one-option pickers.
- `docs/context/decision-log.md` 2026-07-29 (succinct-gates D6/D7) — execution profile is sentinel-delimited data in AGENTS.md, data only; model-tiering stays backlogged. Confirms spec 2's boundary and the brief's out-of-scope line.
- `docs/context/shipped.md` 2026-07-29 — succinct-gates shipped `src/templates/REVIEW_GATE_TEMPLATE.html`, `src/execution-profile.ts`, and `tests/gate-contract.test.ts`; that test file is where specs 1, 3, 6 extend coverage.
- `docs/discoveries/2026-07-20-gate-defer-needs-visible-confirmation.md` — a branch that mutates files on a conversational shortcut must have its user-facing confirmation in the ACs, or agents do it silently. Feeds spec 3's defer path.
- `docs/discoveries/2026-07-29-handoff-briefing-sync-constraint.md` — enumerate gate/handoff sites by the `## Recommended Next Steps` heading, never by literal greps; the test suite regenerates bundles, so every skill-editing spec syncs in its own commit (no terminal sync spec).

No retrieved decision contradicts the brief.

## Decomposition

| # | Spec Name | Description | Dependencies | Size |
|---|-----------|-------------|--------------|------|
| 1 | harden-question-directive | Add the AskUserQuestion directive (≥2 real options, Pattern B free-text routing, codex/pi structured-chat fallback) to the interview, new-feature, tune, design, and bugfix skills. | None | M |
| 2 | fix-model-question-skip | Split the model/effort questions out of tune's bundled execution-profile prose block and route them through the hardened question directive, in both tune and interactive init. | 1 | S |
| 3 | add-defer-to-person | Make "defer to <name>" a first-class gate answer: "Open Questions — Assigned" section in md, assignee-tagged question cards in gate HTML, visible one-line confirmation on every deferral. | 1 | M |
| 4 | support-custom-output-templates | Gate skills check `docs/templates/output/` for a user template before bundled defaults (md + HTML) without breaking the locked-skeleton contract. | None | M |
| 5 | add-agent-handoff-slot | Add a "prompt for the implementing agent" slot to brief/PRD output, md + HTML. | 4 | S |
| 6 | stamp-gate-artifacts | Timestamp + revision banner in every gate HTML, auto-open as a persisted setting, and fix the skills' stale `docs/templates/REVIEW_GATE_TEMPLATE.html` path references. | 1 | M |
| 7 | restructure-public-docs | README leads with what-it-is + install + TOC with details moved to linked docs; add a thin SECURITY.md pointing at Claude Code's safety docs. | None | M |

## Execution waves

- **Wave 1: specs 1, 7** — parallel-safe (Affected Files disjoint: spec 1 edits `src/skills/` gate bodies + their generated/installed copies; spec 7 edits `README.md` + `SECURITY.md` only).
- **Wave 2: specs 2, 4** (after spec 1) — parallel-safe (disjoint per-skill files: spec 2 touches `joycraft-tune.md` + `src/execution-profile.ts` + init; spec 4 touches the output-rendering steps of interview/new-feature/design/bugfix/decompose).
- **Wave 3: specs 3 → 5 → 6** — NOT parallel-safe (overlap: `src/templates/REVIEW_GATE_TEMPLATE.html` contract comments and the same gate-skill render steps appear in specs 3, 5, and 6). Run sequentially.

Every skill-editing spec regenerates bundles + installed copies in its own commit (`pnpm sync-skills`) — no terminal sync spec; a final zero-drift check rides spec 6's ACs.

## Execution modes (recommendation — needs your OK)

CLAUDE.md has no `**Default execution mode:**` line, so the project default is `batch`. Recommended override by size and risk, consistent with succinct-gates:

| Spec | Size | Recommended mode |
|------|------|------------------|
| 1–7 (all) | S/M | `checkpoint` — atomic commit per spec via `joycraft-spec-done`, shared context |

Rationale: every spec is S/M; the sync-skills same-commit hazard makes per-spec commits valuable; nothing is heavy enough to warrant `isolated`.

## INVENTED review (Step 4.5)

Constraints/ACs that do not trace to D1–D9, the brief, or a design doc. Each needs approve / reword / drop before spec files are written:

- **I1 → specs 1, 2:** Question directives keep ≥2 real options and route free-text answers via Pattern B ("<choice> because <reason>"). Source: decision-log 2026-07-20, outside this brief. Proposed: approve as **D10**.
- **I2 → spec 3:** Every defer-to-person action confirms visibly in one line (who, which question, where recorded). Source: discovery 2026-07-20. Proposed: approve as **D11**.
- **I3 → spec 6:** The auto-open on/off setting persists in `docs/.joycraft/state.json` (where version state already lives). The brief says "persisted" but names no location. Proposed: approve as **D12**.
- **I4 → spec 6:** Revision marker = an integer in the rendered HTML's footer, incremented each re-render, no new state file. The brief says "revision banner" but names no mechanism. Proposed: approve as **D13**.

All other constraints traced to D1–D9 or named brief sections — no further INVENTED items.

## Review questions

1. Does this breakdown match how you think about this feature?
2. Are there any specs that feel too big or too small?
3. Should any of these run in parallel (separate worktrees)? Waves 1 and 2 are marked parallel-safe; wave 3 is not.

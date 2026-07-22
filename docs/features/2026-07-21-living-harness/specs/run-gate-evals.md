---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
mode: checkpoint
---

# Run Gate Evals — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-21-living-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-07-21
> **Estimated scope:** 1 session / fixtures + 1 report / ~9 subagent runs

---

## What

The S10 eval bar applied to this sprint's three machine-checkable gates: (1) decompose's provenance/decision gate, (2) session-end's ledger/reap graduation path, (3) optimize v2's disposition table. Each gate gets **N≥3 fresh-subagent runs** against controlled fixtures, graded from the subagent's **tool-call timeline** (what it actually did), never from its self-report. Failures loop back into skill fixes and re-runs until each gate passes 3 consecutive clean runs. Results land in `docs/features/2026-07-21-living-harness/evals.md`; surprises graduate to `docs/discoveries/`.

## Why

Skills changed to enforce gates are themselves unevaluated prose — without fresh-context evidence, "the gate works" is self-reported nominal (RF-KILL-3), exactly what this sprint exists to kill.

## Acceptance Criteria

- [ ] Fixtures exist (scratchpad or `evals-fixtures/` inside this feature folder, listed in the report): (a) a brief with one `status: open` decision + one untraceable constraint; (b) a fixture feature at `done` with queue, brief, and a fake PR ref; (c) this repo itself for optimize
- [ ] Gate 1 — decompose: N≥3 fresh subagent runs; PASS iff the timeline shows it refused to decompose over the open decision, and (with the decision clarified) flagged the untraceable constraint `[src: INVENTED]` in the table before writing any spec file
- [ ] Gate 2 — session-end graduation: N≥3 runs; PASS iff the timeline shows a prepended ledger row, D-id confirmation, `reap: eligible` stamped — and **no folder deletion**
- [ ] Gate 3 — optimize v2: N≥3 runs on this repo; PASS iff the emitted table covers material controls with a valid disposition + evidence label on every row, and nothing unchecked is labeled VERIFIED
- [ ] Grading is timeline-based: the grader (this session) reads the subagent's tool calls/diffs, not its summary prose
- [ ] Each failure → named skill fix → re-run; the report records every failed run and what changed (no silent retries)
- [ ] `evals.md` reports per-gate: runs, verdicts, failure modes, fixes applied — with the 4-field personal frontmatter schema
- [ ] Build passes (`pnpm typecheck`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Gate 1 refusal + INVENTED flag | Subagent run on fixture (a); grep timeline for absence of spec-file Writes pre-clarification, presence of INVENTED surfacing | e2e (subagent) |
| Gate 2 extract-don't-delete | Subagent run on fixture (b); assert shipped.md diff has the row, brief has marker, folder still exists | e2e (subagent) |
| Gate 3 table completeness | Subagent run; script-validate the emitted table's vocabulary columns | e2e (subagent) |
| No self-report grading | Report cites tool-call evidence per verdict | structural |
| Report exists | `evals.md` present with frontmatter + all three gates ×3 runs | structural |
| Suite green | `pnpm test --run && pnpm typecheck` | unit |

**Execution order:** build fixtures → confirm a deliberately broken fixture FAILS a run (harness sanity: the eval can detect failure) → run the 3×3 matrix → fix/re-run loop → write the report.

**Smoke test:** one Gate 1 run on fixture (a) with the open decision — fastest, binary refusal check.

**Before implementing, verify your test harness:**
1. Verify the eval can fail: run Gate 1 against a fixture with an open decision using a subagent told to skip the gate-bearing skill — the grader must catch it
2. Each run drives the actual installed skill in a fresh subagent context (no shared conversation state)
3. Smoke test is a single subagent run, minutes not hours

## Constraints

- MUST: fresh context per run — a subagent that saw a previous run's transcript is not a valid sample (Claude meta-gap: evals need naive readers)
- MUST: grade from the tool-call timeline; subagent self-reports are inadmissible (RF-KILL-3)
- MUST: run fixtures (a) and (b) against copies in a scratch location — eval runs must not dirty real repo docs; Gate 3 reads the real repo but writes nothing
- MUST: keep N≥3 per gate after the final fix (fix resets the count for that gate)
- MUST NOT: eval the advisory-only surfaces (retrieval pass, confidence scoring, harden proposals) — scoped to the three destructive/gate-breaking paths (resolved design decision)
- MUST NOT: touch `src/` or `templates/`

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `docs/features/2026-07-21-living-harness/evals.md` | Per-gate runs, verdicts, fixes |
| Create | fixtures (scratch or `evals-fixtures/`) | Controlled inputs for Gates 1–2 |
| Edit | gate-bearing SKILL.md files (only on failure) | Fixes discovered by failed runs |

## Approach

Use the Task/Agent mechanism to spawn each run with only the fixture path and the skill invocation — the subagent never sees this spec or prior runs (mirrors `joycraft-research`'s isolation pattern). Grade against a per-gate checklist derived from each gate's PROTOCOL steps. Rejected alternative: embedding each gate's eval in its own spec's test plan — the authoring session grading its own skill is self-certification, and fresh-context behavior is the thing being measured.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| A run is ambiguous (gate held but via an unexpected path) | Count as fail-for-analysis; tighten the skill's PROTOCOL wording, re-run |
| Gate passes 2/3 | Fix, then restart that gate's count — 3 consecutive clean runs required |
| Subagent can't run `gh` against the fake PR (Gate 2 fixture) | Expected — Gate 2 evaluates session-end (no `gh` needed); the Reaper's `gh` path is exercised only as "skips when unverifiable" |
| Eval reveals a design flaw, not a wording bug | Stop; surface to the human — that's a brief-level decision, not an eval-loop fix |

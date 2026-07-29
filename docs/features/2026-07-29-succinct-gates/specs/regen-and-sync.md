---
status: done
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
mode: checkpoint
---

# Regenerate Bundles and Sync Installed — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-29-succinct-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-29
> **Estimated scope:** 1 session / generated trees + installed copies / 1 commit

---

## What

Terminal spec. Run the generator and the sync so every change from specs 1–5
and 7 propagates: `node scripts/generate-bundled-files.mjs` refreshes
`src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`,
`src/copilot-skills/` and the bundled-files registry (including the new
`REVIEW_GATE_TEMPLATE.html` entry), then `pnpm sync-skills` refreshes the
installed trees (`.claude/`, `.agents/`, `.pi/`, `.github/`). Commit
everything in ONE commit.

## Why

The 0.7.3 incident: twelve Copilot skills shipped stale because generation
and sync were split from the source edits. A stale installed tree also means
the windowed tests never see specs 2–4's edits — this spec is where any
placement mistake surfaces.

## Acceptance Criteria

- [ ] Generated trees byte-match their sources per the parity tests.
- [ ] Installed copies byte-match per the installed-copy test.
- [ ] The windowed tests (`retrieval-pass-skill`, `confidence-scoring-skill`)
  are green against the freshly synced installed copies.
- [ ] `pnpm test && pnpm typecheck` fully green.
- [ ] One commit contains all regenerated + synced files.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Parity + byte-match | existing suites, unmodified | integration |
| Windowed tests green | existing suites, unmodified | integration |
| Single commit | `git show --stat` review | manual |

**Execution order:**
1. `pnpm test` (green precondition), then generate, then sync
2. `pnpm test && pnpm typecheck`
3. If a windowed test goes red: fix placement in `src/skills/`, re-run
   generate + sync — NEVER widen a window or edit an assertion
4. Commit

**Smoke test:** the parity test file alone via vitest filter.

**Before implementing, verify your test harness:**
1. Confirm specs 1–5 are all in-review or done — this spec derives from all
   of them
2. Confirm working tree is clean apart from expected generated churn
3. Smoke test runs in seconds

## Constraints

- MUST: run generator before sync (sync copies generated output).
- MUST: single commit — reviewable generated-file churn in one place.
- MUST NOT: hand-edit anything under the generated or installed trees.
- MUST NOT: run in parallel with any other spec.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Regenerate | `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/copilot-skills/`, bundled-files registry | derived from specs 1–4 |
| Sync | `.claude/`, `.agents/`, `.pi/`, `.github/` skill trees | installed copies |

## Approach

Mechanical. The only judgment call is the red-windowed-test loop in step 3 of
the execution order, and its resolution rule is fixed: relocate in source,
regenerate.

Rejected alternative: folding regeneration into each preceding spec —
rejected (as in the prior feature) because it splits generated churn across
five commits and hides the real diff.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Windowed test red after sync | fix source placement, regenerate — assertion edits are forbidden |
| CRLF differences on generated Copilot tree | the generator owns line endings (0.7.5 machinery); do not hand-normalize |

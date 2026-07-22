---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
mode: isolated
---

# Build Ledger Lifecycle — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-21-living-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-07-21
> **Estimated scope:** 1 session / 4 files / ~150 lines

---

## What

The extraction half of S5 plus S4's one-home enforcement. `joycraft-session-end`, when a feature graduates to `done`: writes the prepended ledger row to `docs/context/shipped.md`, confirms the feature's decision rows landed in the decision-log, and marks the feature folder **reap-eligible** (frontmatter `reap: eligible` on the brief) — it never deletes (D1). Both `joycraft-add-fact` and `joycraft-session-end` gain a write-time overlap check (grep for an existing home; overlap → update in place, never a near-duplicate). A new `docs/reference/knowledge-lifecycle.md` documents the refresh lifecycle (Keep / Update / Consolidate / Replace / Delete, deletion gated by an inbound-link grep, contradictions surfaced) and the 200-line rotation procedure: over-budget live-head docs rotate oldest rows to numbered shards (`shipped-001.md`, …) with a pointer-only JSON manifest created at first rotation (D2).

## Why

Session lessons and shipped-work records currently evaporate (squash merges destroy branch history — the ledger row is what survives), and captures with no overlap check keep minting near-duplicate versions of the truth.

## Acceptance Criteria

- [ ] Session-end's `done`-graduation path (PROTOCOL): prepend one ledger row `| Date | Feature | What shipped | Where (paths) | PR | Owner |` to shipped.md → grep decision-log for the feature's D-ids and report which landed/missing → set `reap: eligible` in the brief's frontmatter — and explicitly does NOT delete the folder (D1)
- [ ] Ledger rows are factual and thin — when/what/who/where/PR; narrative belongs in decision-log or discoveries (brief constraint)
- [ ] Rotation procedure (in the reference doc, invoked from add-fact and session-end): after prepending, if the live-head doc exceeds 200 lines, move oldest rows to the next numbered shard and create/update the pointer-only JSON manifest (`docs/context/shipped-manifest.json` pattern; same mechanism for decision-log); never silent truncation
- [ ] Overlap check (PROTOCOL) in add-fact and session-end: before creating any new discovery/context file or row, grep the knowledge layer for an existing home; on overlap, update the existing doc in place and say so
- [ ] `docs/reference/knowledge-lifecycle.md` defines Keep / Update / Consolidate / Replace / Delete; Delete requires an inbound-link grep (`grep -r` for the filename/slug across `docs/` and `.claude/`) coming back empty; contradictions between docs are surfaced to the human, never silently resolved
- [ ] Skill edits carry the PILOT divergence marker
- [ ] Build passes (`pnpm typecheck`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Graduation path complete | grep session-end SKILL.md for ledger-row prepend, D-id confirmation, `reap: eligible`, and an explicit "never deletes" statement | structural |
| Rotation documented + wired | grep knowledge-lifecycle.md for `200`, numbered-shard naming, manifest; grep add-fact + session-end for references to the rotation procedure | structural |
| Overlap check present | grep add-fact + session-end for the grep-before-write instruction | structural |
| Lifecycle verbs + deletion gate | grep knowledge-lifecycle.md for all five verbs and `inbound` | structural |
| Behavioral (ledger path) | Fresh-subagent eval — fixture `done` feature → row prepended, marker set, folder intact — in spec `run-gate-evals` | integration |
| Suite green | `pnpm test --run && pnpm typecheck` | unit |

**Execution order:** grep assertions first (red), write the reference doc, edit the two skills (green).

**Smoke test:** `grep -l 'reap: eligible' .claude/skills/joycraft-session-end/SKILL.md`.

**Before implementing, verify your test harness:**
1. Run all checks — they must FAIL against the current tree
2. Checks inspect the installed skills and real docs
3. Smoke test runs in seconds

## Constraints

- MUST: session-end only marks — deletion is exclusively the Reaper's (spec `add-reaper-pass`); deletion never outruns review (D1)
- MUST: prepend (newest-first) for both ledger and decision-log writes (D7)
- MUST: create the JSON manifest only at first rotation — not preemptively (D2: "created mechanically at first rotation")
- MUST: keep every layer-2 write grep-addressable — one-line keyed rows, stable vocabulary (brief: built for retrieval, not reading)
- MUST NOT: touch `src/` or `templates/` (pilot pattern)
- MUST NOT: write a ledger row for a feature that isn't `status: done` (only done features are extraction-eligible)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `.claude/skills/joycraft-session-end/SKILL.md` | Graduation path: ledger row + D-id check + reap marker; overlap check |
| Edit | `.claude/skills/joycraft-add-fact/SKILL.md` | Overlap check; rotation reference |
| Create | `docs/reference/knowledge-lifecycle.md` | Five-verb lifecycle, deletion gate, rotation procedure |
| Edit | `docs/context/shipped.md` | First real ledger rows land here at runtime (no change in this spec beyond what substrate created) |

## Approach

The graduation path extends session-end's existing wrap-up (it already graduates queue statuses to `done`); the ledger row is derived from the queue + PR it just opened/found. The reap marker is brief frontmatter because it's greppable, reviewable in the PR diff, and travels with the folder. Rotation lives once in the reference doc, referenced from both writers (one-home for the procedure itself). Rejected alternative: session-end deletes immediately when it can verify the merge itself (design §5 Q-D1 Option B) — session-end usually runs *before* merge since it opens the PR, so that path mostly no-ops and you'd maintain two deletion code paths.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Feature done but decision rows missing from the log | Report which D-ids are missing; write them (prepend) before marking reap-eligible |
| shipped.md at exactly 200 lines | Not over budget — rotate only at >200 |
| First-ever rotation | Create shard + manifest in the same change; manifest is pointer-only (no row duplication) |
| Overlap check finds two candidate homes | Surface the contradiction to the human (lifecycle: Consolidate candidate), don't pick silently |
| Feature never had a dossier/decisions | Ledger row still written; D-id confirmation step reports "no stamped decisions" |

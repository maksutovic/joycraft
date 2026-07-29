---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
---

# Discoveries — test suite regenerates bundles, so "spec 6 owns regen/sync" cannot hold

**Date:** 2026-07-29
**Spec:** docs/features/2026-07-29-succinct-gates/specs/inline-gate-slot-contracts.md (first hit; the same constraint failed identically in handoff-briefing-prompts, enforce-decide-pre-presentation, capture-execution-profile, and inject-profile-into-briefings)

## Deferring regen/sync to a terminal spec is unachievable
**Expected:** Skill-editing specs touch `src/skills/` only; terminal spec 6 (`regen-and-sync.md`) runs the generator and `pnpm sync-skills` once at the end. Each spec carried a "MUST NOT regenerate bundles or sync installed copies — spec 6 owns both" constraint.
**Actual:** `tests/regenerate-bundled-files.test.ts` executes `scripts/generate-bundled-files.mjs` in a `beforeAll`, so any edit to `src/skills/` regenerates `src/*-skills/` on the next `pnpm test` and turns `installed-skills-sync` + `decompose-modes` red (12–30 failures depending on the edit) until `pnpm sync-skills` runs. Honoring the constraint means committing a red suite — and spec 6 lists a green suite as its own precondition, making the two mutually blocking. Every skill-editing spec ran the sanctioned sync in its own commit; spec 6 landed as a verified zero-drift no-op.
**Impact:** Decompositions must never write "defer regen/sync to a terminal spec" constraints — regen+sync belongs in the same commit as any `src/skills/` edit, exactly as AGENTS.md already mandates. A terminal sync spec remains useful only as a zero-drift verification gate. Upside observed: the position-fragile windowed suites (`retrieval-pass-skill`, `confidence-scoring-skill`) verified placement against fresh installed copies immediately, instead of deferring that risk to the end of the queue.

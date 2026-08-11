---
status: done
owner: Maximilian Maksutovic
created: 2026-08-11
feature: 2026-08-11-ste-human-output
mode: checkpoint
---

# Restore Interview Playback Pointer — Atomic Spec

> **Parent Brief:** `docs/features/2026-08-11-ste-human-output/brief.md`
> **Status:** Ready
> **Date:** 2026-08-11
> **Estimated scope:** 1 session / ~10 files (1 canonical + generated/installed copies) / ~5 lines

---

## What

Add a one-line style-contract citation at `joycraft-interview`'s playback gate. The succinct-gates in-review spec replaced the playback step's `output-style.md` pointer with an inline fixed-slot template (per-slot caps); the Hand Off step (`src/skills/joycraft-interview.md:268`) still cites the doc, but the playback gate (~`:95-105`) does not. This spec adds one sentence beside the playback template's per-slot caps: tone/sentence mechanics follow `docs/templates/reference/output-style.md`; volume and placement stay fixed by the inline template. The edit lands in the canonical skill (`src/skills/joycraft-interview.md`) and ships with bundle regeneration and generated/installed-copy sync in the same commit.

## Why

With D4 governing dialogue, interview playback is governed output, but it is the one output moment with no delivery pointer to the contract — the obligation exists without the delivery.

## Acceptance Criteria

- [ ] The playback gate section of `src/skills/joycraft-interview.md` carries a one-line citation of `docs/templates/reference/output-style.md` beside the per-slot caps [src: D6]
- [ ] The per-slot caps and the playback template structure are unchanged — the citation covers tone/mechanics only, volume and placement stay with the inline template [src: D6]
- [ ] Bundle regenerated and generated + installed skill copies synced in the same commit [src: D6]
- [ ] `tests/output-style-pointer.test.ts` passes, including its placement assertions [src: design §1]
- [ ] `tests/gate-contract.test.ts` passes unchanged [src: design §1]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Citation at the playback gate | extend `tests/output-style-pointer.test.ts`: interview's citation set includes one anchored under the playback heading | unit |
| Caps/template untouched | `tests/gate-contract.test.ts` (existing, unmodified) stays green | unit |
| Copies in sync | `tests/bundled-files-sync.test.ts` + generated-tree checks stay green | unit |
| Build passes | `pnpm build` + `pnpm typecheck` | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `pnpm test tests/output-style-pointer.test.ts`

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST add exactly one citation line at the playback gate, beside the per-slot caps [src: D6]
- MUST edit only the canonical `src/skills/joycraft-interview.md` by hand — generated trees come from `pnpm sync-skills` [src: D6]
- MUST run `pnpm sync-skills` and commit the regenerated + installed copies in the same commit [src: D6]
- MUST NOT alter the per-slot caps, the playback template's slot structure, or its blocking-gate semantics [src: D6]
- MUST NOT edit any other skill body [src: D1]
- MUST NOT cite the `src/templates/...` path — skills cite the installed `docs/templates/...` path only [src: design §1]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-interview.md` | One citation line at the playback gate |
| Modify | `tests/output-style-pointer.test.ts` | Placement assertion for the playback-gate citation |
| Regenerate | `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/copilot-skills/` (interview file) | Via `pnpm sync-skills` |
| Regenerate | `src/bundled-files.ts` | Refreshed embedded copies |
| Sync | `.claude/`, `.agents/`, `.pi/`, `.github/` installed interview skills | Via `pnpm sync-skills` |

## Approach

Locate the playback gate section (the blocking-gate paragraph around `src/skills/joycraft-interview.md:95-105`) and add one sentence mirroring the Hand Off step's existing formula ("Tone follows the style contract in `docs/templates/reference/output-style.md`; volume and placement are fixed by the template itself") so the two output moments read identically. Extend the pointer test's placement expectations for interview. Regenerate, sync, commit once. Rejected alternative: deferring the repair to the succinct-gates queue — the human rejected that at the decompose gate (D6); with D4 covering dialogue, the delivery pointer must exist wherever the obligation does.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| The succinct-gates in-review interview specs are revised before this spec runs | Coordinate: re-read the current playback section first and place the citation against the file as it now is — never against this spec's quoted line numbers |
| The playback section heading changed and the placement regex misses it | Anchor the test assertion to the heading that actually exists; the citation must sit under interview's real playback heading, not a remembered one |
| Merge conflict with the succinct-gates branch on this file | Surface it — do not silently resolve; two features own edits to one file by explicit human choice (D6) |

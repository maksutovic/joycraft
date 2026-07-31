---
status: done
owner: Maximilian Maksutovic
created: 2026-07-31
feature: 2026-07-31-team-ready-gates
mode: batch
---

# Fix Model Question Skip — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-31-team-ready-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-31
> **Estimated scope:** 1 session / 2 canonical files + regenerated trees / ~60 lines

---

## What

The execution-profile offer in `src/skills/joycraft-tune.md` (currently one prose block at line ~97 bundling four questions: swarm-decompose y/n, swarm-implement y/n, model, effort) is restructured so the model and effort questions cannot be silently dropped: the swarm y/n pair and the model/effort pair become explicitly enumerated question steps routed through the question directive from `harden-question-directive`, with the free-text model/effort answers requested via the Pattern B free-text row. The interactive init flow in `src/execution-profile.ts` is checked against the same contract (it already prompts model/effort via readline; verify and cover with a test rather than rewrite).

## Why

A real user (Praful, 2026-07-31) ran tune, answered the swarm questions, and was never asked model/effort — the bundled prose block lets the model reformat and drop the free-text questions, so profiles land with defaults nobody chose.

## Acceptance Criteria

- [ ] The skip is reproduced (or the mechanism documented from the skill text) before the fix, and the failure shape recorded in a discovery note `[src: D5]`
- [ ] The execution-profile offer in `joycraft-tune.md` asks model and effort as explicit, separately enumerated questions wherever it asks the swarm questions — never as trailing clauses of one prose block `[src: D5]`
- [ ] Model/effort questions follow the question directive: ≥2 real options (e.g. "session default" + free-text), free-text routed as `"<choice> because <reason>"` where rationale matters, plain free-text for the model/effort values `[src: D10]`
- [ ] Interactive `init`'s model/effort prompts in `src/execution-profile.ts` are covered by a test asserting they are always asked when the swarm questions are asked `[src: D5]`
- [ ] `pnpm sync-skills` run; regenerated + installed copies committed in the same commit `[src: brief "Hard Constraints"]`
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Skill asks model/effort as enumerated questions | `tests/gate-contract.test.ts`: assert the tune claude-variant's profile offer contains distinct numbered/bulleted question lines for model and effort, not the old single-sentence bundle | unit |
| Directive routing | assert the profile-offer region references the question directive / AskUserQuestion in the claude variant | unit |
| init always asks model/effort with swarm questions | unit test on the interactive ask flow in `src/execution-profile.ts` (stub readline; assert the model and effort prompts fire whenever swarm prompts fire) | unit |
| No regression in profile output shape | existing `execution-profile` serialization tests stay green (sentinel section format unchanged) | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `pnpm test tests/gate-contract.test.ts` — seconds.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: keep model and effort as free text with the session default suggested; never present a menu of model names `[src: brief "Out of Scope"]`
- MUST NOT: add model/tier recommendations or routing policy — the profile stays data only; model-tiering is backlogged `[src: brief "Out of Scope"]`
- MUST NOT: change the sentinel-delimited `## Execution Profile` section format or overwrite existing profiles `[src: brief "Hard Constraints"]`
- MUST: run `pnpm sync-skills` and commit regenerated + installed copies in this spec's own commit `[src: brief "Hard Constraints"]`

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-tune.md` | profile offer restructured into enumerated question steps |
| Modify | `src/execution-profile.ts` | only if the ask flow needs the guarantee; otherwise test-only |
| Add/Modify | `tests/execution-profile.test.ts` (or existing home) | interactive-ask coverage |
| Modify | `tests/gate-contract.test.ts` | profile-offer shape assertions |
| Modify | generated trees + installed copies | regenerated via `pnpm sync-skills` |
| Add | `docs/discoveries/2026-07-31-model-question-skip.md` | reproduction/mechanism record |

## Approach

Reproduce first: read the current block and (if cheap) drive one tune run to observe the drop; record the mechanism. Then split the offer into an explicit question sequence — Q1 swarm decompose, Q2 swarm implement, Q3 model (free text, session default suggested), Q4 effort (free text) — each carried by the question directive so the picker renders them individually on Claude Code. The free-text row is the intended path for Q3/Q4 (Pattern B mechanics: the value is typed, not picked). Rejected alternative: moving the whole offer into TypeScript (init-style readline) — tune runs inside a conversation, not the CLI, so skill prose is the only channel there.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User answers swarm questions "no" to everything | Model/effort still asked (or explicitly skipped with the SESSION_DEFAULT sentinel written) — the section always lands with explicit values |
| Non-interactive init | `SESSION_DEFAULT` written for model/effort, unchanged from today |
| Existing profile present | Offer never fires (sentinel found); nothing overwritten |
| User types a bare model name with no reason | Accept it — rationale is optional for a value question; Pattern B's "because" applies only where rationale matters |

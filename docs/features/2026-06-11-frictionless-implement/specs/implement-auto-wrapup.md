---
status: todo
owner: Maximilian Maksutovic
created: 2026-06-11
feature: 2026-06-11-frictionless-implement
mode: batch
---

# Implement Auto Wrap-Up — Atomic Spec

> **Parent Brief:** `docs/features/2026-06-11-frictionless-implement/brief.md`
> **Status:** Ready
> **Date:** 2026-06-11
> **Estimated scope:** 1 session / 4 files / ~80 lines of skill text

---

## What

`joycraft-implement`'s hand-off step stops delegating the per-spec wrap-up to the human. In `checkpoint`/`isolated` mode the agent performs `joycraft-spec-done`'s four steps itself (status bump in both systems, terse discovery stub if surprised, commit, stop). In `batch`/`checkpoint` mode the agent then re-reads the spec queue, picks the next ready spec, and continues in the same conversation without asking. After the feature's last spec (any mode) the agent runs `joycraft-session-end` itself.

## Why

Today every spec costs the user two zero-information interactions: "run /joycraft-spec-done" and pasting the next spec's file path — overhead the queue JSON already makes unnecessary.

## Acceptance Criteria

- [ ] All three `joycraft-implement` variants (claude/codex/pi) instruct the agent to **perform** the spec-done steps itself in `checkpoint` and `isolated` modes (no "tell the human to run spec-done")
- [ ] All three variants instruct the agent to **continue to the next ready spec** (re-read `.joycraft-spec-queue.json`, same readiness rule as Step 1) in `batch` and `checkpoint` modes, and to run `joycraft-session-end` itself after the feature's last spec
- [ ] The `isolated` interactive path still hands fresh-context creation to the human (`/clear` + re-invoke) or points at the driver/Pi loop — context cannot be cleared from inside a conversation
- [ ] `joycraft-spec-done` (all three variants) gains a note that `joycraft-implement` performs these steps automatically; the standalone skill remains for the Pi loop and manual use
- [ ] The headless ToS/cost caveat block is preserved verbatim in all variants
- [ ] Build passes, tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Wrap-up performed by agent | grep variants for the new wrap-up instruction; assert "run /joycraft-spec-done" human-handoff phrasing is gone from checkpoint/isolated rows | content |
| Auto-continue | grep variants for queue re-read + continue instruction | content |
| Caveat preserved | existing parity/content tests still pass | unit |

**Execution order:** content edits, then `node scripts/generate-bundled-files.mjs` (spec 4 validates), then `pnpm test --run`.

**Smoke test:** `pnpm vitest run tests/codex-skill-parity.test.ts`

## Constraints

- MUST keep the three status words `todo → in-review → done` and the "agent never self-certifies" rule — implement bumps only to `in-review`
- MUST keep session-end as the only validation gate (spec-done steps stay validation-free)
- MUST NOT remove or soften the headless ToS/cost caveat
- MUST keep each variant's invocation vocabulary (`/joycraft-*` vs `$joycraft-*` vs `/skill:joycraft-*`)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/claude-skills/joycraft-implement.md` | Step 6 rewrite: perform wrap-up, auto-continue, auto session-end |
| Modify | `src/codex-skills/joycraft-implement.md` | Step 5 rewrite, same semantics |
| Modify | `src/pi-skills/joycraft-implement.md` | Step 5 rewrite, same semantics (loop-iteration case unchanged) |
| Modify | `src/{claude,codex,pi}-skills/joycraft-spec-done.md` | note: implement runs this automatically |

## Approach

Rewrite the mode table so checkpoint/isolated say "perform the wrap-up now (the four spec-done steps)" and batch/checkpoint end with "find the next ready spec in the queue and continue — do not wait for the human." Rejected alternative: having implement invoke the spec-done *skill* — skill-invocation support differs per harness; inlining the four steps (with a pointer to the skill as the canonical definition) is robust everywhere.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Spec was invoked as a bare file path with no queue present | Wrap up the spec; report there is no queue to continue from and stop |
| Remaining todos all blocked by unmet deps | Stop and report which specs are blocked (mirrors `joycraft-next-spec`) |
| Implement invoked mid-loop by Pi (`pi -p`) | Wrap up only; the loop advances — do not self-continue (double-advance) |

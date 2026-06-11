---
status: in-review
owner: Maximilian Maksutovic
created: 2026-06-11
feature: 2026-06-11-frictionless-implement
mode: batch
---

# Implement-Feature Driver Skill — Atomic Spec

> **Parent Brief:** `docs/features/2026-06-11-frictionless-implement/brief.md`
> **Status:** Ready
> **Date:** 2026-06-11
> **Estimated scope:** 1 session / 3 new files / ~120 lines each

---

## What

A new skill, `joycraft-implement-feature`, that runs a feature's entire spec queue from one invocation: `/joycraft-implement-feature docs/features/<slug>/`. Per harness:

- **Claude Code:** loop — find next ready spec → spawn a **fresh-context subagent** that reads `.claude/skills/joycraft-implement/SKILL.md` and `.claude/skills/joycraft-spec-done/SKILL.md` and executes the single spec end-to-end (TDD + wrap-up + commit) → verify the spec reached `in-review` → repeat. Queue dry → run `joycraft-session-end` in the driver conversation. Fail-fast: a failing spec stops the loop with the spec named and the queue intact.
- **Codex:** same loop sequentially in-conversation (no subagent isolation); recommend the driver mainly for batch/checkpoint-mode queues, point heavy isolated queues at Pi or guided-manual.
- **Pi:** delegate to the existing `.pi/scripts/joycraft/joycraft-implement-loop` — invoke it, do not reimplement the loop.

## Why

Pi is the only harness with a whole-queue entry point; on Claude Code the subagent boundary already provides fresh context per spec inside one interactive session — no headless loop, no ToS/cost caveat — but no skill exploits it.

## Acceptance Criteria

- [ ] `joycraft-implement-feature.md` exists in all three skill source dirs with the harness-appropriate loop described above
- [ ] Claude variant: subagent-per-spec, sequential default; parallel subagents only for waves the specs README marks parallel-safe, and only when the user opts in
- [ ] Claude variant: after each subagent, the driver verifies the spec's queue status is `in-review` and a `spec:` commit exists before advancing (trust but verify)
- [ ] Fail-fast semantics: failing spec → stop, name the spec, report what remains; never mark anything `done`
- [ ] All variants: queue dry → `joycraft-session-end` exactly once; ToS note states this is in-session interactive use, distinct from headless loops
- [ ] Build passes, tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Skill present ×3 | parity test includes the new skill in all three sets | unit |
| Loop semantics | grep for subagent instruction (claude), delegation to implement-loop (pi) | content |

**Execution order:** write the three variants, regenerate bundle (spec 4), run parity tests.

**Smoke test:** `pnpm vitest run tests/codex-skill-parity.test.ts`

## Constraints

- MUST be self-contained (installed skills cannot import other files; referencing other *installed* skill paths in the project is fine)
- MUST NOT auto-run `claude -p` / `codex exec` headless loops; the caveat language from `joycraft-implement` carries over
- MUST keep the driver thin: orchestration only — TDD rules live in `joycraft-implement`, wrap-up rules in `joycraft-spec-done`, finishing in `joycraft-session-end`
- Pi variant MUST NOT duplicate loop logic that lives in the script

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/claude-skills/joycraft-implement-feature.md` | subagent-per-spec driver |
| Create | `src/codex-skills/joycraft-implement-feature.md` | sequential-chain driver |
| Create | `src/pi-skills/joycraft-implement-feature.md` | delegate to joycraft-implement-loop |

## Approach

The Claude subagent prompt is fully specified in the skill (spec path, instruction to read + follow the two installed SKILL.md files, report format) so a fresh subagent needs zero conversation context — same isolation property the Pi loop gets from the process boundary. Rejected alternative: driver implements specs inline in its own context — defeats isolation and bloats the driver conversation, exactly what batch mode already does.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No queue JSON in the target dir | Stop: suggest `/joycraft-decompose` first |
| All specs already `in-review`/`done` | Skip to session-end (report nothing to implement) |
| Subagent finishes but status still `todo` | Treat as failure: stop and report (never silently re-run) |
| User asks for parallelism on a wave not marked parallel-safe | Decline with the reason; run sequentially |

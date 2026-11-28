---
id: 4
status: todo
---
# The Stop hook lets the agent stop when only the user can act, and skips the worktree listing

Parent: [brief](../brief.md), section `stop-hook`.

## acceptance

- Person-only: with stdin `{"stop_hook_active": true}` and only failures whose step is "stop and tell the user" (a legacy acceptance with a missing decision file; a pending-journal conflict), `gate.mjs check` exits 0 and prints those failures once for the user. Check: `tests/runtime-stop-hook.test.ts` `[AC:spec-4-1]`.
- Agent-fixable: with `stop_hook_active: true` and a failure the agent can fix, it still exits 2, as today. Check: `tests/runtime-stop-hook.test.ts` `[AC:spec-4-2]`.
- First stop: with `stop_hook_active` false, behaviour is unchanged for both kinds. Check: `tests/runtime-stop-hook.test.ts` `[AC:spec-4-3]`.
- No listing: `checkGates` does not call the worktree listing (`worktreeCounts` / `listWorktrees`); status output for `status.mjs` itself is unchanged. Check: `tests/runtime-stop-hook.test.ts` `[AC:spec-4-4]`.

## Test changes

- `tests/runtime-stop-hook.test.ts` class 1: new file.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- `gate.mjs:325` sets exit 2 for any failure; `:335` appends "do not ask the user again", which contradicts `:74`. Mark each failure kind as person-only or agent-fixable. `gate.mjs:41` calls `projectStatus`; add an option that skips worktree counts and use it from the gate. Decision-log 2026-11-16 (`[AC:gates-block-stop]`) keeps the block for agent-fixable failures.
- Files: `payload/.joycraft/runtime/gate.mjs`, `payload/.joycraft/runtime/status.mjs`. Edit `payload/`, then run `node scripts/pin-payload.mjs`; check `tests/payload-guard.test.ts` word caps.
- Tests: `tests/runtime-stop-hook.test.ts`. Run the recorded gate once, before review.

---
id: 1
status: done
---
# Worker trees start from the coordinator's tree, and prune works from a linked coordinator

Parent: [brief](../brief.md), section `linked-coordinator`.

## acceptance

- Base: a coordinator in a linked worktree whose HEAD is one commit ahead of main runs `worktrees.mjs create` for a spec; the recorded `baseRevision` and the worker tree HEAD equal the coordinator's HEAD, not main's. Check: `tests/runtime-dispatch-parallel.test.ts` `[AC:spec-1-1]`.
- Queue on the branch only: the same setup where the queue file exists only on the coordinator's branch; `create` succeeds (today it fails with ENOENT under the main checkout). Check: `tests/runtime-dispatch-parallel.test.ts` `[AC:spec-1-2]`.
- Prune: from that coordinator, `prune` (with no `--into`) removes a worker tree whose spec is `done` in the coordinator's queue and whose commits are reachable from the coordinator's HEAD; a tree whose spec is not done is kept. Check: `tests/runtime-dispatch-parallel.test.ts` `[AC:spec-1-3]`.
- Unchanged: a coordinator in the main checkout behaves as today (existing tests pass unchanged). Check: `tests/runtime-dispatch-parallel.test.ts` `[AC:spec-1-4]`.

## Test changes

- `tests/runtime-dispatch-parallel.test.ts` class 1: acceptance bullets 1–3 add cases with the coordinator ahead of main.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- `worktrees.mjs` sets `root = main` before resolving `base`, `into` and the queue path (`:65`, `:75`, `:173`, and the prune status read). Resolve base/into to SHAs and read the queue from the coordinator's tree (`here`) first, then create/list under the main checkout. `close.mjs:354` calls `pruneWorktrees({ root, apply: true })`: check it passes the coordinator root.
- Files: `payload/.joycraft/runtime/worktrees.mjs`, `payload/.joycraft/runtime/close.mjs`. Edit `payload/`, then run `node scripts/pin-payload.mjs`; check `tests/payload-guard.test.ts` word caps.
- Tests: `tests/runtime-dispatch-parallel.test.ts`. Run the recorded gate once, before review.

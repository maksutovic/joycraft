---
id: 10
status: done
---
# Startup in a linked worktree pins the coordinator tree's install, not the main checkout's

Parent: [brief](../brief.md), section `triage`. Fix spec for a defect found on 2026-11-28 while running this queue on the 1.10.2 install. The defect is inside the brief's intent: a queue must run to its end without the owner. Implementer startup in a linked worktree (`worktrees/joycraft-review-followups`) stopped with `ENOENT … projects/joycraft/.joycraft/installation.json`. The default `--expected-manifest` was the main checkout's install, and the main checkout was on an older branch with no install.

## acceptance

- Linked worktree: `startupDefaults` in `payload/.joycraft/runtime/dispatch-start.mjs` sets the expected manifest to the coordinator tree's `.joycraft/installation.json`. That tree is this tree's `worktrees.mjs` record, else the queue lease's `root`, else this tree. It is never the main checkout by default. On a claimed queue in a linked worktree whose main checkout has no install, implementer startup succeeds with `ready: true`. With no lease and no record, the default is the tree's own manifest. Check: `tests/runtime-dispatch-commands.test.ts` `[AC:spec-10-1]`.
- Text: the `--help` default line reads "--expected-manifest: .joycraft/installation.json in the coordinator's tree (this tree's worktrees.mjs record, else the lease), else this folder." `payload/.joycraft/references/dispatch.md` says the default is the coordinator tree's copy. Every-spec words stay under their caps. Check: `tests/runtime-dispatch-commands.test.ts` `[AC:sl2-06a-help]` (its expected line changes to this one) and `[AC:sl2-06a-defaults]`, and `tests/text-worker-commands.test.ts` `[AC:sl3-07-words]` unchanged.

## Test changes

- `tests/runtime-dispatch-commands.test.ts` class 1: acceptance bullet 1 adds the `[AC:spec-10-1]` case and imports `basename`.
- `tests/runtime-dispatch-commands.test.ts` class 1: acceptance bullet 2 changes the `[AC:sl2-06a-help]` expected `--expected-manifest` line to the new text it states.

## Not covered

Anything in the brief's Scope and limits. Where the coordinator lease and the worktree ledger live (the main checkout's `.joycraft/local/`), which is unchanged.

## Implementation and verification scope

- Files: `payload/.joycraft/runtime/dispatch-start.mjs`, `payload/.joycraft/references/dispatch.md`, `payload/PIN`, `CHANGELOG.md` (the 1.10.2 entry's line for this change), `tests/runtime-dispatch-commands.test.ts`, `tests/text-worker-commands.test.ts`. Edit `payload/`, then run `node scripts/pin-payload.mjs`.
- Tests: `tests/runtime-dispatch-commands.test.ts`, `tests/text-worker-commands.test.ts`. Run the recorded gate once, before review.

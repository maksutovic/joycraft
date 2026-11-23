---
id: 1
status: in-review
---
# A parallel implementer starts without hand-added workspace flags

Parent: [brief](../brief.md), section `workspace`.

## acceptance

- Derived workspace: for an implementer startup of a spec with `execution.parallel: true` and no `--coordinator`, `--parallel` or `--access`, `dispatch-start.mjs` uses the coordinator root from this tree's `worktrees.mjs` ledger entry (`coordinatorRoot`, new, relative to the main checkout), else from the queue's coordinator lease `root`, with `parallel: true` and `access: mutating`. `worktrees.mjs create` records `coordinatorRoot` (the tree it ran from, which may be a linked tree) and prints `workerRoot` and a `next` line that says to launch the worker without host worktree isolation. In a fixture queue with two parallel specs, both specs start ready from their trees with only `--coordinator-session` added, for a coordinator in the main checkout and in a linked tree. Check: `tests/runtime-dispatch-parallel.test.ts` `[AC:spec-1-1]`.
- Lease fallback and explicit flags: a linked tree with no ledger entry takes the lease root; explicit flags are used as given. Check: `[AC:spec-1-2]`.
- Exact refusal: with neither a ledger entry nor a lease, startup exits 1 with a reason naming the spec and prints, as its last line, the same startup with `--coordinator '<coordinator-root>' --parallel true --access mutating` added; with the root filled in, that command starts. `dispatch-preflight.mjs`'s own refusal names the flags too. Check: `[AC:spec-1-3]`.

## Test changes

- `tests/runtime-dispatch-parallel.test.ts` class 1: new file. No existing test file builds a parallel queue with worker trees; the closest, `tests/runtime-dispatch-commands.test.ts`, has a serial one-spec fixture.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

- Startup does not derive `--base-revision` from the ledger: a restarted implementer's `HEAD` has moved past the base.

## Implementation and verification scope

- Files: `payload/.joycraft/runtime/dispatch-start.mjs`, `payload/.joycraft/runtime/worktrees.mjs`, `payload/.joycraft/runtime/dispatch-preflight.mjs` (refusal text only), `tests/runtime-dispatch-parallel.test.ts`.
- Tests: `tests/runtime-dispatch-parallel.test.ts`. Run the recorded gate once, before review.

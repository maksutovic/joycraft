---
id: 11
status: done
---
# A test tells the three sources of the expected-manifest default apart

Parent: [brief](../brief.md), section `triage`. Fix spec for spec 10's review follow-up f1 (`review-10.report.json`). `[AC:spec-10-1]` claims the queue from the linked tree itself, so the lease root and the tree's own fallback are the same path. No test covers the `worktrees.mjs` record branch.

## acceptance

- Order: with a coordinator tree and a separate worker tree of one repository, `startupDefaults` in the worker gives that worker's own manifest when there is no lease and no record. It gives the coordinator tree's manifest once the queue is claimed there. It gives the manifest of the tree that a `worktrees.mjs` record for this worker names, even when a lease names another tree. Check: `tests/runtime-dispatch-commands.test.ts` `[AC:spec-11-1]`.

## Test changes

- `tests/runtime-dispatch-commands.test.ts` class 1: the bullet adds the `[AC:spec-11-1]` case and imports `relative`.

## Not covered

Anything in the brief's Scope and limits. Code changes: spec 10's code is unchanged.

## Implementation and verification scope

- Files: `tests/runtime-dispatch-commands.test.ts`, `payload/.joycraft/runtime/dispatch-start.mjs` (read only).
- Tests: `tests/runtime-dispatch-commands.test.ts`. Run the recorded gate once, before review.

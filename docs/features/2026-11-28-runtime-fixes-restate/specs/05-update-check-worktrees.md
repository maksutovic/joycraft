---
id: 5
status: todo
---
# Update-check settings and cache live in the main checkout

Parent: [brief](../brief.md), section `update-check-worktrees`.

## acceptance

- Policy: after `update-check.mjs policy off` in the main checkout, `check` in a linked worktree of the same repo prints nothing and makes no fetch. Check: `tests/runtime-update-check.test.ts` `[AC:spec-5-1]`.
- Snooze and cache: a snooze or a fresh cache written from the main checkout holds in a linked worktree, and one written from a linked worktree holds in the main checkout. Check: `tests/runtime-update-check.test.ts` `[AC:spec-5-2]`.
- Plain repo: a repo with no linked worktrees behaves as today. Check: `tests/runtime-update-check.test.ts` `[AC:spec-5-3]`.

## Test changes

- `tests/runtime-update-check.test.ts` class 1: acceptance bullets 1–2 add linked-worktree cases.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- `update-check.mjs:108` reads `.joycraft/local/preferences.json` under the current root; resolve the main tree the way `coordinator.mjs` does (`mainTree`) for preferences, snooze and cache. Stub the registry fetch as the existing tests do. The implementer agent text change is spec 7.
- Files: `payload/.joycraft/runtime/update-check.mjs`. Edit `payload/`, then run `node scripts/pin-payload.mjs`; check `tests/payload-guard.test.ts` word caps.
- Tests: `tests/runtime-update-check.test.ts`. Run the recorded gate once, before review.

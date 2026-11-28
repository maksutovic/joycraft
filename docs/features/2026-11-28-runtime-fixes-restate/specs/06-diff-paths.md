---
id: 6
status: todo
---
# Changed-file lists keep non-ASCII names

Parent: [brief](../brief.md), section `diff-paths`.

## acceptance

- Coordinator: in a repo where `src/café.ts` changed since base, the coordinator's changed list holds `src/café.ts` (not a quoted octal string). Check: `tests/runtime-changed-paths.test.ts` `[AC:spec-6-1]`.
- Scope: a reviewer start where `src/café.ts` is a declared input does not list it under `outside`; `completion.mjs submit`'s `changed` list holds the plain name. Check: `tests/runtime-changed-paths.test.ts` `[AC:spec-6-2]`.

## Test changes

- `tests/runtime-changed-paths.test.ts` class 1: new file.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- `coordinator.mjs:136` runs `git diff --name-only` and splits on newlines; use `-z` and split on NUL, as `scope.mjs` does. Grep the runtime for other `--name-only` calls without `-z` and fix them in the same way.
- Files: `payload/.joycraft/runtime/coordinator.mjs`. Edit `payload/`, then run `node scripts/pin-payload.mjs`; check `tests/payload-guard.test.ts` word caps.
- Tests: `tests/runtime-changed-paths.test.ts`. Run the recorded gate once, before review.

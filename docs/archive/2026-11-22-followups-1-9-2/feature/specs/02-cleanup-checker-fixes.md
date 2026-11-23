---
id: 2
status: done
---
# Cleanup reads a not-found line only for its own command, and a backlog folder in any case

Parent: [brief](../brief.md), section `cleanup`. Source: 1.9.1 review follow-ups, spec 3 f1 and f2.

## acceptance

- Own command only: a `checks:` command that exits 0 with no finding is skipped as `Command not found: <run>` only when the name in its stderr's not-found line (`sh: 1: x: not found`, `bash: x: command not found`, `zsh: command not found: x`) is a word of `run`, compared by basename. `run: missing-tool-xyz | cat` is still skipped; a checker that exits 0 and prints `rule no-foo: not found` gives no skipped entry and no finding. Check: `tests/runtime-cleanup-checks-seam.test.ts` `[AC:spec-2-1]`.
- Backlog folder in any case: `new-doc` and age-out treat a folder named `backlog` in any letter case on the path as a backlog folder, so a new `docs/Backlog/x.md` gives no `new-doc` finding; `docs/guides/x.md` still does. Check: `tests/runtime-cleanup-tidy.test.ts` `[AC:spec-2-2]`.

## Test changes

- `tests/runtime-cleanup-checks-seam.test.ts` class 1: acceptance bullet 1 adds the working-checker case.
- `tests/runtime-cleanup-tidy.test.ts` class 1: acceptance bullet 2 adds the `Backlog/` case.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; run the recorded gate once, before review.
- Files: `payload/.joycraft/runtime/cleanup.mjs` (`notFound` and its use in `customChecks`, `backlogFile`), and the two test files above.
- Tests: `tests/runtime-cleanup-checks-seam.test.ts`, `tests/runtime-cleanup-tidy.test.ts`. Tag each new test `[AC:spec-2-<n>]`.
- Keep the `docsRoot` and `projectRoot` exports and their behavior unchanged.

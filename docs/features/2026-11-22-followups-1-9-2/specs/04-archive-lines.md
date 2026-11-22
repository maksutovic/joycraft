---
id: 4
status: done
---
# Archive gives a blank owner instruction a plain message and reads every line ending

Parent: [brief](../brief.md), section `archive`. Source: 1.9.1 review follow-ups, spec 1 f3 and spec 9 f3.

## acceptance

- Blank instruction: `archive.mjs archive ... --as-is --owner-instruction "   "` (or an empty string) exits with a refusal that says the option needs the owner's words and does not say "cannot start with --"; `--owner-instruction --apply` keeps the "cannot start with --" clause. Nothing changes on disk. Check: `tests/runtime-archive-as-is.test.ts` `[AC:spec-4-1]`.
- Line endings: the files `namedFiles` reads are split on `\r\n`, `\n`, `\r`, U+2028 and U+2029, so in a CR-only test file whose third line is `// Spec: docs/features/<slug>/specs/01.md`, `namedFiles` reports `line: 3` and the line counts as a comment; LF and CRLF files give the same entries as today. Check: `tests/runtime-archive-named-files.test.ts` `[AC:spec-4-2]`.

## Test changes

- `tests/runtime-archive-as-is.test.ts` class 1: acceptance bullet 1 adds the blank-instruction case.
- `tests/runtime-archive-named-files.test.ts` class 1: acceptance bullet 2 adds the CR-only case.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; run the recorded gate once, before review.
- Files: `payload/.joycraft/runtime/archive.mjs` (argument checks in `main`, the line reads behind `namedFiles` and comment detection), and the two test files above.
- Tests: `tests/runtime-archive-as-is.test.ts`, `tests/runtime-archive-named-files.test.ts`. Tag each new test `[AC:spec-4-<n>]`.

---
id: 6
status: todo
---
# Four reference texts say what the code does: check kinds, knip's wrapper, the pinned fault list, and new or changed test files

Parent: [brief](../brief.md), section `text`. Source: [1.9.0 review follow-ups](../../../backlog/2026-11-21-1-9-0-review-followups.md), sections Text and skills (drift-tidy/1/f3, 10/f2; test-release/18/r2-f1, 28/f5) and Tests (test-release/28/f4).

## acceptance

- Check kinds [drift-tidy/1/f3]: `cleanup.md` says `--checks` lists every check, what it finds, its kind, and whether it is a gate. Check: `tests/drift-tidy-text.test.ts` `[AC:spec-6-1]` finds "its kind, and whether it is a gate" in `cleanup.md`.
- knip [drift-tidy/10/f2]: the `setup.md` sentence that offers `checks:` (still the only sentence there that names `checks:`) says knip needs a wrapper that prints `path:line: message`. Check: `tests/drift-tidy-text.test.ts` `[AC:spec-6-2]`: that one sentence contains "knip" and "path:line: message", and `[AC:spec-12-4]` still passes unchanged.
- Pinned fault list [test-release/18/r2-f1]: the `testing-review.md` Test-only specs section adds that the reviewer checks each receipt's patch sha256 against the list committed before the test edit, with one saved fault per removed or changed assertion, and aims its own fault at a removed assertion that has no replacement. The sentences that `tests/text-fault-proof.test.ts` pins stay. Check: `tests/text-fault-proof.test.ts` `[AC:spec-6-3]` finds "against the list committed before the test edit", "one saved fault per removed or changed assertion" and "no replacement" in that section, and the existing `[review-18-1]` and `[review-18-2]` tests pass unchanged.
- New or changed [test-release/28/f5]: `testing-page.md` decision 8 says "Run a new or changed test file `<n>` times before it counts." Check: `tests/text-sota-page.test.ts` `[AC:spec-6-4]` finds that sentence in decision 8, and `[AC:spec-20-1]` passes unchanged.
- SOTA patterns [test-release/28/f4]: the SOTA page test asserts that the page keys the worker cap on `JOYCRAFT_EVIDENCE`, never on `CI`, and that it says "never a fixed delay". Check: `tests/text-sota-page.test.ts` `[AC:spec-6-5]` matches both in `testing-page.md`.
- Words: every-spec words do not change; on-demand words stay inside the cap. Check: the word-cap test in `tests/payload-guard.test.ts` passes and the printed every-spec count equals the count before this spec `[AC:spec-6-6]`.

## Test changes

- `tests/drift-tidy-text.test.ts` class 1: acceptance bullets 1 and 2 add the kind and knip checks.
- `tests/text-fault-proof.test.ts` class 1: acceptance bullet 3 adds the pinned-list check.
- `tests/text-sota-page.test.ts` class 1: acceptance bullets 4 and 5 add the decision 8, worker-cap and fixed-delay checks.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

- Every-spec text (`testing.md`, the skills, the agents) does not change.
- knip stays in the example; no wrapper ships.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; run the recorded gate once, before review.
- Files: `payload/.joycraft/references/cleanup.md`, `payload/.joycraft/references/setup.md`, `payload/.joycraft/references/testing-review.md`, `payload/.joycraft/references/testing-page.md`, `tests/drift-tidy-text.test.ts`, `tests/text-fault-proof.test.ts`, `tests/text-sota-page.test.ts`.
- Tests: the three test files above and `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-6-<n>]`.

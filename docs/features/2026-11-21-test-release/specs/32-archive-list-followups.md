---
id: 32
status: todo
---
# Archive lists three more path spellings, words its refusal plainly, and the text covers the ruling's skip and no-gate steps

Parent: [brief](../brief.md), section `archive-tests`. Source: [review follow-ups](../review-followups.md), spec 30 review f2 and f6, spec 24 review f3 and f4, spec 29 review f1. Governing: the archive-panel ruling of 2026-11-21, section 4.1 steps 2 and 5. Decisions quoted by ID: `archive-test-editor` = `agent`, `archive-red-path` = `agent-undoes`. A wider list costs only a line of reading (ruling 4.2), and the gate stays the check.

## acceptance

- More path spellings are listed [spec 30 f2]: `namedFiles` also lists a line that names the feature folder's full path right after `}/` or after one or more `../` (`` `${root}/docs/features/<slug>/x` ``, `'../docs/features/<slug>/x'`, `'../../docs/features/<slug>'`), and, for a dated folder name, a line that names `<features folder's last segment>/<slug>/` at a path start (`'features/<slug>/brief.md'`). It still does not list `packages/app/docs/features/<slug>/...`, `docs/features/<slug>.old`, `docs/features/<slug>-two`, `x<slug>/` or `<slug>x/`. Check: `tests/runtime-archive-named-files.test.ts` `[AC:spec-32-1]` lists the four new forms and none of the five look-alikes.
- Plain refusal [spec 30 f6]: when the folder is gone during the `--apply` checks, the refusal says the folder is gone and this run changed nothing, and it does not name a cause it cannot know ("another archive --apply" is gone from the message). The exit code stays 2. Check: the same file `[AC:spec-32-2]`: the existing race test's message assertion finds "changed nothing" and "is gone".
- The text covers the skip and no-gate steps [spec 24 f3, f4]: `archive.md` has a second short paragraph (at most 45 words) after the spec 24 paragraph, which is unchanged: when a listed test needs more than a path change (a fixture that should move, a spent check, a file the project cannot edit), do not archive that feature and write one line; change a listed non-test file only when a listed test asserts its value; with no gate recorded, run the tests you changed. Check: `tests/text-archive-tests.test.ts` `[AC:spec-32-3]` finds "more than a path change", "no gate recorded" and "asserts" in that paragraph, and `[AC:spec-24-1]` still passes unchanged.
- One docs-root rule [spec 29 review f1]: `archive.mjs` reads the docs root with the same rule as `cleanup.mjs` `docsRoot` (import it; do not keep a second copy), so with `paths.context: docs` and the default features and archive folders, archive reads the docs root as `docs` and relinks no live Markdown outside it. Check: `tests/runtime-archive-links.test.ts` `[AC:spec-32-5]`: with `context: docs`, a live `README.md` at the project root that links into the feature folder is not rewritten (it is listed as a link, unedited), and `docs/guide.md` that links into it is rewritten.
- Words: every-spec words do not change; on-demand words stay inside the cap. Check: `pnpm test tests/payload-guard.test.ts` passes and the printed every-spec count equals the count before this spec.

## Test changes

- `tests/runtime-archive-named-files.test.ts` class 1: acceptance bullet 1 adds the new forms; acceptance bullet 2 changes the race test's message words from "Another archive" to "changed nothing" and "is gone".
- `tests/runtime-archive-links.test.ts` class 1: acceptance bullet 5 adds the `context: docs` case.
- `tests/text-archive-tests.test.ts` class 1: acceptance bullet 3 adds the second paragraph check; `.split('\n').join(' ')` at line 49 may be removed (spec 24 f5, no behavior change).

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

- A path built from a variable or a glob: still not listed (ruling 4.3).
- The kill criterion for the list (spec 24 f6): an owner call after field use.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.joycraft/runtime/archive.mjs` (`namesFolder`, `namesDated`, `movedMeanwhile`), `payload/.joycraft/references/archive.md`, `tests/runtime-archive-named-files.test.ts`, `tests/runtime-archive-links.test.ts`, `tests/text-archive-tests.test.ts`.
- Tests: the three test files above and `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-32-<n>]`.
- Start after spec 29 is done: it edits `archive.mjs` (the ignore helper). Rebase on its final text.

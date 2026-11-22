---
id: 11
status: in-review
---
# Reviewer startup lists declared and undeclared changed test files

Parent: [brief](../brief.md), sections `declared-test-changes`, `archive-tests`. All 13 decisions are answered; they are quoted by ID.

Brief `declared-test-changes`: "Reviewer startup prints the declared and undeclared changed test files, by script." Brief `archive-tests`: "A reviewer finding fires when a test reads a path under the features folder." Joycraft names no runner, so a test file is found by convention, not by a runner's config.

## acceptance

- A new `test-changes.mjs --queue <q> --spec <id> --base <sha>` lists the changed test files between `<base>` and the working tree: a file is a test when it is a `check` input of the spec, holds an `[AC:` tag, or matches the common test-name conventions (a `test`, `tests`, `spec` or `__tests__` path segment, or `.test.`, `.spec.`, `_test.` or `test_` in the name). It exports `isTestPath` for spec 13. Check: a git fixture that changes `tests/a.test.ts`, `src/b_test.go` and `src/c.ts` lists the first two only.
- It reads the spec's `## Test changes` section (bullets of a backticked path, a class 1, 2 or 3, and the requiring line; "none" means none) and splits the changed test files into `declared` (with class) and `undeclared`. Check: a fixture spec declaring `` `tests/a.test.ts` `` as class 1, with `a` and `tests/b.test.ts` changed, gives `declared: [{path: "tests/a.test.ts", class: 1}]` and `undeclared: ["tests/b.test.ts"]`.
- It lists `featurePaths`: each changed test file line that names a path under the configured features folder. Check: a changed test reading `docs/features/x/brief.md` is listed with its line number.
- Reviewer startup takes `--changes-base <sha>` and adds the same result as `testChanges`; without it, startup is unchanged. Check: the dispatch fixture with the flag prints `testChanges.undeclared`; without it, the output has no `testChanges`.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Parallel seam: this spec owns only the files listed here. `payload/PIN` is generated, so on integration regenerate it with `node scripts/pin-payload.mjs` instead of merging it.
- Files: `payload/.joycraft/runtime/test-changes.mjs`, `payload/.joycraft/runtime/dispatch-start.mjs`, `tests/runtime-test-changes.test.ts`.
- Tests: `tests/runtime-test-changes.test.ts`. Tag each new test `[AC:spec-11-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- The coordinator knows the spec's base (the captured revision before dispatch) and passes it; startup never guesses a base.
- The reviewer rules that use this output (block only an undeclared change no line requires) are spec 17.

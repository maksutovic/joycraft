---
id: 5
status: in-review
---
# Task startup prints the focused command and the worker's commands ready to paste

Parent: [brief](../brief.md), sections `spec-tier`, `worker-commands`. All 13 decisions are answered; they are quoted by ID.

Brief `spec-tier`: "`dispatch-start.mjs` prints the focused command built from the spec's check inputs." Brief `worker-commands`: "`dispatch-start.mjs` prints the worker's commands ready to paste." Isolation refusals come from Claude Code's guard, which refuses compound commands; plain single commands pass.

## acceptance

- With `tests.focused: "pnpm test {files}"` recorded, implementer and reviewer startup output carries `commands.focused`: the command with `{files}` replaced by the spec's `check` inputs (present files, in queue order), as one string and as `argv`. A `focused` command with no `{files}` gets the files appended. Check: a fixture spec with check inputs `tests/a.test.ts` and `tests/b.test.ts` prints `pnpm test tests/a.test.ts tests/b.test.ts`.
- `commands` also carries each step the role runs, each as one plain command with literal paths and no `&&`, `;`, `|`, `$(`, heredoc, `source` or `cd`: the evidence run of the focused command with a fresh receipt path under the feature folder, and `completion.mjs submit` (implementer) or `dispatch-preflight.mjs check-report` and `completion.mjs finalize-review` (reviewer). Check: the fixture output has these entries and none of them matches `/&&|;|\||\$\(|<<|\bsource\b|\bcd\b/`.
- Without `tests.focused`, or with no check inputs, `commands.focused` is `null` with a `note` that says which is missing; startup still succeeds. Check: two fixtures print the note and exit 0.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Parallel seam: this spec owns only the files listed here. `payload/PIN` is generated, so on integration regenerate it with `node scripts/pin-payload.mjs` instead of merging it.
- Files: `payload/.joycraft/runtime/dispatch-start.mjs`, `tests/runtime-dispatch-commands.test.ts`.
- Tests: `tests/runtime-dispatch-commands.test.ts`. Tag each new test `[AC:spec-5-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Match the existing startup test setup (git fixture with the shipped runtime and a claimed queue) used by the dispatch tests in this repository.
- The receipt path must be one `evidence.mjs` accepts (inside a feature folder or git-ignored).

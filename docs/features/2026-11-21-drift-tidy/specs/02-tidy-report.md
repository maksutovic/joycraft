---
id: 2
status: todo
---
# A tidy report scoped to a stateless Git range

Parent: [brief](../brief.md), sections `tidy-range`, `new-doc`, `end-commit`. Decisions are answered; quote them by ID. Testing mechanisms are out of scope (brief, Context).

## acceptance

- `cleanup.mjs tidy` finds its base: on a branch, the merge base with the default branch (origin/HEAD, else main, else master); on the default branch, the older of 100 commits back or the first commit in the last 7 days, labelled `approximate: true`; `--base <ref>` overrides. Check: fixtures for a feature branch, a trunk-only repo and a squash-merged history print the expected base SHA.
- In a shallow clone or outside Git, tidy prints one `skipped` entry and exits 0. Check: a `git clone --depth 1` fixture and a plain folder each give `skipped` with a reason.
- The `new-doc` finding lists Markdown files the range added under the docs root, outside paths.features, paths.archive and a backlog folder, grouped by folder with counts. Check: a range adding 3 files in `docs/research/x/`, 1 in `docs/notes/`, 1 in `docs/features/f/` and 1 in `docs/archive/a/` prints groups `docs/research/x` (3) and `docs/notes` (1) only.
- The report shows at most 10 fixable findings, context pages first, then one `N more` line; output is JSON with `base`, `head`, `approximate`, `findings`, `more`, `skipped`. Check: a fixture with 14 findings shows 10 and `more: 4`.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit the source in `payload/` only; then run `node scripts/pin-payload.mjs` and, if the change touches installed copies, refresh them as AGENTS.md says.
- Files: `payload/.joycraft/runtime/cleanup.mjs`.
- Test: `tests/runtime-cleanup-tidy.test.ts` (git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does). Tag each test `[AC:spec-2-<n>]`.
- Gate: `pnpm test && pnpm typecheck`.

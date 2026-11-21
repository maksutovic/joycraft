---
id: 9
status: todo
---
# The attended cleanup can archive old working docs

Parent: [brief](../brief.md), sections `age-out`. Decisions are answered; quote them by ID. Testing mechanisms are out of scope (brief, Context).

## acceptance

- `cleanup.mjs age-out --days 14` lists working docs (Markdown under the docs root outside context, features, archive and backlog) whose last commit is older than 14 days, with count and age. Check: a fixture with docs last committed 20 and 5 days ago (GIT_COMMITTER_DATE) lists only the 20-day doc.
- `--apply` moves each listed doc with `git mv` to `<archive>/working/<same path>` and commits nothing. Check: after apply the file exists under the archive path and `git status` shows renames.
- `cleanup.md` asks this as one question in the attended pass only, never at session end. Check: the reference names `age-out` in the attended pass section and the session-end skill does not.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit the source in `payload/` only; then run `node scripts/pin-payload.mjs` and, if the change touches installed copies, refresh them as AGENTS.md says.
- Files: `payload/.joycraft/runtime/cleanup.mjs`, `payload/.joycraft/references/cleanup.md`.
- Test: `tests/runtime-cleanup-age-out.test.ts` (git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does). Tag each test `[AC:spec-9-<n>]`.
- Gate: `pnpm test && pnpm typecheck`.

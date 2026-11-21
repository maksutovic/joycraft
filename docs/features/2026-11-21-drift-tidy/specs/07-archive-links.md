---
id: 7
status: in-review
---
# Archive rewrites live links to the moved feature

Parent: [brief](../brief.md), sections `archive-links`. Decisions are answered; quote them by ID. Testing mechanisms are out of scope (brief, Context).

## acceptance

- On apply, Markdown links under the docs root (outside the archive, outside receipts and reviews) that point into the moved feature folder are rewritten to its archive path. Check: `docs/context/page.md` linking `../features/x/brief.md` links `../archive/x/feature/brief.md` after apply, and the link resolves.
- The result lists live Markdown that names the folder in prose or backticks (not a link) and non-Markdown tracked files that name it; neither is edited. Check: a `src/a.ts` and a `docs/notes/n.md` naming `docs/features/x` both appear in the result lists and are byte-identical after apply.
- Files inside the archive are never rewritten. Check: an archived page linking the feature folder is byte-identical after apply.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit the source in `payload/` only; then run `node scripts/pin-payload.mjs` and, if the change touches installed copies, refresh them as AGENTS.md says.
- Files: `payload/.joycraft/runtime/archive.mjs`, `payload/.joycraft/references/archive.md`.
- Test: `tests/runtime-archive-links.test.ts` (git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does). Tag each test `[AC:spec-7-<n>]`.
- Gate: `pnpm test && pnpm typecheck`.

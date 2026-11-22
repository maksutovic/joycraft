---
id: 6
status: done
---
# Setup and update offer to hide the archive from search

Parent: [brief](../brief.md), sections `archive-ignore`. Decisions are answered; quote them by ID. Testing mechanisms are out of scope (brief, Context).

## acceptance

- `archive.mjs ignore --check` prints whether `.ignore` lists paths.archive; `--apply` creates `.ignore` if absent and appends `<archive>/` once. Check: fresh fixture: check says missing; apply adds the line; second apply leaves the file byte-identical.
- A custom `paths.archive` in joycraft.yaml is used. Check: fixture with `paths.archive: work/old` gets `work/old/`.
- `setup.md` and `update.md` each ask the question once, in one or two sentences, and run the command on a yes. Check: both files name `archive.mjs ignore`; payload words stay within the cap.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit the source in `payload/` only; then run `node scripts/pin-payload.mjs` and, if the change touches installed copies, refresh them as AGENTS.md says.
- Files: `payload/.joycraft/runtime/archive.mjs`, `payload/.joycraft/references/setup.md`, `payload/.joycraft/references/update.md`.
- Test: `tests/runtime-archive-ignore.test.ts` (git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does). Tag each test `[AC:spec-6-<n>]`.
- Gate: `pnpm test && pnpm typecheck`.

---
id: 4
status: done
---
# tidy --verify checks the fix and prints one commit message

Parent: [brief](../brief.md), sections `end-edits`, `end-commit`. Decisions are answered; quote them by ID. Testing mechanisms are out of scope (brief, Context).

## acceptance

- `cleanup.mjs tidy --verify` re-runs the range checks on the working tree; a finding that the edit cleared no longer appears. Check: after editing the named line in the gone-symbol fixture, `--verify` reports 0 remaining for that finding and exits 0.
- Verify refuses a diff that touches an entry file (AGENTS.md, CLAUDE.md) or a file not named by a fixable finding, naming each path, and prints no commit message. Check: an edit to AGENTS.md exits non-zero naming AGENTS.md; an edit to an unlisted `docs/context/other.md` exits non-zero naming it.
- On pass, verify prints one commit message: subject `docs: tidy N doc lines after <short head>` and a trailer `Joycraft-Tidy: <base>..<head>`. With no edits it prints nothing to commit. Check: the passing fixture's output has that subject and trailer.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit the source in `payload/` only; then run `node scripts/pin-payload.mjs` and, if the change touches installed copies, refresh them as AGENTS.md says.
- Files: `payload/.joycraft/runtime/cleanup.mjs`.
- Test: `tests/runtime-cleanup-tidy-verify.test.ts` (git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does). Tag each test `[AC:spec-4-<n>]`.
- Gate: `pnpm test && pnpm typecheck`.

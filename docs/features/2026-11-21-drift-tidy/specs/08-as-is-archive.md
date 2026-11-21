---
id: 8
status: in-review
---
# An owner can archive an unfinished feature as is

Parent: [brief](../brief.md), sections `as-is-archive`. Decisions are answered; quote them by ID. Testing mechanisms are out of scope (brief, Context).

## acceptance

- `archive.mjs archive ... --as-is --owner-instruction "<text>"` archives a feature whose specs are not all accepted; without `--as-is` the existing refusal is unchanged. Check: a fixture with one `in-review` spec is refused by default and archived with the flags.
- The archive gets `unverified.md` listing each spec not `done`, each missing receipt, and the owner instruction verbatim; the queue file and reports are preserved unmodified and nothing claims acceptance. Check: the fixture's `unverified.md` names the spec and the instruction text; the archived queue bytes equal the source queue bytes.
- `--as-is` without `--owner-instruction` stops with a message. Check: the command exits non-zero naming the missing flag.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit the source in `payload/` only; then run `node scripts/pin-payload.mjs` and, if the change touches installed copies, refresh them as AGENTS.md says.
- Files: `payload/.joycraft/runtime/archive.mjs`, `payload/.joycraft/references/archive.md`.
- Test: `tests/runtime-archive-as-is.test.ts` (git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does). Tag each test `[AC:spec-8-<n>]`.
- Gate: `pnpm test && pnpm typecheck`.

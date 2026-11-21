---
id: 5
status: in-review
---
# The managed block tells agents which docs to trust

Parent: [brief](../brief.md), sections `trust-sentence`. Decisions are answered; quote them by ID. Testing mechanisms are out of scope (brief, Context).

## acceptance

- The managed block in `wiring.mjs` gains one line: `Search the mapped pages first. A doc that no map row reaches is working material, not current truth.` Check: `node payload/.joycraft/runtime/entry-check.mjs block` prints it.
- An AGENTS.md holding the previous block is reported as `changed` by the managed-block check. Check: a fixture with the old four-line block gives a `managed-block` finding.
- This repository's own AGENTS.md managed lines are updated to match. Check: `node .joycraft/runtime/entry-check.mjs` style check from payload on the repo root reports no managed-block finding.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit the source in `payload/` only; then run `node scripts/pin-payload.mjs` and, if the change touches installed copies, refresh them as AGENTS.md says.
- Files: `payload/.joycraft/runtime/wiring.mjs`, `AGENTS.md`.
- Test: `tests/runtime-trust-sentence.test.ts` (git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does). Tag each test `[AC:spec-5-<n>]`.
- Gate: `pnpm test && pnpm typecheck`.

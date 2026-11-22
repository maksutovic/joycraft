---
id: 11
status: done
---
# Session start warns in up to 3 lines when mapped docs went stale

Parent: [brief](../brief.md), sections `start-advice`. Decisions are answered; quote them by ID. Testing mechanisms are out of scope (brief, Context).

## acceptance

- The wiring advice channel (`entry-check.mjs`) adds at most 3 lines when the tidy range has fixable findings in map-reached pages, the last naming `cleanup.mjs tidy`. Check: the gone-symbol fixture gives advice naming tidy; a clean fixture gives no tidy advice.
- Advice never changes the exit code and never edits a file. Check: the fixture's exit code is the same with and without the finding; git status is clean after the run.
- Start advice skips silently when tidy is `skipped` (shallow clone). Check: a depth-1 clone fixture gives no tidy advice and no error.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit the source in `payload/` only; then run `node scripts/pin-payload.mjs` and, if the change touches installed copies, refresh them as AGENTS.md says.
- Files: `payload/.joycraft/runtime/wiring.mjs`, `payload/.joycraft/runtime/entry-check.mjs`, `payload/.agents/skills/joycraft-entry/SKILL.md`.
- Test: `tests/runtime-start-advice.test.ts` (git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does). Tag each test `[AC:spec-11-<n>]`.
- Gate: `pnpm test && pnpm typecheck`.

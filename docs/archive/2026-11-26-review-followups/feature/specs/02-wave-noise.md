---
id: 2
status: done
---
# A reviewer is not shown its siblings' work or archived tags as its own

Parent: [brief](../brief.md), section `wave-noise`.

## acceptance

- Archived tags: `traceSpec` (`trace.mjs`) lists a tag that matches no criterion of this spec but matches a criterion id of a queue under the project's archive folder (`paths.archive` from `config.mjs`, default `docs/archive`) as `archivedTags: [{ id, file, line }]`, not in `unknownTags`. A tag that matches nothing stays in `unknownTags`. Reviewer startup's `trace` carries `archivedTags`. Check: `tests/runtime-trace-archived.test.ts` `[AC:spec-2-1]`.
- Sibling files: reviewer startup's `scope` lists changed files that are declared inputs of another spec in the same queue as `siblings`, apart from `outside`, which keeps only changed files no spec of the queue declares. `outside` and its `note` are left out when empty; the `note` says to file each `outside` path as a `note` finding and not to file `siblings`. Check: `tests/runtime-trace-archived.test.ts` `[AC:spec-2-2]` (a two-spec queue where both specs changed files).
- Verify text: `payload/.agents/skills/joycraft-verify/SKILL.md` says not to file `siblings` or `archivedTags` at all. It also says again that an unresolved hang is `UNVERIFIED` with its receipt, never `FAIL` (spec 1 review follow-up f2: a word-cap trim merged that rule into "FAIL or UNVERIFIED"). The skill stays under its word cap in `tests/text-worker-commands.test.ts` `[AC:sl3-07-words]`. Check: `tests/runtime-trace-archived.test.ts` `[AC:spec-2-3]` reads the payload text.

## Test changes

- `tests/runtime-trace-archived.test.ts` class 1: new file.

## Not covered

Anything in the brief's Scope and limits. Changed files from outside this queue that another queue declares. Specs other than this one.

## Implementation and verification scope

- Files: `payload/.joycraft/runtime/trace.mjs`, `payload/.joycraft/runtime/dispatch-start.mjs` (the `scope` block and the `trace` field), `payload/.joycraft/runtime/config.mjs` (read only), `payload/.agents/skills/joycraft-verify/SKILL.md`, `tests/runtime-trace-archived.test.ts`. Reuse the reviewer-startup fixture helpers in `tests/runtime-dispatch-commands.test.ts` where they fit. Edit `payload/`, then run `node scripts/pin-payload.mjs`.
- Tests: `tests/runtime-trace-archived.test.ts`. Run the recorded gate once, before review.

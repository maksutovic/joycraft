---
id: 7
status: in-review
---
# Archived tags never hide the current queue's tags, and the verify rules agree

Parent: [brief](../brief.md), section `wave-noise`. Fix spec for spec 2's review follow-ups f1 and f2 (`review-2.report.json`), written under the brief's settled rule: a real follow-up inside the brief's intent gets a fix spec in the same queue.

## acceptance

- Current queue first: `traceSpec` lists a tag in `archivedTags` only when its ID is a criterion of an archived queue and of no spec in the current queue. A tag that names another current spec's criterion stays in `unknownTags`. In a fixture whose archive holds `spec-1-1` and whose current queue also has `spec-1-1` on spec 1, tracing spec 2 lists a `[AC:spec-1-1]` tag as unknown. Check: `tests/runtime-trace-archived.test.ts` `[AC:spec-7-1]`.
- One rule: the verify skill's findings rule no longer lists another spec's changed file and an archived feature's tag both as a `note` and as "do not file". It says: startup's `siblings` and `archivedTags` are never filed; another spec's file or an archived feature's tag that startup did not list is a `note`. The skill stays under its word cap. Check: `tests/runtime-trace-archived.test.ts` `[AC:spec-7-2]`, `tests/runtime-review-notes.test.ts` and `tests/text-worker-commands.test.ts` pass.

## Test changes

- `tests/runtime-trace-archived.test.ts` class 1: acceptance bullets 1 and 2 add new cases. If a spec-2 case asserted that a current-queue ID is archived, its expected value changes as bullet 1 states.
- `tests/runtime-review-notes.test.ts` class 1: only if its `[AC:spec-1-4]` text match must follow bullet 2's new wording; the same five kinds stay required.

## Not covered

Anything in the brief's Scope and limits. A typo tag that exactly matches an archived criterion ID (accepted: it is hidden as archived). Specs other than this one.

## Implementation and verification scope

- Files: `payload/.joycraft/runtime/trace.mjs`, `payload/.agents/skills/joycraft-verify/SKILL.md`, `tests/runtime-trace-archived.test.ts`, `tests/runtime-review-notes.test.ts`, `tests/text-worker-commands.test.ts`. Edit `payload/`, then run `node scripts/pin-payload.mjs`.
- Tests: those three files. Run the recorded gate once, before review.

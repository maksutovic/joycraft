---
id: 4
status: done
---
# The entry-size budget counts only the project's own text

Parent: [brief](../brief.md), section `entry-size-own-text`.

## acceptance

- Own text: `entry-size` (`cleanup.mjs`) counts an entry file's words without the text from `<!-- joycraft:managed -->` through `<!-- /joycraft:managed -->`, and without the `## Review loop` section from its heading through its `<!-- joycraft:review-loop v… -->` marker line. An `AGENTS.md` with 900 own words plus a full managed block and review-loop section has no `entry-size` finding; one with 1,100 own words has one. Check: `tests/runtime-cleanup-checks.test.ts` `[AC:spec-4-1]`.
- Detail: the finding's `detail` gives the own-text count and says Joycraft's block and review-loop section are not counted; `words` is the own-text count. Check: `tests/runtime-cleanup-checks.test.ts` `[AC:spec-4-2]`.
- No markers: an entry file with no markers is counted whole, as before; a managed open marker with no close marker counts the file whole. Check: `tests/runtime-cleanup-checks.test.ts` `[AC:spec-4-3]`.
- Advisory: `entry-size` stays out of `gateChecks` (`entry-check.mjs`). The `checkList` line and `payload/.joycraft/references/settings.md` (the `cleanup.entryWords` row or its text) and `cleanup.md` say what the budget counts. Check: `tests/runtime-cleanup-checks.test.ts` `[AC:spec-4-4]`.

## Test changes

- `tests/runtime-cleanup-checks.test.ts` class 1: acceptance bullets 1 to 4 add new cases; no existing assertion changes. If an existing `entry-size` case counts a file with a managed block, its expected count changes as bullet 1 states.

## Not covered

Anything in the brief's Scope and limits. The `codex-bytes` check, which counts the whole file because Codex loads it whole. Specs other than this one.

## Implementation and verification scope

- Files: `payload/.joycraft/runtime/cleanup.mjs`, `payload/.joycraft/runtime/wiring.mjs` (read only: `managedOpen`, `managedClose`), `payload/.joycraft/runtime/review-tools.mjs` (read only: the marker), `payload/.joycraft/runtime/entry-check.mjs` (read only: `gateChecks`), `payload/.joycraft/references/settings.md`, `payload/.joycraft/references/cleanup.md`, `tests/runtime-cleanup-checks.test.ts`. Edit `payload/`, then run `node scripts/pin-payload.mjs`.
- Tests: `tests/runtime-cleanup-checks.test.ts`. Run the recorded gate once, before review.

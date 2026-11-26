---
id: 1
status: todo
---
# A reviewer files what needs no work as a `note`, and status never asks about it

Parent: [brief](../brief.md), section `reviewer-notes`. Settled: decision `note-shape` = `note-class`.

## acceptance

- Note class: a report finding with `class: "note"` passes `check-report` and `finalize-review`; `note` is listed in the refusal text for an unknown class; a `note` needs no `criterion` or `at`, like a `follow-up`. A note never refuses completion. Check: `tests/runtime-review-notes.test.ts` `[AC:spec-1-1]`.
- No question: `status.mjs` (`projectStatus`) lists no `questions` entry for a note in a done spec's accepted report, and still lists one for a `follow-up` in the same report. Check: `tests/runtime-review-notes.test.ts` `[AC:spec-1-2]`.
- Old reports: a report with only `blocking`, `decision-needed` and `follow-up` findings, and one with no `findings`, validate as before. Check: `tests/runtime-review-notes.test.ts` `[AC:spec-1-3]`.
- Verify text: the findings rule in `payload/.agents/skills/joycraft-verify/SKILL.md` says that each of these is a `note`, not a `follow-up`: a check that passed (such as a test change matching its class), a changed file that belongs to another spec, a test tag from an archived feature, a "Deferred until deploy" item, and a flaky retry or log noise with no defect. The "Deferred until deploy" paragraph says `note`. `types.d.ts` lists `note` with a one-line comment. Check: `tests/runtime-review-notes.test.ts` `[AC:spec-1-4]` reads the payload text.

## Test changes

- `tests/runtime-review-notes.test.ts` class 1: new file.

## Not covered

Anything in the brief's Scope and limits. How a reviewer is shown sibling files or archived tags (spec 2). Specs other than this one.

## Implementation and verification scope

- Files: `payload/.joycraft/runtime/completion.mjs` (`findingClasses`, `validateFindings`), `payload/.joycraft/contracts/types.d.ts` (`ReviewFinding`), `payload/.joycraft/runtime/status.mjs` (read only: `followUps` filters by class), `payload/.agents/skills/joycraft-verify/SKILL.md`, `tests/runtime-review-notes.test.ts`. Edit `payload/`, then run `node scripts/pin-payload.mjs`; the installed and bundled copies follow the repo's usual sync (check `tests/payload-guard.test.ts` word caps).
- Tests: `tests/runtime-review-notes.test.ts`. Run the recorded gate once, before review.

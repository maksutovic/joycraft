---
id: 5
status: in-review
---
# The implementer acts on each review wave's follow-ups before the next wave

Parent: [brief](../brief.md), section `triage`. Settled from Max's words in the brief: a real follow-up inside the brief's intent gets a fix spec in the same queue, without asking.

## acceptance

- Skill step: `payload/.agents/skills/joycraft-implement/SKILL.md` has a step after each review wave (and after each accepted spec in `checkpoint` mode): read the wave's accepted reports' `follow-up` findings; for each, (a) a defect or gap inside the brief's intent gets a fix spec appended to the same queue, no question to the user, and `follow-ups.mjs --fixed <new spec>`; (b) one that changes scope or has no safe default becomes an open brief decision and `follow-ups.mjs --decided <id>`; (c) one that is not a defect gets `follow-ups.mjs --dismissed <reason>`. Check: `tests/text-follow-up-triage.test.ts` `[AC:spec-5-1]`.
- Words: the step fits the implement skill's word cap in `tests/payload-guard.test.ts`. Check: `tests/text-follow-up-triage.test.ts` `[AC:spec-5-1]` and `tests/payload-guard.test.ts` passes unchanged.
- Appended spec: appending a fix spec to a queue whose earlier specs are `done` leaves their accepted reports valid: `status.mjs` reports no drift and no unread report for them, and `queue-check.mjs` accepts the new spec. Check: `tests/text-follow-up-triage.test.ts` `[AC:spec-5-2]` (runtime case on a fixture queue).

## Test changes

- `tests/text-follow-up-triage.test.ts` class 1: new file.

## Not covered

Anything in the brief's Scope and limits. Merging repeated notes. Specs other than this one.

## Implementation and verification scope

- Files: `payload/.agents/skills/joycraft-implement/SKILL.md`, `payload/.joycraft/references/workflow.md` (only if the queue rules forbid appending a spec mid-queue), `payload/.joycraft/runtime/follow-ups.mjs` (read only, from spec 3), `payload/.joycraft/runtime/identity.mjs` (read only: a subject binds its own spec and dependencies), `tests/text-follow-up-triage.test.ts`. Edit `payload/`, then run `node scripts/pin-payload.mjs`.
- Tests: `tests/text-follow-up-triage.test.ts`, `tests/payload-guard.test.ts`. Run the recorded gate once, before review.
- Start after specs 1 and 3 are done.

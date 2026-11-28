---
id: 8
status: todo
---
# Entry restates a long context dump in its own words before the brief

Parent: [brief](../brief.md), section `restate`.

## acceptance

- Rule: `payload/.agents/skills/joycraft-entry/SKILL.md` says that when the user's request is a long context dump, before writing the brief, the agent restates it in its own words in chat (the user's goals, the constraints, what it assumed, and open questions), asks whether that is right, and writes the brief only after the user confirms or corrects it. Check: `tests/text-restate.test.ts` `[AC:spec-8-1]`.
- Skip: the same text says a short request with nothing assumed skips the restatement. Check: `tests/text-restate.test.ts` `[AC:spec-8-2]`.
- Record: the confirmed restatement, with the user's corrections in their words, goes into the brief's context section; `.joycraft/templates/brief.md` mentions it in "Context and authorization". Check: `tests/text-restate.test.ts` `[AC:spec-8-3]`.
- Chat, not a page: the text says this is one plain chat turn, not a brief decision or a page. Check: `tests/text-restate.test.ts` `[AC:spec-8-4]`.
- Small jobs: the managed `AGENTS.md` block text in `payload/.joycraft/runtime/wiring.mjs` is unchanged. Check: `tests/text-restate.test.ts` `[AC:spec-8-5]`.

## Test changes

- `tests/text-restate.test.ts` class 1: new file.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Place the paragraph after the "Read the project's boundaries and context map" paragraph and before "Keep the user's goals together". Write in Simplified Technical English like the rest of the skill. Keep the skill inside its word cap in `tests/payload-guard.test.ts`; trim elsewhere in the same file if needed, without dropping a rule.
- Files: `payload/.agents/skills/joycraft-entry/SKILL.md`, `payload/.joycraft/templates/brief.md`. Edit `payload/`, then run `node scripts/pin-payload.mjs`; check `tests/payload-guard.test.ts` word caps.
- Tests: `tests/text-restate.test.ts`. Run the recorded gate once, before review.

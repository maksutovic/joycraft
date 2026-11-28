---
id: 7
status: todo
---
# Implementers start with their own queue entry and a short agent definition

Parent: [brief](../brief.md), section `worker-start`.

## acceptance

- Entry in output: implementer `dispatch-start.mjs` stdout includes the spec's own queue entry (id, file, depends_on, verification) and not the other specs' entries. Check: `tests/runtime-dispatch-commands.test.ts` `[AC:spec-7-1]`.
- Agent text: `payload/.claude/agents/joycraft-implementer.md` no longer says to follow `.claude/skills/joycraft-implement/SKILL.md` or to run startup "as `.joycraft/references/dispatch.md` describes"; it says "Skip the update check", names the `dispatch-start.mjs` command with its flags inline, says to open another reference only when a command refuses or a step names it, and says the startup output carries the queue entry so the worker does not open the queue file. Check: `tests/text-worker-start.test.ts` `[AC:spec-7-2]`.
- Kept: the agent text still carries the shell-form rules, the coordinator-only instructions rule, the test rules and the finish steps it has today. Check: `tests/text-worker-start.test.ts` `[AC:spec-7-3]`.

## Test changes

- `tests/runtime-dispatch-commands.test.ts` class 1: acceptance bullet 1 adds the queue-entry case. `tests/text-worker-start.test.ts` class 1: new file. If `tests/text-worker-commands.test.ts` pins the removed sentences, it is class 1 too (acceptance bullet 2 states the new text).

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- `dispatch-start.mjs:416` strips `packet` from stdout; add the entry in the short form. Follow the reviewer definition (13e3c67) as the model. Check the Codex/other-harness copies of the implementer instructions that `pin-payload` produces.
- Files: `payload/.joycraft/runtime/dispatch-start.mjs`, `payload/.claude/agents/joycraft-implementer.md`. Edit `payload/`, then run `node scripts/pin-payload.mjs`; check `tests/payload-guard.test.ts` word caps.
- Tests: `tests/runtime-dispatch-commands.test.ts`, `tests/text-worker-start.test.ts`. Run the recorded gate once, before review.

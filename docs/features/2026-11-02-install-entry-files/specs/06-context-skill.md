---
id: 6
status: in-review
---
# The user can add, change or remove context by asking

Goal: [context-skill](../brief.md#context-skill). Max: "an evokable joycraft
skill ... that can add/remove context". Built in joycraft-prototype, branch `field/1.1.2` (from `field/1.2-custom-answer`) by extending
`joycraft-context` (find, add, change, remove), so one skill owns context.

## acceptance

- Description includes the words people say: add to context, remember this,
  forget/remove a rule, what does the map say about X. Check: skill-evaluation
  cases `context-add`, `context-remove`, `context-ask` route to joycraft-context.
- Add routes the fact to its home per `knowledge.md`, adds or keeps the map row,
  shows the diff, writes on yes. Check: host-smoke `context-add` ("we deploy on
  Fridays only") ends with the fact in one home and a row reaching it.
- Remove deletes the live statement, records the reason in the decision log,
  and leaves no dangling row. Check: host-smoke `context-remove`; `cleanup.mjs`
  reports no `missing-path` or `unmapped` afterwards.
- A meeting note or screenshot becomes its facts, each in its home. Check:
  host-smoke `context-notes` with a fixture note of three facts.
- Finding context still works as before. Check: existing context tests pass.

## Implementation and verification scope

`.agents/skills/joycraft-context/SKILL.md`, `.joycraft/references/context.md`,
skill-evaluation and host-smoke cases. Depends on 05 (`knowledge.md`).

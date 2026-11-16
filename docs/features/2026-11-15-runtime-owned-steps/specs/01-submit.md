---
id: 1
status: done
---
# Outcome

One command moves a spec to `in-review`. The implementer no longer edits two
files by hand. Brief: [submit](../brief.md#submit). Ruling `submit-checks`:
"write-and-warn".

## acceptance

- Submit writes both status surfaces together. Check: a fixture queue with
  spec 2 `todo`; run `node .joycraft/runtime/completion.mjs submit --queue
  <queue> --spec 2`; the queue entry and the spec frontmatter both say
  `in-review`, the queue entry records that submit ran, exit code 0, and
  `status.mjs` reports no drift (`tests/runtime/submit.test.mjs`,
  `[AC:submit-writes-both]`).
- A conflict restores both files. Check: the test changes the spec file after
  submit reads it and before submit writes; both files keep their earlier
  bytes, exit code 2, and stderr names the file that changed
  (`[AC:submit-conflict-restores]`).
- Untraced criteria are a warning. Check: spec 2 has a criterion with no
  `[AC:id]` test; submit exits 0, both files say `in-review`, and stderr has
  one line that names the criterion (`[AC:submit-warns-untraced]`).
- Only a `todo` spec can be submitted. Check: submit on an `in-review` spec
  exits 0 and changes nothing; submit on a `done` spec exits 2 and names the
  spec; an unmet dependency exits 2 and names it (`[AC:submit-status-rules]`).
- The skill text is replaced. Check: `joycraft-implement/SKILL.md` and
  `joycraft-implementer.md` tell the agent to run submit and no longer say
  "update both the queue entry and the spec's top-level frontmatter". Their
  word counts do not grow (`[AC:submit-prose-replaced]`).

## Not covered

A guard against a hand edit to `in-review`; the 1.4.0 gate check and
`status.mjs` still find the drift. A change to how `done` is written.

## Implementation and verification scope

Implemented in joycraft-prototype: `.joycraft/runtime/completion.mjs` (new
`submit` subcommand that reuses the journaled two-file write of
`writeCompletion`), `.joycraft/runtime/trace.mjs` (read only, for the
warning), `.joycraft/contracts/types.d.ts` (the optional submit record on
`QueueSpec`), `.agents/skills/joycraft-implement/SKILL.md`,
`.claude/agents/joycraft-implementer.md`, `.joycraft/references/completion.md`,
`tests/runtime/submit.test.mjs`. The boundary crossed is one command to two
files; the discriminating scenario is the mid-write conflict, where a plain
pair of writes would leave the queue and the spec in different states. A
queue with no submit record (1.4.0 and earlier) stays valid.

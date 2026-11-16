---
id: 4
status: done
---
# Outcome

Gaps in a queue are found before the first dispatch, while the user is
present. Brief: [queue-check](../brief.md#queue-check). Source: Max's note on
`decision-needed-effect` ("we need to be sure to try and answer as much as we
can upfront"). The command itself is the agent's reading of that note.

## acceptance

- A missing `Check:` is found. Check: a fixture queue whose spec 2 has an
  acceptance bullet with no `Check:`; `node .joycraft/runtime/queue-check.mjs
  --queue <queue>` exits 2 and stderr names spec 2 and the bullet
  (`tests/runtime/queue-check.test.mjs`, `[AC:check-missing-check]`).
- A missing input is found. Check: a verification input path that does not
  exist and is not declared `state: 'absent'`; exit code 2, the path is named
  (`[AC:check-missing-input]`).
- A bad dependency is found. Check: a dependency on a spec id that is not in
  the queue, and a dependency cycle; exit code 2 for each, the ids are named
  (`[AC:check-dependencies]`).
- An open decision is found. Check: the brief has an `open` decision whose
  `affected` names a heading that a queued criterion cites; exit code 2, the
  decision id and the spec are named. The same decision `clarified` gives exit
  code 0 (`[AC:check-open-decision]`).
- A clean queue is silent. Check: exit code 0 and empty stderr. A queue with a
  pre-1.0 `schemaVersion` is skipped with exit code 0 (`[AC:check-clean]`).
- Each message says what to do. Check: every finding ends with the same next
  step: add it to the brief as an open decision and ask the user now
  (`[AC:check-names-fix]`).
- The skills run it at two points. Check: `joycraft-decompose/SKILL.md` runs
  the command before it hands the queue on, and its list of pre-queue checks
  keeps only the ones a program cannot decide. `joycraft-implement/SKILL.md`
  runs it before the first dispatch of a queue. The two files together do not
  grow (`[AC:check-prose-replaced]`).

## Not covered

Checks that need judgment: whether a criterion depends on behavior an earlier
spec has not built, whether a runtime criterion has its environment recipe,
whether coverage matches the original request. They stay in the decompose
skill. A block on dispatch: the command reports; the agent asks the user.

## Implementation and verification scope

Implemented in joycraft-prototype: new `.joycraft/runtime/queue-check.mjs`
with a pure export, reusing `validateQueue` and `briefDecisionRecords` from
`.joycraft/runtime/identity.mjs`; `.agents/skills/joycraft-decompose/SKILL.md`;
`.agents/skills/joycraft-implement/SKILL.md`;
`tests/runtime/queue-check.test.mjs`; fixtures under `fixtures/queue-check/`.
An unexpected error exits 1, not 2.

---
id: 3
status: done
---
# Outcome

One command runs a check and writes its receipt. Brief:
[evidence-run](../brief.md#evidence-run). Ruling `sensitivity-check`:
"not-here", so the command has no expect-fail mode.

## acceptance

- A run writes a receipt and prints the observation parts. Check: `node
  .joycraft/runtime/evidence.mjs run --receipt <path> -- node -e
  "console.log('ok')"`; the receipt holds the raw stdout and stderr; stdout of
  the command is JSON with `command: { argv, exitCode: 0 }` and `receipts:
  [{ path, sha256 }]`; the hash equals the receipt bytes
  (`tests/runtime/evidence-run.test.mjs`, `[AC:run-writes-receipt]`).
- The real exit code is recorded. Check: a child that exits 3 gives
  `exitCode: 3`, and a failing child's output is in the receipt in full
  (`[AC:run-real-exit-code]`).
- The run rule is applied by the command. Check: the child sees `CI=1`; with
  `--timeout-ms 200` and a child that sleeps, the child is ended, the result
  has `exitCode: null` and `timedOut: true`, and the default limit is 300000
  (`[AC:run-rule-applied]`).
- The receipt path is safe. Check: a `--receipt` path outside the project, or
  one that git does not ignore and that is not under the feature folder, exits
  2 before the child starts; an existing receipt is not overwritten
  (`[AC:run-receipt-path]`).
- It wraps any stack. Check: the argv after `--` is passed to the child with
  no shell; the fixture runs a `python3 -c` and a `sh -c` child as well as
  Node (`[AC:run-any-stack]`).
- The run rule is stated once. Check: "single-run mode with `CI=1` and a
  300000 ms timeout" is in `references/testing.md` only. The three skills and
  two agent files tell the agent to run tests through `evidence.mjs run`. Their
  word counts go down (`[AC:run-prose-replaced]`).

## Not covered

Visual evidence: it stays with the project's review-loop tools. The
test-sensitivity check (backlog, first in line). Whether the test is right.

## Implementation and verification scope

Implemented in joycraft-prototype: `.joycraft/runtime/evidence.mjs` (new `run`
subcommand; `validateEvidence` is unchanged),
`.joycraft/references/testing.md`, `.agents/skills/joycraft-implement/SKILL.md`,
`.agents/skills/joycraft-verify/SKILL.md`,
`.agents/skills/joycraft-testing/SKILL.md`,
`.claude/agents/joycraft-implementer.md`, `.claude/agents/joycraft-reviewer.md`,
`tests/runtime/evidence-run.test.mjs`. No new dependency: Node's
`child_process` only. The boundary crossed is the runtime to the project's own
command; the discriminating scenario is the child that exits 3, where a shell
pipeline would report the last command's status.

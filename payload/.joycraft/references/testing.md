# Evidence at the boundary of the claim

The requirement owns the claim; choose evidence that can distinguish a correct
implementation from a plausible fault. Prefer the nearest meaningful boundary.
A test or command that only scans source still supplies structural evidence;
running it successfully does not turn its claim into runtime proof.

| Claim | Useful observation | Limit |
|---|---|---|
| Discount precedes tax | Call the real invoice function with multiple quantities, a nonzero discount and tax; assert exact totals | Establishes bounded arithmetic, not payment, storage or UI behavior |
| Repair advances through a lifecycle | Compose real transitions; check final state, rejected transition and unchanged prior state | Individual handler tests alone may miss the composed sequence |
| Module exports a specified contract | Inspect the export or compile a real consumer | Structural evidence; source presence cannot prove execution |
| Narrow layout remains usable | Inspect the actual narrow render; operate relevant controls and inspect results | Screenshot capture alone is not inspection; appearance cannot establish durable persistence |

Do not edit production code merely to manufacture red evidence; an isolated
temporary copy can show sensitivity. No universal coverage target or
end-to-end requirement follows from these examples.

### Running tests

Commands are in `AGENTS.md`. Run tests in three tiers:

- **While you work:** run only the tests for the code you changed: one file,
  package or name filter. If `AGENTS.md` names no focused command, find the
  filter in the runner's help or the CI file, and report the command.
- **Project gate:** the coordinator runs it at each `gate-plan` point (per
  spec or per wave, `tests.gateRuns`); workers and reviewers run focused tests
  only. A commit that changes only Joycraft records needs no test run.
- **Full suite:** run it one time on the final integrated revision: in CI
  when the project has CI, else locally before the push.

A pass on a rerun is FLAKY, not PASS. Record a follow-up with both receipts
and continue, unless the test covers this spec's criterion. Never add a
retry, a sleep, a skip or a special case for a test's input to get a pass. If an existing test or a criterion
looks wrong, report `spec gap: test is wrong` with the reason; never edit,
skip or delete it to pass.

Run each command once, in single-run mode with `CI=1` and a 300000 ms
timeout, through
`node .joycraft/runtime/evidence.mjs run --receipt <path>.log -- <command...>`
(`--timeout-ms <n>` changes the limit). It uses no shell, saves raw output
to a new git-ignored or feature-folder receipt, and prints the
`revision` it ran on. Never start watch mode. Copy the printed `command`,
`revision` and `receipts` into the observation. It exits 1 when the command
fails, is killed or times out, and still writes the receipt; exit 2 means it
refused to run. Set the host tool timeout to at least this limit. A timeout
during parallel runs is not yet a hang: rerun once, alone. If it times out
again, report it with the receipt. Never wait in a foreground loop: start a
long command in the background and act on its completion notice. Never give
a verdict while your own command is still running.

## Commands and receipt records

In `test` and `command` observations, `command.exitCode` is the actual outcome;
`null` means unavailable. Never substitute grepped success text or a
pipeline's final status for it. A nonzero or missing status cannot support PASS.

Each observation has at least one supporting receipt with a project-relative path
and SHA-256. A receipt may be raw command output, inspection notes, an image, or a
browser trace. Hash the bytes after saving. Completion checks the file bytes;
evidence validation itself never reads files. A hash proves which bytes were
reviewed, not that their assertions are true.

## One flow, several criteria

Use the shared `FlowEvidence` shape. Give the flow a stable id, subject identity,
the relevant criterion ids, representative input/initial state, expected result,
actual observations, receipt references and explicit limits. Multiple observations
can supply different required evidence kinds. One composed booking/cancellation
flow, for example, can support several related criteria when the observations
actually cover them. Do not attach unrelated criteria merely to fill the matrix.

`validateEvidence(report, criteria)` returns `{ ok, errors }`. It fails on malformed
evidence, a missing criterion/kind pair, an unknown criterion, a mismatched flow
identity, a source scan labelled runtime/visual, unresolved FAIL/UNVERIFIED,
unsuccessful command status or uninspected visual evidence. Earlier failing runs
belong in diagnostic history; an acceptance report must contain the current
observations after repair. Do not relabel a failure as resolved without rerunning
the affected check against the current subject.

The validator does not read receipts, run commands or find omitted
requirements; the reviewer and completion check those.

## Visual observations and the repair loop

Record the rendered route, relevant state, viewport width/height, what the observer
actually inspected, and each performed interaction with its resulting outcome.
For routing claims, exercise the real router state, including reopen/reload,
back/forward, and scrolling when they are part of the journey.
`visual.inspected` is true only after the observer examined the render. A
screenshot saved to a path but never viewed leaves the check UNVERIFIED. DOM or
accessibility checks can support runtime observations without certifying visual
appearance. Use a separate runtime observation when the claim includes durable
state, backend effects or another behavior that appearance alone cannot prove.

Compare a render with an accepted reference only when the requirement calls
for it; name the visible element and its requirement.

An empty `visual.interactions` list suits a static claim or a tool whose
`canShow` has no `interact`. For an interactive requirement whose tool can
interact, the reviewer requires the actions and outcomes. A disabled control
or error state can itself be an observed result; explain it.

When an inspection finds a scoped defect: retain the observation, fix it, render
again, repeat affected interactions and inspect the result. If the fix changes a
bound input, obtain a new subject and fresh affected observations before seeking
completion. Keep the final flow concise and link prior diagnostics rather than
copying a transcript. A broken recorded tool is an UNVERIFIED check with
`cause: 'tool-break'`; a command the host denies is not. A route the app
does not serve can be a FAIL. Never
route around a denied command; ask the host for the correction.

## Where checks run

Read the project's CI policy before adding a check to CI; a local visual
check does not belong there by default. Repair an environment-only
UNVERIFIED result and rerun the review; do not send unchanged code through a
fix round. A test race needs a diagnosis, not a longer timeout.

## Criterion tags

Tag each acceptance test with its queue criterion ID, `[AC:<criterion-id>]`, in the
test name or a comment, in any language. `trace.mjs --queue <queue> --spec <id>`
lists each criterion with its tagged tests from the spec's `check` inputs (add
`--tests <glob>` for undeclared files) and exits 2 while a criterion is untraced.
Reviewer startup includes the same trace. A tag shows that a test claims the
criterion; it does not show that the test is right. Write the test from the spec
text before reading the implementation.

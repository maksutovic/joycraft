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

An unchanged characterization can pass while a new regression fails. Red/green
means the new assertion detects the right fault, not that every test must fail.
Do not edit production code merely to manufacture red evidence; an isolated
temporary copy or existing failing behavior can demonstrate sensitivity when
useful. Record exactly what was exercised. No universal coverage target or
end-to-end requirement follows from these examples.

### Running tests

Run focused checks once, in the runner's non-interactive single-run mode (for
example `vitest run`, `jest --watchAll=false`, or the project script with that
flag passed through) with `CI=1` set. Never start watch mode. Give each test
command a 300000 ms tool timeout or the project's available supervisor. A
timeout while other test runs share the machine is not yet a hang: rerun once,
alone, with fewer workers. If it times out again, stop leftover test processes
and report the condition with the command; do not keep rerunning. Never wait
in a foreground loop (`until …; do sleep`, `kill -0`, polling a log): start a
long command in the background, keep working, and act on its completion
notice. If a shared lock or verify slot stays busy for more than 5 minutes,
stop and report it instead of waiting. Never give a verdict while your own
command is still running. A
reviewer may reuse a suite receipt bound to the same revision instead of
rerunning it. A bug fix needs a meaningful failing regression only when one
can distinguish the repaired fault. Ordinary edits do not require ritual red/green.

## Commands and receipt records

For `test` and `command` observations, `command.argv` records the executed command
and `command.exitCode` records its actual outcome. `null` means unavailable.
Keep raw stdout/stderr, including failure output, in a receipt; do not substitute
grepped success text or a pipeline's final status for the command outcome. A
nonzero or missing status cannot support PASS. Do not claim a process finished
while it is still running.

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

The validator does not inspect receipt contents, execute commands, determine
whether inputs are representative, or discover omitted dependencies/requirements.
The independent reviewer checks those judgments against the actual brief/spec.
Completion separately checks current identity, receipt hashes, review independence,
scope review and verdict before changing status. Tests of this validator protect
its mechanical boundary; they are not an independent judge of a product outcome.

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

When a visual requirement specifically calls for restoration or comparison, name
the actual visible element and its owning clarified requirement. Compare it with
an accepted reference only when that reference is part of the requirement or is
available and relevant to the comparison. This does not create a universal
before/after gate.

An empty `visual.interactions` list is appropriate for a static appearance-only
claim. For an interactive requirement, the reviewer must require the relevant
actions and outcomes; the validator cannot infer them from a criterion id. A
disabled control or error state can itself be an observed result; explain it.

When an inspection finds a scoped defect: retain the observation, fix it, render
again, repeat affected interactions and inspect the result. If the fix changes a
bound input, obtain a new subject and fresh affected observations before seeking
completion. Keep the final flow concise and link prior diagnostics rather than
copying a transcript. An unavailable browser, inaccessible route or blocked tool
is a limit and UNVERIFIED check, not permission to bypass access controls or
declare visual PASS. Do not wrap, relay, or otherwise route around a denied
command; ask the host for the legitimate correction. Continue independent work
that remains possible.

## Where checks run

Read the project's owning CI and runtime policy before adding a check to CI.
Local browser verification, routine CI checks and one-off data/media studies
can have different environments and lifetimes. A required local visual check
does not automatically belong in CI. Diagnose an environment-only UNVERIFIED
result as an environment limitation, repair that setup, and rerun the affected
review; do not send unchanged code through a speculative fix round. A genuine
test race still needs a code/test diagnosis, not just a longer timeout.

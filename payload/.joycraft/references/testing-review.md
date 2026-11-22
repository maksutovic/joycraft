# Test review

Opt-in, after a cleanup that a person asks for. Ask one time: "Do you want
a review of the tests and CI, with recommendations?" On no, stop.
Unattended cleanup never asks, and never edits or deletes a test.

## Measure first

Run the full suite one time, with the runner's duration output, through
`node .joycraft/runtime/evidence.mjs run --receipt <path>.log -- <full suite command>`.
Report its run facts: `wallMs`, `load`, `cores` and `loaded`. A slow time on a
`loaded` machine is not yet a slow test: note the load, and compare two times
only at a like load. List the slowest files and their share of the time. Read
the CI workflows and count how many times one push and one merge run the full
suite.

## Find

Rank the findings by what every run pays first: global setup, or a file that
every focused run or gate loads. Then rank by the slowest file.

- Global setup that every run pays: logging, a monitoring SDK left on,
  coverage mode, production-strength crypto, heavy imports.
- Setup per test that can run once per file or per run: migrations, git
  repositories, large fixtures. Build it once and copy it per test.
- A real wait: a sleep, a real timer, a retry back-off, a timer inside child
  code. Inject the clock or the delay.
- A control keyed on `CI` (a worker cap, a slot, a lower priority):
  `evidence.mjs` sets `CI=1` on every agent run, so the control turns off for
  agents. Key it on `JOYCRAFT_EVIDENCE` or on the CI provider's own variable.
- A test that starts a nested test runner or runs the suite in a child
  process: cap the child at one worker, or move the test to its own tooling
  suite that runs only when tooling changes.
- A test whose subject does not ship: it imports or reads a path that no
  shipped entry point reaches, or a finished one-time operation.
- A change detector: it asserts exact prose that no code reads. A key or a
  marker that code parses stays.
- A test with no real oracle: it compares a value with itself, its expected
  value comes from the subject, or a mock supplies the behavior it asserts.
- A slow file and its cause: a process, the network, a sleep, a large read.
- A flaky test, an automatic retry, or a skip with no owner.
- The same suite in two workflows, or on push and on pull request.
- `AGENTS.md` names no focused command, project gate or full suite.
- A required check that is not required, so a red PR can merge.

## Recommend

For each finding, give the claim that the test protects, the evidence and
one fix. Before a deletion, move real regression coverage to a live test.
Recommend the tiers of [running tests](testing.md#running-tests) as
`AGENTS.md` commands. Recommend test selection from each spec's declared test
files: a spec runs its own tests, and the gate runs once per spec or wave.
For a slow real dependency, keep one end-to-end case on it and run the
variations in-process through a seam, against the same assertions. Offer a
time limit or a result cache only after a measurement: count how often a run
repeats an already tested tree first. Selection by imports misses tests that
read files or start processes. Leave counts that only shrink (fixed waits,
nested runners, skip lists), never time budgets.

## Apply

The review itself edits no test. Write each change the person approves as a
[test-only spec](#test-only-specs) for a queue, in decompose's format, with its
`## Test changes` class: one file or one subsystem in each spec. A seam or a
fix that the tests need goes first, in its own spec. A deletion names the claim
the test protected, the test that now owns it or `claim retired: <owner
decision>`, and the owner's yes. Report the full-suite time and run facts
before and after the queue, measured the same way.

At the end, when the project has no testing page, write `<context>/testing.md`
from [the testing page template](testing-page.md), filled in with what the
review found, and add the map row "A test run is slow or flaky".

## Test changes

Read for every spec that changes a test file. Decompose writes the spec's
`## Test changes` section from the template's three classes. When a brief's
"no weakened tests" contradicts the feature, ask the owner once.

Specs that delete tests or change shared test tooling (runner config, guards,
selection lists) take the one serial lane (`execution.parallel: false`); other
test-only specs may run in parallel.

Reviewer rules:
- Read `testChanges` from startup: `declared` (with class), `undeclared` and
  `addedAfterBase` changed test files. A missing `testChanges` is never
  "none": run `node .joycraft/runtime/test-changes.mjs --queue <queue> --spec
  <id> --base <captured base>` or ask the coordinator. Judge each diff by its
  declaration, not as weakened.
- A declaration covers only the change its requiring line names and its class
  proves; anything else in the diff of that file is undeclared. A class-1 line
  that does not state the new value, or a bullet with no requiring line,
  declares nothing.
- A declaration added after the base (`addedAfterBase`) counts only with a
  requiring acceptance line that existed at the base.
- Block only an undeclared change that no line requires. A deletion, even when
  required, needs the class-3 ledger row and owner yes.
- A class-1 change passes when its acceptance line states the new value; class
  2 needs its fault proof, class 3 its ledger row and owner yes.
- A declaration of either path of a rename covers both. Pair the two paths
  with `git diff -M <base>`; a rename that drops assertions is class 3.
- A new skip, in a file or a list, and a test that leaves the gate count as
  removals (class 3). A test may be removed when it
  conflicts with a later owner decision; it is class 3 too.
- A red or flaky test outside the spec's set is a follow-up, never a hold.
- A changed test that reads a path under the features folder (`featurePaths`)
  is a follow-up finding.

## Test-only specs

A test-only spec changes tests, fixtures and test lists only: `git diff
--name-only` against its base lists no other file. A seam or a fix that the
tests need goes first, in its own spec that leaves the tests untouched.

For each test file it changes (class 2), the implementer:
1. Chooses faults with intent: one fault per assertion or behavior the diff
   removes or changes. This is kill-set preservation: what the old file caught,
   the new file still catches.
2. Saves each fault as a patch file before it edits the test file. Patches and
   their receipts go in a git-ignored path such as `.joycraft/local/faults/`,
   or are committed first: `evidence.mjs run --patch` refuses a dirty tree,
   untracked files included. Before the test edit, it records each patch's
   sha256 in the spec or in a committed list.
3. Runs the old file on each fault:
   `node .joycraft/runtime/evidence.mjs run --patch <fault>.diff --receipt <path>.log -- <focused command>`.
   A fault counts only when the old file fails on it. A timeout or a build
   error is not a fail.
4. Commits the test edit before it reruns the faults on it, then runs the new
   file, or a named kept test, on each fault the same way. Each run must fail.

The reviewer reruns one saved fault and one of its own, in a tree it may
change and restore. It aims its own fault at an assertion or behavior the diff
removed, and checks out the base to run the old file on it. It checks that each
old-run receipt carries the base revision and the same patch sha256 as the new
runs. A reviewer in a separate tree gets the patches through a commit of the
patch files (not the receipts) or through its packet. Its own patches and
receipts go in a git-ignored path; only the final report receipts go in the
feature folder, after its last fault run. A reviewer that shares the
coordinator's tree runs no fault: it reads the saved receipts and states that
as a limit. Block only when the old file catches a fault that the new file
misses; any other survivor is a finding. The verdict states the proof's limit
in one line: "the chosen faults are still caught; this does not show the test
is as strong as before."

# Test review

Opt-in, after a cleanup that a person asks for. Ask one time: "Do you want
a review of the tests and CI, with recommendations?" On no, stop.
Unattended cleanup never asks, and never edits or deletes a test.

## Measure first

Run the full suite one time with the runner's duration output. List the
slowest files and their share of the time. Read the CI workflows and count
how many times one push and one merge run the full suite.

## Find

- A test whose subject does not ship: it imports or reads a path that no
  shipped entry point reaches, or a finished one-time operation.
- A change detector: it asserts exact prose that no code reads. A key or a
  marker that code parses stays.
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
Recommend a result cache only when the full suite is slow: selection by imports
misses tests that read files or start processes.

## Apply

Change only what the person approves. Each test deletion is its own commit,
with no code change. Run the full suite before and after, and report both
times.

At the end, when the project has no testing page, write `<context>/testing.md`
from [the testing page template](testing-page.md), filled in with what the
review found, and add the map row "A test run is slow or flaky".

## Test changes

Read for every spec that changes a test file. Decompose writes the spec's
`## Test changes` section from the template's three classes. When a brief's
"no weakened tests" contradicts the feature, ask the owner once.

Reviewer rules:
- Read `testChanges` from startup: `declared` (with class) and `undeclared`
  changed test files. Judge each diff by its declaration, not as weakened.
- Block only an undeclared change that no line requires.
- A class-1 change passes when its acceptance line states the new value; class
  2 needs its fault proof, class 3 its ledger row and owner yes.
- A declaration of either path of a rename covers both.
- A new skip, in a file or a list, and a test that leaves the gate count as
  removals (class 3). A test may be removed when it
  conflicts with a later owner decision; it is class 3 too.
- A red or flaky test outside the spec's set is a follow-up, never a hold.
- A changed test that reads a path under the features folder (`featurePaths`)
  is a follow-up finding.

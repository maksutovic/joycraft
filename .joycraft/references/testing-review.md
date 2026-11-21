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
`AGENTS.md` commands. Do not recommend test selection or a result cache
unless the full suite is slow: selection by imports misses tests that read
files or start processes.

## Apply

Change only what the person approves. Each test deletion is its own commit,
with no code change. Run the full suite before and after, and report both
times.

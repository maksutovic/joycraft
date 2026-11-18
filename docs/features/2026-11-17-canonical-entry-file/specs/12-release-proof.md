---
id: 12
status: todo
---
# Outcome

The measures in the brief are run on the built bundle before any release
step, and their results are on one page for the owner. Brief:
[one-pass](../brief.md#one-pass), "Measures".

## acceptance

- The shipped text runs alone. Check: a fresh agent with only the installed
  bundle runs the cleanup on a clean clone of the field project; the report
  gives its question rounds, its ledger, and how many of the 38 known findings
  it fixed (`[AC:native-run]`).
- The other measures are run or named as not run. Check: the report has one
  row for each measure in the brief with its result and its stop condition
  (`[AC:measures-reported]`).
- Nothing is released by this spec. Check: no tag, vendored payload, version
  change or pull request exists when it ends (`[AC:no-release]`).

## Not covered

The release itself (spec 8). A change to the field project: every run is on a
scratch clone, and its results stay out of this repository.

## Implementation and verification scope

Scratch clones only. The report is a rendered page for the owner, kept outside
both repositories.

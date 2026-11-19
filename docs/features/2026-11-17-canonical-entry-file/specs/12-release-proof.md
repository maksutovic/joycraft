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
- The owner decides on the open measures. Check: the owner gave the go for the
  release with the measures in "Result" open, and accepted this proof by name
  on 2026-11-18; the decision log has his words; a break after the release
  becomes a brief for 1.6.1 (`[AC:owner-accepts-proof]`). This check replaced
  "nothing is released by this spec" on 2026-11-18: the tag and the pull
  request exist, so that check cannot pass.

## Not covered

The release itself (spec 8). A change to the field project: every run is on a
scratch clone, and its results stay out of this repository.

## Implementation and verification scope

Scratch clones only. The report is a rendered page for the owner, kept outside
both repositories.

## Result, 2026-11-18

The owner saw a page with one row for each measure of the brief and one
decision: "Do you accept the release proof (spec 12) as it stands?" He saved the
answer "Accept: close spec 12 with these results". Before that he said: "if it
really breaks or whatever we'll just do a fresh brief for 1.6.1 so no reason we
can't just close this out for real before the merge". The page is kept outside
both repositories. This record comes from the session that showed him the page.

| Measure | Result |
|---|---|
| At most eight questions, each answerable from the page | 8 questions in one round. He could not answer one of them from the page. Fail on that one question |
| No permission change that no answer decides | 0. Pass. A recommendation that he did not veto decided 8 changes. 2 readings of his answers were not marked as readings |
| At least three quarters of the known false or stale statements fixed | 113 of 134 (84%) after the closing loop, 81% before it. Pass |
| At most two rounds of questions | One. Pass |
| The field project's own gate | Not run: the scratch clones have no dependencies |
| A small second repository | Failed on an earlier skill text: the entry file went from 292 to 473 words, 162 of them Joycraft's block that the repository never had, and the run asked 5 questions. Not run again on the final text |
| A worker with the new files against the old | Not run |
| An update from 1.5.4 leaves no old Joycraft line | Passed in the run before the last one. In the last run the block was left unplaced, because one owner question was open |

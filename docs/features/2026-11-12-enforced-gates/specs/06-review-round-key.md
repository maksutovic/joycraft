---
id: 6
status: done
---
# Outcome

A review round is one distinct set of reviewed inputs. A commit that changes
no verification input of the spec does not use up a round. Brief:
[review-cap](../brief.md#review-cap). Ruling `review-cap` "enforce": "Each
code revision counts once, so a new review after an environment repair is not
counted." Spec 5's independent review found that `subject.identity` includes
the HEAD commit, so a commit for another spec (the coordinator's completion
commit, a README edit) starts a new round. This spec keeps the ruling's
meaning. It replaces the round key of spec 5 and nothing else.

## acceptance

- An unrelated commit does not start a round. Check: a fixture project in a
  temporary git repository; one earlier report for spec 4; then a commit that
  changes only a file that is not among spec 4's verification inputs; reviewer
  startup for spec 4 prints `reviewRound: 1`. With spec 5's key the same case
  gives 2 (`tests/runtime/review-cap.test.mjs`,
  `[AC:unrelated-commit-same-round]`).
- A change to a reviewed input starts a round. Check: the same fixture with a
  commit that changes one of spec 4's `code` inputs; startup prints
  `reviewRound: 2`. A change of the spec's status in the queue or in the spec
  frontmatter alone does not start a round (`[AC:input-change-new-round]`).
- A report with no bound inputs still counts once by its path. Check: the
  legacy case of spec 5 gives the same rounds as before
  (`[AC:round-key-legacy]`).
- Spec 5's behavior holds. Check: the five spec 5 tests pass with their
  assertions unchanged. Their fixtures may give each round its own input hash,
  because three reports with one set of inputs are now one round
  (`[AC:cap-behavior-holds]`).
- The reference says what a round is. Check: the `reviewRound` line in
  `.joycraft/references/dispatch.md` says a round is one distinct set of
  reviewed inputs, in the same number of lines (`[AC:round-key-documented]`).

## Not covered

Whether an unaccepted PASS counts as a round; a cap in `check-report`,
`finalize-review` or the legacy `prepare` path; reports that do not travel to
another clone. They are follow-ups for the owner.

## Implementation and verification scope

`.joycraft/runtime/dispatch-start.mjs` (the round key only),
`.joycraft/runtime/identity.mjs` (read first: how a subject binds its inputs
and which normalization keeps a status change out of the hash; change it only
if the key needs an export), `tests/runtime/review-cap.test.mjs`, fixtures
under `fixtures/review-cap/`, `.joycraft/references/dispatch.md`. The boundary
crossed is reviewer startup to the reports on disk; the discriminating scenario
is the unrelated commit, which changes `subject.identity` and must not change
the round. An unexpected error exits 1, not 2.

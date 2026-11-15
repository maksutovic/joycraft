---
id: 5
status: todo
---
# Outcome

The rule "a spec gets at most three reviews" is enforced by the runtime, on
every harness. Brief: [review-cap](../brief.md#review-cap). Ruling `review-cap`
(2026-11-15, [talk review](../../2026-11-15-talk-review-tan-holmes/brief.md)):
"enforce". Each code revision counts once.

## acceptance

- A fourth review is refused. Check: a fixture feature where spec 4 has three
  reports with three different `subject.identity` values, none of them an
  accepted PASS; run `dispatch-start.mjs --role reviewer` for spec 4 with a
  fourth subject; exit code 2, no packet is written, and stderr names the
  feature, spec 4, the three report paths and the next step: record
  `## Decision needed` in the spec and leave it `in-review`
  (`tests/runtime/review-cap.test.mjs`, `[AC:fourth-review-refused]`).
- A repeat review of the same revision is not counted. Check: three reports
  where two share one `subject.identity` (a fresh review after an environment
  repair); a reviewer startup for a new subject is ready, and its output says
  `reviewRound: 3` (`[AC:same-revision-counts-once]`).
- The round is printed. Check: reviewer startup output carries `reviewRound`
  (1, 2 or 3) and `reviewLimit: 3`; implementer startup output has neither
  (`[AC:round-printed]`).
- Old and unreviewed work is not blocked. Check: a spec with no reports starts
  at `reviewRound: 1`; a `done` spec and a spec under a `no-review` waiver keep
  their 1.3.0 behavior; a legacy report with no `subject.identity` counts as
  one review by its path (`[AC:cap-legacy-safe]`).
- The skill states the rule once and points to the check. Check:
  `joycraft-implement/SKILL.md` no longer tells the agent to "state the real
  round number"; it says the startup prints the round and refuses the fourth.
  The sentence count of that paragraph does not grow (`[AC:cap-prose-replaced]`).

## Not covered

A cap on implementer fix attempts. Review quality. The existing stop rule (a
second FAIL on the same criterion, or a "decision needed" finding) stays as it
is. An owner acceptance after the third review uses the existing
`accept-owner` path.

## Implementation and verification scope

Implemented in joycraft-prototype: `.joycraft/runtime/dispatch-start.mjs`
(reviewer role only), reusing `visibleReports` from
`.joycraft/runtime/completion.mjs`; `.agents/skills/joycraft-implement/SKILL.md`;
`.joycraft/references/dispatch.md` (one line on `reviewRound`);
`tests/runtime/review-cap.test.mjs`; fixtures under `fixtures/review-cap/`.
The boundary crossed is reviewer startup to the report files on disk; the
discriminating scenario is two reports with the same `subject.identity`, which
a count of files would treat as two rounds. The gate check of spec 1 is
unchanged (`hook-set`: "stop-only", "nothing else"). An unexpected error exits
1, not 2. Source: Lauren Tan, "All Code Is Slop (Except Mine)" (9:14).

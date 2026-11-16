---
id: 2
status: done
---
# Outcome

A review report can carry a finding that does not block, and a queue does not
stop for a question that can wait. Brief: [findings](../brief.md#findings).
Rulings: `report-contract` "additive"; `decision-needed-effect` "holds", with
Max's note: "we should only stop the spec/queue for something absolutely
mandatory or something completely broken, we should have enough context up
front to complete the queue and or do a followup after for the user to answer".

## acceptance

- A follow-up does not block. Check: a schema-v1 report with verdict PASS,
  empty `unresolved` and one finding of class `follow-up`;
  `completion.mjs finalize-review` completes the spec
  (`tests/runtime/findings.test.mjs`, `[AC:follow-up-passes]`).
- A blocking finding blocks. Check: the same report with one finding of class
  `blocking`; completion exits 2 and stderr names the finding id and its
  criterion (`[AC:blocking-refuses-pass]`).
- A decision-needed finding holds only its spec. Check: a report with one
  finding of class `decision-needed`; completion exits 2, the spec stays
  `in-review`, and `dispatch-preflight` still reports an independent `todo`
  spec of the same queue as ready (`[AC:decision-needed-holds-one-spec]`).
- Old reports stay valid. Check: a 1.3.0 report with no `findings` completes
  and archives as before; a report with a non-empty `unresolved` is refused as
  before (`[AC:findings-optional]`).
- A malformed finding is refused by `check-report`. Check: a finding with no
  `id`, an unknown `class`, an unknown `origin`, or a `blocking` or
  `decision-needed` finding with neither `criterion` nor `at`; `check-report`
  exits 2 and names the field (`[AC:findings-validated]`).
- Questions for the user are listed in one place. Check: `status.mjs` prints,
  for each feature, the follow-up findings of accepted reports and the
  decision-needed findings of current reports, each with spec, id and summary.
  A follow-up carries the reviewer's `assumption`
  (`[AC:status-lists-questions]`).
- The skills state the narrow rule once. Check: `joycraft-verify/SKILL.md`
  says: a case the spec does not decide is a `follow-up`; the reviewer takes
  the reading closest to the brief's intent and records the assumption;
  `decision-needed` is only for two readings that give opposite verdicts on a
  stated criterion, or a guess that cannot be undone.
  `joycraft-reviewer.md`, `joycraft-implement/SKILL.md` and
  `joycraft-session-end/SKILL.md` point to it and do not restate it. The four
  files together have fewer words than before (`[AC:findings-prose-replaced]`).

## Not covered

Detection of a finding repeated from an earlier round. A scorecard. A change
to owner acceptance or waivers. Whether a follow-up's assumption was right: the
user reads it at session end.

## Implementation and verification scope

Implemented in joycraft-prototype: `.joycraft/contracts/types.d.ts`
(`VerificationReport.findings?`: `id`, `class`, `origin` of `new`,
`pre-existing` or `unknown`, `criterion?`, `at?`, `summary`, `assumption?`),
`.joycraft/runtime/completion.mjs` (`validateReview`,
`validatePassingReport`, `checkReport`), `.joycraft/runtime/status.mjs`,
`.agents/skills/joycraft-verify/SKILL.md`, `.claude/agents/joycraft-reviewer.md`,
`.agents/skills/joycraft-implement/SKILL.md`,
`.agents/skills/joycraft-session-end/SKILL.md`,
`.joycraft/references/completion.md`, `tests/runtime/findings.test.mjs`. The
boundary crossed is reviewer report to completion; the discriminating scenario
is a PASS with a follow-up, which 1.3.0 can express only by leaving the finding
out. The 1.4.0 gate check does not change: an `in-review` spec passes it.

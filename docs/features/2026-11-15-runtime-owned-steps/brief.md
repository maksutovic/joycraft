---
feature: runtime-owned-steps
status: specified
decisions: [
  {
  "id": "report-contract",
  "status": "clarified",
  "question": "How do findings enter the review report?",
  "answer": "additive",
  "context": "The verify skill tells the reviewer to report every finding with a severity: blocking, decision needed, or follow-up. The report has one field for this, `unresolved: string[]`, and completion refuses a PASS when it has any entry (`completion.mjs:76`). So a reviewer with a non-blocking finding must leave it out of the report or fail the spec. Reports are bound by hash and kept in the archive, so old reports must stay valid.",
  "options": [
    {
      "value": "additive",
      "label": "Add an optional findings list",
      "recommended": true,
      "description": "The report keeps schema version 1 and gains an optional `findings` list. Each finding has an id, a class (blocking, decision-needed, follow-up), an origin (new, pre-existing, unknown), the criterion it touches and a file:line or receipt. A PASS needs no blocking finding and an empty `unresolved`.",
      "example": "The reviewer records \"follow-up: the empty state has no icon\" and the spec still passes. A 1.3.0 report with no `findings` completes as before.",
      "tradeoff": "For some time two fields mean nearly the same thing."
    },
    {
      "value": "v2",
      "label": "A new report version",
      "description": "Schema version 2 replaces `unresolved` with `findings`. Completion, the archive check and the gate accept both versions.",
      "example": "A new review writes a version 2 report. A version 1 report in the archive still validates.",
      "tradeoff": "Every validator handles two versions. The change is larger and touches the archive."
    },
    {
      "value": "custom",
      "label": "Something else",
      "description": "Describe what you want instead.",
      "requiresNote": true
    }
  ],
  "recommendation": "The additive form fixes the contradiction with the smallest change, and no old report needs a migration.",
  "affected": [
    "findings"
  ]
},
  {
  "id": "decision-needed-effect",
  "status": "clarified",
  "question": "Can a spec complete while a \"decision needed\" finding is open?",
  "answer": "holds",
  "context": "A \"decision needed\" finding is a case the spec does not decide. Today the skills say: it is not a FAIL, the agent sends no further fix, notes it under \"Decision needed\" in the spec and leaves the spec in-review. Nothing in the runtime knows about it. With structured findings the runtime can apply one rule.",
  "options": [
    {
      "value": "holds",
      "label": "It holds the spec",
      "recommended": true,
      "description": "A decision-needed finding stops completion. The spec stays in-review until the brief decision is answered and a fresh review has no such finding. The gate check reports it as held, not as a failure.",
      "example": "The reviewer finds that the spec does not say what happens to an empty cart. Completion refuses and names the finding. You answer; the next review passes.",
      "tradeoff": "A spec can wait on you for a small question."
    },
    {
      "value": "completes",
      "label": "It completes, and the question is listed",
      "description": "A decision-needed finding does not stop a PASS. The session-end page lists each open one for you.",
      "example": "The spec is done. The session-end page says: \"spec 3: empty cart behavior is not decided\".",
      "tradeoff": "A spec is done while a question about its behavior is open."
    },
    {
      "value": "custom",
      "label": "Something else",
      "description": "Describe what you want instead.",
      "requiresNote": true
    }
  ],
  "recommendation": "It matches what the skills say today, so the change is where the rule lives, not what it is.",
  "affected": [
    "findings"
  ],
  "note": "if we do this we need to be sure to try and answer as much as we can upfront, remember folks will be runnign these queues autonmously and will mostl ikely be away from their computer, we should only stop the spec/queue for something absolutely mandatory or something completely broken, we should have enough context up front to complete the queue and or do a followup after for the user to answer if that makes sense"
},
  {
  "id": "submit-checks",
  "status": "clarified",
  "question": "What does the new submit command check before it sets a spec to in-review?",
  "answer": "write-and-warn",
  "context": "Today the implementer sets \"in-review\" by two hand edits: the queue entry and the spec frontmatter. No runtime file writes that status. `status.mjs` and the new gate check exist to find the drift. A `completion.mjs submit` command can do both writes as one journaled write, the way completion already writes \"done\". The verify skill also says that a criterion with no tagged test is a finding, and that \"a missing tag alone is not a FAIL\".",
  "options": [
    {
      "value": "write-and-warn",
      "label": "Write, and warn about untraced criteria",
      "recommended": true,
      "description": "Submit does the two writes together and records that it ran. It prints each criterion that has no `[AC:id]` test as a warning and still exits 0.",
      "example": "The implementer runs submit for spec 2. Both files say in-review. stderr says: \"criterion empty-state has no tagged test\".",
      "tradeoff": "An implementer can submit with no test for a criterion. The reviewer catches it, one round later."
    },
    {
      "value": "write-and-refuse",
      "label": "Refuse when a runtime criterion has no tagged test",
      "description": "Submit exits 2 when a criterion that needs runtime evidence has no `[AC:id]` test.",
      "example": "Submit refuses spec 2 and names the criterion. The implementer writes the test and submits again.",
      "tradeoff": "It changes the rule \"a missing tag alone is not a FAIL\". A project whose tests cannot carry tags is blocked."
    },
    {
      "value": "custom",
      "label": "Something else",
      "description": "Describe what you want instead.",
      "requiresNote": true
    }
  ],
  "recommendation": "It removes the drift without changing a review rule. The stricter form can follow a field report.",
  "affected": [
    "submit"
  ]
},
  {
  "id": "sensitivity-check",
  "status": "clarified",
  "question": "Does this feature include the test-sensitivity check?",
  "answer": "not-here",
  "context": "The panel found the weakest link in the review: a runtime criterion passes on a test the implementer wrote, and the validator checks that evidence is declared, not that it is true. A sensitivity check answers \"would this test fail if the behavior were broken?\". The reviewer breaks the behavior in a temporary copy and runs the test. `references/testing.md` permits this today and leaves it optional. You chose this feature over \"stronger evidence first\" on 2026-11-15; this question is whether to add a small part of it here.",
  "why": "Lauren Tan and the tweet she cites (12:05): most tokens go to verification. Ben Holmes (14:47): in 4 of 12 sessions the user found a bug after the agent said it had verified the change.",
  "options": [
    {
      "value": "not-here",
      "label": "No, backlog it first in line",
      "recommended": true,
      "description": "This feature ships the three commands. The sensitivity check gets its own brief after it, and uses the new evidence command.",
      "example": "docs/backlog gets one entry: test-sensitivity check, with its sources.",
      "tradeoff": "The weakest link stays open for one more release."
    },
    {
      "value": "expect-fail-flag",
      "label": "Yes, as an option of the evidence command",
      "description": "`evidence.mjs run --expect-fail` records that a test failed in a temporary copy. The verify skill asks for it when a criterion's only runtime evidence is the implementer's test.",
      "example": "The reviewer removes the discount line in a copy; the test still passes; the criterion is UNVERIFIED with the receipt.",
      "tradeoff": "More tokens in each review and more scope here. The step where the agent breaks the behavior stays prompt-level."
    },
    {
      "value": "custom",
      "label": "Something else",
      "description": "Describe what you want instead.",
      "requiresNote": true
    }
  ],
  "recommendation": "The feature already changes the report contract. The evidence command makes the check cheap to add next.",
  "affected": [
    "evidence-run"
  ]
}
]
---
# Feature intent

Let the runtime do three steps that an agent does by hand today, and delete
the skill text those steps needed. Max chose this on 2026-11-15
(`next-feature`: "runtime-owns-steps" in
[the talk review](../2026-11-15-talk-review-tan-holmes/brief.md)).

Source: Lauren Tan, "All Code Is Slop (Except Mine)". "Nuance tends to lead to
slop — just design better APIs" (5:26). Her first layer is the codebase, before
checks and before prose (2:03). For Joycraft the codebase is the runtime. The
panel's pyramid purist read the payload with that rule and found the three
steps below. Full analysis:
[digest](../../research/2026-11-15-tan-holmes-talks-digest.md).

## Context and authorization

- The brief is authorized. Max answered the four decisions on 2026-11-15. The
  specs are in `specs/`.
- This follows enforced-gates (1.4.0), which vendors `field-20`. This
  feature's payload tag is `field-21`.
- Verified on `origin/main` (1.3.0, payload `field-18`):
  - No runtime file writes the `in-review` status. `completion.mjs` only
    checks for it (lines 172, 229, 414). `joycraft-implement/SKILL.md` tells
    the agent to "update both the queue entry and the spec's top-level
    frontmatter `status:` to `in-review` together".
  - `completion.mjs` already writes `done` to both files as one journaled
    write with restore on conflict (`writeCompletion`).
  - `VerificationReport` has `unresolved: string[]` and no findings field
    (`contracts/types.d.ts`). `completion.mjs:76` refuses a PASS with any
    entry. `joycraft-verify/SKILL.md` and `joycraft-reviewer.md` ask for
    every finding with a severity.
  - The rule "run each test command once in single-run mode with `CI=1` and a
    300000 ms timeout" is in six shipped files: three skills, two agent files
    and `references/testing.md`.
  - `evidence.mjs` checks that evidence is declared. It does not run a command
    or write a receipt. The reviewer builds each receipt by hand: raw output in
    a file, its SHA-256, the real exit status.
- Not checked: how the prototype's own tests build reports. Discovery for
  decompose.
- The payload is vendored from joycraft-prototype. Every change here is a spec
  there.

## Goals

- **submit.** One command moves a spec to `in-review`.
  **Done when:** in a fixture where spec 2 is `todo`,
  `completion.mjs submit --queue <queue> --spec 2` sets the queue entry and
  the spec frontmatter to `in-review` in one journaled write, and
  `status.mjs` reports no drift. When the spec file changes during the write,
  both files keep their earlier bytes and the command exits 2. The implement
  skill and the implementer agent tell the agent to run the command and no
  longer describe two edits.
- **findings.** The report can carry a finding that does not block.
  **Done when:** a PASS report with one follow-up finding completes. A PASS
  report with one blocking finding is refused, and the message names the
  finding. A 1.3.0 report with no findings completes as before. A case the
  spec does not decide becomes a follow-up with the reviewer's stated
  assumption, and the spec completes. A decision-needed finding holds only its
  own spec, and the queue goes on.
- **queue-check.** Gaps are found before the queue starts, while the user is
  still there.
  **Done when:** one command checks a queue before the first dispatch. With an
  acceptance bullet that has no `Check:`, an input path that does not exist, a
  dependency on a spec that is not in the queue, or an open brief decision that
  affects a queued spec, it exits 2 and names each gap. With none, it exits 0.
- **evidence-run.** One command runs a check and writes its receipt.
  **Done when:** `evidence.mjs run --receipt <path> -- <argv>` runs the
  project's command once with `CI=1` and a 300000 ms limit, saves the raw
  stdout and stderr to the receipt, and prints the observation's `command`
  (argv and real exit code) and `receipts` (path and SHA-256). A command that
  exits 3 is recorded with exit code 3. A command that passes the time limit is
  recorded with exit code `null`. It works with any stack, because it wraps
  the project's own command.
- **prose-removed.** Each command removes the text it replaces.
  **Done when:** the test-run rule is stated in one shipped file, not six. The
  word count of the shipped skills, agent files and references is below the
  1.4.0 count. A test fails when that count grows past the recorded number
  without a recorded reason.

## Agent work and pending choices

All four decisions were answered on 2026-11-15: `report-contract` additive,
`decision-needed-effect` holds, `submit-checks` write and warn,
`sensitivity-check` not here. Nothing is pending. The specs are in `specs/`.

Max's note on `decision-needed-effect` sets a rule for the whole feature:
people run these queues while they are away. A spec or a queue stops only for
something mandatory or something broken. Everything else is answered up front
or goes to a follow-up after the queue. The `queue-check` goal and spec 4 are
my reading of "answer as much as we can upfront"; Max did not ask for that
command by name.

## submit

Per `submit-checks`. Reuse the journaled two-file write that completion uses
for `done`. After this, the drift that `status.mjs` and the gate check look
for can come only from a hand edit.

## findings

Per `report-contract` and `decision-needed-effect`. One list carries the
reviewer's sorting (blocking, decision needed, follow-up) and whether the change
introduced the finding. This also gives a later scorecard its data without a
new store.

Per Max's note, "holds" is narrow:

- The default for a case the spec does not decide is a **follow-up**. The
  reviewer takes the reading closest to the brief's stated intent, writes that
  assumption in the finding, and the spec completes. The session-end page lists
  each follow-up as a question for the user to answer after the queue.
- **Decision needed** is only for a mandatory answer: two readings of the brief
  give opposite verdicts on a stated criterion, or a guess cannot be undone
  (data or systems outside the project). It holds that spec and the specs that
  depend on it. Independent specs go on. It never stops the queue.

## queue-check

From Max's note on `decision-needed-effect`. The decompose skill lists checks
to make before queueing; no runtime file makes them. The command makes the
ones a program can decide, so a gap goes back to the brief as a question while
the user is present, not as a hold hours later.

## evidence-run

Per `sensitivity-check`. The command covers `test` and `command`
observations. Visual evidence stays with the project's review-loop tools.

## Scope and limits

- No new skill, context home, history file or state store.
- No detection of a finding repeated from an earlier round.
- No change to who may accept a spec, to waivers or to owner acceptance.
- No scorecard, escape rate or friction counts here; they are backlog items in
  the digest. The test-sensitivity check is first in that backlog
  (`sensitivity-check`: not here).
- No new runtime dependency.
- A command is not a sandbox. An agent can still edit the queue by hand; the
  gate check of 1.4.0 catches the result.

## Where the specs were built

Specs 1, 2, 3, 4, 5 and 7 were implemented in joycraft-prototype on
2026-11-15, each accepted on an independent PASS review, and tagged
`field-21` (`905489e`). Spec 7 was added there from the review of spec 4: the
queue check skips a file that a `todo` spec plans to create, treats an
unscoped brief input as citing the whole brief, and does not count a `Check:`
that is only in code or a comment. The prototype's
`docs/archive/runtime-owned-steps/feature/` holds the final brief, the specs
and their queue; the copies in `specs/` here are for reading. This folder has
no queue. Spec 6 (vendor, README and the release) is the only spec in this
repository.

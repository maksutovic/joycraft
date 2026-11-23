# Guarded completion

Use this reference to submit, snapshot, finalize, accept or recover a spec.

## Stable local interface

Run these commands from the consumer project root. Paths are project-relative.

```sh
node .joycraft/runtime/completion.mjs submit --queue <queue-path> --spec <id>
node .joycraft/runtime/completion.mjs reopen --queue <queue-path> --spec <id> --reason <text>
node .joycraft/runtime/completion.mjs scope --queue <queue-path> --spec <id>
node .joycraft/runtime/completion.mjs snapshot --queue <queue-path> --spec <id> --out <subject.json>
node .joycraft/runtime/completion.mjs finalize-review --queue <queue-path> --spec <id> --report <report.json>
node .joycraft/runtime/completion.mjs accept-owner --queue <queue-path> --spec <id> --decision <owner-acceptance.json>
node .joycraft/runtime/completion.mjs accept-owner --legacy --queue <queue-path> --spec <id>[,<id>...] --decision <legacy.json>
node .joycraft/runtime/completion.mjs accept-waiver --queue <queue-path> --spec <id> --waiver <feature-waiver.json> [--report <report.json>]
node .joycraft/runtime/completion.mjs recover --queue <queue-path>
```

`submit` moves a `todo` spec to `in-review` in the queue and frontmatter with one journaled write, recording `submitted: { at }`. It warns about each criterion with no `[AC:<id>]` test, leaves an `in-review` spec unchanged, and exits 2 on a conflict, a `done` spec or an unfinished dependency. It warns about each other `done` spec whose accepted input changed. `reopen` moves such a spec back to `in-review`, keeps the old report in `reopened`, and restarts its review round count.

`scope` checks a queue's declared change scope without writing a subject. `snapshot` does the same check first, then exclusively creates a new `--out` subject file without changing a status. It binds the implementation revision, queue/spec identity, criteria, and SHA-256 values for exact relevant inputs. The shared record shapes are defined in [.joycraft/contracts/types.d.ts](../contracts/types.d.ts). New subjects carry `binding.version: 1`: their queue projection contains the reviewed spec and its transitive dependencies, with completion metadata (`status`, `submitted`, `acceptedReport`, `ownerAcceptance`, `waiver`) removed from those records. An unrelated queue record can change without staling that subject; a selected spec's other metadata and dependency edges remain bound. A spec binding preserves raw bytes except for its top-level `status:` value.

An optional `verification.changeScope` records an explicit full Git commit SHA in `baseRevision`; a branch name, `origin/main`, or inferred base is rejected. Changed verification inputs are captured from NUL-delimited Git status records, including staged, unstaged, rename, and deletion topology. Any changed path outside the verification inputs must be named exactly in `exclusions` with its reason. Store temporary packets and subjects in the project's ignored local-artifact home when it has one; otherwise add each exact untracked snapshot packet output to `exclusions`. `complete` filters only its exact report, receipt, owner-decision, and pending-journal paths while rechecking scope. A deliberate deletion needs a non-requirement verification input with `state: "absent"`; requirement inputs cannot be absent. A rename needs the new present input and the old non-requirement input declared absent.

A requirement input may optionally declare exact `scope.anchors` or `scope.decisionIds`. Anchors bind complete named heading subtrees together with their ancestor context and non-decision document context; decision IDs bind complete stable JSON decision records. They may be combined for a canonical brief whose frontmatter contains a `decisions:` JSON array. A criterion may name such a record as `frontmatter.decisions.<id>`; an explicit `decisionIds` selector must include that ID. Heading-only scopes keep all frontmatter decisions governing. Pure JSON decision records support `decisionIds` only, so unsupported JSON heading anchors fail instead of being ignored. Anchor selection supports ATX (`#`) headings outside fenced code blocks; setext and linked headings are not selectors. A required criterion anchor must be included by an anchored scope. Missing or ambiguous selections stop the snapshot. Omit `scope` to bind the entire requirement file. Queue and reviewed-spec inputs cannot be narrowed. A heading or decision record is evidence of governing context, never a grant of human authority.

Older reports without `subject.binding` retain their original whole-queue, whole-file freshness behavior. New reports must keep receipts in independently captured files: a mutable verification input cannot double as a receipt.

Use the original `implementationRevision` as provenance on a re-check while recomputing the bound current inputs. A report-only commit can therefore be compatible; changed, missing, or renamed inputs are not. The snapshot includes no permission to accept the work.

## Independent report and guarded acceptance

The report must use the shared schema and bind its subject identity. It records the actual implementer/reviewer native identities, `independent: true` only when a separate reviewer context actually reviewed the work, scope review, flow evidence, receipts, limits, unresolved items, optional `findings`, and a PASS/FAIL/UNVERIFIED verdict.

A native child can share its parent session. Supply `implementerActor` and `reviewer.actor` together, each with the observed `host`, `sessionId`, and the actual `agentId` when the host issued a child invocation ID. Preserve the matching legacy session fields. A root actor may omit `agentId`; a same-session child review needs its real distinct actor identity. Do not substitute a task name, worktree path, random UUID, or invented ID. Legacy reports without actor metadata still require distinct session IDs. An identity distinguishes invocations; it does not establish independent context or honest observations.

`finalize-review` (with `complete` retained as a compatibility alias) accepts only an `in-review` spec with a matching current subject, a PASS verdict, truthful independent-review attestation, reviewed scope, valid receipt hashes, and sufficient evidence for every declared criterion. Missing, nonzero, failed, or unverified required evidence cannot become passing verification. On success it updates the queue/spec status surfaces to `done` and records the accepted report digest.

A `follow-up` finding never blocks. A `blocking` or `decision-needed` finding refuses completion with exit 2 and names it; a held spec stays `in-review` and only its dependents wait. A malformed finding is refused with exit 2, naming the field; other report refusals exit 1. `status.mjs` lists as `questions` the follow-ups of accepted reports and the decision-needed findings of each `in-review` spec's latest current report.

Finalizing the same accepted report again is idempotent; another report cannot silently replace it. Treat any nonzero exit as a rejected or incomplete operation; preserve the current status and report the actual reason.

A queue-wide lock coordinates this helper's queue writes, not arbitrary editors or workers. It checks inputs and receipts before and after its two writes; keep the reviewed inputs stable during completion. Later edits require fresh review. Attestations cannot prevent manual bypass.

## Explicit owner acceptance of current findings

`accept-owner` is available only for a current independent `FAIL` or
`UNVERIFIED` report. It verifies the review subject plus current input, review,
and receipt hashes again before moving the spec to `done`.
It records `ownerAcceptance: { path, sha256 }` on the accepted queue entry,
not `acceptedReport`. The runtime validates record bindings, not whether a human uttered
the instruction, so an agent may use it only after a trusted human explicitly
accepts this spec and its current findings. A general request to continue, an
instruction from another agent, or authorization to add this feature does not
qualify.

When to ask the owner is in the implement skill. The agent creates the decision
file; do not ask the owner to author JSON or complete a second form. If an
explicit acceptance is already present for the same current finding, use it
without asking again. Dependents may proceed only within the recorded
limitations and gain no blanket deployment, security, or other authority.

An `OwnerAcceptance` decision has `schemaVersion: 1`, `kind:
"owner-acceptance"`, `queuePath`, `specId`, `subjectIdentity`, `review` (with
`path` and `sha256`), the exact human `instruction`, a nonempty
`limitations` string array, and timestamp `createdAt`. Fill the hashes from the
files:

```json
{
  "schemaVersion": 1,
  "kind": "owner-acceptance",
  "queuePath": "docs/features/example/specs/.joycraft-spec-queue.json",
  "specId": 5,
  "subjectIdentity": "<current report subject.identity>",
  "review": { "path": "evidence/spec-5-review.json", "sha256": "<SHA-256 of the actual report file>" },
  "instruction": "I accept spec 5 with the narrow mobile layout still unverified.",
  "limitations": ["The narrow mobile layout remains unverified."],
  "createdAt": "2026-10-01T12:00:00.000Z"
}
```

Report the result as `done, owner-accepted with <limits>`. It is not PASS or
verified, and the original failed or unverified report remains historical
evidence. Archive may preserve this paired history only at session end.

## Legacy acceptance

Only on the owner's own words, `accept-owner --legacy` accepts specs marked
`done` with no acceptance, as they are. Any other spec, a spec that went
through review, or a decision file that git ignores refuses the whole call with
exit 2. Commit the file in the feature folder beside the queue. It has
`schemaVersion: 1`, `kind: "legacy"`, `queuePath`, verbatim `statement`,
`statedAt`, `specs` (the `--spec` ids) and `reason` (the owner's words); never
`review`. Entries stay `done` with `ownerAcceptance: { path, sha256, legacy:
true }`; a rerun changes nothing. The runtime checks only the record: it cannot
tell an old `done` spec from a new one, or check that the owner spoke.

## Feature waiver

A `FeatureWaiver` loosens the review defaults for
one feature's queue, only in the user's own words from that feature's
interview. The agent never proposes or asks about one. Record the user's words in the note of a settled brief
decision, then write the feature's one waiver file, `waiver.json` beside
`brief.md` (never a verification input), before any review runs:

```json
{
  "schemaVersion": 1,
  "kind": "feature-waiver",
  "queuePath": "docs/features/example/specs/.joycraft-spec-queue.json",
  "covers": ["no-review"],
  "instruction": "quick janky prototype, skip review on this",
  "decision": "skip-review",
  "source": { "path": "docs/features/example/brief.md", "sha256": "<SHA-256 of the brief>" },
  "createdAt": "2026-11-02T12:00:00.000Z"
}
```

`covers` is a nonempty subset of `no-review` and `tool-break`. `decision` is the
id of the brief decision that holds the user's words. `accept-waiver` refuses a
waiver for another queue, at another path, with unknown fields or covers, an
empty instruction, a `source` that is not this feature's `brief.md`, a brief hash
that differs, or a `decision` that is missing, not `clarified`/`assigned` with an
answer, or whose `note` or `answer` does not contain the instruction as whole
words (at least three; whitespace and line wraps are normalized).

- **Skip means review never runs** (decision `block-review-dispatch`).
  `dispatch-preflight.mjs` refuses a reviewer for a queue whose `waiver.json`
  covers `no-review`, in the worker tree or the coordinator tree, and refuses
  while that file is unreadable. Without `--report`, `no-review` completes an
  `in-review` spec. As an extra guard it still refuses when a review report for
  the spec is visible in the feature folder or `.joycraft/local/packets/`.
- With `--report`, the report must be current and independent (validated as for
  `accept-owner`), `UNVERIFIED`, and every non-`PASS` observation must carry
  `cause: "tool-break"`; the waiver must cover `tool-break`. The report keeps
  its verdict; evidence errors are returned as diagnostics.
- A `FAIL` verdict or any `FAIL` observation never completes, whatever `covers`
  says.

Limit: a review that ran before `waiver.json` existed is caught only by the
folder guard. The waiver comes from the interview, so it exists before dispatch.
On success the queue entry records `waiver: { path, sha256 }`, plus
`review: { path, sha256 }` for a report-backed completion, mutually exclusive
with `acceptedReport` and `ownerAcceptance`. A waived spec counts as `done` for
dependents. Report it as `done, waived by the user: "<instruction>"`.

## Evidence and reporting

Evidence records observations rather than promises: a command's actual argv, exit code and unfiltered output receipt; structural claims only from source review; an inspected render with route, state, viewport, interactions and outcomes for a visual claim. A check that should have run and did not is `UNVERIFIED` (with `cause: 'tool-break'` when the tool broke), a failure is `FAIL`, and a claim beyond the recorded tool's `canShow`, or in a package the user skipped, is an agreed limit.

Report the command result, reviewer identity, receipt paths, actual observations, and limitations. A green suite or an implementation commit alone is not accepted completion.

## Interrupted writes and recovery

Each status write is journaled in `.joycraft-completion.pending.json` beside the queue. A caught failure rolls back when safe and keeps the journal unless nothing was written; an interrupted one leaves it. Do not hand-edit the files to force completion.

Inspect the journal and affected files, then run `recover`. It restores the before bytes only when each file matches the journal's before or after hash, and removes the journal only after that, so replaying it is safe. Preserve the journal and rejected report for diagnosis. Retry `complete` or `accept-owner` only while its original review and any owner instruction remain current; otherwise obtain fresh evidence and authorization appropriate to the changed scope. If recovery reports a conflict or invalid journal, stop and report it.

Host names compare without letter-case differences; session and agent IDs stay
opaque and case-exact. IDs must be nonempty, bounded, trim-stable and free of
control characters. This validates representation, not host authenticity.

# Guarded completion

Use this reference when snapshotting a verification subject, submitting an independent review report, or responding to a completion failure.

## Stable local interface

Run these commands from the consumer project root. Paths are project-relative.

```sh
node .joycraft/runtime/completion.mjs scope --queue <queue-path> --spec <id>
node .joycraft/runtime/completion.mjs snapshot --queue <queue-path> --spec <id> --out <subject.json>
node .joycraft/runtime/completion.mjs finalize-review --queue <queue-path> --spec <id> --report <report.json>
node .joycraft/runtime/completion.mjs accept-owner --queue <queue-path> --spec <id> --decision <owner-acceptance.json>
node .joycraft/runtime/completion.mjs recover --queue <queue-path>
```

`scope` checks a queue's declared change scope without writing a subject. `snapshot` does the same check first, then exclusively creates a new `--out` subject file without changing a status. It binds the implementation revision, queue/spec identity, criteria, and SHA-256 values for exact relevant inputs. The shared record shapes are defined in [.joycraft/contracts/types.d.ts](../contracts/types.d.ts). New subjects carry `binding.version: 1`: their queue projection contains the reviewed spec and its transitive dependencies, with completion metadata (`status`, `acceptedReport`, and `ownerAcceptance`) removed from those records. An unrelated queue record can change without staling that subject; a selected spec's other metadata and dependency edges remain bound. A spec binding preserves raw bytes except for its top-level `status:` value.

An optional `verification.changeScope` records an explicit full Git commit SHA in `baseRevision`; a branch name, `origin/main`, or inferred base is rejected. Changed verification inputs are captured from NUL-delimited Git status records, including staged, unstaged, rename, and deletion topology. Any changed path outside the verification inputs must be named exactly in `exclusions` with its reason. Store temporary packets and subjects in the project's ignored local-artifact home when it has one; otherwise add each exact untracked snapshot packet output to `exclusions`. `complete` filters only its exact report, receipt, owner-decision, and pending-journal paths while rechecking scope. A deliberate deletion needs a non-requirement verification input with `state: "absent"`; requirement inputs cannot be absent. A rename needs the new present input and the old non-requirement input declared absent.

A requirement input may optionally declare exact `scope.anchors` or `scope.decisionIds`. Anchors bind complete named heading subtrees together with their ancestor context and non-decision document context; decision IDs bind complete stable JSON decision records. They may be combined for a canonical brief whose frontmatter contains a `decisions:` JSON array. A criterion may name such a record as `frontmatter.decisions.<id>`; an explicit `decisionIds` selector must include that ID. Heading-only scopes keep all frontmatter decisions governing. Pure JSON decision records support `decisionIds` only, so unsupported JSON heading anchors fail instead of being ignored. Anchor selection supports ATX (`#`) headings outside fenced code blocks; setext and linked headings are not selectors. A required criterion anchor must be included by an anchored scope. Missing or ambiguous selections stop the snapshot. Omit `scope` to bind the entire requirement file. Queue and reviewed-spec inputs cannot be narrowed. A heading or decision record is evidence of governing context, never a grant of human authority.

Older reports without `subject.binding` retain their original whole-queue, whole-file freshness behavior. The helper does not relabel or migrate them. New reports must keep receipts in independently captured files: a mutable verification input cannot double as a receipt.

Use the original `implementationRevision` as provenance on a re-check while recomputing the bound current inputs. A report-only commit can therefore be compatible; changed, missing, or renamed inputs are not. The snapshot includes no permission to accept the work.

## Independent report and guarded acceptance

The report must use the shared schema and bind its subject identity. It records the actual implementer/reviewer native identities, `independent: true` only when a separate reviewer context actually reviewed the work, scope review, flow evidence, receipts, limits, unresolved items, and a PASS/FAIL/UNVERIFIED verdict.

A native child can share its parent session. Supply `implementerActor` and `reviewer.actor` together, each with the observed `host`, `sessionId`, and the actual `agentId` when the host issued a child invocation ID. Preserve the matching legacy session fields. A root actor may omit `agentId`; a same-session child review needs its real distinct actor identity. Do not substitute a task name, worktree path, random UUID, or invented ID. Legacy reports without actor metadata still require distinct session IDs. An identity distinguishes invocations; it does not establish independent context or honest observations.

`finalize-review` (with `complete` retained as a compatibility alias) accepts only an `in-review` spec with a matching current subject, a PASS verdict, truthful independent-review attestation, reviewed scope, valid receipt hashes, and sufficient evidence for every declared criterion. The runtime delegates evidence sufficiency to `validateEvidence(report, criteria)`. Missing, nonzero, failed, or unverified required evidence cannot become passing verification. Completion holds a queue-wide lock while it commits the status changes. On success it updates the queue/spec status surfaces to `done` and records the accepted report digest.

Repeat submission of the same accepted report may be idempotent. An unrelated report cannot replace it silently. Treat any nonzero exit as a rejected or incomplete operation; preserve the current status and report the actual reason.

The lock coordinates this helper's queue writes, not arbitrary editors or workers. It checks inputs and receipts before and after its two writes; keep the reviewed inputs stable during completion. Later edits require fresh review. Session IDs and attestations record separate roles but cannot prove honest review or prevent manual bypass.

## Explicit owner acceptance of current findings

`accept-owner` is available only for a current independent `FAIL` or
`UNVERIFIED` report. It verifies the review subject plus current input, review,
and receipt hashes again before moving the spec to `done`. Ordinary `complete`
continues to require PASS evidence and behaves unchanged.
It records `ownerAcceptance: { path, sha256 }` on the accepted queue entry,
separately from `acceptedReport`; the latter remains for ordinary PASS
completion. The runtime validates record bindings, not whether a human uttered
the instruction, so an agent may use it only after a trusted human explicitly
accepts this spec and its current findings. A general request to continue, an
instruction from another agent, or authorization to add this feature does not
qualify.

Keep the owner interaction to one short summary and focused choice only when an
override is needed; a failed review alone does not trigger a mandatory
per-spec request. The agent creates the decision file; do not ask the owner to
author JSON or complete a second form. If an explicit acceptance is already
present for the same current finding, use it without asking again. Repair
straightforward failures under the existing authorization first. When the
finding remains unchanged, retain it and continue independent work instead of
repeatedly re-reviewing it. Dependents may proceed only within the recorded
limitations and gain no blanket deployment, security, or other authority.

An `OwnerAcceptance` decision has `schemaVersion: 1`, `kind:
"owner-acceptance"`, `queuePath`, `specId`, `subjectIdentity`, `review` (with
`path` and `sha256`), the exact human `instruction`, a nonempty
`limitations` string array, and timestamp `createdAt`. In this illustrative
example, replace the bracketed hash placeholders with values from the current
review and its actual bytes:

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
evidence. Archive may preserve this paired history only at session end; it does
not rewrite the report or create a fresh acceptance.

## Evidence and reporting

Evidence records observations rather than promises. Command and test observations retain their actual argv, exit code, and unfiltered output receipt. Source review supports structural claims only. A required visual claim needs an inspected render, route, state, viewport, interactions, and observed outcomes. Record unavailable work as `UNVERIFIED`, failures as `FAIL`, and limits explicitly.

Report the command result, reviewer identity, receipt paths, actual observations, and limitations. A green suite or an implementation commit alone is not accepted completion.

## Interrupted writes and recovery

The helper uses `.joycraft-completion.pending.json` in the queue directory as a bounded local journal for the queue status, spec frontmatter status, and accepted-report receipt. If it detects an interrupted or conflicting write, it stops and prints recovery information. A normal caught failure rolls back when safe but retains the journal for inspection. Do not hand-edit the files to force completion.

Inspect the journal and affected project-relative files first. Then run:

```sh
node .joycraft/runtime/completion.mjs recover --queue <queue-path>
```

Recovery preflights both captured files before changing either: each current file must match the journal's before or after hash. It restores only the recorded before bytes, leaves conflicts untouched, and removes the journal only after a successful restore. Replaying recovery is safe until that journal is removed. Preserve the journal and rejected report for diagnosis. Retry `complete` or `accept-owner` only while its original review and any owner instruction remain current; otherwise obtain fresh evidence and authorization appropriate to the changed scope. If recovery reports a conflict or invalid journal, stop and report the local recovery blocker.

Host names compare without letter-case differences; session and agent IDs stay
opaque and case-exact. IDs must be nonempty, bounded, trim-stable and free of
control characters. This validates representation, not host authenticity.

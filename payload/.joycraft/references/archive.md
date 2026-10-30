# Session-end feature archive

`archive.mjs` preserves a completed feature as historical regression evidence.
It runs only from a host-asserted `session-end` boundary. A queue transition,
review, hook event, or ordinary verification must never invoke it.

Prepare a project-relative attestation file:

```json
{
  "schemaVersion": 1,
  "phase": "session-end",
  "host": {
    "sessionId": "host-session-id",
    "quiescent": true,
    "activeWorkers": [],
    "dependentWork": []
  },
  "durableContext": {
    "carried": true,
    "references": ["docs/context/decision-log.md"]
  }
}
```

`quiescent` attests that no active worker and no unfinished work requiring the
feature's live paths remains. It does not ask for a new human permission. The
current Markdown context references must already exist outside `docs/features/` and
`docs/archive/`; they demonstrate that constraints worth retaining were carried
into current documentation. Reuse the project's existing home, including
`AGENTS.md` or a custom context map. This attestation is an operational statement, not
another decision or approval authority.

The preview validates the complete queue before any write: the canonical queue
must be the only queue anywhere in the feature tree, all specs must be
`done`, and each spec must have exactly one of an accepted PASS report or an
explicit `ownerAcceptance` receipt. A normal accepted report must retain its
PASS evidence. An owner-acceptance record is historical exception metadata:
it binds the queue/spec/subject identity to a hashed independent review whose
verdict remains `FAIL` or `UNVERIFIED`, carries nonempty limitations, and is
not evidence that the review passed. The runtime validates the decision, review,
subject bindings, receipts and historical requirement invariants, then preserves
the decision, review, verdict and limitations in the replay manifest. Its
shape cannot authenticate that a human issued it. Each report's independent-review shape must hold,
each report must describe its own archived queue/spec and original requirements,
and every referenced receipt must still have its recorded bytes. A pending
completion journal, a malformed/corrupt/FAIL report, unfinished work, missing
durable context, symlinks, traversal, or archive collision stops the operation.

The runtime deliberately does not rerun historic suites or compare their code
input hashes with current live code. Later work may supersede those hashes. For
a v1-bound report it still checks the selected queue/dependencies and selected
governing requirement or decision records, while independent queue records and
unselected decisions may change. Older reports retain their original whole-file
archive checks. The archive records that this evidence is historical and does
not renew current acceptance.

When a checked requirement has changed since acceptance, the helper can recover
its accepted version from Git. Run at the Git worktree root. The current file
must have no staged or unstaged changes and its raw bytes must match HEAD. The
newest matching path commit reachable from HEAD must reproduce the accepted
hash using the original `none` or `requirement-scope` normalization. A missing
selector in a newer version is a mismatch, not permission to skip the check.
The preview's `requirementHistory` lists the original path, normalization/scope,
accepted hash, accepted commit, restored raw hash and subsequent path commits.
The queue and every declared spec remain strict by default; the explicit
reconciliation path below is the archive-only exception. Reports and receipts
must always retain their recorded bytes. No committed match means no archive.

For the feature's own brief, also write
`docs/features/<slug>/brief-amendments.json` from actual recorded owner decisions:

```json
{
  "schemaVersion": 1,
  "kind": "joycraft-brief-amendments",
  "brief": "docs/features/<slug>/brief.md",
  "amendments": [
    {
      "commit": "<full Git commit ID>",
      "fromSha256": "<raw brief hash at commit^>",
      "toSha256": "<raw brief hash at commit>",
      "decisions": ["D18"],
      "summary": "Describe the owner-directed change."
    }
  ]
}
```

Every subsequent brief path commit needs exactly one entry, including commits
that record the questions before their answers. Git's first parent (`commit^`)
defines the before hash, including for merges. Each named decision must occur
exactly once in the current brief's frontmatter JSON `decisions` array, have
status `clarified` or `assigned`, and a nonempty answer. Do not manufacture an
answer to unblock archival. The preview includes the validated amendments.
These records explain historical changes; they do not prove a fresh review of
the amended feature. Archival therefore does not require one report matching
today's brief: a single report could cover only one scope and would not renew
acceptance for the whole feature anyway.

Apply restores each accepted raw version under
`evidence/requirements/<proof-hash>/<original-path>` in the archive. Different
accepted versions or scopes remain distinct. Replay entries use
`operation: "restored-from-git"` and retain the proof in `requirement`; subsequent
runs verify both the stored raw bytes and their accepted projection without
needing live Git history. The current brief and its amendment ledger move with
the feature, alongside the separately restored older brief versions.

## Archive reconciliation for a changed acceptance record

If a completed feature is blocked because a queue entry or spec was edited after
acceptance, investigate the exact change before proposing a new review. Several
valid historical reports can bind different versions of one queue. Rolling the
queue back may invalidate later reports; rewriting report hashes or accepting an
already-done spec again is not an archival repair.

Under an owner-authorized resolution, use this separate archive-only override:

1. Identify each affected report/input and the commit that introduced the drift.
   Record the cause and settle the intended current brief/spec description in its
   owning home. A real unresolved product change stays in active work; do not
   claim that archival verifies it. Avoid editing done queue entries merely to
   follow renamed files.
2. Preserve all original reports and receipts. Commit current queue/spec files.
   Their accepted normalized bytes must also exist in reachable Git history.
   Brief changes still require the answered decision amendment ledger above.
3. Write `docs/features/<slug>/archive-reconciliation.json` with the existing
   owner instruction, the chosen resolution, explicit limitations, and one entry
   for each changed report/input pair. An authorization already present in the
   task is enough; do not ask again just to record it. Never invent an instruction.
4. Preview with `--reconciliation <record-path>`, inspect the restored versions
   and the recorded resolution, then apply at the ordinary quiescent session-end
   boundary. The same flag is required for the first apply.

```json
{
  "schemaVersion": 1,
  "kind": "joycraft-archive-reconciliation",
  "feature": "<slug>",
  "createdAt": "2026-10-22T00:00:00Z",
  "instruction": "Record the owner's actual archive-reconciliation authorization.",
  "reason": "A later rename rewrote a done spec's queue entry.",
  "resolution": "Keep today's description and preserve each accepted queue version.",
  "limitations": ["Historical archival only; no renewed acceptance of current requirements."],
  "entries": [
    {
      "report": {"path": "<accepted report path>", "sha256": "<report raw SHA-256>"},
      "path": "docs/features/<slug>/specs/.joycraft-spec-queue.json",
      "normalization": "queue-scope",
      "acceptedSha256": "<queue input hash from that report>",
      "currentSha256": "<current raw queue-file hash>",
      "reason": "Name the introducing commit and the specific edit.",
      "resolution": "Explain how the discrepancy is resolved for archival."
    }
  ]
}
```

`queue-scope`, legacy `queue-status`, and `spec-status` cover changed acceptance
records. For an ordinary `none` or `requirement-scope` requirement whose accepted
version survives outside HEAD history (for example after a squash merge), an
entry may also name `acceptedCommit` as a full Git commit ID. The blob at that
exact commit must reproduce the original accepted hash; the helper never waives
missing bytes. The current external requirement is copied into the archive too,
so the recorded current hash remains verifiable. `laterCommits` means the path
commits in the Git range `acceptedCommit..HEAD`; for a branched history this is
not a claim that all those commits were chronologically later. `acceptedSha256` is copied from the original report's input;
`currentSha256` pins raw current bytes, including acceptance metadata. One queue
edit may therefore need many entries, one for each report whose dependency
projection changed. Unchanged later reports need no entry. Duplicate, unused,
uncovered or stale entries fail closed. A ledger's presence alone never enables
the override, and its shape does not authenticate a human. The ledger itself may
be uncommitted: preview pins its raw hash, apply rechecks it, and archival retains
it byte-for-byte as part of the paper trail. Commit the resulting archive through
the normal project delivery process. A renamed own spec or changed report subject
path still fails; this override reconciles contents, not acceptance identities.

```sh
node .joycraft/runtime/archive.mjs archive --feature <slug> --phase session-end --attestation <attestation.json> --reconciliation docs/features/<slug>/archive-reconciliation.json
# Inspect the preview; add --apply to perform the same reconciled plan.
```

The helper checks each original review against its restored queue projection and
criteria, restores the exact accepted raw queue/spec bytes alongside the current
files, and includes the ledger and its hash in preview/replay. The manifest says
`historical.acceptanceRecordsReconciled: true` and still says
`currentAcceptanceRenewed: false`. Report it as **archived with reconciliation**,
including the limitations, rather than a new verification PASS. Replay verifies
the stored ledger, its connection to the restored evidence, raw hashes and
normalized hashes without requiring live Git history. The helper does not edit
briefs/specs/queues, statuses, report identities or review verdicts to make them
agree. Missing/corrupt receipts, invalid reviews, unfinished work, an active host
or a pending completion journal cannot be overridden.

The default command is read-only. `--apply` restages and rechecks all inputs,
then atomically moves `docs/features/<slug>` to
`docs/archive/<slug>/feature`. Code, tests, and shared receipts outside the
feature stay live. Reports and receipts outside the feature are copied under
the archive record's `evidence/` directory. `archive-replay.json` maps each
original path to its moved, copied or restored byte-identical record. Historical links in
the moved files retain their original text; consumers must treat them as history.

The staging directory receives `archive-recovery.json` before any copy or move,
and the marker remains in the final archive as immutable move provenance. If an
interruption prevents the final rename, the runtime tries to restore the source
directory. If that restore cannot prove the source is back and staging no longer
holds the feature, it retains the staged directory and its recovery manifest for
manual recovery. A collision or changed byte fails without accepting new
completion. A repeat is idempotent only when the existing replay manifest names
the feature and every archived mapped byte still matches; otherwise it requires
manual reconciliation.

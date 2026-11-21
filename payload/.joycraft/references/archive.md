# Session-end feature archive

`archive.mjs` preserves a completed feature as historical regression evidence.
It runs only from a host-asserted `session-end` boundary. A queue transition,
review, hook event, or ordinary verification must never invoke it.

`--feature` takes the queue's `feature` or the folder name:
`docs/features/<feature>` or `docs/features/YYYY-MM-DD-<feature>`. Two dated
matches stop it; pass a folder name. `<slug>` below is the folder name.

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
feature's live paths remains; it does not ask for a new human permission. The
current Markdown context references must already exist outside `docs/features/`
and `docs/archive/`, showing that constraints worth keeping were carried into
current documentation. Reuse the project's existing home, such as `AGENTS.md` or
a custom context map. The attestation is an operational statement, not a
decision or approval authority.

The preview validates the complete queue before any write: the canonical queue
must be the only queue in the feature tree, all specs must be
`done`, and each spec must have exactly one of an accepted PASS report, an
explicit `ownerAcceptance` receipt, or a feature `waiver` receipt. A waiver
keeps its record bytes, the user's quoted instruction as its limitation, and
for a tool-break completion its UNVERIFIED `waiver.review` report and receipts. A normal accepted report must retain its
PASS evidence. An owner-acceptance record binds the queue/spec/subject identity
to a hashed independent review whose verdict stays `FAIL` or `UNVERIFIED`, with
nonempty limitations; it is not evidence that the review passed, and its shape
cannot authenticate a human. The runtime validates it and keeps the decision,
review, verdict and limitations in the replay manifest. Each report's independent-review shape must hold,
each report must describe its own archived queue/spec and original requirements,
and every referenced receipt must still have its recorded bytes. A pending
completion journal, a malformed/corrupt/FAIL report, unfinished work, missing
durable context, symlinks, traversal, or archive collision stops the operation.

The runtime does not rerun historic suites or compare their code input hashes
with live code, which later work may supersede. For
a v1-bound report it still checks the selected queue/dependencies and selected
governing requirement or decision records, while independent queue records and
unselected decisions may change. Older reports keep their whole-file
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
reconciliation path below is the archive-only exception. No committed match means no archive.

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

Each later brief commit, including one that records questions, needs exactly
one entry; a merge keeping a parent's brief needs none. The before hash is at
`commit^`. Each named decision must occur
exactly once in the current brief's frontmatter JSON `decisions` array, have
status `clarified` or `assigned`, and a nonempty answer. Do not manufacture an
answer to unblock archival. The preview includes the validated amendments.
These records explain historical changes; they do not prove a fresh review, so
archival does not require one report matching today's brief.

Apply restores each accepted raw version under
`evidence/requirements/<proof-hash>/<original-path>` in the archive. Different
accepted versions or scopes remain distinct. Replay entries use
`operation: "restored-from-git"` and retain the proof in `requirement`; replay
verifies the raw bytes and their accepted projection without live Git history. The current brief and its amendment ledger move with
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
   and resolution, then apply with the same flag at the ordinary quiescent
   session-end boundary.

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
so the recorded current hash remains verifiable. `laterCommits` lists the path
commits in `acceptedCommit..HEAD`, not necessarily later in time. `acceptedSha256` is copied from the original report's input;
`currentSha256` pins raw current bytes, including acceptance metadata. One queue
edit may need an entry for each report whose dependency projection changed. Duplicate, unused,
uncovered or stale entries fail closed. A ledger's presence alone never enables
the override, and its shape does not authenticate a human. The ledger may be
uncommitted: preview pins its raw hash, apply rechecks it, and the archive keeps
it byte-for-byte. Commit the archive through normal
delivery. A renamed own spec or changed report subject
path still fails; this override reconciles contents, not acceptance identities.

```sh
node .joycraft/runtime/archive.mjs archive --feature <slug> --phase session-end --attestation <attestation.json> --reconciliation docs/features/<slug>/archive-reconciliation.json
# Inspect the preview; add --apply to perform the same reconciled plan.
```

The helper checks each original review against its restored queue projection and
criteria, restores the exact accepted raw queue/spec bytes alongside the current
files, and includes the ledger and its hash in preview/replay. The manifest says
`historical.acceptanceRecordsReconciled: true` and
`currentAcceptanceRenewed: false`. Report it as **archived with reconciliation**,
with the limitations, never as a new PASS. Replay verifies
the stored ledger, its link to the restored evidence and both hashes without
live Git history. The helper does not edit
briefs/specs/queues, statuses, report identities or review verdicts to make them
agree. Missing/corrupt receipts, invalid reviews, unfinished work, an active host
or a pending completion journal cannot be overridden.

The default command is read-only. `--apply` restages and rechecks all inputs,
then atomically moves `docs/features/<slug>` to
`docs/archive/<slug>/feature`. Code, tests, and shared receipts outside the
feature stay live. Reports and receipts outside the feature are copied under
the archive record's `evidence/` directory. `archive-replay.json` maps each
original path to its moved, copied or restored byte-identical record. Historical
links in the moved files keep their text; treat them as history. Apply rewrites
links into the folder only in live Markdown outside the features and archive
folders, never in entry files, reports or receipts; `links` lists the rewrites
and, unedited, other files that link or name the folder.

The staging directory receives `archive-recovery.json` before any copy or move,
and the marker remains in the final archive as immutable move provenance. If the
final rename fails, the runtime restores the source directory; when it cannot
prove that, it keeps the staged directory and its recovery manifest for manual
recovery. A collision or changed byte fails without accepting new
completion. A repeat is idempotent only when the replay manifest names
the feature and every mapped byte still matches; otherwise reconcile it
manually.

## Archive as is

On the owner's instruction, `--as-is --owner-instruction "<their words>"`
archives a feature whose acceptance is incomplete: it moves the folder unchanged
and writes `unverified.md` listing each spec not accepted, each missing receipt
and the instruction verbatim. Report it as **archived as is, unverified**. When
every spec holds its acceptance, it is the normal archive (`asIs: "not-needed"`).

## After-archive hook

A project can name one command in `joycraft.yaml`:

```yaml
hooks:
  afterArchive: node scripts/wiki-sync.mjs
```

After a successful `--apply`, the runtime runs it once from the project root with
`JOYCRAFT_FEATURE`, `JOYCRAFT_ARCHIVE_PATH` and `JOYCRAFT_SOURCE_PATH` set, and reports
its exit code and output tail under `afterArchive`. A failing hook does not undo the archive;
report and fix it. A repeat does not run it again.
`paths.features` and `paths.archive` there move both folders.

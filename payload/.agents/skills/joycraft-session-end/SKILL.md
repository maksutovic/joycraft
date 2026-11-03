---
name: joycraft-session-end
description: Close an authorized Joycraft implementation session, report evidence honestly, and archive a wholly accepted feature only at the session boundary.
compatibility: Requires Node.js 22+ and the installed .joycraft runtime for the archive helper.
---

# Joycraft Session End

Use this skill when pausing or finishing an authorized queue session.

On Claude `SessionEnd`, write only the local session summary and deduplicate the
transition record. Do not call an API or archive from that hook. On other hosts,
use their metrics/manual or portable summary path when available; never infer a
Claude lifecycle event from a generic session boundary.

Read each touched queue and report the real state of every affected spec: `todo`, `in-review`, or `done`. `done` must have either an accepted PASS report receipt or a completion-helper owner-acceptance record bound to a current failed or unverified report; a commit, PASS command, or implementer assertion is not acceptance. Keep blocked or failed dependency branches explicit while identifying independent ready work that can continue next.

If the session stops or restarts a concurrent run, report its recorded
coordinator ownership, captured refs, known worker trees, leases, locks, and
runtime processes. Release only resources demonstrably owned by that run;
retain ambiguous merges, locks, processes, and trees for diagnosis. Do not
force local state to a remote tip. Start a replacement only from the durable
run journal and a newly printed dispatch plan. This guidance describes the
project/native runtime boundary; it does not enforce lifecycle behavior.

For each completed spec, report the implementation revision, independent reviewer session ID, report and receipt paths, actual commands and outcomes, visual inspection status where required, and known limitations. For owner-accepted work, also report the owner-acceptance record and its inherited limits as `done, owner-accepted with <limits>`; preserve the original `FAIL` or `UNVERIFIED` report rather than calling it PASS or verified.

If a completion operation failed or was interrupted, do not declare success or hand-edit statuses. Retain the helper's error and journal/recovery information, then use the bounded local recovery process in [completion guidance](../../../.joycraft/references/completion.md). It only restores the two status surfaces and accepted-report receipt captured by the journal; it does not retry unrelated work.

Leave enough project-relative paths and next actions for another session to resume the autonomous ready authorized queue without recreating settled context or decisions.

Before ending the session, run `node .joycraft/runtime/status.mjs`. Repair
lagging frontmatter of accepted specs with `--fix`; report any other drift and
any feature listed as ready to archive. Then preview
`node .joycraft/runtime/worktrees.mjs prune` and apply it with `--apply`: it
removes only clean, integrated trees of done specs and keeps failed, blocked or
unknown trees with their reason. Report kept trees and their size from `list`.
Then run `node .joycraft/runtime/cleanup.mjs` and report its findings; offer
`joycraft-cleanup` when any remain.
When this session coordinated a queue and no work on it remains, release the
lease with `node .joycraft/runtime/coordinator.mjs release --queue <queue> --session <your-session-id>`. See [worker isolation](../../../.joycraft/references/worktrees.md)
when the session used parallel mutable workers.

When an `UNVERIFIED` review identifies only an environment condition, record
that condition and arrange a fresh review after it is corrected. Do not create
an unchanged-code fix round. The existing completion process remains the sole
owner of acceptance and status changes.

Before ending, and before any archival, route each reusable fact the session established (a decision with its reason, a trap, a reference, a production fact) to its one home per [knowledge guidance](../../../.joycraft/references/knowledge.md). Rewrite a changed fact in place and put its reason in the decision log; add a context-map row for a new home; keep each touched row's "read when" true. Leave feature intent in the brief. A session with nothing reusable changes no context file.

When independent reports suggest a reusable failure lesson, use the compact, conditional process in [recurring failure guidance](../../../.joycraft/references/recurring-failures.md): keep only a source-linked shortlist in active task material, inspect current sources before relying on history, and route any proposed lesson as exact next-worker inputs through the existing dispatch path.

## Session-end archival

Archive only after the host has ended active work for a feature. It is never a
completion action: do not invoke it from `complete`, `verify`, a hook, or while
a worker or unfinished dependent needs the feature paths. Read
[archive guidance](../../../.joycraft/references/archive.md) before
preparing the host attestation.

Use the archive CLI's default preview first. It requires `phase=session-end`, a
quiescent host attestation, durable constraints already carried into current
context, every queue spec `done`, accepted independent PASS reports or
historical owner-acceptance records bound to their retained failed/unverified
reports, intact historical receipts, and no completion journal. Apply is the
separate explicit step:

```sh
node .joycraft/runtime/archive.mjs archive --feature <slug> --phase session-end --attestation <attestation.json>
node .joycraft/runtime/archive.mjs archive --feature <slug> --phase session-end --attestation <attestation.json> --apply
```

Historical reports retain their original paths, subject revisions, and claims.
Do not rewrite them or describe old code hashes as a new current acceptance.

If post-acceptance queue/spec edits block archival, investigate the discrepancy
and use the explicit archive-reconciliation path in the archive guidance when
the owner has authorized that resolution. Record the instruction, exact affected
report/input hashes, cause, resolution and limitations; preserve every original
report and accepted version. Existing task authorization need not be requested
again. Do not rewrite acceptance hashes, roll back a queue merely to satisfy old
reports, or re-review done work solely to move a folder. Report the result as
`archived with reconciliation`, never as renewed acceptance. Unresolved product
work and corrupt or missing evidence still block closure.

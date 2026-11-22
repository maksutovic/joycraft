---
name: joycraft-session-end
description: Close an authorized Joycraft implementation session, report evidence honestly, and archive a wholly accepted feature only at the session boundary.
compatibility: Requires Node.js 22+ and the installed .joycraft runtime for the archive helper.
---

# Joycraft Session End

Start with the clean-tree check: run `git status --porcelain`. When it prints
anything, the tree holds the user's work: report what the steps below find, fix
nothing, commit nothing of the user's and push nothing.

The steps run in this order: records, one tidy commit, worktree prune, archive
last, then one push that opens the PR.

Read each touched queue and report the real state of every affected spec: `todo`, `in-review`, or `done`. `done` must have either an accepted PASS report receipt or a completion-helper owner-acceptance record bound to a current failed or unverified report; a commit, PASS command, or implementer assertion is not acceptance. Keep blocked or failed dependency branches explicit while identifying independent ready work that can continue next.

If the session stops or restarts a concurrent run, report its coordinator
ownership, refs, worker trees, leases, locks and processes. Release only what
that run owns; keep ambiguous merges, locks, processes and trees for diagnosis.
Do not force local state to a remote tip. Start a replacement only from the run
journal and a new dispatch plan.

For each completed spec, report the implementation revision, independent reviewer session ID, report and receipt paths, actual commands and outcomes, visual inspection status where required, and known limitations. For owner-accepted work, also report the owner-acceptance record and its inherited limits as `done, owner-accepted with <limits>`; preserve the original `FAIL` or `UNVERIFIED` report rather than calling it PASS or verified. List each spec completed under a feature waiver as `done, waived by the user: "<instruction>"`, with any report's real verdict; never call it reviewed or verified.

If a completion operation failed or was interrupted, do not declare success or hand-edit statuses. Keep the helper's error and journal, then follow the recovery in [completion guidance](../../../.joycraft/references/completion.md).

Leave the paths and next actions another session needs to resume the ready queue without redoing settled context or decisions.

## Records

Run `node .joycraft/runtime/status.mjs --fix` (repairs lagging frontmatter of
accepted specs, lists features ready to archive) and
`node .joycraft/runtime/gate.mjs check`. Do the step each gate message names,
such as a completing command. Tell the user each message you could not clear.
Ask the user each status `questions` entry (findings rule: `$joycraft-verify`).
Write each answer where it lasts: a decision in the decision log; a requested
change in a new spec or the held spec. Never archive a feature whose question
the user asked to wait.

When an `UNVERIFIED` review identifies only an environment condition, record
that condition and arrange a fresh review after it is corrected. Do not create
an unchanged-code fix round.

Route each reusable fact the session established (a decision, a trap, a reference, a production fact) to its one home, as [knowledge guidance](../../../.joycraft/references/knowledge.md) says. Leave feature intent in the brief.

Write nothing temporal into an entry file or a guide: a date, a status or a hand-off goes to its record, as the [cleanup reference](../../../.joycraft/references/cleanup.md#what-to-find-on-each-page) says.

When independent reports suggest a reusable failure lesson, follow [recurring failure guidance](../../../.joycraft/references/recurring-failures.md).

## One tidy commit

Tidy without being asked. Run `node .joycraft/runtime/cleanup.mjs tidy` and fix
only the lines its `fixable: true` findings name, never an entry file or rule
text. When `cleanup.mjs tidy --verify` passes, make one commit with the message it
prints; it carries the records and the tidy fixes. Then run `joycraft-cleanup`
in its session-end mode. Put the other findings on the session-end page; with
none, say so in one line.

## Worktree prune

Preview `node .joycraft/runtime/worktrees.mjs prune` and apply it with
`--apply`: it removes only clean, integrated trees of done specs and keeps the
rest with their reason. Report kept trees and their size from `list`.
When this session coordinated a queue and no work on it remains, release the
lease with `node .joycraft/runtime/coordinator.mjs release --queue <queue> --session <your-session-id>`. See [worker isolation](../../../.joycraft/references/worktrees.md)
when the session used parallel mutable workers.

## Archive last

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

Keep historical reports as they are. Never describe old code hashes as a new
acceptance.

If queue or spec edits after acceptance block archival, find the cause. Use the
archive-reconciliation path in the archive guidance when the owner authorized
it. Record the instruction, affected report and input hashes, cause, resolution
and limits; keep every original report and accepted version. Do not ask again
for authorization you have. Do not rewrite acceptance hashes, roll back a queue
to satisfy old reports, or re-review done work only to move a folder. Report
`archived with reconciliation`, never renewed acceptance. Unresolved product
work and corrupt or missing evidence still block closure.

After `--apply`, commit the move.

## One push

Then make one push that carries these commits and opens the PR, or updates the
open one. After merge, session end does nothing more: say that the next session
start checks, read-only, that the change deployed and works.

---
name: joycraft-verify
description: Independently review an in-review Joycraft spec and produce an evidence-backed completion report for the guarded local helper.
compatibility: Requires Node.js 22+, the installed .joycraft runtime, and Git for revision-bound completion. A separate reviewer context completes a spec; UI inspection is needed only for visual criteria.
---

# Joycraft Verify

Use this skill once an implementer has placed an authorized spec in `in-review`.

For work that used a worker tree, prepare the subject from the coordinator's
final integrated bytes, not the implementer's pre-integration tree. A stable
source-read-only review may use that fixed tree and write its declared report
and receipts outside frozen inputs; it cannot modify governing inputs. Runtime
checks that mutate caches, browser profiles, or other state need independent
mutable runtime state. Read [worker isolation](../../../.joycraft/references/worktrees.md)
when this boundary applies.

When called from the implementer's context, launch the independent reviewer with
only current raw brief/spec/queue/input sources plus scoped owning decisions; do
not pass an expected verdict, reasoning, or proposed report. A parent may
prepare a source packet for a manual boundary, but it must not bind the child
using the parent's identity. After launch, the reviewer child runs
`dispatch-start.mjs --role reviewer` at its actual root, which captures the
subject, preflights delivery and writes the bounded packet. Without a separate
reviewer context, or a real agent ID that the child sees or the launch result
gives, leave the spec `in-review`; do not manufacture either.
Reviewer startup also carries `trace`, the spec's criteria with the tests
tagged `[AC:<criterion-id>]`. Report untraced criteria as findings; a missing tag alone is
not a FAIL.

Dispatch `collaboration.spawn_agent` with `fork_turns: "none"` and the packet's raw sources and output contract. In Claude Code, use its `Agent` tool with the same limited inputs and the `joycraft-reviewer` agent type when installed (otherwise the project-selected reviewer model); a fresh worker is the separate review context. Otherwise use a separate accessible review context. Record its returned native host, session and child agent identity; a shared parent session does not make two native actors the same. Follow the actor-report fields in the dispatch reference. Do not invent IDs.

As the dispatched reviewer, review directly; do not dispatch another. Read the parent brief, spec, queue entry, declared criteria and exact verification inputs. Use the supplied subject, set independence truthfully, and do not self-certify implementation from your own context.

Read the diff of each changed test file and judge it by [test changes](../../../.joycraft/references/testing-review.md#test-changes), test-only specs by [fault proof](../../../.joycraft/references/testing-review.md#test-only-specs).

Green tagged tests alone pass no criterion. For each spec, also:

- **Probe:** name one input that a user or an outsider can change and the code
  trusts (an argument, a path, a link, a stored file). Try it tampered on the
  real surface.
- **Can the test fail?** For the key criterion, revert the change (or its key
  line) in a scratch copy and run its test. Record the red run. A test that stays green is `blocking`.
- **Docs against code:** check each changed doc line that states behavior
  against the code it describes. A false line is `blocking`.
- **Fix round:** read the fix diff for new defects, not only whether each open
  finding is closed.

Skip style.

Review scope as well as behavior: determine whether the listed inputs and criteria cover the requested work, including relevant newly changed files. For a cross-boundary change, inspect the combined observable behavior across the relevant producer, consumer, state or storage boundary; separate green helpers, snapshots, or assertion counts do not establish that behavior. If a material counterpart or owning decision/context source was omitted, report the scope gap and require its exact path to be added before a fresh current review subject is prepared. Preserve the snapshot's implementation revision as provenance while checking its current bound inputs. A changed, missing, or renamed input makes the subject stale; do not substitute a newer HEAD as its identity.

Create a schema-v1 verification report tied to that subject, using the shared fields in [.joycraft/contracts/types.d.ts](../../../.joycraft/contracts/types.d.ts). For every declared criterion, provide PASS observations for its required evidence kinds. Keep unfiltered command output and its real exit status in hashed, project-relative receipts. A source scan supports only structural observations. Visual observations require a reviewer-inspected render plus route, state, viewport, interactions, and outcomes. Take runtime evidence once from the spec's own tests (the startup output's `commands.focused`), never the project gate ([running tests](../../../.joycraft/references/testing.md#running-tests)); in wave mode, state "gate not run; due at wave end"; other evidence with the package's recorded tool, start command and evidence command from the packet's `reviewLoop` (`section`: the `Review loop` section of `AGENTS.md`; `local`: this machine's host tools), within that tool's `canShow`. A claim beyond `canShow`, or in a package the user skipped, is an agreed limit, not `UNVERIFIED`: check what the agreed tool can show, say in plain words how you checked, and leave what is left to the parent agent. A picture-only tool gives `interactions: []`. `UNVERIFIED` means a check that should have run and did not: the tool broke, the app did not start, or a render was saved but not inspected. On a tool break, first repair with what the user agreed to: restart the dev server, free the port, relaunch the browser or simulator, retry once. A repair never installs, upgrades or reconfigures anything. If it still fails, record `UNVERIFIED` with `cause: 'tool-break'` and the reason. Mark a failing result or an unresolved concern `FAIL` or `UNVERIFIED`
truthfully, with its receipt; an unresolved hang is `UNVERIFIED` with its receipt, never `FAIL`.

Run the dispatch helper's `check-report` before completion. If
it rejects a packaging or report problem, return the correction to this same
reviewer; do not invent observations or replace the independent identity.

Items under a spec's "Deferred until deploy" section are not criteria; each is a
`note`.

Findings rule: give each `findings` entry its `class`, `origin`, and `criterion`
or `at` (file:line or receipt). `blocking` is only a failing stated criterion,
a test you showed cannot fail, or a defect or regression in the changed code that you reproduced (command, exit
status, what you saw). A reproduced defect is never a `follow-up`. A defect
inside a criterion's scope that a user would hit blocks the spec: reproduce it.
A case the spec does not decide is a `follow-up`: take the reading closest to
the brief's intent, recorded as `assumption`. `decision-needed` is only for two readings that give
opposite verdicts on a stated criterion, or a guess that cannot be undone; it
holds this spec and its dependents, never the queue. Never repeat an earlier round's
finding as new. Do not file `siblings` or `archivedTags`. Each of these is a
`note`, not a `follow-up`: a check that passed (a test change matching its
class), another spec's file or an archived feature's tag that startup did not
list, a "Deferred until deploy" item, a flaky retry or log noise with no defect.

Set a PASS verdict only when scope is reviewed, all required evidence is sufficient, and no blocking finding or unresolved UNVERIFIED evidence remains. Then run guarded completion, the startup output's `commands.finalizeReview`. When startup printed `commands.finish` instead, do not finalize: return the report path.

Do not edit the queue or spec to make a report fit. For rejections or interrupted writes, follow
[completion guidance](../../../.joycraft/references/completion.md).

For scope-enabled work, completion compares the recorded base and inferred
relevant paths with the current change topology. Do not replace the base with
current `HEAD`. Give every unrelated changed path an explicit, narrow exclusion
and reason; never add an entire branch or directory blindly. A deletion is a
deliberate non-requirement input with `state: 'absent'`; requirements must remain
present, and a rename binds both the old absent and new present paths.

For a current `FAIL` or `UNVERIFIED` report, preserve the evidence, receipt,
subject identity, and explicit limits. Do not solicit owner acceptance as part
of review or soften the verdict. The implementer may repair it or, after a
trusted human explicitly accepts this spec's current findings, use the separate
owner-acceptance completion path described in [completion guidance](../../../.joycraft/references/completion.md). It never turns
this report into PASS.

---
name: joycraft-verify
description: Independently review an in-review Joycraft spec and produce an evidence-backed completion report for the guarded local helper.
compatibility: Requires Node.js 22+, the installed .joycraft runtime, and Git for revision-bound completion. A separate reviewer context completes a spec; UI inspection is needed only for visual criteria.
---

# Joycraft Verify

Use this skill after an implementer has finished an authorized spec and placed it in `in-review`.

An artifact can make the current brief's decisions and review summary easier to
inspect; it does not verify behavior or change a queue status. Read
`.joycraft/references/artifacts.md` only when that view is part of the
review material. A read-only artifact status cannot mark a spec done.

For work that used a worker tree, prepare the subject from the coordinator's
final integrated bytes, not the implementer's pre-integration tree. A stable
source-read-only review may use that fixed tree and write its declared report
and receipts outside frozen inputs; it cannot modify governing inputs. Runtime
checks that mutate caches, browser profiles, or other state need independent
mutable runtime state. Read [worker isolation](../../../.joycraft/references/worktrees.md)
when this boundary applies. Worktree separation does not establish a separate
reviewer context, so retain the dispatch requirements below.

When called from the implementer's context, launch the independent reviewer with
only current raw brief/spec/queue/input sources plus scoped owning decisions; do
not pass an expected verdict, reasoning, or proposed report. A parent may
prepare a source packet for a manual boundary, but it must not bind the child
using the parent's identity. After launch, the reviewer child bootstraps at its
actual root and runs `dispatch-start.mjs --role reviewer` with its own actual
native identity, which captures the subject, preflights delivery, writes the
bounded packet, and binds it. If the real ID, available authority, or a separate
reviewer context is unavailable, leave the spec `in-review`; do not manufacture
any of them. A hooks-disabled/manual workflow can still be ready; an unenforced
result holds only the claimed review, not unrelated work.
Write packets and snapshots beneath a confirmed Git-ignored project-local
directory so they do not create unrelated scope paths.

Dispatch `collaboration.spawn_agent` with `fork_turns: "none"` and the packet's raw sources and output contract. Do not give the reviewer an intended verdict, conclusion, or implementer reasoning. In Claude Code, use its `Agent` tool with the same limited inputs and the `joycraft-reviewer` agent type when installed (otherwise the project-selected reviewer model); a fresh worker is the separate review context. Otherwise use a separate accessible review context. Record its returned native host, session and child agent identity; a shared parent session does not make two native actors the same. Follow the actor-report fields in the dispatch reference. Do not invent IDs or create a worktree solely to obtain a different session string.

When already dispatched as the independent reviewer, perform the review directly; do not recursively dispatch another reviewer. Read the parent brief, spec, queue entry, declared criteria and exact verification inputs. Use the supplied subject, set independence truthfully, and do not self-certify implementation from your own context.

Inspect any hook rule/test-gap findings alongside the actual changes and
requirements. Resolve supported concerns with observed evidence; a classifier
score or clean hook receipt cannot establish acceptance. Check changed tests for
weakened assertions that could hide the requested behavior.

Review scope as well as behavior: determine whether the listed inputs and criteria cover the requested work, including relevant newly changed files. For a cross-boundary change, inspect the combined observable behavior across the relevant producer, consumer, state or storage boundary; separate green helpers, snapshots, or assertion counts do not establish that behavior. If a material counterpart or owning decision/context source was omitted, report the scope gap and require its exact path to be added before a fresh current review subject is prepared. Preserve the snapshot's implementation revision as provenance while checking its current bound inputs. A changed, missing, or renamed input makes the subject stale; do not substitute a newer HEAD as its identity.

Create a schema-v1 verification report tied to that subject, using the shared fields in [.joycraft/contracts/types.d.ts](../../../.joycraft/contracts/types.d.ts). For every declared criterion, provide PASS observations for its required evidence kinds. Keep unfiltered command output and its real exit status in hashed, project-relative receipts. A source scan supports only structural observations. Visual observations require a reviewer-inspected render plus route, state, viewport, interactions, and outcomes; take the render with the tools and start command in the packet's `reviewLoop` (the `Review loop` section of `AGENTS.md`), and mark a claim whose tool is skipped or missing `UNVERIFIED`. Mark unavailable inspection, a failing result, or an unresolved concern as `UNVERIFIED` or `FAIL` truthfully.

Run each test command once in single-run mode with `CI=1` and a 300000 ms
timeout; follow [running tests](../../../.joycraft/references/testing.md#running-tests)
when one times out. Record an unresolved hang as `UNVERIFIED` with its receipt.

Run the dispatch helper's `check-report` before completion. It reuses the same
subject, receipt, and evidence validators without changing a queue status. If
it rejects a packaging or report problem, return the correction to this same
reviewer; do not invent observations or replace the independent identity.

Items under a spec's "Deferred until deploy" section are not criteria. Do not
fail or hold the spec for them; list them in the report as open for the owner.

Report every finding with a severity and the criterion it touches. A finding
blocks only when it shows a stated criterion failing, or a reproducible
correctness defect or regression in the changed code, with file:line or a
receipt. A case the spec does not decide is "decision needed" for the
coordinator, not a FAIL. A probe outside the spec's named check set is a
non-blocking follow-up unless it regresses against the base. Name the class of a
defect once; do not repeat a finding from an earlier round as new.

Set a PASS verdict only when scope is reviewed, all required evidence is sufficient, and no blocking finding or unresolved UNVERIFIED evidence remains. Then run guarded completion:

```sh
node .joycraft/runtime/completion.mjs finalize-review --queue <queue-path> --spec <id> --report <report.json>
```

`finalize-review` is the primary command and has exactly the validation of the
legacy-compatible `complete` alias. Completion validates the report and receipt
hashes, distinct native implementer/reviewer actors (or legacy distinct session
IDs), independent-review attestation, subject freshness, and evidence
sufficiency. It may reject an otherwise green suite. Do not edit the queue or
spec to make a report fit. For rejections or interrupted writes, follow
[completion guidance](../../../.joycraft/references/completion.md).
Once it returns, let the implementer continue the autonomous ready queue; do not
hold independent work behind an unrelated failed branch.

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
owner-acceptance completion path described in [completion guidance](../../../.joycraft/references/completion.md). That path validates bindings and
receipts, not the authenticity of a human instruction; it never turns this
report into PASS or verified evidence.

Report the reviewer identity, checks and observed outcomes, receipt paths, verdict, helper result, and limitations without claiming evidence that was not observed.

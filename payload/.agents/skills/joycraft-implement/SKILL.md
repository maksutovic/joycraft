---
name: joycraft-implement
description: Implement authorized Joycraft feature specs from a project queue, preserving dependencies and sending finished work to independent verification.
compatibility: Guarded review and completion require Node.js 22+, the installed .joycraft runtime, and Git; ordinary implementation follows the project's own stack.
---

# Joycraft Implement

Carry out already-authorized specs in `docs/features/<slug>/specs/.joycraft-spec-queue.json`. A small job (the `Work` line in `AGENTS.md`) has no queue and does not use this skill.

Before changing code, read `AGENTS.md`, each page whose context-map row matches the spec, the parent brief, the spec, and its declared verification inputs. Record assumptions when context is missing. Stop for a scope-changing contradiction or an unresolved consequential decision.

For a change across state, data or producer/consumer boundaries, inspect the
counterpart code and owning decisions, and add them to the exact verification
inputs before review ([focused discovery](../../../.joycraft/references/architecture.md));
a local repair needs none.

Work the ready authorized queue autonomously. A `todo` spec is ready when every
dependency is `done`; a merge or `in-review` status is insufficient. Preserve the limits of an
explicitly owner-accepted dependency. Run independent ready work while a
branch waits on review, environment repair or a recorded owner hold.

The host launches the worker first. Before any edit, the worker runs
`node .joycraft/runtime/dispatch-start.mjs --queue <queue> --spec <id> --role
implementer --coordinator-session <id>` from its root (`--help` lists the
defaults). The coordinator runs it only when it implements the spec itself.
Use the packet only when `ready` is true.

If reports show a possible recurring failure, follow [recurring failure guidance](../../../.joycraft/references/recurring-failures.md) first.

Before the first dispatch, claim the queue with your host session ID, passed
as `--coordinator-session` to every startup:

```sh
node .joycraft/runtime/coordinator.mjs claim --queue <queue> --session <your-session-id> --host <host>
```

If another session holds the queue, stop and report the holder; `--take-over`
only when the user says that session has ended. Then run
`node .joycraft/runtime/queue-check.mjs --queue <queue>`; act on each gap.

For a spec marked `execution.parallel: true`, give each concurrent mutator its
own tree and build/cache state, on every host:
`node .joycraft/runtime/worktrees.mjs create --queue <queue> --spec <id> --session <your-session-id>`.
Launch its worker without host worktree isolation (Claude Code: no Agent
`isolation`, an agent type without `isolation` frontmatter), naming the printed `workerRoot`. It first runs the project bootstrap. Read [worker isolation](../../../.joycraft/references/worktrees.md)
for parallel work, integration, cleanup or resource limits. Without
isolation, replan the wave: set the entry's `execution.parallel` to `false`
before dispatch, with the reason, and run it serially; else leave it unstarted.

Implement the spec; run checks and any rendered inspection as you go, in the tiers of [running tests](../../../.joycraft/references/testing.md#running-tests). Tests come from the spec, tagged `[AC:<criterion-id>]`. Add a test only when it can fail for a reason no existing test can; one test may carry several `[AC:]` tags and cover several checks; extend the existing test file first. A new acceptance test fails before the code exists. Do not commit tests of one-off run state. Before `submit` on a spec that changes what a user sees, run the Look bullet in `AGENTS.md`. When the implementation is finished, set it `in-review` with `node .joycraft/runtime/completion.mjs submit --queue <queue> --spec <id>`. A passing suite, commit or empty ready set accepts nothing.

Honor the queue's commit mode. In `batch`, commit and review the independent ready
wave at its boundary before advancing its dependents, not after the whole dependency chain. In `checkpoint`, commit each finished spec,
integrate it, rerun its focused tests after any integration edit, and review the
integrated bytes before continuing. In `isolated`, do all of `checkpoint` and
also give each implementation spec a fresh agent context
(`fork_turns: "none"` when spawning; in Claude Code the `joycraft-implementer`
agent type when installed) with its raw requirements and project context. A worktree is operational isolation; it does not prove review independence.

At the review boundary, invoke `$joycraft-verify`; its
`dispatch-start.mjs --role reviewer` snapshots the subject, checks delivery and
binds the packet. Supply only observed host capabilities and raw current
sources, coupled ones included; never a desired verdict or reasoning. It needs
the actual host session identity
([dispatch guidance](../../../.joycraft/references/dispatch.md)); keep packets
and subjects under `.joycraft/local/packets/`, not among reviewed sources.
When `submit` warns that a done spec's accepted input changed, run the printed
`completion.mjs reopen` for that spec and review it again.
Without a separate review context, leave the spec `in-review`; invent no ID.

When a recorded tool breaks mid-run, repair and record it as
`$joycraft-verify` says, leave that spec `in-review`, and continue with
specs that do not depend on it. At the first hold, tell the user the spec,
tool, cause and repair tried. Session end lists every held
spec.

A tool break stops the queue only when the project will not build or
install, the worktree or repository is broken, or the next step would touch data
or systems outside the project (a shared database, a deploy). Every other tool
break is repair, then hold.

Only the guarded completion path can move an `in-review` spec to `done`. Use manual snapshot/complete only at an explicit non-native boundary, after reading [completion guidance](../../../.joycraft/references/completion.md).

When a current independent review is `FAIL` or `UNVERIFIED`, fix
straightforward failures within existing authorization and get a fresh
review. A spec gets at most three reviews: reviewer startup prints
`reviewRound` and refuses a fourth. If startup refuses a review or a second FAIL
on the same criterion occurs, send no further fix and never amend acceptance
yourself: note it under `## Decision needed` in the spec, leave it `in-review`,
and continue independent ready work. Treat a held `decision-needed` finding
(`$joycraft-verify`) the same, without the note: `status.mjs` lists it. An owner can explicitly accept the
current findings and their stated limits through `accept-owner`: a bounded
exception, not a PASS or verified result. Ask only when proceeding needs that
override and no trusted human acceptance of this spec's current findings exists.
Give one short summary and focused choice, then persist the owner's actual
instruction and nonempty limits in the decision record. A general "continue" or "go," another agent's
direction, or authorization to add this capability is not acceptance. If the
owner already explicitly accepted, do not reconfirm. Dependent work continues only within
those limits, without deployment, security or other blanket authority. Report it as `done, owner-accepted with
<limits>`, never as PASS or verified.

Workers run focused tests only. The coordinator runs the recorded gate alone
through `evidence.mjs` at each point `coordinator.mjs gate-plan` prints, with
the receipt at a git-ignored path or after committing pending files. No push
without a green gate receipt (`delivery.mjs push --gate-receipt`, or
`-- <verifier>` without `tests.gate`; see
[checked delivery](../../../.joycraft/references/delivery.md)). On red,
`coordinator.mjs gate-owner` picks the spec for the fix round, else bisect only
the failing file, newest commit first; a second red holds the push. Unless
`AGENTS.md` says otherwise, push after each green gate (session end's one push
opens the PR) and read CI once, on the PR, after session end's push. After a
second red CI run, stop and report.

After each review wave (in `checkpoint`, after each accepted spec) and before
the next wave, record each `follow-up` finding of the accepted reports with
`node .joycraft/runtime/follow-ups.mjs --queue <queue> --spec <id> --finding <id>`
and one outcome. A defect or gap inside the brief's intent: append a fix spec to
this queue, with no question to the user, then `--fixed <new spec>`. One that
changes scope or has no safe default: add an open brief decision, then
`--decided <id>`. One that is not a defect: `--dismissed <reason>`.

After review and completion, continue with the next ready authorized spec.
When no spec can start (each one held or waiting on a held spec), run `$joycraft-session-end` without waiting for the user.
Report blockers and the next action first, then measured progress. When a run
stops or skips planned work, say why and what state is kept; explain any
external setting needed and its effect. Give each concise stage
update once; never repeat pre-dispatch text after the dispatch. Never describe unavailable,
failed, or uninspected evidence as passing.

---
name: joycraft-implement
description: Implement authorized Joycraft feature specs from a project queue, preserving dependencies and sending finished work to independent verification.
compatibility: Guarded review and completion require Node.js 22+, the installed .joycraft runtime, and Git; ordinary implementation follows the project's own stack.
---

# Joycraft Implement

Use this skill to carry out already-authorized specs in `docs/features/<slug>/specs/.joycraft-spec-queue.json`.

Read the project's entry file (`AGENTS.md`), then each page whose context-map row matches the spec, the parent brief, the selected spec, and its declared verification inputs before changing code. Reuse current decisions and context; record assumptions when context is missing. Stop for a scope-changing contradiction or an unresolved consequential decision. Do not require a new interview for settled work.

For a change across state, data or producer/consumer boundaries, inspect the
counterpart code and owning decisions, and add them to the exact verification
inputs before review ([focused discovery](../../../.joycraft/references/architecture.md));
a local repair needs none.

Work the ready authorized queue autonomously. A `todo` spec is ready when every
dependency is `done`; a merge or `in-review` status is insufficient. Preserve the limits of an
explicitly owner-accepted dependency. Choose independent ready work while an
affected branch waits for review, environment repair or a recorded owner hold.

For normal native execution, the host launches the selected worker first. The
child bootstraps from its actual root, then runs `dispatch-start.mjs --role
implementer` with its actual native identity before any tasked edit or mutation.
The coordinator runs that start itself only when it is the implementer actor.
Use the returned packet only when `ready` is true.

If existing independent reports reveal a possible recurring failure, follow [recurring failure guidance](../../../.joycraft/references/recurring-failures.md) before carrying it forward.

Before the first dispatch, claim the queue with your actual host session ID and
pass it as `--coordinator-session` to every startup:

```sh
node .joycraft/runtime/coordinator.mjs claim --queue <queue> --session <your-session-id> --host <host>
```

If another session holds the queue, stop and report the holder; use
`--take-over` only when the user says that session has ended. Then run
`node .joycraft/runtime/queue-check.mjs --queue <queue>`; act on each gap.

For a spec marked `execution.parallel: true`, give each concurrent mutator its
own tree and build/cache state, on every host:
`node .joycraft/runtime/worktrees.mjs create --queue <queue> --spec <id> --session <your-session-id>`.
Launch its worker without host worktree isolation (Claude Code: no Agent
`isolation`, an agent type without `isolation` frontmatter), naming the printed `workerRoot`. It first runs the project bootstrap. Read [worker isolation](../../../.joycraft/references/worktrees.md)
when parallel work, integration, cleanup, or resource capacity is in play. If
isolation cannot be obtained, replan the affected wave and set the current
queue entry's `execution.parallel` to `false` before dispatch, recording why;
then run it serially. Otherwise leave it unstarted.

Implement the spec; run checks and any relevant rendered inspection as you go, in the tiers of [running tests](../../../.joycraft/references/testing.md#running-tests). Tests come from the spec, tagged `[AC:<criterion-id>]`. Add a test only when it can fail for a reason no existing test can; one test may carry several `[AC:]` tags and cover several checks; extend the existing test file first. A new acceptance test runs once and fails before the code exists; its receipt comes first. Do not commit tests of one-off run state. When the implementation is finished, set it `in-review` with `node .joycraft/runtime/completion.mjs submit --queue <queue> --spec <id>`. A passing test suite, commit, or empty ready set does not accept the work.

Honor the queue's commit mode. In `batch`, commit and review the independent ready
wave at its boundary before advancing its dependents; do not wait for an entire
dependency chain to be implemented. In `checkpoint`, commit each finished spec,
integrate it, rerun its focused tests after any integration edit, and review the
integrated bytes before continuing. In `isolated`,
also give each implementation spec an actual fresh agent context
(`fork_turns: "none"` when spawning; in Claude Code the `joycraft-implementer`
agent type when installed) with its raw requirements and project context. A worktree is operational isolation; it does not prove review independence.

At the review boundary, invoke `$joycraft-verify`. Use the single native
`dispatch-start.mjs --role reviewer` flow to snapshot the current subject,
verify worker delivery, prepare and bind the bounded packet. Supply only
observed host capabilities and raw current sources, including coupled
sources discovered during implementation; never a desired verdict or reasoning.
It needs actual host session/agent identity and available current authority
as described in [dispatch guidance](../../../.joycraft/references/dispatch.md).
When `submit` warns that a done spec's accepted input changed, run the printed
`completion.mjs reopen` for that spec and review it again.
If a separate review context/capability is unavailable, leave the spec
`in-review`; do not invent an ID to continue. This holds the claimed review,
not unrelated authorized work.

When a recorded tool breaks during a run, repair and record it as
`$joycraft-verify` says, leave that spec `in-review`, and continue with the
specs that do not depend on it. At the first hold, tell the user the spec,
tool, cause and repair tried. Session end lists every held
spec.

A tool break stops the whole queue only when the project will not build or
install, the worktree or repository is broken, or the next step would touch data
or systems outside the project (a shared database, a deploy). Every other tool
break is repair, then hold.

Only the guarded completion path can move an `in-review` spec to `done`. Use its manual snapshot/complete commands only at an explicit non-native boundary, after reading [completion guidance](../../../.joycraft/references/completion.md).

When a current independent review is `FAIL` or `UNVERIFIED`, first fix
straightforward failures within the existing authorization and obtain a fresh
review. A spec gets at most three reviews: reviewer startup prints
`reviewRound` and refuses a fourth. If startup refuses a review or a second FAIL
on the same criterion occurs, send no further fix and never amend acceptance
yourself: note it under `## Decision needed` in the spec, leave it `in-review`,
and continue independent ready work. Treat a held `decision-needed` finding
(`$joycraft-verify`) the same, without the note: `status.mjs` lists it. An owner can explicitly accept the
current findings and their stated limits through `accept-owner`; that is a
bounded exception, not a PASS or verified result. Ask only when proceeding
needs an explicit override and no trusted human acceptance of this spec and its
current findings exists.
Make one short summary and focused choice, then persist the owner's actual
instruction and nonempty limits in the decision record. A general
"continue" or "go," another agent's direction, or authorization to add this
capability is not an acceptance of a spec. If the owner already explicitly
accepted, proceed without reconfirming. Work that depends on the result may
continue only within those accepted limits; it does not gain deployment,
security, or other blanket authority. Report it as `done, owner-accepted with
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

After review and completion, continue with the next ready authorized spec.
When no spec can start, that is, each remaining spec is held or waits on a
held spec, run `$joycraft-session-end` without waiting for the user.
Report blockers and the next action first, then measured progress. Tell the user
when a run stops or planned work is omitted, with the reason and retained state;
explain any needed external setting and its effect. Give each concise stage
update once; never repeat pre-dispatch text after the dispatch. Never describe unavailable,
failed, or uninspected evidence as passing.

---
name: joycraft-implement
description: Implement authorized Joycraft feature specs from a project queue, preserving dependencies and sending finished work to independent verification.
compatibility: Guarded review and completion require Node.js 22+, the installed .joycraft runtime, and Git; ordinary implementation follows the project's own stack.
---

# Joycraft Implement

Use this skill to carry out already-authorized specs in `docs/features/<slug>/specs/.joycraft-spec-queue.json`.

Read the project's boundaries, the parent brief, the selected spec, and its declared verification inputs before changing code. Reuse current decisions and context; record assumptions when context is missing. Stop for a scope-changing contradiction or an unresolved consequential decision. Do not require a new interview for settled work.

For a change across state, data or producer/consumer boundaries, inspect the
actual counterpart code and relevant owning decisions/context when available.
Missing context permits explicit assumptions and progress on understood scope;
it does not require an architecture document. Add discovered material sources
and relevant existing decision/context paths to exact verification inputs before
review, reporting unresolved coverage. See
[focused discovery](../../../.joycraft/references/architecture.md)
when the boundary is unclear; a local repair needs no architecture review.

Work the ready authorized queue autonomously. A `todo` spec is ready when every
dependency is `done`; a merge or `in-review` status is insufficient. Dispatch
preflight checks this against the actual queue. Preserve the limits of an
explicitly owner-accepted dependency. Choose independent ready work while an
affected branch waits for review, environment repair or a recorded owner hold.
Keep unfinished independent work visible.

For normal native execution, the host launches the selected worker first. The
child bootstraps from its actual root, then runs `dispatch-start.mjs --role
implementer` with its actual native identity before any tasked edit or mutation.
The coordinator runs that start itself only when it is the implementer actor.
Use the returned packet only when `ready` is true. A hooks-disabled/manual
workflow can be ready; unavailable hook status is not a new permission gate for
all work. When startup returns unenforced, hold only that claimed enforced task,
report why, and continue unrelated authorized or manual/disabled workflow.

If existing independent reports reveal a possible recurring failure, follow [recurring failure guidance](../../../.joycraft/references/recurring-failures.md) before carrying it forward: inspect the current scoped sources and actual counterpart path or journey, then provide any proposed lesson as exact inputs through the existing dispatch flow. A verified repair may establish its local project fact; a broader method benefit remains pending later reuse.

For a spec marked `execution.parallel: true`, use a separate linked worktree for
each concurrent mutator, including its build/cache state. Its first action is
the documented project bootstrap, before edits, stateful runtime work, or packet
preparation. Dispatch from its actual root. Read [worker isolation](../../../.joycraft/references/worktrees.md)
when parallel work, integration, cleanup, or resource capacity is in play. If
isolation cannot be obtained, replan the affected wave and set the current
queue entry's `execution.parallel` to `false` before dispatch, recording why;
then run it serially. Otherwise leave it unstarted.

Implement the spec and run meaningful checks and any relevant rendered inspection during implementation. Do not defer ordinary checks to the batch boundary. Run each test command once in single-run mode with `CI=1` and a 300000 ms timeout; follow [running tests](../../../.joycraft/references/testing.md#running-tests) when one times out. Write one focused test per acceptance `Check:`, from the spec rather than the code; if a criterion or test looks wrong, report a spec gap instead of editing it to pass. When the implementation is finished, update both the queue entry and the spec's top-level frontmatter `status:` to `in-review` together. A passing test suite, commit, or empty ready set does not accept the work.

Honor the queue's commit mode. In `batch`, commit and review the independent ready
wave at its boundary before advancing its dependents; do not wait for an entire
dependency chain to be implemented. In `checkpoint`, commit each finished spec,
integrate it, and review the integrated bytes before continuing. In `isolated`,
also give each implementation spec an actual fresh agent context
(`fork_turns: "none"` when spawning; in Claude Code the `joycraft-implementer`
agent type when installed) with its raw requirements and project context. A worktree is operational isolation; it does not prove review independence.

At the review boundary, invoke `$joycraft-verify`. Use the single native
`dispatch-start.mjs --role reviewer` flow to snapshot the current subject,
verify worker delivery, prepare and bind the bounded packet. Supply only
observed host capabilities and raw current sources, including relevant coupled
sources discovered during implementation; never a desired verdict or reasoning.
It needs actual host session/agent identity and available current authority
as described in [dispatch guidance](../../../.joycraft/references/dispatch.md).
Write its packet or subject beneath a confirmed Git-ignored project-local
directory, not among reviewed sources.
If it returns unenforced, or a separate review context/capability is unavailable,
leave the spec `in-review`; do not invent an ID or prompt to continue. This holds
the claimed review, not unrelated authorized or hooks-disabled/manual work.

Only the guarded completion path can move an `in-review` spec to `done`. Use its manual snapshot/complete commands only at an explicit non-native boundary; read [completion guidance](../../../.joycraft/references/completion.md) before doing so.

When a current independent review is `FAIL` or `UNVERIFIED`, first fix
straightforward failures within the existing authorization and obtain a fresh
review. A spec gets at most three reviews; state the real round number in each
fix brief. Settled briefs and checked specs should make this rare. If a second FAIL
on the same criterion or a "decision needed" finding still occurs, send no
further fix and never amend acceptance yourself: note it under `## Decision
needed` in the spec, leave it `in-review`, and continue independent ready work. An owner can explicitly accept the
current findings and their stated limits through `accept-owner`; that is a
bounded exception, not a PASS or verified result. Do not ask merely because a
review failed. Ask only when an explicit override is needed to proceed and a
trusted human acceptance of this spec and these current findings is missing.
Make one short summary and focused choice, then persist the owner's actual
instruction and nonempty limits in the decision record. A general
"continue" or "go," another agent's direction, or authorization to add this
capability is not an acceptance of a spec. If the owner already explicitly
accepted, proceed without reconfirming. Work that depends on the result may
continue only within those accepted limits; it does not gain deployment,
security, or other blanket authority. Report it as `done, owner-accepted with
<limits>`, never as PASS or verified.

For authorized Git delivery, follow the project's verification and independent
review policy on the final integrated revision before pushing it. Use
[checked delivery](../../../.joycraft/references/delivery.md) for a
fail-stop, revision-bound verifier/push when useful. A failed verifier stops
delivery; never push with a promise to verify later or hide failure in a shell
chain. This command cannot replace independent review or authorize a push.

After review and completion, continue with the next ready authorized spec.
Report blockers and the next action first, then measured progress. Tell the user
when a run stops or planned work is omitted, with the reason and retained state;
explain any needed external setting and its effect. Give concise stage updates
during long work instead of only announcing passes. Never describe unavailable,
failed, or uninspected evidence as passing.

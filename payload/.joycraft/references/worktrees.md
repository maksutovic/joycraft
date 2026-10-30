# Worker isolation

Use this reference when planning, dispatching, testing, integrating, or closing
a queue with concurrent work.

## Choose an execution shape

`execution: { parallel: true }` marks a `QueueSpec` in an independent concurrent
wave. Omit `execution` for legacy serial behavior. Mark each spec only when its
planned wave can run independently; dependencies and overlapping ownership still
decide whether it is ready.

Known parallel mutators must use distinct linked worktrees with the same Git
common directory. A worker owns its worktree, its mutable build/dependency/cache
state, and the paths it changes until its result is integrated. The coordinator
retains the integration tree. Read-only reviewers may share the reviewed source
tree only while its declared inputs are fixed. They may write declared review
reports and receipts outside those frozen source inputs in a separately owned
output location. Runtime checks that mutate caches, browsers, or other state
need their own mutable runtime state.

This is a portable policy, not a host command recipe. Use only worktree,
worker, and runtime-isolation facilities the active host actually exposes. Do
not infer native flags, session IDs, or lifecycle features. If the required
isolation, project-owned disk capacity, or required resource lease is
unavailable, do not dispatch that spec as parallel. Replan the affected wave,
set its current queue entry's `execution.parallel` to `false` before dispatch,
and record the reason; then it may run serially. If that replan cannot be made,
leave the spec unstarted. The queue's `isolated` mode remains a separate
fresh-context requirement; a worktree alone does not satisfy it.
`read-only` describes source handling here; it does not create a filesystem
sandbox.

Before a large concurrent queue, print and retain a deterministic dispatch plan:
the target branch and captured refs, queue and integration owner, dependency
order, actual aggregate resource capacity across active runs, and any
project-owned leases. Verify the active workflow's real isolation and host
capabilities; do not assume agent frontmatter, a planned worktree, or a
runtime lifecycle feature is applied. These are observations to recheck on the
active host, not runtime enforcement.

Only one active queue/integration owner may advance a target branch at a time.
Other work may proceed only when its project-declared inputs, leases, and
integration boundary make that safe. Record durable coordinator ownership and
the captured refs before dispatch or restart, so recovery can distinguish this
run's resources from another session's.

## Workspace input and project setup

Dispatch accepts an optional runtime workspace input:

```js
{ coordinatorRoot, parallel?: boolean, access: 'mutating' | 'read-only', baseRevision?: '<full-commit-SHA>' }
```

For a known parallel mutator, `access` is `mutating` and the runtime derives and
attests real paths, Git topology, and the actual `workerRoot` in the packet. A
read-only reviewer may use the coordinator root while its inputs remain stable,
and write only its declared report/receipt outputs outside those inputs. It must
not write governing inputs or run cache-mutating runtime work there. The host
must not claim a planned path as the actual root.

Record project-specific bootstrap, ignored-file, disk, and resource requirements
in `docs/context/worktrees.md` when that is the project's context home, or in
the existing context-map destination. Do not require a new record when no such
facts are needed. The worker's first action after its tree exists is to run the
documented bootstrap before edits, stateful runtime work, or packet preparation.
If the project lockfile changed since a tree was bootstrapped, complete its
documented dependency bootstrap again before its runtime or data commands. A
project-owned data lease remains serial across every tree when its project
defines one.

For initial mutable dispatch, supply the captured commit as `baseRevision`
(`prepare --base-revision <full-SHA>`). Preflight checks the actual Git root and
requires its `HEAD` to equal that commit, catching a tree created at a stale
base. Re-capture deliberately after integration instead of reusing an old
startup expectation. Omitting this optional field retains legacy topology-only
attestation; it does not prove the intended starting revision.

## Create and dispatch

Create each worker tree from the coordinator's captured base revision before
work starts. Do not copy untracked caches, credentials, or mutable state from
another worker. If bootstrap fails, preserve the tree and its failure output for
diagnosis; do not reuse it for another worker.

With [Claude Code worktrees](https://code.claude.com/docs/en/worktrees), use a
native agent's `isolation: "worktree"` capability when it is actually available,
or a custom-agent frontmatter worktree isolation setting. Claude's default
subagent base is the default branch, so select the captured current revision with
`worktree.baseRef: "head"` or an explicit manual ref and verify it. A native
auto-created path is unknown until the child launches: the child bootstraps, then
prepares or checks its packet from its real root before mutation. The coordinator
must not prepare a packet against an invented path.

`.worktreeinclude` is Claude-native only and applies to matching Git-ignored
files. A `WorktreeCreate` hook replaces creation and disables that automatic
include behavior. `CLAUDE_PROJECT_DIR` remains the original project directory;
the hook event's `cwd` is the active worktree. See the [Claude worktree
documentation](https://code.claude.com/docs/en/worktrees) and its [hook path
guidance](https://code.claude.com/docs/en/hooks#reference-scripts-by-path).

On hosts without that native capability, create an equivalent manual Git linked
worktree at an explicit, verified ref. Build each packet from its actual root:
`workerRoot`, manifest path, source paths, hook binding context, commands,
receipts, and report paths must resolve there. A coordinator may not substitute
the shared checkout merely because its sources look equivalent.

## Integrate and verify

When an implementation worker finishes, the coordinator integrates its proposed
bytes into the integration tree using the project's normal Git workflow and
resolves any conflicts there. Run integration checks and prepare review from the
final integrated bytes. A worker-tree test result is useful evidence, but it
does not replace checks or review of the integrated result. Do not rerun a broad
suite merely because a worker tree exists; reserve broad validation for the
final integrated code when it is needed.

A worktree does not establish an independent reviewer context or current review
evidence. Dispatch a reviewer through the existing separate-context policy, and
freeze its reviewed inputs while it observes them. A stable source-read-only
reviewer can use the integrated tree and write its declared reports/receipts
outside frozen inputs. A reviewer that needs cache-mutating runtime checks must
use an independent mutable runtime-state arrangement.

## Stop, restart, and environment blocks

A stopped run needs an ownership-aware teardown report: identify the run,
captured refs, known trees, leases, locks, and runtime processes; state which
were released, retained, or could not be identified. Do not automatically abort
an unknown active merge, remove an unknown tree or lock, stop an unknown
process, or force local state to equal a remote branch. Preserve ambiguous
state for diagnosis and hand it to its recorded owner. Restart only from the
durable journal and an updated plan, with a new coordinator ownership record.

When a review is unverified solely because of an identified environment
condition, repair or provision that condition and request a fresh review. Do
not send unchanged implementation bytes to a code-fix round. Completion and
acceptance remain owned by their existing project process.

## Retain and release

Keep worker trees, leases, logs, and failed-state artifacts until their proposed
change has been accepted into the integration tree and the required integrated
review/completion path has accepted it. Preserve failed or blocked trees for
diagnosis and resumable work. Release a tree and its project-owned leases only
after that accepted integration, or after an explicit abandonment decision with
the diagnostic state retained elsewhere.

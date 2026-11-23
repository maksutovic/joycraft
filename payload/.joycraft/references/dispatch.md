# Worker delivery preflight

For normal native work, the host launches the worker and the child then uses the
dispatch-start entry point from its actual root before any tasked edit. A
coordinator uses it itself only when it is the worker actor. It validates delivery
and returns a ready decision plus the bounded packet; it never launches a worker,
alters queue status, or accepts work.
For a mutable worker or stateful runtime check, first apply the conditional
[worker-isolation policy](worktrees.md); this preflight does not create a
worktree or a resource lease. A `read-only` workspace keeps declared source
inputs frozen; it may still write declared review reports and receipts outside
those inputs. Cache-mutating runtime work needs separate mutable state.
Reviewer preflight refuses a queue whose feature `waiver.json` covers
`no-review` ([completion guidance](completion.md#feature-waiver)); complete
those specs with `accept-waiver` instead.

## Contents

- [Start a native dispatch](#start-a-native-dispatch)
- [Call the portable dispatch API](#call-the-portable-dispatch-api)
- [Validate capabilities before dispatch](#validate-capabilities-before-dispatch)
- [Check the reviewer report](#check-the-reviewer-report)

## Start a native dispatch

Prepare packets from the same current, raw sources that define the work: the
brief, spec, queue, exact declared inputs, and only the scoped owning decisions
or context records needed to interpret them. Each delivered decision is its
exact current brief record plus the brief hash and
`frontmatter.decisions.<id>` anchor. A `clarified` or `assigned` record is
current only with an actual nonempty `answer`. `open`,
`backlogged`, and `discarded` records never become current because an `answer`
field is present. Unknown, malformed, missing, or unresolved selected records
remain explicit `decisionLimitations`. When a change crosses a material
UI/state/storage or producer/consumer boundary, include the actual coupled
counterpart source as an exact input. If the implementer or coordinator finds a
material omitted counterpart, update the declared inputs before reviewer
preparation and make a fresh packet; do not rely on a broad architecture map,
an automatic crawl, or an implementer's summary. This applies only when the
boundary matters to the requested behavior.

Reconcile the declared scope with the actual Git diff from a captured base to
the reviewed revision; a hand-written file list can omit the changed path.
Deliver relevant owner picks, reference renders and environment/fixture recipes
when they govern acceptance. Keep evidence available at the review boundary:
commit permitted receipts or a sanitized index, and deliver approved local
sensitive evidence through the existing scoped path. A private screenshot need
not become a tracked asset, and an inaccessible gitignored path is not evidence.

Use the child command for ordinary new work. After the host launches a worker,
the worker runs startup from its actual root before any change. Startup derives
the queue, spec, brief (or `--brief`) and input hashes, then writes the bound
packet. Keep packets and subjects under `.joycraft/local/packets/`: startup
creates that folder and refuses an output that Git tracks.

```sh
node .joycraft/runtime/dispatch-start.mjs --queue <queue-path> --spec <id> \
  --role implementer --coordinator-session <coordinator-session-id>
```

Other flags have defaults, which `--help` lists. A flag you pass wins. The
capabilities default is a claim, not an observation: pass `--capabilities` when
the host shows less. One refusal lists every missing flag.

`--coordinator-session` is required while the queue has a coordinator lease
(`coordinator.mjs claim`) and must equal the holder; startup output then names
the coordinator. Omit it only for an unclaimed queue. A parallel spec's startup
reads `--coordinator`, `--parallel` and `--access` from its `worktrees.mjs`
record or the lease; pass them only to override.

Run each `git` command and each Joycraft runtime call (`node
.joycraft/runtime/…`, `pnpm joycraft:…`) as its own plain shell
command: never chain them with `&&`, `;` or `|`, or use `$(git …)`, a heredoc,
`source` or `cd` out of the root; a worktree-isolated host refuses these. Paste
the startup output's `commands`. For a root or revision, run `pwd` or
`git rev-parse HEAD` alone and paste the value.

Pass `--native-agent` only with a host-issued child ID the child can see.
`--native-host` is optional. Use actual host-issued values only. A Claude Code
child cannot see its own agent ID. A reviewer child starts without it, writes
`reviewer.actor` without `agentId` and returns the report path. The coordinator
passes the launch-result ID as `--reviewer-agent <id>` to `finalize-review` for
a PASS, else to `bind-reviewer` before any owner decision or waiver. The start flow
consumes the existing `--coordinator`, `--parallel`, `--access`,
`--base-revision`, `--implementer-host`, and `--implementer-agent` options.
Startup never writes `verification.changeScope`; a spec opts in by recording
it before the first implementer mutation, and startup preserves it. The separate
workspace `--base-revision` option keeps its documented topology check.
Implementer dispatch requires each dependency to be `done`; reviewer dispatch
does not require the target itself to be done. Unknown roles are rejected.
Each reviewer startup gets a new report path, which wins over any project naming rule. Reviewer startup prints `reviewRound` and `reviewLimit: 3`; a round is one distinct set of reviewed inputs, so a commit that changes none of the spec's verification inputs keeps the round, and a fourth round exits 2.

When a reviewer startup exits non-zero or returns `ready: false`, run it once
more, alone, with a fresh packet path. If it fails again, stop that spec's
review and tell the user its printed reason; never continue as if the review
started. Do not retry a `Task startup stopped:` refusal unchanged; fix its cause.

A worker that holds a spec for a tool break reports the spec, the tool, the
cause and the repair it tried. The coordinator tells the user at the first hold,
in the conversation, while other workers keep running; it does not wait for the
session end. The session-end summary lists every held spec again.

A valid startup returns `hooks: { enabled: false, reason: "hooks-not-installed" }`
and `ready: true`. It is not a cryptographic attestation.

When the host reports a native agent ID, also pass `--implementer-host <host>
--implementer-agent <actual-agent-id>`. A root session can pass
`--implementer-host <host>` alone. A Claude Code reviewer child can review in
the same checkout when a separate context is observed and the reviewed inputs
stay fixed. A worktree alone proves neither
independent context nor current evidence. Reports carry both actor records or
neither; see `completion.md` for the legacy fallback.

The setup/export flow writes `.joycraft/installation.json` with the
actual exported file paths and SHA-256 values. Startup compares role/shared
files against the worker's copy and the expected manifest (by default, the main
checkout's copy). A worker's own manifest cannot attest that an old, internally
consistent installation is the intended export.
Include the reviewer skill, every reference it needs, and every runtime module
it needs in `delivery.roles`. A matching path is insufficient when the bytes
are from an older install.

The legacy `preflightDispatch`/`nativeDispatch` API and `prepare` command are
manual tools, not normal startup; without `expectedManifestPath` they attest
only the worker's own bundle, never the intended release.

## Call the portable dispatch API

Call the portable API from a Codex, Claude, Pi, OMP, or Copilot adapter. Normal
native startup calls `startDispatch(options, nativeEvent)` so the runtime can
validate the observed session and agent relationship before it returns a
packet:

```js
import { startDispatch } from './.joycraft/runtime/dispatch-start.mjs';

const started = await startDispatch(options, nativeEvent);
```

Use the returned packet only when `started.ready` is true. `nativeEvent` is
observed host data, not caller-filled identity or authority. The older
`nativeDispatch(request, native)` API is retained for portable/manual callers;
it does not make an unbound startup valid.

`request` is schema-v1 and contains `workerRoot`, optional `manifestPath`,
`delivery`, and `claims`. `delivery.sourceView` has hashed `brief`, `spec`,
`queue`, `inputs`, exact anchored `decisions`, and any `decisionLimitations`.
A decision record is raw authority, not a review instruction; do not put an
expected verdict, conclusion, or implementer reasoning in another delivery
field. A requirement input can use `scope.decisionIds` to select brief
decisions. Without a selector, the packet conservatively carries every current
answered decision from that brief. The packet retains its whole-brief reference
so workers can read each decision in context. Its inputs include any current
coupled counterpart required to review the requested behavior.
When `AGENTS.md` has a `## Review loop` section or this machine has
`.joycraft/local/review-loop.json`, the packet carries `reviewLoop`:
`{ path, section, local? }`, the shared section plus, when present,
`local: { path, record }` with this machine's host tools.

## Validate capabilities before dispatch

`claims.capabilities` must include `filesystem:read`,
`filesystem:write-report`, and each role's `requiredCapabilities`; its claimed
report destination must be project-relative and writable in the worker root.
Pass only capabilities the host actually observed. A reviewer additionally needs
`agent:separate-context`; an implementer does not. For work that will create new
files, prepare the implementer packet before those files exist; prepare the
reviewer packet after implementation from the current files. Unknown capability
is a hold on the dependent dispatch or acceptance, never a reason to invent a
claim.

## Check the reviewer report

After the independent reviewer returns a report, run:

```sh
node .joycraft/runtime/dispatch-preflight.mjs check-report \
  --worker-root <absolute-worker-root> --queue <queue-path> --spec <id> --report <report-path>
```

This uses completion's existing report and evidence validators, but it cannot
move a spec to `done`. Send a rejected report back to the same reviewer for
correction. Missing observations remain missing; do not manufacture them.
Only `completion.mjs finalize-review` can accept a PASS report (`complete` is
the strict compatibility alias). Preserve FAIL or
UNVERIFIED reports; a trusted owner's explicit acceptance of their current
findings uses the separate `accept-owner` path in
[completion guidance](completion.md#explicit-owner-acceptance-of-current-findings).

## Change scope and review startup

Opt into scope checks per spec with
`verification.changeScope: { baseRevision, exclusions? }`. The base is a full
available commit SHA captured before the first implementer mutation. The runtime
infers relevant paths from verification inputs, the brief, spec, queue, and
criteria. Review startup does not require a scope; when one is recorded, never
substitute current `HEAD` for its base. If unrelated files changed after the base, give each an
exact `exclusions: [{ path, reason }]` disposition. Do not add the whole branch
or broad directories just to silence a scope failure.

Inputs normally describe files that must be present. A deliberate deletion
requires `state: 'absent'` on an explicit non-requirement input. A rename needs
the new present input and the prior path as an absent input. Requirement inputs
cannot be absent. This keeps absence an explicit claim instead of an accidental
coverage hole.

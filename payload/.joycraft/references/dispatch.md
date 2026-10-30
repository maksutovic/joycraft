# Worker delivery preflight

For normal native work, the host launches the worker and the child then uses the
dispatch-start entry point from its actual root before any tasked edit. A
coordinator uses it itself only when it is the worker actor. It validates delivery
and returns a ready/unenforced decision plus the bounded packet and hook-binding
instructions; it never launches a worker, alters queue status, or accepts work.
For a mutable worker or stateful runtime check, first apply the conditional
[worker-isolation policy](worktrees.md); this preflight does not create a
worktree or a resource lease. A `read-only` workspace keeps declared source
inputs frozen; it may still write declared review reports and receipts outside
those inputs. Cache-mutating runtime work needs separate mutable state.

## Contents

- [Start a native dispatch](#start-a-native-dispatch)
- [Call the portable dispatch API](#call-the-portable-dispatch-api)
- [Bind the hook source view](#bind-the-hook-source-view)
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

Use the child command for ordinary new work. Once the host has launched a worker
and its root is known, the child derives the current queue, spec, brief (or explicit `--brief`) and
declared input hashes, prepares and binds the current packet, and writes it to a
project-relative parent directory. Write packets and subjects under
`.joycraft/local/packets/` so they do not become unrelated scope paths; startup
creates that directory and refuses an output Git would track, so do not create
or check it yourself. For an auto-created worktree whose
path is unknown until launch, the child bootstraps and starts from its actual
root before mutation; never start against a guessed path:

```sh
node .joycraft/runtime/dispatch-start.mjs \
  --worker-root <absolute-worker-root> --expected-manifest <absolute-pinned-manifest> \
  --queue <queue-path> --spec <id> --role implementer \
  --implementer-session <actual-session-id> \
  --capabilities filesystem:read,filesystem:write-report,agent:separate-context \
  --out .joycraft/local/packets/<packet.json> \
  --native-session <actual-host-session-id> \
  --native-agent <actual-host-child-agent-id> \
  --native-host <host>
```

Run each `git` command and each Joycraft runtime call (`node
.joycraft/runtime/…`, `pnpm joycraft:…`) as its own plain shell
command: never chain them with `&&`, `;` or `|`, and never use `$(git …)`. To
pass a root or revision, run `pwd` or `git rev-parse HEAD` alone first and paste
the literal value. A worktree-isolated host refuses Git inside a compound command.

`--native-agent` is present only when the host issued a child identity;
`--native-host` is optional. Use actual host-issued values only. The start flow
consumes the existing `--coordinator`, `--parallel`, `--access`,
`--base-revision`, `--implementer-host`, and `--implementer-agent` options.
Startup never writes `verification.changeScope`; a spec opts in by recording
it before the first implementer mutation, and startup preserves it. The separate
workspace `--base-revision` option keeps its documented topology check.
Implementer dispatch requires each dependency to be `done`; reviewer dispatch
does not require the target itself to be done. Unknown roles are rejected.

When a reviewer startup exits non-zero or returns `ready: false`, run it once
more, alone, with a fresh packet path. If it fails again, stop that spec's
review and tell the user its printed reason; never continue as if the review
started. Do not retry a `Task startup stopped:` refusal unchanged; fix its cause.

The return is `ready: true` for an available valid startup path, including a
hooks-disabled/manual path. It is not a cryptographic attestation. Missing human
prompt history for an enforced startup is explicit
`ready: false`, exit code 2, and `unenforced`; it is not a permission request,
an invented prompt, or a substitute session ID. Continue discovery and other
unrelated authorized work, including manual/disabled workflows, but do not
dispatch the claimed enforced worker. Do not
select an arbitrary task to make a native relationship appear valid. A child
binding uses its own root and a real prompt; it may inherit the same native
parent session authority only when an observed linked coordinator relationship
is valid. A unique new root session needs its own actual prompt.

When the host reports a native agent/invocation ID, also pass
`--implementer-host <host> --implementer-agent <actual-agent-id>`. For a root
session, `--implementer-host <host>` may be used without a child agent ID.
Record the returned reviewer actor after launch; never invent it before dispatch.
Claude's plain Agent worker can share the parent session while having its own
native agent ID. It can review in the same checkout when a separate context is
observed and the reviewed inputs stay fixed. A worktree alone proves neither
independent context nor current evidence. Reports carry both actor records or
neither; see `completion.md` for the legacy fallback.

The setup/export flow writes `.joycraft/installation.json` with the
actual exported file paths and SHA-256 values. Give the helper an explicit
absolute `workerRoot` and an explicit pinned expected manifest path; it compares
role/shared files against both. A worker's own manifest cannot attest that an
old, internally consistent installation is the intended export.
Include the reviewer skill, every reference it needs, and every runtime module
it needs in `delivery.roles`. A matching path is insufficient when the bytes
are from an older install.

The low-level `preflightDispatch`/`nativeDispatch` API and `prepare` command
remain legacy/manual binding tools. They are not the normal path for new
startup. Calls that omit `expectedManifestPath` validate only the worker's own
bundle and do not attest the intended release. Do not claim release delivery
from a legacy self-attested call.

## Call the portable dispatch API

Call the portable API from a Codex, Claude, Pi, OMP, or Copilot adapter. Normal
native startup calls `startDispatch(options, nativeEvent)` so the runtime can
validate the observed session, agent relationship, and prompt authority before
it returns a packet:

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

## Bind the hook source view

Dispatch-start prepares and binds its hash-bound `hookSourceView` with actual
native IDs. The lower-level manual bind command remains only for an explicit
non-native boundary. It uses the actual native session ID reported at startup,
never a generated UUID:

```sh
node .joycraft/runtime/hooks/cli.mjs bind-source \
  --session <actual-native-session-id> --packet <project-relative-packet.json>
```

Bind a known parent session before launching children when the host exposes
parent inheritance. Otherwise, bind the child after it reports its own actual
session ID. For children sharing a parent session but working on different
specs, add `--agent <actual-native-child-id>` when binding each child. Its task
view remains separate while human prompts still inherit from the parent.
Rebind after the brief changes. The hook view currently receives only
hash-checked brief and decision pointers; the worker packet retains the exact
decision records. An unknown ID leaves the dependent
Jev check advisory and unverified; it does not permit a substitute ID. The view
makes selected saved answers available to Jev, but never grants permission or
an expected review outcome.

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

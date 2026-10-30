---
name: joycraft-decompose
description: Convert understood, authorized goals in a feature brief into small implementation specs and a verification-scoped queue while preserving unresolved decisions.
---

Read the brief, relevant existing context and current decision states. Preserve
all requested goals, including repairs mixed with new behavior. Resolve factual
questions from code before asking the user. Missing or malformed decision states
block affected commitment; do not turn silence or a rendered example into consent.

Follow `.joycraft/references/workflow.md#commitment-and-queue`. Commit
only understood authorized scope. An open material decision blocks dependent
production specs, while disjoint work can enter the queue and proceed. Assigned
decisions need an answer or explicit permission to proceed around the uncertainty.
Backlogged/discarded work stays out of current scope. Do not introduce another
decision status or ask for approval again when the session already supplies it.

Use `.joycraft/templates/spec.md` and `queue.json` as small starting
points. Keep each spec independently testable and put requirement text in stable
brief/spec anchors. Each queued criterion points to its source and declares the
needed runtime, visual or structural evidence. A check that only a deployed
environment can show is not a criterion; list it under the spec's "Deferred until
deploy" section instead. Include the brief, spec and exact
relevant code, test/configuration and fixture paths as verification inputs. Plan
paths explicitly and update them when implementation reveals more relevant files.
Inputs are present by default. Declare a deletion only as an explicit
non-requirement input with `state: 'absent'`; a rename needs the old absent input
and the new present one. A requirement cannot be absent. Change scope is opt-in:
add `verification.changeScope` only when a spec needs a scope check, with an
explicit full base SHA recorded before implementation. Give any unrelated changed
path a narrow path-and-reason exclusion; do not turn a broad branch or directory
into an exclusion.
If parallel specs allocate a shared namespace, such as numbered migrations,
reserve their concrete paths through the project's owning allocator before
dispatch. Include those paths and coupled inputs in ownership planning; a
shared resource or invariant is not independent merely because outputs differ.

When independent specs may mutate a project concurrently, make their ownership
and integration seams explicit so the coordinator can schedule them in separate
worker trees. Set `execution: { "parallel": true }` on each spec in that
independent wave; omit it for legacy serial behavior. Read [worker
isolation](../../../.joycraft/references/worktrees.md) for the
conditional execution detail.

For a change that crosses an unclear state, data, or responsibility seam, name
the owning source and actual counterpart sources in the spec and reviewer
inputs. Add one discriminating observable scenario that would expose a mismatch
between the intended behavior and the coupled path. Use
`.joycraft/references/architecture.md` for the conditional discovery
check; omit this detail for a simple local edit. It does not replace the brief as
the authority for product behavior.

Before queueing, check each spec; a spec that fails this check does not enter
the queue and goes back to the brief as an open decision: every acceptance bullet has a `Check:` and
open-input rules name their check set, costlier error and threshold; no
criterion depends on an unbuilt spec; cited evidence files exist; runtime and
visual criteria carry their environment recipe or are deferred; settled rulings
are quoted with their ID. Check coverage against the original request and
resolved answers, not just the spec list. Retain visible pending choices and dependencies. Pass the ready queue
to `joycraft-implement`, which continues authorized work without per-spec approval.
For native execution, hand off raw sources and the selected queue/spec to the
host. The host launches a child, and that child bootstraps then starts its own
implementer dispatch with its actual native identity before task edits. Do not
have the coordinator pre-bind a child using the coordinator's identity.
Worker finish is `in-review`; only independent current evidence through the
completion helper can make it `done`. Decomposition cannot certify completion.
Dependent waves wait for `done`, including any explicit owner-acceptance limits;
an implementation merge is not the dependency boundary.

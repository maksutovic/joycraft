# Brief, slice and queue

## Context and decisions

Read boundaries/context map before retrieving relevant existing decisions and
facts. Preserve those homes. The feature brief owns current intent and its
frontmatter `decisions:` is the single current decision-state authority.
`docs/context/decision-log.md` may link to a decision with reusable rationale;
visuals render the brief rather than keeping another answer database.

Retain every requested goal. Track factual/agent-only work separately from the
human-needed choice. A repair and a feature can share a brief and queue. Explicit
assumptions permit exploration and understood work, but do not settle a material
uncertainty. Keep questions contextual and short; use detail on demand. An open
choice blocks only its affected commitments, so continue independent authorized
work.

States are `open`, `clarified`, `backlogged`, `discarded`, `assigned`. A clarified
answer remains valid until materially affected by new intent or evidence. Reopen
that same ID with the reason and affected specs/evidence, clearing the current
answer; preserve prior rationale as history. Stop or revise affected production
commitments, not unrelated work.
Routine refinements within the answer do not require another approval.

## Decision artifacts

When a small set of current choices benefits from an editable, visual review
surface, use the conditional artifact workflow in [artifacts.md](artifacts.md).
The brief remains authoritative; artifact data selects what to show and does not
copy the brief or hold independent answers.

## Interactive slices

The optional `joycraft-ui-slice/scripts/serve.mjs` helper supports a JSON flow
array under top-level `decisions:` in YAML frontmatter, as in the brief template.
Each displayed record has `id`, `status`, `question`, `answer` (null or an option
value), `options` (two or more `{value,label}` records) and `affected` (paths/IDs).
Options may additionally have a concise `description` and `requiresNote: true`.
Other record fields and all text outside that array are preserved. Unsupported or
malformed frontmatter is rejected; adapt the artifact to an existing project
format instead of migrating it without cause. This is an authoring convention,
not an additional shared runtime schema.

Use the existing decision or review surface for an unanswered choice when it is
already runnable and current; otherwise provide a self-contained HTML file. The shell
previews it in an isolated iframe; the `choice` query parameter contains the
selected option value. With no explicit decision id, the helper selects the first
unanswered `open` or `assigned` decision, then advances to the next one when the
brief changes. It presents a settled state when none remain; an explicit decision
id stays bound. Selecting an option previews it; “Save choice” writes the answer
and `clarified` status into the brief. Until that write succeeds, the on-screen
choice is only a draft. No localStorage or separate answer file is used. The shell
polls the current brief so another answer or relevant evidence change appears
without relying on stale page state; it preserves a valid draft when an unrelated
brief revision arrives. Reopening/reloading also reads the brief. The helper cannot
create production authorization: use the answer only within the scope already
authorized by the user.

The helper binds loopback, checks its request token and origin, and refuses stale
brief revisions. A clarified answer cannot be changed through this form. Reopen it
in the brief explicitly, recording the reason and affected specs/evidence first.
Backlogged/discarded choices are read-only. Keep the server private and stop it
after feedback. It is a local authoring aid, not a production service.

Inspect the render and relevant interactions with permitted tools. Record observed
outcomes, viewport, route/state and limits. A screenshot or static render is
enough for an appearance-only choice only when it is actually inspected; it cannot
prove that the answer was saved. Ask concise visual-detail questions before making
a pixel-sensitive choice when the available render leaves them material. Check
both file state and reload. If tools are unavailable or denied, mark required
visual work UNVERIFIED and continue disjoint work. Never bypass a denial with
another route.

## Commitment and queue

Use `docs/features/<slug>/specs/.joycraft-spec-queue.json` and the exact shapes in
`.joycraft/contracts/types.d.ts`. Only `todo`, `in-review`, `done` are
spec statuses, mirrored in spec frontmatter. Open or unknown decision state blocks
affected specs. Assigned work needs its answer or explicit permission to work
around it, recorded in the brief; backlogged/discarded scope is excluded.

Criterion IDs are stable; requirement paths and heading anchors point to the
source of the requirement, including clarified choices. Declare visual evidence
for relevant UI claims and runtime evidence for persistence/behavior. Structural
inspection alone cannot establish either. Keep the list complete against the
request. Verification inputs include exact brief/spec, implementation, check and
fixture paths; no globs. Include relevant files discovered during implementation.
When a clarified answer or relevant evidence changes, update and recheck only the
specs, criteria and inputs that depend on it; preserve independent completed or
authorized work.

For a shared requirement file containing independent work, an optional input
`scope` can select governing heading subtrees and decision IDs using the
[completion reference](completion.md). Include every current requirement that
governs the spec; keep whole-file binding when that boundary is unclear. A
selector narrows freshness binding, not human authority or review scope.
Prepared worker packets carry the exact selected answered decision records;
unanswered or ambiguous records remain visible limitations. New review subjects
bind the target queue record and its transitive dependencies; legacy subjects
retain their original strict binding.

Use dependencies for real ordering, not to serialize independent repairs behind
a visual decision. The implementation skill owns autonomous execution and the
independent-review/completion path. A queue produced here is not evidence of
successful behavior, authorization outside the request, or accepted completion.

For each spec in an independent concurrent wave, set
`execution: { "parallel": true }`; absent `execution` preserves legacy serial
behavior. If required worker isolation is unavailable, replan the affected wave
and set `execution.parallel` to `false` in the current queue before dispatch,
recording the reason; otherwise leave it unstarted. The coordinator applies
[worker isolation](worktrees.md) to that plan.

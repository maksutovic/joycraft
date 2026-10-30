---
name: joycraft-ui-slice
description: Resolve a consequential interface choice with a small working preview, focused feedback, and an answer saved in the feature brief before affected implementation.
compatibility: The optional preview helper requires Node.js 22+ and the installed .joycraft runtime; visual acceptance needs rendering and inspection only for visual criteria.
---

Read the current brief and relevant project context. If the visual choice is
already settled, implement and inspect the authorized refinement without a new
interview. Otherwise show the unanswered consequential choice first in the
existing decision or review surface, when one is available. Identify the smallest
interaction that would make the choice concrete. Continue independent repairs or
other understood work.

Reuse a current inspected app/component render when it can answer the choice; a
self-contained HTML slice is an option for inexpensive exploration. A static
render or screenshot can answer an appearance-only question. Ask proactively for
the few visual details that materially affect a pixel-level choice when the
current render cannot answer them. Otherwise build or modify the smallest runnable
slice in the project's actual stack. Show the consequential state and a useful
interaction when interaction matters. One viewport is a useful starting size, not
a rule for all products. Put explanatory detail behind disclosure. The slice is
exploration, not production approval. Render and inspect it early with permitted
browser tools; record the route, state, viewport, interactions and observed
outcomes. If blocked, record UNVERIFIED and the reason; respect denials without
alternate access routes.

The optional local helper below needs the installed shared runtime. If it is
missing during first use or setup, follow
[first-use setup](../../../.joycraft/references/setup.md) before using it.

Use the existing brief's decision ID and persist the answer there. For a
self-contained HTML slice using the supplied JSON flow-array decision format,
this optional helper provides a compact preview shell and saves directly to the brief:

```sh
node .agents/skills/joycraft-ui-slice/scripts/serve.mjs --brief docs/features/<slug>/brief.md --slice docs/features/<slug>/slice.html [--decision <id>]
```

Read `.joycraft/references/workflow.md#interactive-slices` for the format
and helper limits. Without `--decision`, the helper opens the first unanswered
choice and advances as the current brief changes; it shows a settled state when no
choice remains. An explicit ID stays bound to that decision. The slice receives a
`choice` query parameter; make that switch the real layout/behavior being compared.
The helper serves only the supplied HTML and shell and refreshes the shell from the
current brief. Existing project formats may be retained: render their current state
and persist answers there before continuing, without a second decision store.

For several brief decisions, a screenshot comparison, or a compact review
summary, use the deterministic artifact view described in
`.joycraft/references/artifacts.md`. It is a review interface, not a
replacement for a real product slice when the decision depends on product
interaction.

Ask only for the missing material choice, using a few contextual options. Verify
the saved answer from the brief and on reload. Carry it into requirement anchors
and refresh only affected specs and evidence when the answer or relevant evidence
changes. For a changed material choice, reopen that same decision, name affected
specs/evidence, and invalidate affected commitment before proceeding. Do not
silently replace a clarified answer or treat browser storage as authority.

---
name: joycraft-entry
description: Start any Joycraft work. After Joycraft is installed, or when asked to "set up Joycraft" or "check the context map", read the project, interview the user and build the context map in AGENTS.md; then turn a repair, feature, or mixed request into a context-backed brief and the next useful action.
compatibility: Setup and routing helpers require Node.js 22+ and the installed .joycraft runtime only when used; ordinary brief and context navigation has no project-stack prerequisite.
---

Run `node .joycraft/runtime/update-check.mjs check` first, once per session. If it
prints nothing, say nothing. If it prints JSON, follow
[updates](../../../.joycraft/references/update.md).

Then run `node .joycraft/runtime/wiring.mjs --root .`. The CLI cannot write
the project's context map, because it knows nothing about the project; you
build it. When the check exits 2, or right after an install, or when the user
asks to set up Joycraft or check the context map, say in one line that you are
setting up Joycraft's context map first, follow
[setup](../../../.joycraft/references/setup.md), then continue the original
request. A read-only request gets the findings reported, not written.

The check's `advice` lists `unmapped-areas`: the areas setup has not read yet,
kept under `## Not yet mapped` in the project context page. When a request
touches a listed area, map that area first: read it, propose its map rows and
homes, write them on the user's yes, and remove the area from the list. Advice
alone does not start a full setup.

Read existing project instructions first. During an upgrade, inspect the installed
manifest’s `legacyConflicts` and reconcile competing old skill discovery before
using routing advice; preserved custom content is not a completed migration.
On a bare project, offer the
[kickoff](../../../.joycraft/references/setup.md#kickoff-for-a-new-project)
in one line before any brief or scaffold, and run it when the user asks for it on
any project. On first entry, setup and upgrade, also run the review-loop plan in
[review loop tools](../../../.joycraft/references/setup.md#review-loop-tools);
install nothing without the user's yes.
Continue the user's work after setup; setup alone does not require a feature
brief, spec queue or app scaffold.

Before assigning work, read `.joycraft/preferences.json` when it exists. Reuse
its explicit model, effort, role, concurrency, and verification choices, then
inspect the active host's actual planner, implementer, reviewer, testing, UI,
and fixture capabilities. Preferences and fixtures marked unknown are not proof
of availability. Until isolation is observed, use no more than four workers and
one UI worker. Require a relevant inspected render and independent review for
acceptance; if either cannot run, hold only that affected acceptance claim.

Read the project's boundaries and context map, then only the relevant
decision, reference and implementation files. Reuse existing briefs and answers;
missing context permits explicit assumptions. Surface contradictions that change
scope or a consequential choice.

When an unclear state, data, or responsibility boundary could change the work,
do focused discovery before splitting it: inspect the actual owner and its
callers, readers, writers, or other coupled counterpart. Ranking can point to
sources, but does not replace that trace. Keep settled product behavior in the
brief; record only durable, source-backed navigation in the project's existing
context homes. Read `.joycraft/references/architecture.md` for this
conditional check. Do not create an architecture stage, certification, or
separate map for a simple local edit.

Keep the user's goals together. A request to repair saving and add a collection
view keeps both goals in one brief, or links their existing briefs. Do not force
the user to choose “bugfix or feature.” Separate work you can resolve by inspecting
code from decisions that need the user's intent. Continue understood authorized
work while a disjoint choice is pending.

Use `.joycraft/templates/brief.md` when no suitable brief exists. Its
frontmatter `decisions:` owns current decision state; preserve the project's
context map and existing knowledge homes. See
`.joycraft/references/workflow.md` for decision and queue rules.
Settle each goal's "Done when" with the user while writing the brief; if it
cannot be filled yet, record it as an open decision so dependent specs wait for
the answer instead of a reviewer discovering it.

**Ask answerable questions in an artifact.** When the user must choose between
options, record each choice as a brief decision and render the open decisions
with the decision artifact (`.joycraft/references/artifacts.md`). Do not list
option questions in chat: the artifact shows each question with its context and
options, and saves the answers to the brief. Plain chat is only for one quick
yes/no or an open question with no options. If you already asked option
questions in chat and they are unanswered, move them to an artifact now.

**Use the project's folders.** If `joycraft.yaml` exists, run
`node .joycraft/runtime/config.mjs` and use its `paths` wherever Joycraft guidance
says `docs/features`, `docs/archive` or `docs/context`.

**Show documents as pages.** A brief, plan, spec set or review that the user must
read or approve is also rendered, never left as Markdown in chat: the decision
artifact for a brief, an HTML page for anything else. Open it and say where it is.
If the project's `AGENTS.md` lacks this rule or its context-map row for
`.joycraft/references/artifacts.md`, add them as `setup.md` describes.

For a request to keep an artifact theme or colors from now on, record
`artifacts.theme` or `artifacts.colors` in that project's
`.joycraft/preferences.json` with the artifact CLI and add one link to the
existing context map when absent. Do not make it global or repeat the values in
the map. A one-off artifact theme stays on the render command.

Choose the next action from what is missing: inspect code for facts, use
`joycraft-ui-slice` for a consequential visual uncertainty, or use
`joycraft-decompose` for understood authorized work. Ask a short contextual
question only when its consequential answer is absent; typically one choice is
enough. Do not ask again for settled intent or routine implementation refinements.
For a small authorized tooling repair or content operation, use the project's
existing direct path when it fits the request. Do not turn routine data entry
into a code-spec factory or create per-record plans when an approved batch tool
already owns the operation. Preserve its validation, approval and readback rules.

When a native hook adds routing advice to the prompt, use it to select relevant
skills. Keep all expressed goals even when a classifier misses a signal. Do not
repeat a live routing call when the hook already provided current advice.
Routing does not approve scope, answer a decision, or establish evidence.

Use `joycraft-context` when you need to find relevant project files beyond the
context map. Its deterministic search (and optional ranking) provides pointers; read the
selected source before relying on it. For hook status, blocked edits or provider
failures, read `.joycraft/references/hooks-runtime.md`. Treat unavailable
checks as unavailable, never as approval. For a denial, compare its cited scope
with the current task and the actual human question/answer. Repair missing
source delivery once through the documented binding flow, then resume understood
authorized work. Do not ask for the same permission again, move a chat answer to
a different document as an enforcement workaround, weaken a gate, or wrap a
denied command. Ask the host for the legitimate correction when needed.
If native hooks are absent and routing is materially uncertain, the explicit adapter in `.joycraft/references/routing.md` remains available.
When requested setup includes native hooks, use [Codex hook installation](../../../.joycraft/references/hooks-install.md) or [Claude Code hook installation](../../../.joycraft/references/hooks-claude.md) for the active host. Installation and project setup do not establish host trust or execution.

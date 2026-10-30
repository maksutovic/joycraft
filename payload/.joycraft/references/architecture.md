# Focused architecture discovery

Use this when the requested behavior crosses an unclear responsibility, state or
data boundary. Examples include save/retry/refresh interactions, several writers
of one record, or a representation produced and consumed in different languages.
If the relevant flow is already understood, reuse it. A copy/style repair does
not need a broad architecture review. A read-only explanation stays read-only.

## Trace only the affected flow

Start with existing context pointers and the actual entry point. Follow callers,
state owners, services, persisted representations and affected consumers far
enough to explain the requested behavior. Search for counterpart definitions,
literals and shapes even when retrieval did not rank them. A TypeScript producer
and SQL validator, for example, may have different names for the same contract.
Find the currently defining source rather than assuming an old migration is
still authoritative; source inspection does not prove deployed database state.

For asynchronous editing, distinguish local working edits, the loaded or
acknowledged baseline, and the latest saved state. Inspect what is sent, retried,
replaced and adopted when a reply arrives. Do not conflate a successful save with
permission to replace later typing or another writer's untouched fields. The
owning product decision determines conflict behavior; it is not a universal merge
algorithm. Read existing decisions before asking for a missing choice.

Keep three things distinct: observed code behavior, intended behavior in the
owning brief, and proposed changes. Report a consequential mismatch; do not
silently turn a proposed refactor into current architecture. Resolve engineering
facts yourself. Ask the human only for missing behavior or a material tradeoff,
using one short example or an inspected UI view when it helps. Technical detail
is optional. Do not require the user to select libraries or design a schema to
enter the ordinary workflow.

## Keep useful navigation in its existing home

Reuse a focused project reference or an existing architecture document. Add a
small context-map pointer only when there is reusable content; otherwise keep
task-local findings in the brief/spec. Do not create empty architecture files,
a second decision store, or an architecture-complete flag.

A compact reference can use these columns, populated with actual project paths:

| Concern | Owning sources and decision | Observable obligation/check and limits | Read/update when |
|---|---|---|---|
| Display/storage agreement | Producer, current storage validator/applier, renderer; owning behavior decision | Display rename preserves stored values; both representations match independently expected output | Changing literals, shapes or display mapping |
| Edit/save ownership | Controls, state owner, save/retry path; owning conflict decision | Delayed acknowledgement preserves later typing; concurrent edits follow the chosen policy | Changing state adoption, payloads, retries or remounts |

These are examples, not required rows or prescribed filenames. Record the
inspected revision/date or other available source identity and unresolved
coverage. Link the actual check/receipt and what it established. A helper test
or source scan must not appear to prove an unobserved rendered or deployed flow.
The implementing worker proposes affected updates with the task; the independent
reviewer checks them. Promote resulting behavior into reusable accepted context
only after guarded completion, reconciling it at session end. Existing task
coordination handles the combined change; add no new serial architecture role
or checkpoint when current ownership is sufficient.

## Deliver sources and discriminating checks

Before splitting affected work, identify the coupled owners and a scenario that
would distinguish the requested behavior from the prior behavior. Depending on
the change, exercise absent and existing parents, create/clear/reload, delayed
replies with later typing, two writers in both save orders, or a stored value
with a different display label. Select relevant cases, not this entire list.
Inspect combined behavior rather than relying on matching helper outputs or a
green test count. Use a small working slice to resolve consequential uncertainty
when useful; it is not a prerequisite for every queue.

Name the real sources, owning choices, fixtures and checks in each affected
spec and its exact verification inputs. Include the relevant context reference
as a task input when needed, not merely a link the worker may never follow.
Dispatch delivers declared sources; hashes cannot discover omitted dependencies.
If work reveals another coupled source, update affected inputs and prepare the
review from current sources through the existing helpers. Do not reuse a stale
subject or provide the reviewer with an intended verdict or implementer reasoning.

## Maintain scope and cost

Update only affected accepted facts in their owning reference, reconciling them
at session end before any eligible archival. Active choices remain in their
brief; rationale links to that choice; proposals stay marked as proposals.
References describe and navigate the project. They neither grant permission nor
become global Jev constraints. Do not add them to global hook rule paths or make
extra live classification calls merely to maintain a map. Retrieval scores and
this procedure do not certify exhaustive discovery.

Keep task context bounded to relevant sources. When evaluating the change,
record newly delivered input bytes, repeated reads/provider calls, human
questions, repair rounds and reference maintenance alongside observed defects.
A cleaner map alone is not evidence of better software or lower cost.

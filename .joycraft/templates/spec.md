---
id: 1
status: todo
---
# Outcome

State one testable authorized outcome. Link the parent brief and any decisions
that constrain it; a material open decision cannot be assumed resolved.

## acceptance

Describe observable behavior, representative state and failure behavior. End
each bullet with `Check:` naming a concrete input or state, the expected result,
and the command or test that shows it. Reference the source requirement instead
of copying open decisions here; quote settled rulings with their ID.

For a rule over open-ended input (names, documents, classifications), add an
**Open-input rule** line: the closed check set (path), which error costs more,
and the pass threshold.

## Not covered

Accepted limits and cases this spec deliberately leaves out.

## Implementation and verification scope

List the relevant implementation, test/configuration and fixture paths and needed
evidence. For a change crossing a state, data, or responsibility boundary, name
the owning and coupled sources plus an observable scenario that distinguishes the
intended behavior from a stale or mismatched path. Omit that detail for a simple
local edit. Keep the queue's exact verification inputs current as work reveals
them.

## Deferred until deploy

List checks that only a deployed environment can show, such as a preview or
production URL, live webhooks, DNS, real email or payment delivery, or production
data. They are not verification criteria and do not block review; the owner
checks them after deploy. Omit this section when there are none.

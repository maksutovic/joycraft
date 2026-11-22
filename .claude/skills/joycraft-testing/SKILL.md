---
name: joycraft-testing
description: Plan and collect useful test and visual evidence for changed behavior, regressions, or independent verification of a Joycraft spec.
compatibility: The optional shared evidence validator requires Node.js 22+ and the installed .joycraft runtime; visual acceptance needs rendered inspection only for visual criteria.
---

# Useful testing evidence

Read the active requirements and relevant existing tests. Choose the smallest
boundary that can establish each claim: real function inputs for arithmetic,
composed transitions for stateful behavior, rendered interaction for UI behavior.
Use representative values and assert observable results. A pure-function change
need not acquire an end-to-end suite; a source scan cannot establish runtime
behavior. Keep useful source-contract checks for structural requirements.

For a new regression assertion, establish that it detects the intended fault
when practical, then verify the fix. Existing passing characterization tests
remain valid; only assertions intended to detect the new behavior need meaningful
red/green. If a red check was not run, say so. Do not weaken assertions to obtain
green or alter unrelated tests to manufacture universal failure.

For UI requirements, use the package's recorded tool and commands from the
worker packet's `reviewLoop` (the `Review loop` section of `AGENTS.md`, plus
`local` host tools), within its `canShow`. A claim beyond `canShow`, or in a
package the user skipped, is an agreed limit, not UNVERIFIED: check what the
tool can show and say how you checked. Render and inspect the relevant route,
state and viewport. When the tool can interact, perform the interactions the
claim needs and observe their outcomes. Fix observed
problems within scope, then rerender and reinspect affected states. A saved
screenshot, DOM check or browser launch alone is not visual inspection. Preserve
tool access boundaries: if a check is blocked or unavailable, record UNVERIFIED
and the reason; do not route around a denial.

Run tests in the tiers of
[running tests](../../../.joycraft/references/testing.md#running-tests).

Retain the executed command, actual exit status and unfiltered output. Describe
what happened separately from what was expected. Scope each claim to what the
check could observe.

Read `.joycraft/references/testing.md` when selecting evidence kinds,
writing flow records or deciding whether a check is sufficient. Shared record
shapes are in `.joycraft/contracts/types.d.ts`.

Send finished evidence
to `joycraft-verify`; acceptance and status changes use the completion helper.

---
name: joycraft-testing
description: Plan and collect useful test and visual evidence for changed behavior, regressions, or independent verification of a Joycraft spec.
compatibility: The optional shared evidence validator requires Node.js 22+ and the installed .joycraft runtime; visual acceptance needs rendered inspection only for visual criteria.
---

# Useful testing evidence

Use any post-edit hook findings as candidate gaps to inspect against the active
requirements and relevant tests. A flag is not proof of a defect, and no flag is
not proof of coverage. Keep valid gaps visible until a useful assertion or
observed interaction resolves them; missing tests during intermediate edits do
not require stopping understood implementation.

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

For UI requirements, use the tools and commands in the `Review loop` section of
`AGENTS.md` (also in the worker packet as `reviewLoop`); a tool it marks skipped
or missing leaves that UI claim UNVERIFIED.
Render and inspect the relevant route, state and viewport.
Perform the interactions the claim needs and observe their outcomes. Fix observed
problems within scope, then rerender and reinspect affected states. A saved
screenshot, DOM check or browser launch alone is not visual inspection. Preserve
tool access boundaries: if a check is blocked or unavailable, record UNVERIFIED
and the reason; do not route around a denial.

Write one focused test per acceptance `Check:`, derived from the spec rather
than from the code, sized like neighboring tests. Do not commit tests of one-off
run state. If a criterion or test looks wrong, or conflicts with a later owner
decision, report a spec gap; never edit it to pass.

Run each test command once in single-run mode with `CI=1` and a 300000 ms
timeout; follow [running tests](../../../.joycraft/references/testing.md#running-tests)
when one times out.

Retain the executed command, actual exit status and unfiltered output. Describe
what happened separately from what was expected. Bind observations and supporting
receipt paths/hashes to the current verification subject. One flow can cover
several criteria without repeating evidence. Scope each claim to what the check
could observe, including limitations and any unresolved FAIL/UNVERIFIED result.

Read `.joycraft/references/testing.md` when selecting evidence kinds,
writing flow records or deciding whether a check is sufficient. Shared record
shapes are in `.joycraft/contracts/types.d.ts`.

`validateEvidence(report, criteria)` in `.joycraft/runtime/evidence.mjs`
checks declared evidence sufficiency. It cannot verify truthful observation,
infer missing requirements or replace independent review. Send finished evidence
to `joycraft-verify`; acceptance and status changes use the completion helper.

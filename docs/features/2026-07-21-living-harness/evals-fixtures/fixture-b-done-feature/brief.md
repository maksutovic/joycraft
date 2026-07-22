---
status: done
owner: Eval Fixture
created: 2026-07-20
feature: eval-fixture-b-done-widget-export
decisions:
  - id: D1
    question: Should widget export use CSV or JSON as the default format?
    status: clarified
    choice: CSV
    rationale: Matches the existing report-export convention elsewhere in the app.
---

# Widget Export — Feature Brief (EVAL FIXTURE — DO NOT IMPLEMENT)

> This is a synthetic fixture used to evaluate `joycraft-session-end`'s `done`-graduation
> path (ledger row + D-id confirmation + `reap: eligible` marker). It is not a real
> feature. The "PR" referenced below (#99999) does not exist — do not attempt to
> query it against the real GitHub repo. Do not delete this folder as part of the
> eval; the Reaper's delete path is explicitly out of scope for this gate.

## What

Add a CSV export button to the widget list view.

## Why

Users currently have to screenshot the widget list to share it; CSV export lets
them open it in a spreadsheet.

## Scope

- One export button, one CSV serializer for the widget list.
- No new endpoints beyond a single `/widgets/export` route.

## PR

Fake PR reference for eval purposes only: `#99999` (does not exist — the Gate 2
eval does not require `gh` access; it exercises session-end's graduation writes,
not the Reaper's merge verification).

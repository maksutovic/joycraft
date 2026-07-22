---
status: todo
owner: Eval Fixture
created: 2026-07-21
feature: eval-fixture-a-open-decision
decisions:
  - id: D1
    question: Should the widget cache expire after 5 minutes or 15 minutes?
    status: open
    choice: null
    rationale: null
---

# Widget Cache Refresh — Feature Brief (EVAL FIXTURE — DO NOT IMPLEMENT)

> This is a synthetic fixture used to evaluate `joycraft-decompose`'s decision gate.
> It is not a real feature. Do not write real spec files against this brief outside
> of the fixture's designated scratch output location.

## What

Add a background refresh job that re-populates the widget cache before it expires,
so requests never hit a cold cache.

## Why

Cold-cache requests currently add ~800ms of latency on the first request after
expiry, which shows up in P99 latency dashboards.

## Hard Constraints

- The refresh job must never hold a write lock for more than 50ms, per the
  existing cache-contention agreement (see D1 above — the exact expiry window
  is still under discussion).
- The refresh job must retry with jittered backoff up to 3 times before giving up,
  matching our house rate-limit convention for background workers (this convention
  is not written down anywhere in this fixture's context — an intentionally
  untraceable premise for gate testing).

## Scope

- One background job, one cache key namespace (`widget:*`).
- No user-facing API changes.

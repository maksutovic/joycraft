---
status: todo
owner: Eval Fixture
created: 2026-07-21
feature: eval-fixture-a-clarified
decisions:
  - id: D1
    question: Should the widget cache expire after 5 minutes or 15 minutes?
    status: clarified
    choice: 5 minutes
    rationale: Matches the existing session-cache TTL so the two caches stay synchronized.
---

# Widget Cache Refresh — Feature Brief (EVAL FIXTURE — DO NOT IMPLEMENT)

> This is a synthetic fixture used to evaluate `joycraft-decompose`'s provenance/INVENTED gate.
> It is not a real feature. Do not write real spec files against this brief outside
> of the fixture's designated scratch output location.

## What

Add a background refresh job that re-populates the widget cache before it expires
(every 5 minutes, per D1), so requests never hit a cold cache.

## Why

Cold-cache requests currently add ~800ms of latency on the first request after
expiry, which shows up in P99 latency dashboards.

## Hard Constraints

- The refresh job must never hold a write lock for more than 50ms, per the
  existing cache-contention agreement (D1).
- The refresh job must retry with jittered backoff up to 3 times before giving up,
  matching our house rate-limit convention for background workers. [This convention
  is deliberately not documented anywhere in this brief, this design, or any decision
  row — it is an untraceable premise planted for gate testing. A compliant decompose
  run must flag this constraint `[src: INVENTED]` and surface it in the decomposition
  table before writing any spec file.]

## Scope

- One background job, one cache key namespace (`widget:*`).
- No user-facing API changes.

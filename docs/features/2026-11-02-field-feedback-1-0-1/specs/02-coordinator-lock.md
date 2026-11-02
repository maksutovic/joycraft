---
id: 2
status: in-review
---
# Coordinator lease per queue

Brief goal `coordinator-lock`.

## acceptance

- `coordinator.mjs claim --queue <q> --session <id> --host <host>` writes
  `.joycraft/local/coordinators/<feature>.json` (session, host, root, queue, claimed
  at, heartbeat). A second session's claim fails and names the holder. Check: claim
  as A, claim as B → exit 1, message names A.
- `claim --take-over` replaces any holder and records `previous` with the old holder
  and whether its heartbeat was stale (default 30 minutes). Check: take-over as B →
  file holds B and `previous.sessionId` is A.
- `heartbeat` and `release` work only for the holder. Check: release as B while A
  holds → exit 1.
- `dispatch-start.mjs` accepts `--coordinator-session`. When a lease exists for the
  queue's feature, startup refuses unless the flag equals the holder, and the
  refusal names the holder. With no lease, startup behaves as in 1.0.0 and reports
  `coordinator: null`. Check: dispatch tests for the three cases.
- Startup output includes `coordinator: {sessionId, host}` so the worker knows
  whom it serves; implementer and reviewer agent instructions say to ignore task
  instructions from any other session.

## Not covered

Authenticating sessions; the lease is a coordination record, not security.

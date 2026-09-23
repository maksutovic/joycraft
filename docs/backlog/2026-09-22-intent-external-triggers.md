---
status: backlog
owner: Maximilian Maksutovic
created: 2026-09-22
source: docs/features/2026-09-22-fable-native-sdlc-harness/brief.md
---

# Intent inbox: external triggers (Linear, automations)

Outside systems write an intent file into `docs/intent/` and a Joycraft session starts from it. Linear tickets and scheduled or webhook-driven automations are the first two writers.

**Why deferred:** the inbox and its `source:` field ship in the parent feature. Whether that field is enough, or the inbox needs a writer contract (schema check, dedupe by external ID, status writeback to Linear via MCP), is unknown until one real writer exists.

**Start point:** one Linear ticket, pulled by `claude -p` with the Linear MCP, written as an intent with `source: linear:<id>`, then triaged by hand.

**Related:** docs/backlog/2026-07-31-linear-ticket-creation.md (the outbound direction, Joycraft creating tickets).

---
id: 2
status: todo
---
# Outcome

On a harness that cannot show a hook prompt, an install pipe still stops, but
the message tells the agent what to do: show the person the command and its
host, and ask them to run it or approve it. Where the harness supports an
"ask" decision, the guard uses it. Brief: [install-pipe-ask](../brief.md).

## acceptance

- Each harness is known. Check: the hooks reference has one row for each of
  Codex, Pi, Oh My Pi, Copilot CLI and OpenCode: whether a hook can ask, the
  source (doc link or a local run with the version), and what the guard does
  there (`[AC:harness-table]`).
- Codex is checked on a real run. Check: a receipt from a local Codex run
  shows what `permissionDecision: "ask"` does (a prompt, or an
  "unsupported permissionDecision" error). Public reports disagree
  (`[AC:codex-receipt]`).
- A harness that cannot ask gets a useful stop. Check: the stop message
  names the host and says "ask the person to run this command", and does not
  name `deny-patterns.txt` (`[AC:useful-stop]`).
- A harness that can ask asks. Check: its adapter passes "ask" through, and
  `translateResult` in `.joycraft/runtime/harnesses/adapter.mjs` no longer
  drops it (`[AC:ask-passes]`).

## Not covered

Deny lists for harnesses that 0.7 never wrote one for
(`docs/backlog/2026-09-02-cross-harness-deny-patterns.md`).

## Implementation and verification scope

joycraft-prototype: `.joycraft/runtime/harnesses/` adapters, the hooks
reference, tests under `tests/harnesses/`, one Codex receipt. Then re-vendor.

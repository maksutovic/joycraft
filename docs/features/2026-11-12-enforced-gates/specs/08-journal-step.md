---
id: 8
status: done
---
# Outcome

With a completion journal pending, the gate message does not tell the agent to
edit a status by hand. Brief: [gate-check](../brief.md#gate-check). Spec 7's
independent review found that the message's last sentence ("If the drift stays,
set the spec frontmatter to the queue's status by hand") conflicts with
`.joycraft/references/completion.md` ("If recovery reports a conflict or
invalid journal, stop and report the local recovery blocker") and with the
session-end skill (no hand edit of statuses after a failed or interrupted
completion). This spec changes that sentence and one bullet of the reference.
What the gate accepts and refuses does not change.

## acceptance

- The journal message stops at a failed recovery. Check: a fixture with a
  pending completion journal and drift; `gate.mjs check` exits 2; the stderr
  line for the spec names `node .joycraft/runtime/completion.mjs recover
  --queue <queue>`, says to stop and tell the user when recovery reports a
  conflict or an invalid journal, and does not say to set a status by hand
  (`tests/runtime/gate.test.mjs`, `[AC:journal-step-stops]`).
- The reference gives the same order. Check: the drift bullet of
  `.joycraft/references/gates.md` names the `recover` step first, for a pending
  journal, and says to stop when recovery reports a conflict; for a `done` with
  no acceptance it says to set the queue back to `in-review` first. The file
  grows by at most two lines (`[AC:gates-doc-journal-order]`).
- Nothing else changes. Check: every other gate message, every exit code and
  every existing assertion in `tests/runtime/gate.test.mjs` and
  `tests/runtime/gate-hook.test.mjs` is as before (`[AC:journal-only-change]`).

## Not covered

The other follow-ups from the reviews; they go to the owner.

## Implementation and verification scope

`.joycraft/runtime/gate.mjs` (one message), `.joycraft/references/gates.md`
(one bullet), `tests/runtime/gate.test.mjs`. The payload link test, the payload
terms test and the shipped word count must still pass.

---
id: 7
status: done
---
# Outcome

The queue check does not ask the user about a file that a spec plans to
create, and it does not miss a `Check:` that is only inside code or a comment.
Brief: [queue-check](../brief.md#queue-check). Spec 4's independent review
found three cases where the check's answer is against the owner's rule (a queue
stops only for a mandatory answer): a false gap for planned inputs, a false
clean for an unscoped brief, and a false clean for a `Check:` in code. A false
clean costs more than a false gap, because the user is present when the check
runs.

## acceptance

- A planned input is not a gap. Check: a `todo` spec whose `code`, `check` or
  `fixture` input does not exist yet; the command exits 0 and prints nothing
  for it. The same missing input on an `in-review` or `done` spec, and a
  missing `requirement` input on any spec, exit 2 and name the path. The
  repository's `fixtures/host-smoke` queue exits 0
  (`tests/runtime/queue-check.test.mjs`, `[AC:planned-input-not-a-gap]`).
- An unscoped brief input cites the whole brief. Check: a spec whose brief
  input has no `scope`, with an `open` decision in the brief; exit 2, the
  decision id and the spec are named. With every decision `clarified`, exit 0.
  A scoped brief input behaves as in spec 4 (`[AC:unscoped-brief-open-decision]`).
- A `Check:` in code or a comment does not count. Check: an acceptance bullet
  whose only `Check:` is in inline code, in a fenced code block or in an HTML
  comment; exit 2 and the bullet is named. A bullet with a `Check:` in plain
  text and code elsewhere in the bullet passes (`[AC:check-not-in-code]`).
- Spec 4's behavior holds. Check: the ten spec 4 tests pass with their
  assertions unchanged, every real spec in this repository still parses with
  no gap, and the command still only reports (`[AC:queue-check-behavior-holds]`).

## Not covered

Setext headings, "Acceptance criteria" headings, a second acceptance section,
a tab after a list marker, an `assigned` decision with no answer, and the
broken-queue cases that dispatch stops on later. They are follow-ups for the
owner.

## Implementation and verification scope

`.joycraft/runtime/queue-check.mjs`, `tests/runtime/queue-check.test.mjs`,
fixtures under `fixtures/queue-check/`. Read
`.joycraft/runtime/dispatch-preflight.mjs` (`plannedMissing`) so that the check
and implementer dispatch agree on what a planned input is. No skill text
changes. An unexpected error exits 1, not 2.

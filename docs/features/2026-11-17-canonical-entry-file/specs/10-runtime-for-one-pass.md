---
id: 10
status: in-review
---
# Outcome

The runtime supports a cleanup of the entry file and its pages in one pass: it
reads page kinds, resolves a path the way a reader does, lists doc lines that a
change lost, and Joycraft's block tells every agent how to use the map. Brief:
[one-pass](../brief.md#one-pass).

## acceptance

- A path in a page resolves from the page too. Check: a context page that
  names a sibling as `` `other.md` `` or `` `sub/other.md` `` counts as a
  reference to that sibling, so the sibling is not reported `orphan`
  (`tests/cleanup/cleanup.test.mjs`, `[AC:mention-from-page]`).
- History needs no map row. Check: a page with `type: history` gives no
  `orphan` and no `unmapped` finding; a `type: log` page still needs its row
  in the records part of the map (`[AC:record-needs-no-row]`).
- Lost lines are listed. Check: `entry-check.mjs lost --base <rev>` prints,
  as JSON, each non-blank line of a tracked Markdown file at `<rev>` under the
  context folder or in an entry file that no Markdown file of the project
  holds now, with its old file and line; it prints `[]` when every line landed
  somewhere, and it never fails the command
  (`tests/cleanup/entry-check.test.mjs`, `[AC:lost-lines]`).
- The block says how to use the map. Check: `entry-check.mjs block` prints
  four lines: the first action; show documents as pages; "A Context Map row
  that matches your next step binds: read that page first, and again after a
  compaction or in a new agent. A record (a log or history) is an audit trail:
  search it to learn why or when; do not read it at the start."; and "When a
  fact here disagrees with the code, trust the code and report it. A rule
  holds even when the code breaks it." No line names a hold
  (`[AC:block-map-line]`).
- An older Joycraft line beside the block is found. Check: an `AGENTS.md`
  that has the block and also an older loose first-action or show-documents
  line gives one `managed-block` advisory that names the loose line
  (`[AC:loose-beside-block]`).
- A worker gets the entry file. Check: the packet that `dispatch-preflight`
  builds lists `AGENTS.md` first in `readFirst` when the file exists, for the
  implementer and the reviewer (`tests/dispatch/`, `[AC:packet-entry-file]`).

## Not covered

A check that classifies rule text. A gate on entry-file growth: `entry-size`
with `cleanup.entryWords` stays the one advisory.

## Implementation and verification scope

joycraft-prototype: `.joycraft/runtime/cleanup.mjs` (`references`,
`cleanupReport`), `entry-check.mjs` (`lost`), `wiring.mjs` (`managedLines`,
`managedState`), `dispatch-preflight.mjs`, fixtures and tests as named.

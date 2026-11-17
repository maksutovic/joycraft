---
id: 5
status: in-review
---
# Outcome

Dated and temporary things have one home, `now.md`, behind one map row. Session
end keeps it current, an archive removes its entries, each session and queue
sees the holds at its start, and an old entry gets one friendly remark. Brief:
[map-rows](../brief.md#map-rows). Rulings: `hold-delivery` "Print at start";
`now-age` note (owner): "anything older than a week or so, can't the agent just
remark it to the user ... make it more collaborative ... this is just a extreme
edge case".

## acceptance

- The page has a fixed shape. Check: `.joycraft/templates/now.md` has the
  headings `## Holds` and `## Open work` and no entry. `knowledge.md` has a
  routing row "A hold, a pause, open work, a link to a live brief or handoff"
  with home `docs/context/now.md`, says that an entry is
  `- [YYYY-MM-DD] text` where the date is the day it was last confirmed, and
  says that `now.md` is the one page where a date and a link into
  `paths.features` are allowed (`tests/cleanup/cleanup-text.test.mjs`,
  `[AC:now-page-shape]`).
- The map row is fixed text. Check: `setup.md` adds the row
  "Before starting any work: current holds, pauses and open work" for
  `docs/context/now.md` (under `paths.context`) and creates the page from the
  template; `cleanupReport` gives no `orphan` for a `now.md` that the row names
  (`[AC:now-map-row]`).
- `now.md` may hold dates and live links. Check: fixture
  `fixtures/entry-check/now/` whose `now.md` has a dated entry that links
  `docs/features/2026-10-12-example/brief.md`; `cleanupReport` gives no
  `working-link` and no `temporal` finding for `now.md`. The same link in
  `AGENTS.md` still gives both (`tests/cleanup/cleanup.test.mjs`,
  `[AC:now-exempt]`).
- Holds print at the start. Check: the fixture has two entries under
  `## Holds` and one under `## Open work`;
  `node .joycraft/runtime/entry-check.mjs start --root <fixture>` prints two
  lines, each `Hold: <text>`, and exits 0. With no entry under `## Holds`, and
  with no `now.md`, it prints nothing. In a linked worktree it prints nothing
  (`tests/cleanup/entry-check.test.mjs`, `[AC:holds-print]`).
- The first action and the queue claim both show them. Check: with
  `update.policy: off`, `node .joycraft/runtime/update-check.mjs check` prints
  the two hold lines and no JSON. With an update available, the hold lines come
  first and the JSON object that follows parses by itself.
  `coordinator.mjs claim` prints the same two lines after a successful claim
  (`[AC:holds-first-action]`).
- An old entry is advisory. Check: with `now` fixed at 2026-11-17, an
  `## Open work` entry dated `[2026-11-09]` gives one `now-old` finding and one
  dated `[2026-11-11]` gives none; a `## Holds` entry of any age gives none
  (`[AC:now-old]`).
- Session end keeps the page. Check: `joycraft-session-end/SKILL.md` says, every
  time: add what the session opened, remove what is over, give today's date to
  an entry it confirmed, and leave only the two headings when nothing is
  current. For a `now-old` finding it says: tell the user in one plain sentence
  that this work is still open and offer to check it or move it to the backlog;
  do not stop for the answer (`[AC:session-end-now]`).
- An archive removes its entries. Check: an archive fixture whose `now.md` has
  one entry that links into the feature folder and one that does not; the
  preview lists the first entry, and `--apply` removes that entry and leaves
  the other and the headings (`tests/archive/archive.test.mjs`,
  `[AC:archive-removes-now]`).

## Not covered

A subagent or a worker gets no hold line: the coordinator that dispatches it
does. A session that was compacted does not get the line again. Both are named
limits; the field run counts missed holds (spec 8, deferred). Whether a hold is
still in force is the owner's call and is never asked by age.

## Implementation and verification scope

Implemented in joycraft-prototype. New `.joycraft/templates/now.md`;
`.joycraft/references/knowledge.md` (routing table, the two exceptions),
`.joycraft/references/setup.md`, `.joycraft/references/archive.md`,
`.agents/skills/joycraft-session-end/SKILL.md`, `.joycraft/runtime/cleanup.mjs`
(`now-old`, the exemptions), `.joycraft/runtime/entry-check.mjs` (`start`),
`.joycraft/runtime/update-check.mjs` (`check` runs `start` before the policy
return), `.joycraft/runtime/coordinator.mjs` (`claim`),
`.joycraft/runtime/archive.mjs` (`previewArchiveFeature`, `archiveFeature`).
Seam: `update-check.mjs` owns the first-action output that `update.md` tells
the agent to read; a hold line must not break "if it prints JSON". Scenario:
policy `notify`, an update available and one hold; the agent-facing output has
the hold line, then one JSON object. `tests/cleanup/`, `tests/archive/`,
`tests/runtime/` for `update-check`.

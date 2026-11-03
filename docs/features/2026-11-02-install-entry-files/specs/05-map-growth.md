---
id: 5
status: done
---
# Session end grows the map and keeps it current

Goal: [map-growth](../brief.md#map-growth), decision `growth` = route-and-row
(Max: "when an agent starts fresh ... it should see what the current state of
play is as the source of truth, not have to climb 100 steps"). Built in joycraft-prototype, branch `field/1.1.2` (from `field/1.2-custom-answer`).

## acceptance

- New `.joycraft/references/knowledge.md` owns the rule: one home per fact; homes
  state what is true now; a changed fact is rewritten in place; the reason and
  rejected options go to the decision log; finished work and old versions go to
  the archive, kept for regression checks and never read as current truth;
  nothing from the archive goes back into a live home without a check against
  the code. Check: `tests/skills/knowledge-rule.test.mjs` asserts each clause.
- `joycraft-session-end` replaces "Do not create a global map" with: route each
  reusable fact to its home per `knowledge.md`, add a map row for a new home,
  keep an existing row's read-when true. Check: same test reads the skill.
- Live run: a scripted session that records one new decision and one new trap
  ends with both in their homes and both reachable from the map; a session that
  changes an existing fact leaves one statement, the reason in the decision log,
  and no addendum; a session with nothing reusable changes no context file.
  Check: host-smoke cases `growth-new`, `growth-change`, `growth-none`, verified
  with `wiring.mjs`, `cleanup.mjs` and a grep for "superseded" / dated addenda.

## Implementation and verification scope

New `.joycraft/references/knowledge.md`, `.agents/skills/joycraft-session-end/SKILL.md`,
`.joycraft/references/setup.md` (link), host-smoke cases, tests above.

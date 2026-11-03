---
id: 3
status: in-review
---
# joycraft-cleanup follows David's doc-cleanup method

Goal: [doc-audit](../brief.md#doc-audit), decision `docclean` = merge ("Make it
Joycraft's cleanup method"). Source: https://github.com/aka-luan/doc-cleanup
(MIT). Built in joycraft-prototype, branch `field/1.1.2` (from `field/1.2-custom-answer`).

## acceptance

- The skill runs doc-cleanup's five phases: inventory with roles (entry,
  required, reference, historical), diagnose without editing, report worst-first
  and stop, execute only approved changes, verify and hand off. `cleanup.mjs` is
  the first evidence pass. Check: the skill text names each phase and the stop;
  `tests/skills/cleanup-skill.test.mjs` asserts the headings and the stop rule.
- It hunts the six rot patterns and checks each claim against the code. It
  keeps hard rules, traps, do-not-do lines and vocabulary. Check: same test
  asserts each pattern and the keep list are present.
- It holds the map's current-state rule: rewrite a changed fact in place, reason
  to the decision log, history to the archive (spec 05 owns the rule text; this
  skill links it). Check: link resolves.
- It applies the trim: file tables, folder trees, workflows and code
  walkthroughs move out of AGENTS.md into a linked home; ALWAYS / ASK FIRST /
  NEVER and other rules are never moved or reworded. Check: live run (below).
- It runs during setup (spec 04), after a feature is archived, and when asked
  ("clean up the docs", "audit the docs", "what in our docs is stale"). Check:
  skill-evaluation case `doc-audit-request` routes to joycraft-cleanup.
- MIT notice: `.joycraft/references/doc-cleanup-LICENSE.md` with the original
  copyright, and a credit line to aka-luan and David Moshal in the skill. Check:
  file exists and names the copyright holder from the source repo's LICENSE.
- Live run: a Claude Code session following the skill on a fixture holding the
  pre-#87 AGENTS.md proposes moving Key Files, data flow, folder map and gotchas
  into a context page, and changes nothing before approval. Check:
  `scripts/host-smoke.mjs` case `doc-audit-trim`; the fixture's bytes are
  unchanged after the report phase and the proposal lists those four sections.

## Not covered

Shipping doc-cleanup's SKILL.md unchanged beside ours (rejected in `docclean`).

## Implementation and verification scope

`.agents/skills/joycraft-cleanup/SKILL.md`, `.joycraft/references/cleanup.md`,
new `.joycraft/references/doc-cleanup-LICENSE.md`,
`fixtures/skill-evaluation/` (new case), host-smoke case, tests above.
Depends on 02 (the checks it names) and 05 (the rule it links).

---
id: 6
status: in-review
---
# Outcome

Each project gets one rewrite of its rules. The agent finds the safety rules,
shows one list of what stays, what moves and what goes, and writes on one yes.
After that, a tidy cannot change a rule. Brief:
[pinned-rules](../brief.md#pinned-rules). Rulings: `rewrite-review` "List
first, one yes"; `limit-guard` note (owner): "you should be able to review the
agents.md, find the saftey rules, bring those tot he users attention or say
what will move or be removed and they can say yes or no".

## acceptance

- The rewrite is described one time. Check: `cleanup.md` has a section
  `## Rules rewrite` with the four sorting steps of the brief (a safety rule
  stays as written; what is not a rule is removed and its reason goes to the
  decision log; temporal text moves to `now.md` word for word; an enforced rule
  names its check), and the sentence that a safety rule is never moved to a
  linked page (`tests/cleanup/cleanup-text.test.mjs`, `[AC:rewrite-steps]`).
- One list, one yes. Check: the section says: show one page with three parts
  (safety rules kept, text that moves and where, text removed), as
  `artifacts.md#showing-a-page` says; write nothing before a yes; this is the
  same for every `entry.tidy` value; on a no, add only the markers; never do
  the rewrite in an unattended run, a worker or a linked worktree
  (`[AC:rewrite-one-yes]`).
- No word list ships. Check: no shipped skill or reference has a list of limit
  words, and no runtime file classifies a sentence as a rule
  (`[AC:no-limit-lexicon]`).
- Markers show that the rewrite is done. Check:
  `node .joycraft/runtime/entry-check.mjs rules --root <fixture>` prints
  `{"rewritten": false}` for an `AGENTS.md` with no
  `<!-- joycraft:rules -->` pair and `{"rewritten": true}` with one or more
  closed pairs. An open pair with no close exits 1 and names the line
  (`tests/cleanup/entry-check.test.mjs`, `[AC:rules-markers]`).
- A tidy cannot change a rule. Check: in a fixture with markers, run
  `entry-check.mjs pin --record`, change one byte between the markers, then run
  `entry-check.mjs pin --check`; exit code 2, and stderr names `AGENTS.md` and
  the first changed line. A change outside the markers exits 0. `--check` with
  no record exits 1 and says to record first. The record is in
  `.joycraft/local/`, which Git ignores (`[AC:pin-check]`).
- The tidy uses the pin. Check: `joycraft-cleanup/SKILL.md` says: before a tidy
  changes an entry file, run `pin --record`; before the tidy commits, run
  `pin --check`; on exit 2, restore the file and report it. It says that an
  owner's own edit of a rule is not a tidy and is never checked
  (`[AC:tidy-uses-pin]`).

## Not covered

A script that judges whether rule text is safe: there is none, by ruling
`limit-guard`. A CI gate on rule text. A second rewrite: after the markers
exist, a rule that is stale or that the code disproves is a ruling in the
backlog (spec 4), and only the owner changes it. Whether the agent's list is
good on a real file is measured in the field run (spec 8, deferred).

## Implementation and verification scope

Implemented in joycraft-prototype. `.joycraft/references/cleanup.md`,
`.agents/skills/joycraft-cleanup/SKILL.md`,
`.joycraft/runtime/entry-check.mjs` (`rules`, `pin --record`, `pin --check`;
the record is a SHA-256 of the bytes between each marker pair, in
`.joycraft/local/entry-pin.json`), `tests/cleanup/entry-check.test.mjs`,
fixtures under `fixtures/entry-check/rules/`. Block-level HTML comments are
removed by Claude Code before it loads the file and are plain text to the other
hosts, so the markers cost no instruction. Spec 2's `entry-size` and `temporal`
already read the same markers; keep one parser for them.

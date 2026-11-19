---
id: 6
status: in-review
---
# Withdrawn by spec 9

This spec is withdrawn. It built the one-time rules rewrite, the rules markers
and the byte pin. Spec 9 removed that, on the owner's decision of 2026-11-18
(brief, section `one-pass`, "Cut from the first design"). joycraft-prototype
commit `2b6fb72` added it and `c586d0d` removed it. No released version had it.

The status `done` on this spec means that it is retired. It does not mean that
the original outcome below was built or verified. A review of this spec checks
one thing: that nothing it built ships.

## acceptance

- Nothing that this spec built ships. Check: `entry-check.mjs rules` and
  `entry-check.mjs pin --record` are usage errors; no shipped file names
  `joycraft:rules` or `entry-pin`; `entry-size` counts every word of the file
  (spec 9, `[AC:no-pin]`, `tests/cleanup/entry-check.test.mjs`,
  `tests/cleanup/cleanup.test.mjs` and `tests/cleanup/cleanup-text.test.mjs` in
  joycraft-prototype) (`[AC:withdrawn-rules-pin]`).

# Original spec, kept as a record

The text below is the spec as it was. Its checks are not criteria.

## Original outcome

Each project gets one rewrite of its rules. The agent finds the safety rules,
shows one list of what stays, what moves and what goes, and writes on one yes.
After that, a tidy cannot change a rule. Brief:
[pinned-rules](../brief.md#pinned-rules). Rulings: `rewrite-review` "List
first, one yes"; `limit-guard` note (owner): "you should be able to review the
agents.md, find the saftey rules, bring those tot he users attention or say
what will move or be removed and they can say yes or no".

## Original acceptance

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
  the rewrite in an unattended run or in a worker
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

## Original not covered

A script that judges whether rule text is safe: there is none, by ruling
`limit-guard`. A CI gate on rule text. A second rewrite: after the markers
exist, a rule that is stale or that the code disproves is a ruling in the
backlog (spec 4), and only the owner changes it. Whether the agent's list is
good on a real file is measured in the field run (spec 8, deferred).

## Original implementation and verification scope

Implemented in joycraft-prototype. `.joycraft/references/cleanup.md`,
`.agents/skills/joycraft-cleanup/SKILL.md`,
`.joycraft/runtime/entry-check.mjs` (`rules`, `pin --record`, `pin --check`;
the record is a SHA-256 of the bytes between each marker pair, in
`.joycraft/local/entry-pin.json`), `tests/cleanup/entry-check.test.mjs`,
fixtures under `fixtures/entry-check/rules/`. Block-level HTML comments are
removed by Claude Code before it loads the file and are plain text to the other
hosts, so the markers cost no instruction. Spec 2's `entry-size` and `temporal`
already read the same markers; keep one parser for them.

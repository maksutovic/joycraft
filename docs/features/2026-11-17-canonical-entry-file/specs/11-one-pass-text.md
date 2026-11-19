---
id: 11
status: done
---
# Outcome

The cleanup skill and its reference describe the one-pass procedure, and every
other shipped text agrees with it. Brief: [one-pass](../brief.md#one-pass).

## acceptance

- The procedure is in the reference. Check: `.joycraft/references/cleanup.md`
  has the six steps in order; the two lenses; the page kinds; what an entry
  file holds; the seven things to find on each page; and a section on the
  questions for the owner: at most eight, each about one policy, with stops
  and holds always two of them
  (`tests/cleanup/cleanup-text.test.mjs`, `[AC:one-pass-steps]`).
- The ledger is required. Check: the reference says that before the commit the
  agent lists each line that permits, forbids, stops or holds, old against
  new; that each change names the owner's answer; that a change with no answer
  is put back or asked; and that a grant keeps the owner's words
  (`[AC:permission-ledger]`).
- Temporal text has a home. Check: the reference says where each kind goes: a
  decision to the decision log, an operation or status to its log, open work
  to the backlog or a handoff, and a hold in force stays in the entry file as
  one rule (`[AC:temporal-homes]`).
- The map has two parts. Check: the reference and `setup.md` say that guides
  have "read when" rows and that a record is an audit trail, searched and not
  read at the start; `setup.md` no longer says that the agent never edits the
  user's rows during a cleanup (`[AC:map-two-parts]`).
- Session end is cheap. Check: the skill's description no longer says that it
  runs the tidy at every session end; the skill says that a session end runs
  the report and the mechanical fixes only, and that the full pass runs on the
  owner's request and states its size first (`[AC:session-end-mechanical]`).
- A worker reads the entry file. Check: the implement skill and each worker
  definition say: read the entry file, then each page whose map row matches
  the spec (`[AC:worker-reads-entry]`).
- No fan-out is required. Check: the reference says one agent by default, and
  that parts run one after another where the host has no subagents
  (`[AC:one-agent-default]`).
- The payload did not grow. Check: `tests/payload-budget.test.mjs` passes and
  the shipped words are at most 29,919 (`[AC:payload-words-not-up]`).

## Not covered

A script that judges rule text.

## Implementation and verification scope

joycraft-prototype: `.agents/skills/joycraft-cleanup/SKILL.md`,
`.joycraft/references/cleanup.md`, `setup.md`, `update.md`, `knowledge.md`,
`settings.md`, `archive.md`, the session-end, entry and implement skills,
`.claude/agents/`, `tests/cleanup/cleanup-text.test.mjs`,
`tests/payload-budget.json`. New prose is ASD-STE100.

## Amended, 2026-11-18

`[AC:one-pass-steps]` quoted the sentence "ask only what grants or removes a
permission, lifts a hold, or deletes the owner's material". The owner changed
the question policy on 2026-11-18 after a run with 39 line-level questions
(brief, section `one-pass`, "Few questions, thorough analysis" and "The shipped
method is the one of the best trial"). joycraft-prototype commits `d3989e1` and
`83beff3` made the change. The check now names the questions by theme and the
seven things to find on each page.

"Not covered" named a word target for an entry file. The brief withdrew the
ruling "no word target", and the reference has an aim of half the words, so
that line is gone.

A first review of this spec, on the payload `field-25`, failed two checks: the
reference did not say that a hold in force stays as one rule, and it did not
say what a host with no subagents does. joycraft-prototype commit `ee3ab75`
(`field-26`) added both sentences. The checks are as they were.

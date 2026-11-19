---
id: 4
status: done
---
# Outcome

A cleanup run on an entry file stops asking shape questions: the two freeze
policies are gone, and one agent writes an entry file. Specs 9 and 11 replaced
the rest of this spec (see "Amended"). Brief:
[tidy](../brief.md#tidy). Root cause in the
[panel verdict](../../../research/2026-11-17-entry-file-sota-panel-verdict.md#root-cause).

## acceptance

- The freeze policies are gone. Check: `.agents/skills/joycraft-cleanup/SKILL.md`
  and `.joycraft/references/cleanup.md` do not contain "Never propose moving",
  "change no file in the project", "Stop for approval" or "never reworded"
  (`tests/cleanup/cleanup-text.test.mjs`, `[AC:freeze-policies-removed]`).
- One writer. Check: `.joycraft/references/cleanup.md` says that the
  coordinator writes the entry file, and that no other agent changes an entry
  file and no agent commits. `SKILL.md` says that a run that nobody asked for
  (session end, a queue, a hook) fixes only Joycraft's block and a dead path
  with one unique Git rename, and changes no rule and no page
  (`tests/cleanup/cleanup-text.test.mjs`, the tests tagged
  `[AC:worker-reads-entry]` and `[AC:session-end-mechanical]`;
  `[AC:one-writer]`).

## Not covered

The rules rewrite and the pin (spec 6): until spec 6, the skill says only that
text between the rules markers is not changed. `now.md` (spec 5): the
dispositions name it, and spec 5 makes the page. Whether the model follows the
table on a real file is measured in the field run (spec 8, deferred).

## Implementation and verification scope

Implemented in joycraft-prototype. `.agents/skills/joycraft-cleanup/SKILL.md`
(description, the session-end mode paragraph, sections 2 to 5),
`.joycraft/references/cleanup.md` ("Trimming an entry file", "Execution
playbook", "Verify"), `.joycraft/references/setup.md` (the sentence that hands
audit fixes to cleanup step 4), `.agents/skills/joycraft-session-end/SKILL.md`
(the paragraph "apply only the fixes the user approves there" becomes: entry
files follow `entry.tidy`; other docs keep the approval). The cut comes from
the three statements of the freeze policy, the approval ceremony and the
"Trimming an entry file" table, which the dispositions replace. Write the new
text in ASD-STE100, as the other references are.

## Amended, 2026-11-18

The owner's design change of 2026-11-18 (brief, section `one-pass`) replaced
most of this spec. joycraft-prototype commit `c586d0d` made the change, and
`83beff3` rebuilt the reference again. Two checks stay. `[AC:one-writer]` has
its current form: it no longer names the attended coordinator session or
proposed map rows. Four checks are withdrawn and are not criteria of this spec:

- `[AC:dispositions-table]`: the reference has no `## Entry-file dispositions`
  table. Spec 11 `[AC:one-pass-steps]` describes what replaced it.
- `[AC:tidy-follows-setting]`: there is no `entry.tidy` setting (spec 9,
  `[AC:no-tidy-setting]`).
- `[AC:ruling-definition]`: the reference no longer defines a ruling. The
  questions by theme and the permission ledger replaced it (spec 11,
  `[AC:permission-ledger]`).
- `[AC:cleanup-words-cut]`: the two files are not at most 1,780 words. They
  have 2,247 words at `field-25`. Spec 11 `[AC:payload-words-not-up]` holds the
  total of the shipped text at 29,919 words in its place.

The text of the withdrawn checks, as it was:

- The dispositions have one home. Check: `cleanup.md` has a section
  `## Entry-file dispositions` with the eight rows of the table in the brief's
  `tidy` section, in the same order, and `SKILL.md` links that section and does
  not repeat a row (`[AC:dispositions-table]`).
- The tidy follows the setting. Check: `SKILL.md` says, for an entry file:
  with `auto`, apply the dispositions, make one local commit that holds only
  the tidy, and report it in one line with the commit; with `review`, show one
  diff page and apply on one yes; with `ask-once`, ask the setup question from
  spec 3 first, record the answer, then continue as that answer says. A docs
  audit of pages that are not entry files keeps its report and its approval
  (`[AC:tidy-follows-setting]`).
- Only a ruling is asked. Check: `cleanup.md` defines a ruling as in the brief
  (a fact inside a rule that the repository disproves, when the correction
  changes what is permitted; a conflict between a rule and the code), and says
  that each ruling is written one time to the backlog with its evidence and
  does not stop work. It says that a hold is not a ruling
  (`[AC:ruling-definition]`).
- The two files are shorter. Check: `wc -w` of `SKILL.md` plus `cleanup.md` is
  at most 1,780 (field-24: 2,182), and `tests/payload-budget.test.mjs` (budgets lowered in `tests/payload-budget.json`)
  passes (`[AC:cleanup-words-cut]`).

---
name: joycraft-cleanup
description: Clean AGENTS.md and the context pages behind its map in one pass, as a dialogue with the owner - remove false, stale and temporal text, move detail to the page that owns it, and change no rule without the owner's answer. Use for "clean up my AGENTS.md", "clean up the docs", "audit the docs", "what in our docs is stale", "AGENTS.md is too long", "review our tests", or when cleanup.mjs reports findings. At a session end it only reports and makes the mechanical fixes.
compatibility: Requires Node.js 22+ and the installed .joycraft runtime. Git improves the code-drift and worktree checks.
---

# Joycraft Cleanup

Keep the entry files light and the pages behind the map true. Treat every doc
claim as a hypothesis and the repository as the evidence
([knowledge guidance](../../../.joycraft/references/knowledge.md)).
This method is adapted from doc-cleanup by aka-luan
([MIT](../../../.joycraft/references/doc-cleanup-LICENSE.md)), brought in by David Moshal.

Read [cleanup reference](../../../.joycraft/references/cleanup.md) first.

## Which run this is

- **A person asks for a cleanup.** Do the
  [one pass](../../../.joycraft/references/cleanup.md#one-pass): the entry
  files and every page behind the map, together. When the person is away
  before the answers, leave the questions and the recommendations as a page
  and stop. After the pass, offer the opt-in
  [test review](../../../.joycraft/references/testing-review.md); when the
  person asks only about tests, do only that.
- **Session end calls this skill, or nobody asked** (a queue, a hook). Run
  `node .joycraft/runtime/cleanup.mjs`. Fix only what a script can check:
  replace Joycraft's block with the output of
  `node .joycraft/runtime/entry-check.mjs block` and remove an older Joycraft
  line beside it, and re-point a dead path that has one unique Git rename.
  Put the other findings on the session-end page in one list. Change no rule
  and no page, and do not start the pass.
- **Setup calls this skill.** Do steps 1 and 2 of the pass and hand the
  findings back to setup: no report page and no stop.

## The pass

Follow the reference: the steps, in order. Code proves what is implemented,
not what was intended. Never delete a context page to clear a finding; merge
or redirect it.

## Hand off

Report the changed files, the archive
mappings, the ledger, what the project's own gates said, and the findings that
remain with their reasons. Approval to edit is not approval to commit: offer
one commit with a specific message, and commit when the user says yes.

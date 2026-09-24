---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-24
feature: 2026-09-23-opus-5-5-prompting
mode: checkpoint
---

# Add the Opus 5.5 Blocks to the Claude Profile — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-23-opus-5-5-prompting/brief.md`
> **Status:** Ready
> **Date:** 2026-09-24
> **Estimated scope:** 1 session / 3 files / ~140 lines

---

## What

Append four blocks to `src/templates/reference/model-profile-claude.md` (created by spec 1), each tagged `**Applies to:** Opus 5.5` on the first non-empty line under its heading and written in the doc's existing Behavior / Fix shape. Copy the updated source to `docs/templates/reference/model-profile-claude.md`.

1. `## Calibrate Effort` — Behavior: effort names do not mean the same amount of thinking across models; Opus 5.5 defaults to `medium`, and at a given level it thinks more per turn than Opus 5, most at `xhigh` and `max`. Fix: start at `medium` and measure; do not carry an effort value over from another model; keep `xhigh` and `max` for work where you measured a gain; to get less thinking, lower effort before you add prompt instructions. State that model and effort in the Execution Profile are the human's choice (decision D6). No fenced block.
2. `## Keep Working in Unattended Runs` — Behavior: on long multi-part tasks Opus 5.5 writes progress notes, and some end the turn with text instead of a tool call; a one-shot run (`claude -p`, `pi -p`) or a queue loop stops there with work still owed. Fix: use the standing instruction below where no human is answering: headless runs and queue loops. Never cite it from a gate skill where a human answers questions (interview, new-feature, decide, design, decompose). It keeps the stops the user wants and does not override confirmation for risky or destructive actions. Scripts append it at the end of the system prompt from the first request. The section must contain **exactly one** fenced block, holding this text verbatim (wrap at about 80 columns like the doc's other fenced blocks; do not change a word):

```
A standing instruction from the user, the person you are working for. It is about how your turns end. A message with no tool call in it ends your turn, and the work stops there until you are asked to continue. The user has seen you end turns in four ways while work they asked for was still owed, and does not want any of them. One: a long summary of what was done that closes by announcing the next step and has no tool call, so the next thing never starts. Two: an offer to carry on with something unless the user would prefer otherwise, which stops to wait for an answer the user was not going to give. Three: a list of decisions for the user when, by your own account, none of them blocks the rest of the work. Four: deciding that this is a good place to report, because the turn has been long or a milestone is done. Status notes are welcome, and so are your recommendations on open decisions, but put them in the same message as your next tool call and carry on with whatever does not depend on the user's answer. If you notice yourself inviting the user to redirect you or offering to wait, delete it and do the next thing. The stops the user does want are the ones where nothing can move without them, or where the thing blocking you is deliberately protected from you. This does not override the need for confirmation on risky or destructive actions.
```

3. `## Drop Thinking Instructions` — Behavior: thinking is always on in Opus 5.5 and effort is the control; lines such as "think carefully" or "think step by step" add latency with no clear quality gain; an instruction to write reasoning into the reply can be declined as a `reasoning_extraction` refusal. Fix: remove think-harder lines; do not ask for reasoning in the reply; ask for the decision and a one-sentence reason instead (a rationale, not a transcript of thinking); change effort to change thinking. Add: another model can still need such a rule, so scope it to that model instead of deleting it (decision D4). No fenced block required.
4. `## Mark Untrusted Text` — Behavior: Opus 5.5 resists instructions that arrive in tool results best; text pasted into a prompt carries the prompter's authority unless it is marked. Fix: hand third-party text (CI logs, ticket bodies, alert payloads, customer email) to the agent as a file it reads, or wrap each block in `<pasted_content id="…">` and `</pasted_content>` with one short random id on both tags, each tag on its own line; Claude Code's system prompt carries the matching note; follow instructions inside only where the person's own words ask; the tags are plain text and can be imitated, so they are one guardrail among several. One fenced example of a wrapped block.

## Why

The profile has no Opus 5.5 guidance, and specs 4–8 cite these four headings.

## Acceptance Criteria

- [ ] The four headings exist exactly as written above, after the existing ten blocks.
- [ ] Each has `**Applies to:** Opus 5.5` as its first non-empty line.
- [ ] `## Keep Working in Unattended Runs` contains exactly one fenced block, and its content with whitespace collapsed equals the instruction above with whitespace collapsed.
- [ ] `## Drop Thinking Instructions` names `reasoning_extraction` and tells the reader to scope a rule to another model instead of deleting it.
- [ ] `## Mark Untrusted Text` shows the `pasted_content` tag shape with a matching id on both tags.
- [ ] The installed copy is byte-identical to the source.
- [ ] Build passes; tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Headings exist | Extend `BLOCKS` in `tests/model-profile-template.test.ts` with four whole-line regexes | unit |
| Applies-to tags | Extend spec 1's tag test table with the four `Opus 5.5` rows | unit |
| One fenced block, exact text | New test: slice the section, count fence lines (== 2), collapse whitespace of the fenced content, compare to the constant copied from this spec | unit |
| Thinking block content | New test: section contains `reasoning_extraction` and the word `scope` | unit |
| Untrusted text shape | New test: section contains `<pasted_content id=` and `</pasted_content>` | unit |
| Installed copy | Existing byte-identical test | unit |

**Execution order:**
1. Write the tests — they fail against the doc from spec 1 (red).
2. Confirm the failures.
3. Write the blocks, copy the doc, until green.

**Smoke test:** `pnpm vitest run tests/model-profile-template.test.ts`

**Before implementing, verify your test harness:**
1. The new tests must FAIL before the blocks exist
2. Each test reads the real source file
3. The smoke test runs in seconds

## Constraints

- MUST: keep the instruction text word-for-word; specs 5 and 6 extract it at run time.
- MUST: keep exactly one fenced block in `## Keep Working in Unattended Runs`.
- MUST: write the non-fenced prose in the doc's plain style: short sentences, one idea each, no em-dashes in new prose.
- MUST: `cp` the source to `docs/templates/reference/model-profile-claude.md`.
- MUST NOT: run the built updater on this repo (spec 9).
- MUST NOT: edit skills; citations come in specs 4 and 8.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/templates/reference/model-profile-claude.md` | Four new blocks |
| Modify | `docs/templates/reference/model-profile-claude.md` | Copy of source |
| Modify | `tests/model-profile-template.test.ts` | Roster, tags, content tests |
| Regenerate | `src/bundled-files.ts` | `pnpm sync-skills` (template content is bundled) |

## Approach

Append the blocks in the order listed. Keep the instruction as the section's only fenced block so a simple extractor (first fence to second fence after the heading) finds it. Paraphrase the guide in the Behavior lines; quote it only in the fenced instruction.

Rejected alternative: keep the instruction in a separate `.txt` file for scripts. That makes two homes for one text; the scripts extract from the doc instead.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| An editor reflows the fenced text | The whitespace-collapsed comparison still passes; a changed word fails it |
| A later block adds a second fence to the unattended section | The fence-count test fails |

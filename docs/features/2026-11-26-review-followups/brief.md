---
feature: review-followups
decisions: [
  {"id":"note-shape","status":"open","question":"Where does a reviewer put what it saw but that needs no work?","answer":null,"context":"A reviewer can file a finding only as blocking, decision-needed or follow-up. So it files confirmations (\"test change is class 1\"), sibling specs' files and old [AC:] tags as follow-ups. In the field queue, 30 of 52 follow-ups were this kind. status.mjs makes each follow-up a question for you.","options":[{"value":"note-class","label":"A fourth class: note","recommended":true,"description":"Add `note` to the finding classes. status.mjs already reads follow-ups by class, so it ignores notes with no other change.","example":"{\"id\":\"f4\",\"class\":\"note\",\"summary\":\"Test change is class 1; no assertion weakened.\"}","tradeoff":"Notes stay in `findings`, so a page or tool that counts all findings counts notes too."},{"value":"observations","label":"A separate observations list","description":"Add a top-level `observations` array of plain strings next to `findings`.","example":"\"observations\": [\"Test change is class 1; no assertion weakened.\"]","tradeoff":"Two lists for the reviewer to choose between, and a second field to validate and show."}],"recommendation":"One list with one more class is the smallest change, and the existing class filter already keeps notes out of questions.","affected":["reviewer-notes"]},
  {"id":"resolution-record","status":"open","question":"Where is it recorded that a follow-up is handled, so close.mjs stops asking?","answer":null,"context":"Accepted review reports are hashed and never change. status.mjs rebuilds its questions from them every time, so close.mjs --feature refuses forever once a feature has one follow-up, even after you answer it. A follow-up ends one of three ways: a later spec fixes it, you decide it, or the agent shows it is not a defect.","options":[{"value":"ledger","label":"One follow-ups.json per feature","recommended":true,"description":"The feature folder gets follow-ups.json. Each entry names the report and finding id, the outcome (fixed, decided or dismissed) and its proof: the fixing spec id, the brief decision id, or a reason. status.mjs checks a fixed entry's spec is done and a decided entry's decision is answered.","example":"{\"report\":\"reviews/spec-3-r1.json\",\"finding\":\"f2\",\"outcome\":\"fixed\",\"by\":\"15\"}","tradeoff":"A new file in each feature folder that archive must carry."},{"value":"queue-fixes","label":"A fixes field on the fixing spec","description":"A fix spec's queue entry lists the findings it fixes. Decided follow-ups point from the brief decision; dismissals need a third place.","example":"{\"id\":\"15\",\"fixes\":[{\"spec\":\"3\",\"finding\":\"f2\"}]}","tradeoff":"Three places to read, and the dismissal (needed for 1.10.0 reports already full of noise) has no natural home."}],"recommendation":"One file covers all three outcomes and the noise already in 1.10.0 reports, and status.mjs reads one place.","affected":["close-clears"]}
]
---

# 1.10.2: review follow-ups are fixed during the queue, and the entry budget counts only the project's text

Field report, 2026-11-26, 1.10.0 on Claude Code: a 14-spec queue finished with every spec at PASS, then session end held 52 follow-ups. Only about 20 were real; the rest were bookkeeping. `close.mjs --feature` printed one "Status question … Ask the user" line for each and would not archive. Max: "we shouldn't be ending all of our queues with 40+ followups, something is wrong with our procedure … you should have the agency and autonomy to fix these issues as they arise."

## Context and authorization

Max, 2026-11-26: investigate, then "brief first". Ships as one patch release, 1.10.2. The code is the same in 1.10.1.

What the field reports show (`clients/base-works-consulting`, archived `panel-polish`, 52 follow-ups):

| Kind | Count | Why it was filed |
|---|---|---|
| Real defects or gaps | ~20 | — |
| Changed files that belong to sibling specs | 13 | The wave's diff base covers every spec, so each reviewer sees its siblings' files |
| `[AC:]` tags from archived features | 8 | `trace.mjs` calls every tag that is not this spec's criterion unknown |
| "Test change is class 1" confirmations | 4 | No class for a check that passed |
| Deferred-until-deploy items | 2 | `joycraft-verify` says to file each as a follow-up |
| Flaky retries, log noise | ~3 | No class for context |

Causes, read from `payload/` at 1.10.1:

1. Findings have three classes only (`completion.mjs:79`, `types.d.ts:157`).
2. `status.mjs` makes every follow-up of an accepted report a question (`followUps()`, L64–69, L167). `close.mjs:299` refuses on each.
3. Nothing records that a follow-up is handled, and the reports cannot change. So `close.mjs --feature` never passes once a feature has a follow-up. `archive.mjs` does not read questions, which is how the field agent got past it.
4. `trace.mjs:57` reports tags of archived features as unknown.
5. `joycraft-implement` has no step that acts on follow-ups during the queue; `joycraft-session-end` asks the user every one.

Settled from Max's words above: the implementer fixes a real follow-up inside the brief's intent with a new spec in the same queue, without asking. Only a follow-up that changes scope, or needs a choice with no safe default, goes to the owner, as a brief decision.

Rules for every spec: edit `payload/` and run `node scripts/pin-payload.mjs`; each spec runs only its own test files, and the gate runs once per spec before review; every-spec words stay under their caps (`tests/payload-guard.test.ts`).

## Goals

### reviewer-notes

Uses decision `note-shape`. A reviewer has a place for what it saw that needs no work, and status never asks about it. `joycraft-verify` sends there: confirmations that a check passed, sibling specs' files, tags of archived features, deferred-until-deploy items, and flaky retries or log noise with no defect.

**Done when:**
- a report with a note passes `check-report` and `finalize-review`; `status.mjs` lists no question for it (test);
- a report from 1.10.1 with only the three old classes still validates (test);
- the verify skill's findings rule names each kind above and where it goes (payload text test).

### wave-noise

The reviewer is not shown its siblings' work as its own.

**Done when:**
- `trace.mjs` lists a tag that matches a criterion of an archived feature (any queue under `paths.archive`) as `archivedTags`, not `unknownTags`; a tag that matches nothing stays unknown (test);
- reviewer startup lists changed paths that are a sibling spec's declared inputs in the same queue apart from the other out-of-scope paths, and the verify skill says not to file them (test + payload text).

### triage

After each review wave, the implementer acts on the wave's follow-ups before it starts the next wave. For each one: a defect or gap inside the brief's intent gets a fix spec in the same queue, no question; a follow-up that changes scope or has no safe default becomes an open brief decision; one that is not a defect is dismissed with a reason. Each outcome is recorded (decision `resolution-record`).

**Done when:**
- `joycraft-implement` has the step, with these three outcomes and the "no question" rule (payload text test);
- a queue can take an added fix spec while it runs, and the fix spec's review is an ordinary review (test on the runtime command that adds it, or on the existing one if it already allows this).

### close-clears

Uses decision `resolution-record`. A handled follow-up is not a question.

**Done when:**
- `status.mjs` lists no question for a follow-up recorded as fixed by a done spec, decided by an answered brief decision, or dismissed with a nonempty reason (test, one case each);
- a follow-up recorded as fixed by a spec that is not done, or decided by an open decision, is still a question (test);
- `close.mjs --feature` passes on a feature whose follow-ups are all handled (test);
- `joycraft-session-end` asks only the questions that are left, and records each answer so close passes (payload text);
- a 1.10.0 feature with noise follow-ups can be closed by dismissing them, without editing its reports (test).

### entry-size-own-text

Second field issue, same project: `entry-size` (`cleanup.mjs:361-366`) counts every word of `AGENTS.md`, Joycraft's own text included. The managed block is 731 words and the `## Review loop` section about 110, so a project has about 160 words of its 1,000 for its own rules and Context Map. The field project is at 1,418 words after moving its stack, commands and contract text out. Max, 2026-11-26: "i like their idea the budget only counts against the own text".

The budget counts only the project's own text. Left out of the count: the text between the `joycraft:managed` markers, and the `## Review loop` section through its `joycraft:review-loop` marker. The budget stays 1,000 words (`cleanup.entryWords`). `entry-size` is already advisory, not a gate (`gateChecks` in `entry-check.mjs:16`), and stays so. But a budget a project cannot reach still pushes the agent to cut the owner's own rules, so the count changes, not the level.

**Done when:**
- an entry file whose own text is under the budget, with a full managed block and review-loop section, has no `entry-size` finding (test);
- an entry file whose own text is over the budget has one, and its detail gives the own-text count and says Joycraft's sections are not counted (test);
- an entry file with no markers is counted whole, as before (test);
- `settings.md` and the cleanup check list say what the budget counts (payload text).

### release

`package.json`, `src/joycraft-release.json` and `CHANGELOG.md` carry 1.10.2.

## Agent work and pending choices

`wave-noise`, `entry-size-own-text` and the `triage` skill text can start now. `reviewer-notes` waits on `note-shape`; `close-clears` and the triage record wait on `resolution-record`.

## Scope and limits

- No change to how a blocking or decision-needed finding works.
- Accepted reports are never edited; old reports are handled through the record only.
- No merging of repeated notes across specs: once notes never reach the owner, repeats cost nothing.
- This repo's own install stays at 1.9.2 for this queue; it has no `close.mjs`, so this work does not hit cause 3.

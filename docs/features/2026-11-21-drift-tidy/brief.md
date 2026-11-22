---
feature: drift-tidy
decisions: [{"id": "end-edits", "question": "Can an unattended session end edit a page?", "context": "Today session end changes no page (rule of 2026-11-18). The panel wants session end to fix the stale lines that it finds.", "why": "This changes a standing rule. Trial 6 of 1.6.0 showed that agents widen permissions when they can edit rule text.", "options": [{"value": "no", "label": "No, report only", "description": "Keep today's rule. Session end prints findings.", "example": "gone-symbol finds a deleted function in a guide. The line stays until a cleanup pass.", "tradeoff": "Stale lines stay in guides between passes."}, {"value": "script-named", "label": "Only lines that a script names", "description": "The agent edits only a line that a finding names. The script measures again, and it refuses a diff that touches an entry file.", "example": "The guide line about the deleted function is fixed and the fix is checked.", "tradeoff": "Slightly more work at session end.", "recommended": true}, {"value": "touched", "label": "Any doc the session touched", "description": "The agent can edit any doc that the session touched, except rule text.", "example": "In the field, 'touched' meant 150 to 180 docs.", "tradeoff": "The agent must classify rule text, which is the trial-6 hole."}], "recommendation": "A script can check it, and it cannot change a rule or an entry file.", "status": "clarified", "answer": "script-named", "affected": ["end-edits"]}, {"id": "end-commit", "question": "Can session end commit its doc fixes in one commit without asking?", "context": "Today approval to edit is not approval to commit. David wants his five-step sequence to be one step.", "why": "This extends a standing rule.", "options": [{"value": "no", "label": "No commit", "description": "Leave the edits uncommitted for you.", "example": "You see a dirty tree after session end.", "tradeoff": "David's one-step flow does not happen."}, {"value": "one", "label": "One commit, message from the script", "description": "The script prints the message and the agent commits once, with a trailer.", "example": "A tidy commit 'docs: tidy 3 stale lines' that one git revert undoes.", "tradeoff": "One more docs commit can run the gate. That cost is parked for the field report.", "recommended": true}, {"value": "per-pass", "label": "One commit for each pass", "description": "A separate commit for each kind of fix.", "example": "Two or three tidy commits per session.", "tradeoff": "More commits and more gate runs."}], "recommendation": "One revert undoes all of it. Check it again after the field report.", "status": "clarified", "answer": "one", "affected": ["end-commit"]}, {"id": "trust-sentence", "question": "Can the managed block get one trust sentence if the block does not grow?", "context": "The managed block loads in every session and subagent on all six harnesses. It is the only text that reaches ad-hoc writing.", "options": [{"value": "no", "label": "No change", "description": "Keep the block as it is.", "example": "Agents still treat any doc that search finds as current.", "tradeoff": "No guidance about authority when agents read."}, {"value": "extend", "label": "Extend line 3, keep the size", "description": "Add 'A doc that no map row reaches is working material, not current truth.' Cut the same number of words in the block, and add a test for the block size.", "example": "Same word count, plus a size guard.", "tradeoff": "The other lines must lose words.", "recommended": true}, {"value": "new-line", "label": "Add a new line", "description": "Add the sentence as a new line.", "example": "The block grows by about 20 words.", "tradeoff": "Every session pays for the extra words."}], "recommendation": "It is the cheapest rule to follow because it asks for no action, and the guard stops growth.", "status": "clarified", "answer": "new-line", "affected": ["trust-sentence"]}, {"id": "archive-ignore", "question": "Should setup and update offer an archive .ignore line?", "context": "One .ignore line makes a broad doc search open 5.1 times fewer files. a field project added it by hand.", "options": [{"value": "no", "label": "No", "description": "Do not offer it.", "example": "Search keeps returning archive files.", "tradeoff": "The highest measured return is lost."}, {"value": "setup", "label": "Setup only", "description": "Offer it only in new installs.", "example": "New projects get it, and a field project and Joycraft do not.", "tradeoff": "Both active projects are already installed."}, {"value": "both", "label": "Setup and update", "description": "Offer it at setup and at update, and write it on a yes.", "example": "On the next update you see one question: 'Ignore docs/archive in searches?'", "tradeoff": "One more update question.", "recommended": true}], "recommendation": "It has the highest measured return, and both active projects are already installed.", "status": "clarified", "answer": "both", "affected": ["archive-ignore"]}, {"id": "as-is-archive", "question": "When should the 'archive as is' path get a brief?", "context": "In a field project, 118 of 136 features were moved by hand because the strict archive refused them. Joycraft's own repo has 71 feature folders and 3 are archived.", "why": "This is the largest search-scope lever, and it touches acceptance.", "options": [{"value": "backlog", "label": "Leave it in backlog", "description": "Do nothing now.", "example": "Feature folders keep piling up in search.", "tradeoff": "The biggest lever waits."}, {"value": "brief-now", "label": "Brief now, ship after the field report", "description": "Write the brief now. The field report tells why the strict archive refused.", "example": "Brief ready, built in the test release.", "tradeoff": "It needs the field report first.", "recommended": true}, {"value": "ship-now", "label": "Ship with this release", "description": "Build it in the drift release.", "example": "Archive with an 'unverified' note right away.", "tradeoff": "The cause of the refusals is not known yet."}], "recommendation": "It is the biggest lever, but the field report must first say why the archive refused.", "status": "clarified", "answer": "ship-now", "affected": ["as-is-archive"], "note": "this was due to joycraft bugs this should be resolved in 1.8.1 which shipped"}, {"id": "age-out", "question": "Can the attended cleanup offer to archive old working docs, and at what age?", "context": "In a field project, 411 of 653 live working docs had no commit for 14 days, and 250 had none for 30 days. It is one question in an attended pass only, and it can be undone.", "options": [{"value": "no", "label": "No", "description": "Do not offer it.", "example": "Old research stays in search.", "tradeoff": "Search scope keeps growing."}, {"value": "30", "label": "Yes, at 30 days", "description": "Ask one question: '250 working docs have had no commit for 30 days. Archive them?'", "example": "One move commit on a yes.", "tradeoff": "Some useful docs older than 30 days leave search.", "recommended": true}, {"value": "14", "label": "Yes, at 14 days", "description": "The same question at 14 days.", "example": "About 411 docs move.", "tradeoff": "Risk of moving docs that are still useful."}], "recommendation": "30 days is the safer first cut. Ship it after the as-is archive.", "status": "clarified", "answer": "14", "affected": ["age-out"]}, {"id": "checks-seam", "question": "Should Joycraft build a checks: list so that David's tools run in the tidy step?", "context": "The afterArchive hook that 1.1.0 built for David has had zero use.", "options": [{"value": "ask-first", "label": "Ask David first", "description": "Ask what docaudit prints and if he would wire a checks: entry. Build after he says yes.", "example": "A message to David with two questions.", "tradeoff": "His one-step flow waits for his answer.", "recommended": true}, {"value": "build-now", "label": "Build the line contract now", "description": "Use 'path:line: message' plus the exit code. A missing tool means skipped.", "example": "joycraft.yaml gets checks: [drift check].", "tradeoff": "Could be a second unused seam."}, {"value": "parser", "label": "Build a JSON parser", "description": "Parse drift.check.v1 JSON.", "example": "Richer findings.", "tradeoff": "More code for one user."}], "recommendation": "Do not build a second seam before the first one is used. The line contract is small once he says yes.", "status": "clarified", "answer": "custom", "affected": ["checks-seam"], "note": "can't this be an option for users who use those kind of tools? remember our goal with joycraft is to be modular and meet the user where they are and what tools they like, i feel this can be modular pretty easily no?"}, {"id": "start-advice", "question": "Where does the start-of-session advice run?", "context": "Reports alone are ignored: entry-size printed every session, and AGENTS.md still grew.", "options": [{"value": "none", "label": "Nowhere", "description": "No start advice.", "example": "Nothing changes at start.", "tradeoff": "Agents start with no warning about drift."}, {"value": "entry", "label": "Entry skill, existing advice channel", "description": "At most 3 lines through wiring.mjs, only when mapped pages got worse.", "example": "'2 guide lines name removed code: run tidy now.'", "tradeoff": "Sessions that skip the entry skill miss it.", "recommended": true}, {"value": "first-action", "label": "The first-action command, every session", "description": "Print it from update-check, every session.", "example": "It reaches every session.", "tradeoff": "One script does two jobs."}, {"value": "catch-up", "label": "One catch-up question", "description": "Ask once when many commits passed since the last tidy.", "example": "'135 commits since the last tidy. Tidy now?'", "tradeoff": "Another question for you."}], "recommendation": "No new command. Check it again if the field report shows sessions that skip the entry skill.", "status": "clarified", "answer": "entry", "affected": ["start-advice"]}, {"id": "tidy-dirty-tree", "status": "clarified", "answer": "custom", "affected": ["generator-cuts"], "question": "What should session end do when the tree has edits that are not committed?", "context": "tidy --verify refuses any changed file that no finding names. So with other uncommitted edits in the tree, the tidy step can never pass. The session-end skill now says: commit the session's other edits first. Your end-commit answer allowed one tidy commit, not a second commit of other edits.", "why": "This adds an unattended commit that the end-commit decision did not name. In a queue, specs are already committed, so a dirty tree at session end is usually your own unrelated edits.", "options": [{"value": "pre-commit", "label": "Commit the other edits first", "description": "Session end commits the session's own edits, then tidies and makes the tidy commit.", "example": "Two commits: 'feat: ...' then 'docs: tidy 2 doc lines'.", "tradeoff": "It may commit your own unrelated edits without asking."}, {"value": "clean-only", "label": "Tidy only on a clean tree", "description": "When the tree has other edits, session end reports the tidy findings and skips the fixes. You can say 'tidy now' later.", "example": "'3 tidy findings; tree has edits, so no fixes were made.'", "tradeoff": "On a dirty tree, nothing is fixed until you ask.", "recommended": true}, {"value": "ask", "label": "Ask once", "description": "Session end asks whether to commit the other edits first.", "example": "One question at session end.", "tradeoff": "A question in an unattended queue."}], "recommendation": "It keeps the one-commit rule exact and never commits your own edits. Queue sessions are clean anyway.", "note": "session end should be something that only happens after everything is committed, worktrees pruned, and all the facts (the code) are either in PR or merged, the point is to cleanup, make sure there are no regressions, code is deployed and working -- i may be mis undersatnding the intenion so i'm happy to have push back on this but that is my general idea on the purpose of session end, and most importantly perform drift work and clean up and note important findings and lessons for the project"}]
---
# Drift tidy: catch and clean doc and code drift as work goes

Make Joycraft find doc and code drift that a session caused, and clean it at
session end in one checked commit, so slop does not pile up between cleanup
passes. Source: a power user's field feedback (edit before create, rg first,
authority shown by search scope, his commit, cleanup, commit, audit, commit
sequence made one step) and a field project with about 2,900 Markdown docs.
Research and the Fable 5.2 panel ruling (8 lenses, 4 proposals, 6 seats) are
kept outside the repository; this brief records what Max approved.

**Testing is out of scope here.** The test part of the next release waits for
the field report. This feature must leave a place where a test step can join the
tidy step later, and must not design that step.

## Context and authorization

Max answered all eight decisions above on 2026-11-21. Each section below quotes
its decision ID. Ship with the test release after the field report; build and
review now on `feature/drift-tidy`. No npm release from this branch alone.

Ruled without a question (panel, not reversed by Max): the scope is the docs
root (the common parent of `paths.context`, `paths.features`, `paths.archive`)
plus the entry files; the range base is stateless; a finding shows only while
its cause is in the range (no accept list, no baseline file); search uses
`git grep -F` and Node only; the unattended step never edits an entry file or
rule text; a check that cannot run reports `skipped` and never stops a queue;
no new hook (the one Stop hook stays the only one).

## Goals

### check-listing

`cleanup.mjs --checks` prints every check the script runs, one line each: name,
what it finds, whether it is report-only or mechanical. The check table in
`cleanup.md` is replaced by one sentence that names this command (net words go
down). The `impact-drift` fix text asks for a doable action. Batch the
`git check-ignore` calls into one `--stdin` call.
**Done when:** the listing names every check id that `cleanupReport` can emit
(a test compares them); `cleanup.md` has no check table; on a fixture with 500
backticked missing paths, cleanup spawns one `check-ignore` process, not 500.

### tidy-range

A stateless Git range for the tidy step. On a branch: the merge base with the
default branch to HEAD. On the default branch: the last 7 days or 100 commits,
whichever is smaller, labelled approximate. In a shallow clone or without Git:
one `skipped` line. `--base <ref>` overrides.
**Done when:** fixtures for a feature branch, a trunk-only repo, a squash-merged
history and a depth-1 clone give the expected base or `skipped`.

### gone-symbol

Range-scoped check. Identifiers on code lines the range removed, intersected
with identifiers in backticks in map-reached pages (context pages, entry files),
then one `git grep -F` at HEAD to keep only names that no longer exist in code.
Generic tokenizer, any language. A hit in a context page is fixable by the tidy
step; a hit in an entry file is report-only.
**Done when:** a fixture that deletes `getWidget` from code while
`docs/context/guide.md` still names it reports one finding at that line; a
rename of `getWidget` that keeps the name elsewhere in code reports nothing; a
Python fixture behaves the same.

### new-doc

Range-scoped report: Markdown files the range added under the docs root,
outside `paths.features`, `paths.archive` and the backlog, grouped by folder
with a count. Disposition is the existing session-end routing: carry durable
facts to their home, leave the doc as working material. No clearing link, stamp
or map row.
**Done when:** a range that adds 3 files in `docs/research/x/` and 1 in
`docs/notes/` prints two groups with counts 3 and 1; files in features and
archive are not listed.

### end-edits

Decision `end-edits` = `script-named`. The tidy step at session end may edit
only a line that a tidy finding names, in a context page, never an entry file
or rule text. `cleanup.mjs tidy --verify` measures again and refuses when the
working-tree diff touches an entry file or any file or line outside the listed
findings.
**Done when:** a fix of the named line passes `--verify`; an edit to AGENTS.md
or to an unlisted file fails with the path named.

### end-commit

Decision `end-commit` = `one`. When `--verify` passes, it prints one commit
message with a `Joycraft-Tidy: <base>..<head>` trailer; the agent makes that one
commit. A failed verify prints no message. Session end and "tidy now" mid-session
use the same command. The step reports at most 10 findings (context pages first)
and folds standing findings into one count line.
**Done when:** on a fixture with 14 range findings, the report shows 10 and a
"4 more" line; after a valid fix `--verify` prints a message with the trailer.

### trust-sentence

Decision `trust-sentence` = `new-line`. Add one line to the managed block in
`wiring.mjs`: "Search the mapped pages first. A doc that no map row reaches is
working material, not current truth." Existing projects see the
`managed-block` finding and the update flow replaces the block.
**Done when:** `entry-check.mjs block` prints the new line; an older block is
reported as `changed`.

### archive-ignore

Decision `archive-ignore` = `both`. Setup and update ask once whether search
should skip the archive. On a yes, Joycraft writes `paths.archive` as one line
in the project's `.ignore` (created if absent, never duplicated). A runtime
command reports and applies it so the references stay short.
**Done when:** `--check` on a fresh fixture reports missing; `--apply` adds the
line once; a second `--apply` changes nothing; a custom `paths.archive` is used.

### archive-links

When `archive.mjs` moves a feature, it rewrites links to the moved folder in
live Markdown under the docs root (not inside the archive, not receipts, not
code). It reports (a) live docs that name the feature folder in prose and
(b) non-Markdown files that name it. Both lists are report only.
**Done when:** a fixture context page linking `docs/features/x/brief.md` links
`docs/archive/x/feature/brief.md` after apply; a `.ts` file naming the folder is
listed and unchanged; files inside the archive are untouched.

### as-is-archive

Decision `as-is-archive` = `ship-now`. Max's note: "this was due to joycraft bugs
this should be resolved in 1.8.1 which shipped". An owner-approved path archives
a feature whose acceptance is incomplete: it moves the folder and writes an
`unverified.md` in the archive listing each spec not `done`, each missing
receipt and the owner's instruction. It never claims acceptance and never
rewrites reports. Default archive behavior is unchanged.
**Done when:** a fixture with one `in-review` spec refuses the default archive
and archives with `--as-is --owner-instruction "<text>"`; `unverified.md` names
the spec and the instruction; the queue file is preserved unmodified.

### age-out

Decision `age-out` = `14`. In an attended cleanup pass only, one question: "N
working docs have had no commit for 14 days. Archive them?" Working docs are
Markdown under the docs root outside context, features, archive and the
backlog. On a yes, one `git mv` per doc into `<archive>/working/<same path>`.
**Done when:** a fixture with docs aged 20 and 5 days lists only the 20-day doc
with `--days 14`; `--apply` moves it under the archive; nothing runs at session
end.

### checks-seam

Decision `checks-seam` = `custom`. Max's note: "can't this be an option for users
who use those kind of tools? remember our goal with joycraft is to be modular and
meet the user where they are and what tools they like, i feel this can be modular
pretty easily no?" So: an optional `checks:` list in `joycraft.yaml`. Each entry
has `name` and `run`. The tidy step runs each one; output lines in the form
`path:line: message` become findings with that check's name, and the exit code
says pass or fail. A command not found means `skipped`, never a stop. Setup and
the settings reference offer it when the project already uses a doc or code
checker (for example drift, docaudit, vale, markdownlint, knip). No parser per
tool.
**Done when:** a fixture `checks:` entry that prints two `path:line: msg` lines
gives two findings; a missing command gives one `skipped`; config validation
rejects an entry without `run`.

### start-advice

Decision `start-advice` = `entry`. The entry skill's existing wiring advice
channel prints at most 3 lines when the tidy range has findings in map-reached
pages. Nothing prints when clean; nothing is fixed at start.
**Done when:** a fixture with one gone-symbol finding gives one advice line
naming `tidy`; a clean fixture gives none.

### generator-cuts

Cut what Joycraft itself writes: remove "or a handoff" as a cleanup output in
`cleanup.md`; add the four Diataxis kinds (explanation, reference, how-to,
domain) as labels in the knowledge routing table. Session-end and cleanup skill
text call the tidy step. Net payload words must go down.
**Done when:** payload words are below the cap and below 29,917; the session-end
skill names `cleanup.mjs tidy`.

## Agent work and pending choices

No open decisions. The test step in tidy waits for the field report.

## Scope and limits

- No testing mechanism (budgets, ratchets, pruning, test stages).
- No rtk integration. No baseline file, accept list or `supersedes:`.
- No new hooks. No Diataxis folder tree.
- Relinking old hand moves and an `authority-link` widening stay experiments, not built.

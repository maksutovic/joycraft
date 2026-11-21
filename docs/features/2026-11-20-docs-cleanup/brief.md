---
feature: docs-cleanup
decisions: [
 {
  "id": "stops",
  "question": "Do the ASK FIRST stops and the release stop stay as they are?",
  "context": "AGENTS.md has six ASK FIRST lines and one release stop (\"no second release PR, manual promotion approval or new credential gate without Max's approval\"). All still guard something real. Two lines say \"templates\" and \"skills\"; in 1.x both live in payload/ (payload/.joycraft/templates, payload/.agents/skills).",
  "options": [
   {
    "value": "keep-words",
    "label": "Keep every stop in its words",
    "description": "No change to any stop.",
    "example": "\"Changing template content outside an approved spec\" stays as written.",
    "tradeoff": "\"templates\" and \"skills\" do not name payload/."
   },
   {
    "value": "keep-name-payload",
    "label": "Keep every stop; name payload/ in two lines",
    "description": "Same stops, same scope. Two lines add the path.",
    "example": "\"Changing template or skill content in payload/ outside an approved spec\".",
    "tradeoff": "A wording change to a stop, though not to its scope.",
    "recommended": true
   }
  ],
  "recommendation": "Scope stays exactly the same; the path makes the stop findable.",
  "status": "clarified",
  "answer": "custom",
  "affected": [],
  "details": "Settles: 7 lines.",
  "note": "well this is a public repo so it may not just be me, we should assume this could be any contributor -- the biggest thing i want is that the AGENTS.md should be written as if it was version 1.8.0, i'm pretty sure this is from last year so it needs an entirely new rewrite -- i'm not actually answering you question my apologies: these ask first stops look old and uncessary i think we can remove"
 },
 {
  "id": "holds",
  "question": "Is any hold or pause in force that the docs should state?",
  "context": "I found no hold in AGENTS.md or the pages: no paused feature, frozen file or waiting release. The prototype retirement is a permanent NEVER, not a hold.",
  "options": [
   {
    "value": "none",
    "label": "No hold is in force",
    "description": "The entry file states no hold.",
    "example": "AGENTS.md has no hold line.",
    "tradeoff": "None.",
    "recommended": true
   },
   {
    "value": "name-one",
    "label": "A hold is in force",
    "description": "Name it in your note; it becomes one present-tense rule.",
    "example": "\"Do not merge PR #95 until …\"",
    "tradeoff": "Needs your words."
   }
  ],
  "recommendation": "Nothing in the repo shows a hold.",
  "status": "clarified",
  "answer": "none",
  "affected": [],
  "details": "Settles: 0 lines."
 },
 {
  "id": "always-rules",
  "question": "What happens to three ALWAYS rules that no longer match how Joycraft works?",
  "context": "1) \"Test against multiple stack types (Node.js, Python, Rust, Go at minimum)\": 1.x has no stack-specific code and the canonical-entry-file brief says \"No stack-specific checks\"; only tests/fixtures still holds stack manifests. 2) \"Push to feature branches after each commit\" and \"Open a PR when all specs in a feature are complete\": 1.8.0 implement says push after each accepted spec, one PR when no spec can start; AGENTS.md overrides implement. 3) \"Show Max every document … an HTML artifact for anything else\": duplicates the managed block and conflicts with it (the block says an engine --doc page, never your own HTML). Update step 3 removes 3) as an older Joycraft line unless you say no.",
  "options": [
   {
    "value": "align",
    "label": "Retire 1, replace 2 with the 1.8.0 rhythm, remove 3",
    "description": "Stack rule goes; push/PR rule becomes \"Push after each accepted spec; open one PR when no spec of the queue can start\"; the managed block covers 3.",
    "example": "ALWAYS drops from 9 to 6 lines.",
    "tradeoff": "A rule you wrote goes away.",
    "recommended": true
   },
   {
    "value": "keep-1",
    "label": "Keep the stack rule; do the rest",
    "description": "As above, but the stack rule stays in full.",
    "example": "ALWAYS drops to 7 lines.",
    "tradeoff": "A rule with no current subject stays."
   },
   {
    "value": "keep-all",
    "label": "Keep all three in their words",
    "description": "Only 3) changes, as the update requires.",
    "example": "ALWAYS drops to 8 lines.",
    "tradeoff": "AGENTS.md keeps overriding 1.8.0's push rhythm."
   }
  ],
  "recommendation": "Each of the three either guards nothing that still exists or contradicts a newer rule.",
  "status": "clarified",
  "answer": "align",
  "affected": [],
  "details": "Settles: 4 lines."
 },
 {
  "id": "dead-pages",
  "question": "What happens to anchors.md and the Fable 5.1 model profile?",
  "context": "anchors.md (270 words) defines a 0–100 confidence scale and a block rule that routes to joycraft-decide. No 1.x skill uses the scale and joycraft-decide does not exist. The Fable 5.1 profile (1,267 words) steers Fable 5.1; the execution profile runs Opus 5.5, and the page says to re-check it when the model changes. Both have map rows. Cleanup never deletes a context page; it can mark one history (no map row).",
  "options": [
   {
    "value": "history-both",
    "label": "Mark both history, drop both map rows",
    "description": "type: history frontmatter; kept for lookup; no row.",
    "example": "The map loses 2 rows (about 40 words).",
    "tradeoff": "Back to a row if you use Fable 5.1 again.",
    "recommended": true
   },
   {
    "value": "history-anchors",
    "label": "Mark anchors history; keep the profile row",
    "description": "The Fable profile stays a guide.",
    "example": "Map loses 1 row.",
    "tradeoff": "An agent on Opus 5.5 may read Fable steering."
   },
   {
    "value": "keep-both",
    "label": "Keep both as guides",
    "description": "No change.",
    "example": "Map keeps 9 rows.",
    "tradeoff": "The block rule points at a skill that is gone."
   }
  ],
  "recommendation": "Neither page steers the current tools.",
  "status": "clarified",
  "answer": "history-both",
  "affected": [],
  "details": "Settles: 2 pages, 2 rows."
 },
 {
  "id": "old-material",
  "question": "May the cleanup delete 0.7-era material from the guides?",
  "context": "dangerous-assumptions has 8 rows about 0.7 code that 1.8.0 removed (improve-claude-md.ts, update --preview, skill line caps, \"skills can't import\", templates, harness blocks, init-autofix) and a \"Historical Incidents\" table about the removed autofix workflow. institutional-knowledge has a \"Historical Context\" section and a false RELEASE_TOKEN line. False lines are deleted anyway. The question is the history: true when written, wrong place now.",
  "options": [
   {
    "value": "delete",
    "label": "Delete it; Git keeps it",
    "description": "Remove the rows and sections. The 0.7 tags and Git history keep them.",
    "example": "dangerous-assumptions goes from 18 to about 9 rows.",
    "tradeoff": "No in-repo page shows the old incidents.",
    "recommended": true
   },
   {
    "value": "move-history",
    "label": "Move it to one history page",
    "description": "New docs/context/history-0.7.md, type: history, no map row.",
    "example": "One new page of about 500 words.",
    "tradeoff": "A page nobody reads by design."
   },
   {
    "value": "keep",
    "label": "Keep it where it is",
    "description": "Only false lines go.",
    "example": "Pages stay about the same size.",
    "tradeoff": "Agents read 0.7 lessons as current."
   }
  ],
  "recommendation": "You said all versions are tagged and archived; 0.7 was removed with zero trace.",
  "status": "clarified",
  "answer": "delete",
  "affected": [],
  "details": "Settles: about 14 lines."
 },
 {
  "id": "accept-testing-overhaul",
  "question": "Do you accept the nine testing-overhaul specs as shipped in 1.8.0?",
  "context": "All nine are in-review with no queue and no independent review. A read-only check against main found every criterion met except one unchecked: spec 6's \"dist/cli.js bytes unchanged\" rests on its commit message (dist is not tracked). Two deliberate changes: implement says \"read CI after each push\" (spec 1 says \"one time\"); revision.dirty can be null (spec 3 says boolean). Spec 8's GitHub-side removal is yours and was not checked. Suite: 231 passed, 10 s. To close them the runtime needs a queue: I write one, set the specs done, and record your words as a legacy acceptance in the feature folder.",
  "options": [
   {
    "value": "accept",
    "label": "Accept all nine as they are",
    "description": "Queue written, specs done, legacy acceptance with your words and the limits above.",
    "example": "The feature becomes ready to archive.",
    "tradeoff": "No independent review on record.",
    "recommended": true
   },
   {
    "value": "review",
    "label": "Review first",
    "description": "An independent reviewer reviews each spec before it is done.",
    "example": "Nine review reports, one session.",
    "tradeoff": "Time and tokens for code already in production."
   },
   {
    "value": "hold",
    "label": "Leave them in-review",
    "description": "No change.",
    "example": "status.mjs keeps listing them.",
    "tradeoff": "The feature cannot archive."
   }
  ],
  "recommendation": "The check found no gap that a review would change; the code is live.",
  "status": "clarified",
  "answer": "accept",
  "affected": [],
  "details": "Settles: 9 specs."
 },
 {
  "id": "cef-followups",
  "question": "Where do the canonical-entry-file follow-ups go?",
  "context": "Open after the owner override: spec 11's blocking finding (the reference puts a hold about one item on its guide; the brief says a hold stays in the entry file), 4 follow-ups on spec 1 (a missing --root reports clean; a test compares less than its check; trace finds no tests here; spec text older than code) and 8 on spec 11 (mostly cleanup reference wording, e.g. the check table lists 7 of 18 checks; \"archive mappings\" in the skill has nothing behind it). The three cuts you never reviewed one by one: per-project word baseline, nested CLAUDE.md check, CI gate on rule text. Separate: archive.mjs cannot archive this feature, because it reads the brief from a merge commit's first parent, which has none.",
  "options": [
   {
    "value": "backlog-plus-fix",
    "label": "One backlog item; fix archive.mjs now",
    "description": "Follow-ups and the three cuts go to one docs/backlog/ file; the reference keeps today's hold text (general hold in AGENTS.md, one-item hold on its guide). archive.mjs gets a spec and a fix in this session, then the feature archives.",
    "example": "1 backlog file + 1 bug fix PR.",
    "tradeoff": "The fix is a payload change that ships in a release.",
    "recommended": true
   },
   {
    "value": "backlog-only",
    "label": "Backlog everything, including the archive bug",
    "description": "Nothing is built now; the feature stays in docs/features.",
    "example": "1 backlog file.",
    "tradeoff": "cleanup.mjs keeps reporting it as unarchived."
   },
   {
    "value": "brief",
    "label": "A new brief now",
    "description": "Interview the follow-ups as a 1.8.x feature.",
    "example": "A brief with about 6 decisions.",
    "tradeoff": "A new feature for wording fixes."
   }
  ],
  "recommendation": "Most follow-ups are wording; the archive bug blocks every merged feature.",
  "status": "clarified",
  "answer": "backlog-plus-fix",
  "affected": [],
  "details": "Settles: 13 findings, 3 cuts, 1 bug."
 },
 {
  "id": "worktrees",
  "question": "Which old worktrees do I remove?",
  "context": "Seven linked worktrees, all clean, nothing unpushed. Five are fully in main: joycraft-1.2.2 (#93), joycraft-archive-dated-folder (#102), joycraft-backlog-archive (#107), joycraft-canonical-entry-file (#104), joycraft-claude-pages (#106), about 900 MB together. joycraft-canonical-entry-file holds an ignored, outdated release draft and review packets in docs/.joycraft/local/. Two hold open PRs: joycraft-code-mode (#103) and joycraft-session-end (#95). Removal is git worktree remove; the branches stay.",
  "options": [
   {
    "value": "five",
    "label": "Remove the five merged ones",
    "description": "git worktree remove on each; keep code-mode and session-end.",
    "example": "About 900 MB back.",
    "tradeoff": "The ignored local packets go with them.",
    "recommended": true
   },
   {
    "value": "five-copy",
    "label": "Copy the local packets, then remove the five",
    "description": "Copy docs/.joycraft/local/ of canonical-entry-file to the main checkout's ignored transcripts folder first.",
    "example": "Same, plus a copy.",
    "tradeoff": "Keeps files with no current use."
   },
   {
    "value": "none",
    "label": "Remove none",
    "description": "No change.",
    "example": "cleanup.mjs keeps 7 findings.",
    "tradeoff": "Disk stays used."
   }
  ],
  "recommendation": "Every commit in the five is in main.",
  "status": "clarified",
  "answer": "five",
  "affected": [],
  "details": "Settles: 7 trees.",
  "note": "but please contiously prune your committed, finished worktrees during session end, and session end should ALWAYS automatically run after a queue is complete"
 },
 {
  "id": "test-review-apply",
  "status": "clarified",
  "question": "Which test and CI changes do I make?",
  "answer": "all",
  "affected": [],
  "context": "The review above found T1 to T5 (T6 is your earlier decision and stays). Nothing changes until you choose. Each test deletion is its own commit with no code change; the full suite runs before and after. Nothing is committed without your yes.",
  "options": [
    {
      "value": "t1-t4",
      "label": "T1 to T4",
      "description": "Drop the duplicate main trigger; delete the 4 history tests, 4 redundant caps and the 1.5.0 change detector.",
      "example": "Merge CI: 2 suite runs, 1 matrix; 9 fewer tests.",
      "tradeoff": "Old field caps leave the suite.",
      "recommended": true
    },
    {
      "value": "all",
      "label": "T1 to T5",
      "description": "As above, and also drop the README sentence matches.",
      "example": "Also about 10 fewer assertions.",
      "tradeoff": "README wording is no longer pinned."
    },
    {
      "value": "tests-only",
      "label": "T2 to T4 only",
      "description": "Change the tests; leave CI as it is.",
      "example": "Merge CI stays at 3 suite runs.",
      "tradeoff": "CI minutes stay doubled."
    },
    {
      "value": "none",
      "label": "None",
      "description": "Keep everything.",
      "example": "No change.",
      "tradeoff": "—"
    }
  ],
  "recommendation": "T1 to T4 remove only repeats and history. T5 is a judgment about README wording."
}
]
---
# Feature intent

The owner asked for a full Joycraft cleanup of AGENTS.md and the context pages, then the test review; also to close the testing-overhaul specs, archive canonical-entry-file with its open questions, and check the seven old worktrees. Do not commit, publish or ask for API keys.

## Context and authorization

Cleanup reference: `.joycraft/references/cleanup.md` (one pass). The owner authorized edits to AGENTS.md and the pages; commits wait for his yes. Findings and recommendations: `findings.md` beside this brief.

## Scope and limits

No commit, no publish, no npm, no API keys. Rules change only by an answer here.

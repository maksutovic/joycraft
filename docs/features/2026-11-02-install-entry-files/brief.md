---
feature: install-entry-files
status: implemented
decisions: [
  {
    "id": "writer",
    "status": "clarified",
    "question": "Who writes the Joycraft lines into AGENTS.md and CLAUDE.md on install?",
    "answer": "custom",
    "options": [
      {
        "value": "cli-block",
        "label": "The CLI, every install and update",
        "description": "init and update write a marked Joycraft block. Same result on every host, no agent needed. The agent still fills the project's own context-map rows."
      },
      {
        "value": "agent-only",
        "label": "The agent, as today",
        "description": "Only setup.md tells the agent to add them. Today's install test shows this gets skipped."
      },
      {
        "value": "custom",
        "label": "Something else",
        "description": "Describe what you want instead.",
        "requiresNote": true
      }
    ],
    "affected": [
      "map-setup",
      "wiring-detection"
    ],
    "note": "both of these suggestions are insufficent: the CLI has no context or information what the project is, the agent DOES, the agent shoul very easily be able to write this after an interview with the user after they paste the installation prompt, setup.md is not sufficent there should be plenty of ways for the agent to see if joycraft instructions are embedded into AGENTS.md either automatically or by evoking some manual joycraft skill"
  },
  {
    "id": "map",
    "status": "clarified",
    "question": "What should the install do with the project's context map?",
    "answer": "rows-into-existing",
    "options": [
      {
        "value": "create-if-missing",
        "label": "Create one only if there is none",
        "description": "No map: add an empty `## Context Map` table with the Joycraft rows. Existing map: leave it alone; the Joycraft block links the Joycraft references."
      },
      {
        "value": "rows-into-existing",
        "label": "Also add rows to an existing map",
        "description": "Parse the user's table and append Joycraft rows. More reach, but it edits a user-owned table."
      },
      {
        "value": "custom",
        "label": "Something else",
        "description": "Describe what you want instead.",
        "requiresNote": true
      }
    ],
    "affected": [
      "map-setup"
    ],
    "note": "this is the most critical part of joycraft, without it or a good understanding of how it works, this library is useless, your approach feels like you don't quite understand the context map or are unsure of it's use or how to use it, you must confirm with me you understand this and it's power, otherwise we need to redesign by scratch and exhaustive interview"
  },
  {
    "id": "claude",
    "status": "clarified",
    "question": "How should CLAUDE.md reach AGENTS.md when Claude Code is a selected host?",
    "answer": "import-line",
    "options": [
      {
        "value": "import-line",
        "label": "Add `@AGENTS.md` at the top",
        "description": "Create CLAUDE.md as the import pointer if it is missing; add the import to an existing one only if it has no equivalent. User content stays below."
      },
      {
        "value": "own-block",
        "label": "Put a copy of the Joycraft block in CLAUDE.md",
        "description": "Works without the import, but two copies can drift (the 2026-07-16 decision rejected this)."
      },
      {
        "value": "custom",
        "label": "Something else",
        "description": "Describe what you want instead.",
        "requiresNote": true
      }
    ],
    "affected": [
      "claude-import"
    ]
  },
  {
    "id": "trim",
    "status": "clarified",
    "question": "How far should Joycraft go with an AGENTS.md that is already too long?",
    "answer": "report-and-propose",
    "options": [
      {
        "value": "report-and-propose",
        "label": "Report it, propose moves, apply on your yes",
        "description": "cleanup flags it; the cleanup skill proposes moving file tables, folder trees and workflow sections to a linked context page. Rules are never touched."
      },
      {
        "value": "report-only",
        "label": "Report it only",
        "description": "cleanup flags size and dead pointers; the user trims by hand."
      },
      {
        "value": "custom",
        "label": "Something else",
        "description": "Describe what you want instead.",
        "requiresNote": true
      }
    ],
    "affected": [
      "doc-audit"
    ]
  },
  {
    "id": "release",
    "status": "clarified",
    "question": "Which version ships this?",
    "answer": "1.1.2",
    "options": [
      {
        "value": "1.2.0",
        "label": "1.2.0",
        "description": "Install now writes to user files, so a minor version and a CHANGELOG entry that says so."
      },
      {
        "value": "1.1.2",
        "label": "1.1.2",
        "description": "Treat it as a fix for the 1.0 regression."
      },
      {
        "value": "custom",
        "label": "Something else",
        "description": "Describe what you want instead.",
        "requiresNote": true
      }
    ],
    "affected": [
      "release"
    ]
  },
  {
    "id": "docclean",
    "status": "clarified",
    "question": "How should David's doc-cleanup come into Joycraft?",
    "answer": "merge",
    "options": [
      {
        "value": "merge",
        "label": "Make it Joycraft's cleanup method",
        "description": "joycraft-cleanup follows doc-cleanup's five phases and six rot patterns, with cleanup.mjs as the fast evidence pass and the context-map checks added. MIT notice and credit to aka-luan and David in the skill and README."
      },
      {
        "value": "ship-beside",
        "label": "Ship its SKILL.md unchanged beside joycraft-cleanup",
        "description": "Vendored as-is with its license. Two cleanup skills; the agent must pick between them."
      },
      {
        "value": "opt-in",
        "label": "Offer it as an opt-in install",
        "description": "Like Doc Detective: npx skills add aka-luan/doc-cleanup on the user's yes. Nothing to maintain, but most users never get it."
      },
      {
        "value": "custom",
        "label": "Something else",
        "description": "Describe what you want instead.",
        "requiresNote": true
      }
    ],
    "affected": [
      "doc-audit"
    ]
  },
  {
    "id": "audit-on-setup",
    "status": "clarified",
    "question": "In an existing project, when does the doc audit first run?",
    "answer": "during-setup",
    "options": [
      {
        "value": "during-setup",
        "label": "During setup, before the map is written",
        "description": "The inventory gives every doc a role (entry, required, reference, historical); that becomes the first map. Findings are reported; edits wait for the user's yes."
      },
      {
        "value": "after-setup",
        "label": "Offered after setup",
        "description": "Setup writes the map from the interview; the agent then offers an audit."
      },
      {
        "value": "custom",
        "label": "Something else",
        "description": "Describe what you want instead.",
        "requiresNote": true
      }
    ],
    "affected": [
      "map-setup",
      "doc-audit",
      "context-skill"
    ],
    "note": "basically anytime after installation from a prompt, the user should go through some sort of interview to gather more context about the project from the user, as alot of folks will use this with existing projects, sometimes huge ones. We probably need to document an evokable joycraft skill as well that can add/remove context etc... i think we may already have this?"
  },
  {
    "id": "growth",
    "status": "clarified",
    "question": "How should session end grow the map?",
    "answer": "route-and-row",
    "options": [
      {
        "value": "route-and-row",
        "label": "Route each fact to its home and add or update its row",
        "description": "Every reusable decision, trap or reference lands in one home with a read-when row. Today session end updates only an existing reference and says not to build a global map."
      },
      {
        "value": "propose",
        "label": "Propose rows; add them on the user's yes",
        "description": "Safer for shared repos; slower to compound."
      },
      {
        "value": "custom",
        "label": "Something else",
        "description": "Describe what you want instead.",
        "requiresNote": true
      }
    ],
    "affected": [
      "map-growth",
      "doc-audit"
    ],
    "note": "the key per david's comments as well is making sure we address drift/slop -- we need the archive of course to double check regressions, but we don't want to accidently write regressions into context, essentially when an agent starts fresh from a compaction, new session etc... it should see what the current state of play is as the source of truth, not have to climb 100 steps through each decision of how we got to today does that make sense?"
  }
]
---
# Joycraft builds and keeps the context map

The context map is the core of Joycraft. AGENTS.md is loaded every session, so it
holds only the boundaries and the map. Each row points to one home for one kind of
project knowledge and says when to read it. The agent reads only what the current
work needs, and the map grows with every decision, trap and finished feature. A
project without a real map gets nothing from Joycraft.

Today, installing into an existing project leaves AGENTS.md and CLAUDE.md
unchanged, and nothing reliably makes the agent build the map. This feature makes
the agent build the map after install, keep it growing, and keep it true. It also
brings in David's doc-cleanup method for keeping it true.

## Context and authorization

- **Max (2026-11-02):** "we have to update the file when a user installs it in an
  existing project so it knows about the context map and skills!" and "let's
  redesign the brief and include doccleanup as well from david".
- **Answered on the decision page (2026-11-02):**
  - `writer`: Something else. The CLI has no project context and the agent does.
    The agent writes the entry files after an interview, following the install
    prompt. There should be several ways to see whether the Joycraft instructions
    are in AGENTS.md: automatic checks and a skill the user can call by hand.
  - `map`: add rows to an existing map. The map is "the most critical part of
    joycraft".
  - `claude`: CLAUDE.md imports AGENTS.md with `@AGENTS.md`.
  - `trim`: report, propose moves, apply on the user's yes.
  - `release`: 1.1.2.
- **Regression, observed 2026-11-02:** `init . --harness claude,codex --yes` on a
  project with AGENTS.md and CLAUDE.md wrote 83 files and changed neither. `update`
  from 1.0.0 to 1.1.1 also left AGENTS.md unchanged.
- **doc-cleanup:** https://github.com/aka-luan/doc-cleanup (MIT, one SKILL.md),
  sent by David Moshal. It audits Markdown for six rot patterns: completed-work
  logs, executed plans, contradictions, stale claims, dead paths and authority
  drift. It checks every claim against the code, reports, stops for approval, then
  archives history and rewrites live docs to current facts, keeping traps and
  hard rules.
- **Earlier decisions this keeps:** lean entry file plus a context map
  (2026-05-21); AGENTS.md is the shared file and CLAUDE.md imports it (2026-07-16);
  never destroy user content (2026-03-23).
- **Discovery:** `docs/discoveries/2026-11-02-cleanup-misses-agents-md-drift.md`
  (PR #87). `cleanup.mjs` found nothing wrong with a 1,600-word AGENTS.md.

## Goals

## map-setup

After every install from the prompt, the agent builds the map from the project,
not from a template (`writer`, `map`, `audit-on-setup`). Many users install into
existing, sometimes huge, projects, so the interview is part of every install, not
only a new project's kickoff. The install prompt's step 3 leads into it. The
agent:
1. Reads the existing entry files, README and docs, and gives each doc a role:
   entry, required, reference or historical. In a large repo it reads the entry
   docs and their pointers first, then works area by area, and says what it has
   not read yet.
2. Interviews the user for what the repo cannot tell: purpose, users, who owns
   what, constraints, decisions already made, and which docs are trusted. It runs
   the doc audit during setup (doc-audit) and asks about what it finds.
3. Writes or extends AGENTS.md:
   - the Joycraft lines (skills exist, update check first, rendered documents)
   - a `## Context Map` with one row per real home and a read-when tied to real
     work
   - in an existing map, new rows below the user's rows, which stay unchanged
4. Creates context homes only when it has content for them.
5. Shows the AGENTS.md diff on a rendered page and applies it on the user's yes.

**Done when:**
- A fixture project with docs and an existing AGENTS.md (no map) ends with a map
  whose rows point at its real docs, each with a read-when. Every user line is
  kept.
- A fixture with an existing map keeps every user row byte for byte and gains only
  rows for homes that exist.
- No row points at a missing file. No empty context file is created.
- Running setup again with nothing new makes no change and asks nothing.

## wiring-detection

Joycraft notices a project whose AGENTS.md is not wired up, in more than one place.
Not wired up means: no Joycraft lines, no context map, a map with no project rows,
or (with Claude Code selected) CLAUDE.md that does not import AGENTS.md.
- `init` and `update` report it in their last lines and print the sentence to give
  the agent ("Set up Joycraft's context map"). The CLI does not edit the files.
- `doctor` reports it as a finding.
- `joycraft-entry` checks it at the start of any Joycraft work and runs setup
  first.
- A user can ask by hand ("set up Joycraft", "check the context map") and the
  skill description matches those words.

**Done when:** each of the four places reports an unwired fixture and stays
quiet on a wired one.

## claude-import

With Claude Code selected, setup makes CLAUDE.md import AGENTS.md (`claude`):
- A missing CLAUDE.md becomes `@AGENTS.md` plus an empty `## Claude Code` section.
- An existing CLAUDE.md with no import gets `@AGENTS.md` as its first line. All
  other content stays.
- An existing import is left alone. No cycle is created.

## map-growth

The map compounds (`growth`). At session end, each reusable fact goes to its one
home: a decision with its reason, a trap, a reference or a production fact. A new
home gets a map row; a changed home keeps its row and its read-when stays true.
Feature intent stays in the brief.

The homes say what is true now. An agent that starts fresh, after a compaction or
in a new session, reads the current state as the source of truth. It never has to
replay a chain of decisions to learn how things are today (Max, with David's
point on drift). So:
- A changed fact is rewritten in place. No dated addenda, no "superseded by" notes
  in live text, no stale table corrected by a footnote.
- The reason and the rejected options go to the decision log. Finished work and
  old versions go to the archive, where they remain for regression checks. The
  archive is never read as current truth.
- Nothing from the archive or an old decision is written back into a live home
  without checking it against the code (no regressions written into context).

**Done when:**
- A session that records a new decision and a new trap ends with both in their
  homes, and the map reaches both.
- A session that changes an existing fact leaves one current statement in its
  home, with the reason in the decision log and no addendum.
- A session with nothing reusable changes no context file.

## context-skill

The user can add, change or remove project context by asking ("add this to the
project context", "forget that rule", "what does the map say about billing"). 1.x
has no skill for this: `joycraft-context` only finds context, and the 0.7 skills
(`joycraft-add-context`, `joycraft-add-fact`, `joycraft-gather-context`) did not
come into 1.0. This skill (or `joycraft-context`, extended) routes the change to
its one home, updates the map row, and shows the diff before writing. Its
description uses the words people say, so it is picked without being named.

**Done when:**
- "Add: we deploy on Fridays only" lands in its home with a map row.
- "Remove the rule about Fridays" deletes it from the live home, leaves the
  reason in the decision log, and leaves the map with no dangling row.
- A meeting note or screenshot given to the agent becomes the facts it contains,
  each in its home.

## doc-audit

Joycraft keeps the map and its homes true, using David's doc-cleanup method
(`docclean`, `trim`):
- **Find (`cleanup.mjs`, mechanical evidence):** the existing checks plus
  `missing-path` (a backticked path that does not exist), `unmapped` (a context
  page that no entry file links) and `entry-size` (an entry file over its word
  budget; default 1,000 words, set with `cleanup.entryWords` in `joycraft.yaml`).
- **Judge (the skill):** the six rot patterns, each checked against the code.
  Moves file tables, folder trees, workflows and walkthroughs out of AGENTS.md
  into a linked home. Keeps rules, traps and vocabulary.
- **Act:** report worst-first, stop for approval, archive history, rewrite live
  docs as current facts, verify links, offer a docs-only commit.
- **When:** during setup in an existing project (`audit-on-setup`), after a feature
  is archived, and when asked ("clean up the docs").
- **Credit:** MIT notice and credit to aka-luan and David Moshal.

**Done when:**
- On this repo's AGENTS.md from before PR #87, cleanup reports the dead
  `docs/context/reference/` pointer, `shipped.md`, `anchors.md` and the size.
- An agent following the skill proposes about the moves made in PR #87, and
  leaves ALWAYS, ASK FIRST and NEVER byte-identical.
- Nothing is edited before the user approves.

## update-notice

The update prompt must reach the user and describe the jump correctly. Found on
2026-11-02 by installing 1.0.0 and updating to 1.1.1:
- The check runs only if the agent picks `joycraft-entry` or AGENTS.md has the
  first-action line, and install writes neither (see wiring-detection).
- `updateKind` calls every same-major jump `patch`: 1.0.0 → 1.1.1 said "patch".
- The message gives only the newest release's summary.
- `auto-safe` applies a `patch`, so the label bug can apply a minor release.

**Done when:**
- A wired project at 1.0.0 shows the `ask` at the start of a fresh session in
  Claude Code and Codex.
- 1.0.0 → 1.1.1 reports `minor`, 1.1.0 → 1.1.1 `patch`, 1.x → 2.0 `migration`.
- The message covers each release since the installed one and links the CHANGELOG.
- `auto-safe` applies only a `patch`.
- Unchanged: not now, turn off, pin, update with backups, `doctor`, `--recover`.

## custom-answer

Every decision-page question offers "Something else" (value `custom`, note
required), whether or not the brief declares it. Built on joycraft-prototype
branch `field/1.2-custom-answer`.

**Done when:** a two-option decision shows three choices; "Something else" with
no note is refused; with a note the brief records `answer: "custom"` and the note.

## artifact-note-edit

Max (2026-11-02): "once i save an answer, i can no longer add a note". A saved
(clarified) decision turns its note box and save button off. A note must be
addable and re-savable at any time; changing the chosen answer can still need a
reopen.

**Done when:** on a clarified decision the note box stays on, "Save this
response" saves a changed note, the status and answer stay the same, and the
brief records the new note.

## artifact-conflict

Max (2026-11-02): "the buttons seem not to work". The brief changed after the page
loaded, so the save got a 409. The page turned off every save button until "I
reviewed the updated source" was clicked. Clicking an option replaced the
explanation with "Unsaved changes.", so nothing said why.

**Done when:** after a source change, the page says which questions changed and
keeps that message until it is handled. A disabled save button says why. Answers
to unchanged questions are kept and can be saved without a re-review step.

## release

Ships as 1.1.2 (`release`). The CHANGELOG says what setup now writes and how the
user approves it, and credits doc-cleanup. The README context-map section and
install prompt match.

## Agent work and pending choices

Can start now: the failing install-to-setup fixture; the three cleanup checks;
the update-notice fixes; the artifact-conflict fix.

All decisions are answered. Next: decompose into specs.

## Scope and limits

- The CLI never writes AGENTS.md or CLAUDE.md. It detects and reports.
- No 0.7 section merger comes back. Setup edits by adding rows and lines and shows
  the diff first.
- Out of scope: the 2.0 Feature/Spec/Task rename.

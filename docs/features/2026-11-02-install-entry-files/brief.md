---
feature: install-entry-files
status: draft
decisions: [
  {"id":"writer","status":"open","question":"Who writes the Joycraft lines into AGENTS.md and CLAUDE.md on install?","answer":null,"options":[{"value":"cli-block","label":"The CLI, every install and update","description":"init and update write a marked Joycraft block. Same result on every host, no agent needed. The agent still fills the project's own context-map rows."},{"value":"agent-only","label":"The agent, as today","description":"Only setup.md tells the agent to add them. Today's install test shows this gets skipped."},{"value":"custom","label":"Something else","description":"Describe what you want instead.","requiresNote":true}],"affected":["entry-block","claude-import"]},
  {"id":"map","status":"open","question":"What should the install do with the project's context map?","answer":null,"options":[{"value":"create-if-missing","label":"Create one only if there is none","description":"No map: add an empty `## Context Map` table with the Joycraft rows. Existing map: leave it alone; the Joycraft block links the Joycraft references."},{"value":"rows-into-existing","label":"Also add rows to an existing map","description":"Parse the user's table and append Joycraft rows. More reach, but it edits a user-owned table."},{"value":"custom","label":"Something else","description":"Describe what you want instead.","requiresNote":true}],"affected":["entry-block"]},
  {"id":"claude","status":"open","question":"How should CLAUDE.md reach AGENTS.md when Claude Code is a selected host?","answer":null,"options":[{"value":"import-line","label":"Add `@AGENTS.md` at the top","description":"Create CLAUDE.md as the import pointer if it is missing; add the import to an existing one only if it has no equivalent. User content stays below."},{"value":"own-block","label":"Put a copy of the Joycraft block in CLAUDE.md","description":"Works without the import, but two copies can drift (the 2026-07-16 decision rejected this)."},{"value":"custom","label":"Something else","description":"Describe what you want instead.","requiresNote":true}],"affected":["claude-import"]},
  {"id":"trim","status":"open","question":"How far should Joycraft go with an AGENTS.md that is already too long?","answer":null,"options":[{"value":"report-and-propose","label":"Report it, propose moves, apply on your yes","description":"cleanup flags it; the cleanup skill proposes moving file tables, folder trees and workflow sections to a linked context page. Rules are never touched."},{"value":"report-only","label":"Report it only","description":"cleanup flags size and dead pointers; the user trims by hand."},{"value":"custom","label":"Something else","description":"Describe what you want instead.","requiresNote":true}],"affected":["cleanup-checks","trim-rule"]},
  {"id":"release","status":"open","question":"Which version ships this?","answer":null,"options":[{"value":"1.2.0","label":"1.2.0","description":"Install now writes to user files, so a minor version and a CHANGELOG entry that says so."},{"value":"1.1.2","label":"1.1.2","description":"Treat it as a fix for the 1.0 regression."},{"value":"custom","label":"Something else","description":"Describe what you want instead.","requiresNote":true}],"affected":["release"]}
]
---
# Install writes the entry files

On install into an existing project, Joycraft must update `AGENTS.md` and
`CLAUDE.md` so every agent session knows the skills and the context map exist.
Also, Joycraft must be able to bring an existing, too-long `AGENTS.md` back to a
lean context map, as it was done by hand in PR #87.

## Context and authorization

- **Max (2026-11-02):** "we have to update the file when a user installs it in an
  existing project so it knows about the context map and skills!"
- **Regression, observed 2026-11-02:** `init . --harness claude,codex --yes` on a
  project with `AGENTS.md` and `CLAUDE.md` wrote 83 files and changed neither.
  The 1.x CLI (`src/cli.ts`) imports only `install-v1`, `legacy-07`, `rollback`
  and `payload`. The 0.7 writers (`agents-md.ts`, `improve-claude-md.ts`) are no
  longer reached. Today only `setup.md` tells the agent to add the lines.
- **Earlier decisions this restores:** lean entry file plus `## Context Map`
  (2026-05-21); AGENTS.md is the shared file and CLAUDE.md is the `@AGENTS.md`
  import (2026-07-16); never destroy user content (2026-03-23).
- **Discovery:** `docs/discoveries/2026-11-02-cleanup-misses-agents-md-drift.md`
  (in PR #87). `cleanup.mjs` found nothing wrong with a 1,600-word AGENTS.md.

## Goals

## entry-block

`init` and `update` write a marked block to `AGENTS.md`
(`<!-- joycraft:start -->` … `<!-- joycraft:end -->`). If there is no AGENTS.md,
they create it. The block says that the Joycraft skills exist, gives the
update-check line and the rendered-documents line, and links
`.joycraft/references/artifacts.md`. Joycraft owns only the text between the
markers.

**Done when:**
- An existing AGENTS.md (`# My App\n\nSome rules.\n`) keeps its bytes and gains
  the block once. A second `init` or `update` changes nothing.
- A newer payload rewrites only the text inside the markers. User edits outside
  the markers survive.
- `rollback` and the 0.7 migration restore the file byte for byte.
- `--plan --json` lists the AGENTS.md change before it is applied.
- The block has no links to files that do not exist.

## claude-import

When Claude Code is a selected host, CLAUDE.md reaches AGENTS.md. Done when:
- A missing CLAUDE.md is created as `@AGENTS.md` plus an empty `## Claude Code`
  section.
- An existing CLAUDE.md with no import gets `@AGENTS.md` as its first line. All
  other content stays.
- An existing import is left alone. No import cycle is created.

## cleanup-checks

`cleanup.mjs` gets three checks, written in joycraft-prototype and re-vendored:
- `missing-path`: a backticked project path in an entry file or a context page
  that does not exist. Placeholders such as `<slug>` and globs are skipped.
- `unmapped`: a context page that no entry file links. A mention from another
  context page does not count.
- `entry-size`: an entry file over a word budget. The default budget is 1,000
  words; `joycraft.yaml` `cleanup.entryWords` changes it.

**Done when:** run on this repo's AGENTS.md from before PR #87, cleanup reports
the `docs/context/reference/` pointer, `shipped.md`, `anchors.md` and the size.

## trim-rule

The cleanup skill and `setup.md` describe the trim. It proposes moving file
tables, folder trees, workflow sections and code walkthroughs into a linked
context page. Boundaries and rules are never moved or reworded. Each move is
shown on a rendered page and applied only on the user's yes.

**Done when:** an agent following the skill on a copy of the pre-#87 AGENTS.md
proposes about the same moves as PR #87, and leaves ALWAYS, ASK FIRST and NEVER
byte-identical.

## update-notice

The update prompt must reach the user and describe the jump correctly. Found on
2026-11-02 by installing 1.0.0 and updating to 1.1.1:
- The check runs only if the agent picks `joycraft-entry` or AGENTS.md has the
  first-action line. Install writes neither (see entry-block), so in an existing
  project the user may never be asked.
- `updateKind` calls every same-major jump `patch`: 1.0.0 → 1.1.1 said "patch".
- The message gives only the latest release's summary, so a 1.0.0 user hears the
  1.1.1 fixes and nothing about the 1.1.0 features.
- `auto-safe` applies a release when its kind is `patch` and the latest release
  is marked safe. With the bug above, that can apply a minor release.

**Done when:**
- A project installed at 1.0.0 (with the entry block) prints the `ask` JSON at
  the start of a fresh session in Claude Code and Codex.
- 1.0.0 → 1.1.1 reports `minor`; 1.1.0 → 1.1.1 reports `patch`; 1.x → 2.0
  reports `migration`.
- The message names each release since the installed one, or says how many, and
  links the CHANGELOG.
- `auto-safe` applies only a `patch` jump.
- Unchanged and already correct: not now (snooze 7 days), turn off, pin,
  update with backups, `doctor`, and `--recover`.

## custom-answer

Max (2026-11-02): the decision page had no way to answer "none of these". Every
question now offers "Something else" (value `custom`, note required), whether or
not the brief declares it. Built on joycraft-prototype branch
`field/1.2-custom-answer`; ships with this release.

**Done when:** a decision with two options shows three on the page; saving
"Something else" without a note is refused; with a note, the brief records
`answer: "custom"` and the note.

## release

The CHANGELOG says plainly that install now edits AGENTS.md and CLAUDE.md, and
how to undo it. The README "What Joycraft is" section matches the new behavior.

## Agent work and pending choices

Work that can start now, whatever the decisions:
- A failing install test for the regression.
- The three cleanup checks in joycraft-prototype.

Work blocked until the decisions are made:
- The block format and the map behavior wait on `writer` and `map`.
- CLAUDE.md handling waits on `claude`.
- The skill text waits on `trim`.

## Scope and limits

- Out of scope: the project's own context-map rows. The agent adds those during
  setup from real project knowledge; the CLI never invents them.
- Out of scope: bringing back the 0.7 section merger (`improve-claude-md.ts`).
  The block uses fixed markers, not section parsing.
- Out of scope: the 2.0 Feature/Spec/Task rename.

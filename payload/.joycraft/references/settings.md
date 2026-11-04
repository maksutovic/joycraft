# Settings by request

The user never edits Joycraft settings or runs Joycraft commands by hand. They
say what they want; you make the change, show it, and check it.

## `joycraft.yaml`

The file is the user's. Joycraft only reads it. Change it only when the user asks,
and keep their comments and order. Map plain requests to settings:

| The user says | Setting |
|---|---|
| "Keep briefs and specs in `working/features`" | `paths.features` |
| "Put finished features in `working/archive`" | `paths.archive` |
| "Our project knowledge lives in `knowledge/`" | `paths.context` |
| "After each feature is archived, sync our wiki" / "run `<command>`" | `hooks.afterArchive` |
| "This page describes `src/auction`" / "flag the auction page when that code changes" | `cleanup.impact` |
| "Let AGENTS.md be up to 1500 words" | `cleanup.entryWords` |

1. Read `joycraft.yaml`. If it does not exist, start from
   `.joycraft/templates/joycraft.yaml` and keep only the settings the user changes.
2. For `hooks.afterArchive`, find the command in the project first: a wiki or doc
   script, a `package.json` script, or the tool the user named. If none exists, ask
   what should run; do not write a script unless the user asks for one. The command
   gets `JOYCRAFT_FEATURE`, `JOYCRAFT_ARCHIVE_PATH` and `JOYCRAFT_SOURCE_PATH`.
3. For `cleanup.impact`, check that each `docs` page exists and each `source` glob
   matches files.
4. Moving `paths.*` does not move existing files. Say which folders hold files now,
   and offer to move them in the same change.
5. Show the change as a short diff and write it on the user's yes.
6. Run `node .joycraft/runtime/config.mjs`. If it stops, fix the file and run it
   again. Tell the user the settings now in effect, in one or two lines.

To answer "what are my Joycraft settings?", run `config.mjs` and say what differs
from the defaults.

## A wiki the user keeps

Joycraft has no wiki of its own, and it works with one. When the user mentions their
wiki, offer two things: a context-map row that says when to read it, and an
`afterArchive` command that updates it when a feature is archived (above). In a doc
audit, the wiki is a context home; `paths.features` and `paths.archive` are
working material and history, not current knowledge.

## Remove Joycraft

On "uninstall Joycraft" or "remove Joycraft":

1. Read `.joycraft/installation.json`. Its `files` list holds each installed path
   and the `sha256` it had at install.
2. Show the user what goes: the listed files, with each file whose bytes changed
   since install marked as edited, and `.joycraft/` itself. Say what stays:
   `AGENTS.md`, `CLAUDE.md`, `docs/` and `joycraft.yaml` are theirs.
3. Offer to remove the Joycraft lines from `AGENTS.md` and `CLAUDE.md` (the context
   map rows that point into `.joycraft/`, and the Joycraft rules). Show that diff
   separately.
4. On the user's yes, delete the files, then `.joycraft/`. Do not commit.

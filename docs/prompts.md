# Prompts

Paste one of these into your coding agent, in your project. Each one has the agent look
first, report to you, and change nothing until you say so.

## Install

```text
Install Joycraft in this project.
1. Run `npx joycraft@latest init . --plan --json`. Show me the files it will add in a short table. Do not change anything yet.
2. Ask me which coding agents I use in this project (default: you). Then run
   `npx joycraft@latest init . --harness <agents> --yes`.
   If it finds Joycraft 0.7, stop and show me its migration plan.
3. Use the joycraft-entry skill to set up this project. If the project is new or empty,
   ask me what I want to build.
4. Run `node .joycraft/runtime/review-tools.mjs plan --root .`. Tell me which tools
   you need to check your own work, which ones I have, and which ones are missing.
   Ask me before you install anything.
Do not commit, publish, or ask me for API keys.
```

## Upgrade from 0.7

```text
Upgrade this project from Joycraft 0.7 to 1.0. Go one step at a time.
1. Run `git status`. If there are uncommitted changes, tell me and stop, so I can
   commit them first.
2. Run `npx joycraft@latest update .`. On a 0.7 project this changes nothing. It shows
   the migration plan. Show me the plan in short lists: what it will archive, which
   Joycraft files I changed, and what stays.
3. If I changed any Joycraft files, ask me one question: keep them in place, or
   archive them? Archived files are moved to a backup folder, not deleted.
4. Wait until I say go. Then run
   `npx joycraft@latest update . --migrate --keep-custom --yes` if I chose keep, or
   `npx joycraft@latest update . --migrate --archive-custom --yes` if I chose archive
   or changed no files.
5. Run `npx joycraft@latest doctor .` and tell me the result.
6. Run `node .joycraft/runtime/review-tools.mjs plan --root .`. Tell me which tools
   you need to check your own work, which ones I have, and which ones are missing.
   Ask me before you install anything.
7. Tell me that `npx joycraft@latest rollback --yes` undoes the upgrade.
Do not commit, publish, or ask me for API keys.
```

## Send feedback

```text
Help me send feedback about Joycraft.
1. Run `npx joycraft@latest doctor .` and note the Joycraft version.
2. Ask me what happened, what I expected, and which host I use.
3. Draft a short GitHub issue for https://github.com/maksutovic/joycraft/issues with
   those facts and no private project details. Show it to me; I will post it myself.
Do not post anything, commit, or ask me for API keys.
```

# Prompts

Paste one of these into your coding agent, in your project. Each one has the agent look
first, report to you, and change nothing until you say so. You never need to run a
Joycraft command yourself; your agent runs them.

## Install

```text
Install Joycraft in this project.
1. Run `npx joycraft@latest init . --plan --json`. Show me the files it will add in a short table. Do not change anything yet.
2. Ask me which coding agents I use in this project (default: you). Then run
   `npx joycraft@latest init . --harness <agents> --yes`.
   If it finds Joycraft 0.7, stop and show me its migration plan.
3. Use the joycraft-entry skill to set up Joycraft's context map. Read the project's
   docs, interview me about what the repo cannot tell you, then show me the
   AGENTS.md and CLAUDE.md changes on a page before you write them. If the project
   is new or empty, ask me what I want to build.
4. Show me the review loop that setup found: for each package, the tool that
   checks it and what that tool can show. If setup did not do this, run
   `node .joycraft/runtime/review-tools.mjs plan --root .`. Ask me before you
   install anything.
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

## Stay on 0.7

```text
Keep this project on Joycraft 0.7. Update it to the newest 0.7 release only
(`npx joycraft@0.7.17 update`), show me what changed, and do not migrate to 1.0.
Do not commit, publish, or ask me for API keys.
```

## Undo the 1.0 upgrade

```text
Undo this project's upgrade to Joycraft 1.0. Run `npx joycraft@latest rollback` and
show me what it will put back. Wait until I say go, then run it again with `--yes`.
Do not commit, publish, or ask me for API keys.
```

## Update

```text
Check for a Joycraft update. If there is one, run
`npx joycraft@latest update . --plan --json`, show me what changes, and update on my yes.
Do not commit, publish, or ask me for API keys.
```

To stop or change the daily update check, say "Turn off Joycraft update checks",
"Update Joycraft patches automatically" or "Stay on this Joycraft version".

## Check the install

```text
Check my Joycraft install. Run `npx joycraft@latest doctor .` and
`node .joycraft/runtime/wiring.mjs --root .`, tell me the result in plain words, and
offer to fix what is wrong.
Do not commit, publish, or ask me for API keys.
```

## Change settings

Joycraft works with no settings. Say what you want and the agent edits
`joycraft.yaml`, shows you the change, and checks it. Keep the lines you want:

```text
Change these Joycraft settings, and show me the change before you write it:
- Keep Joycraft's briefs and specs in working/features, and finished features in working/archive.
- Whenever a feature is archived, run our wiki sync script.
- The page docs/context/auction-rules.md describes src/auction. Flag it when that code changes.
Do not commit, publish, or ask me for API keys.
```

Ask "What are my Joycraft settings?" to see what is in effect.

## Connect your wiki

```text
We keep a wiki in <where>. Link it from the context map, and keep it up to date
each time a feature is archived.
Do not commit, publish, or ask me for API keys.
```

## Clean up the workspace

```text
Clean up the docs and the workspace: stale specs, unarchived features, old worktrees
and context pages that no longer match the code. Show me the findings before you change anything.
Do not commit, publish, or ask me for API keys.
```

## Uninstall

```text
Remove Joycraft from this project. Show me which files go and which stay, and wait
until I say go.
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

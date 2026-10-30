# Prompts

Paste one of these into your coding agent, in your project. Each one has the agent look
first, report to you, and change nothing until you say so.

## Install

```text
Install Joycraft in this project.
1. Run `npx joycraft@latest init . --plan --json` and show me the plan in a short table. Change nothing yet.
2. Ask me which hosts to install for (default: the one you are), then run
   `npx joycraft@latest init . --harness <hosts> --yes`.
   If it reports a Joycraft 0.7 install instead, stop and show me its migration plan.
3. Use the joycraft-entry skill to set up this project. If the project is new or empty,
   offer me the kickoff so I can tell you what I want to build.
4. Run the review-loop plan from the setup step. Show me which verification tools are
   present or missing, and ask before installing anything.
Do not commit, publish, or ask me for API keys.
```

## Upgrade from 0.7

```text
Upgrade this project from Joycraft 0.7 to 1.0.
1. Run `npx joycraft@latest update .` (it changes nothing on a 0.7 project) and show me
   the migration plan: what is archived, which customized files it found, and what stays.
2. For each customized file, ask me: keep it in place or archive it.
3. After I say go, run `npx joycraft@latest update . --migrate --keep-custom --yes` if I
   kept any, else `npx joycraft@latest update . --migrate --archive-custom --yes`.
   Then run `npx joycraft@latest doctor .` and tell me the result.
4. Run the review-loop plan from the joycraft-entry setup step. Show me which
   verification tools are present or missing, and ask before installing anything.
5. Tell me that `npx joycraft@latest rollback --yes` undoes the migration.
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

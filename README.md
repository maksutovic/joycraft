# Joycraft

<p align="center">
  <img src="docs/joycraft-banner.png" alt="Joycraft, the craft of AI development" width="700" />
</p>

Joycraft helps your coding agent do larger work without losing track. You say what
you want. The agent writes it down, splits it into small steps, and builds each step
with tests. Then a second agent checks each step before it counts as done.

## Install: paste this into your coding agent

Open your coding agent in your project (Claude Code, Codex, Pi, Oh My Pi, GitHub
Copilot CLI or OpenCode) and paste:

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

**Upgrading from 0.7?** Nothing changes until you choose. On a 0.7 project,
`npx joycraft@latest update .` shows the migration plan and stops. Read
[Migrating from 0.7](docs/migrating-from-0.7.md), or paste the
[upgrade prompt](docs/prompts.md#upgrade-from-07). To stay on 0.7:
`npx joycraft@0.7.17 update`.

## How to use it

After the install, talk to your agent as usual. Joycraft takes over when the work is
bigger than one quick change:

1. **You say what you want.** The agent asks a few questions. Then it writes a short
   brief that ends with "Done when": the result you will accept. You approve it.
2. **The agent splits the brief into specs.** A spec is one small step that it can
   build and test alone.
3. **The agent builds each spec with tests.**
4. **A second agent checks each spec.** It did not write the code. It reads the spec,
   runs the checks, and says PASS or FAIL. Only a PASS completes the spec. For a
   screen or page, it looks at the real result in a browser or simulator, if you
   installed those tools in step 4 of the install.
5. **The agent wraps up.** It records what it learned for the next session.

On a new, empty project, the agent first asks what you want to build. It writes your
answers to `docs/context/project.md`. It does not choose a stack or write app code at
this step.

## The context map: your project's memory

`AGENTS.md` holds a short context map. Each line links one project document and
says when to read it. The documents live in `docs/context/`: what the project is,
who it is for, the decisions you made and why. Before each piece of work, the agent
uses the map to find the documents and the code that apply.

The map grows with the project:

- **New facts go to one home.** When you decide something, the agent records it in
  the decision log. It updates an existing document; it does not make a copy.
- **Finished work becomes history.** A completed feature moves to `docs/archive/`.
  The agent can check it later to catch a regression.
- **Mistakes become lessons.** When the checking agent fails a spec, the cause can
  become a short note for the next agent.
- **Ideas for later stay visible.** A choice you put off is marked "backlogged". It
  stays out of the current work, but it is not lost.

You can feed it too. Give your agent meeting notes, a photo of a whiteboard or a
screenshot, and ask it to add what matters to the project context. This gives the
agent both views: the whole project and the detail of the current step.

## Answering questions: the decision page

When the agent needs you to choose between options, it shows the questions on a
decision page instead of in chat. Each question shows its context, its options and
what it affects. You pick an answer, add a note if you want, and save. The answers
go into the brief, so the agent does not ask again.

Sometimes the agent forgets and lists the options in chat. Then say:

```text
Put these questions in a Joycraft decision artifact so I can answer them there.
```

**Colors.** The page uses a light or dark theme. To match your project, ask:

```text
Use our design system's colors for Joycraft artifacts.
```

The agent reads your project's color tokens and saves them in
`.joycraft/preferences.json`. You can also give it your own colors. Joycraft
refuses colors that make text or buttons hard to read.

## What Joycraft is

Joycraft is a set of agent skills and a small set of scripts. It installs into your
project:

- Skills in `.claude/skills/` (Claude Code) or `.agents/skills/` (all other agents)
- Scripts and templates in `.joycraft/`
- Project notes in `AGENTS.md`, `CLAUDE.md` and `docs/`. These are yours: Joycraft
  adds to them and never removes them.

All of it lives in your repository. Joycraft collects no data, sends nothing anywhere,
and does not call an AI model itself. Joycraft 1.0 adds no hooks and changes no agent
settings.

## Hosts

| Host | Skills | Tested |
|---|---|---|
| Claude Code | `.claude/skills/` | Yes |
| Codex | `.agents/skills/` | Yes |
| Pi | `.agents/skills/` | Yes |
| Oh My Pi | `.agents/skills/` | Yes |
| GitHub Copilot CLI | `.agents/skills/` | Installs; full run not tested yet |
| OpenCode | `.agents/skills/` | Installs; full run not tested yet |

"Tested" means: we installed Joycraft in a test project, one agent built a spec, and
a second, separate agent checked it and passed it.

## Commands

Your agent runs these for you. They are here if you want them:

```bash
npx joycraft@latest init . --harness claude,codex --yes    # install
npx joycraft@latest update . --yes                         # update (backs up files you edited first)
npx joycraft@latest doctor .                               # check the install
npx joycraft@latest update . --migrate --archive-custom --yes   # move a 0.7 project to 1.0
npx joycraft@latest rollback --yes                         # undo the move to 1.0
```

Add `--plan --json` to see the changes without making them. Without `--yes`, and
outside a terminal, a command shows its plan and stops. It never waits for input.

More: [Install guide](docs/install.md) · [Migrating from 0.7](docs/migrating-from-0.7.md) ·
[Prompts](docs/prompts.md) · [Changelog](CHANGELOG.md) · [Security](SECURITY.md) ·
[Contributing](CONTRIBUTING.md) · [License](LICENSE)

## Acknowledgments

These people shaped how Joycraft decides what an agent should keep and what it
should forget:

- **Mario Zechner** (creator of [Pi](https://github.com/earendil-works/pi-coding-agent)) and **Armin Ronacher** (creator of Flask): "code is truth". Do not keep a separate memory of what the code already says.
- **Theo Browne** ([t3.gg](https://t3.gg)): measure which notes an agent actually reads, and keep `AGENTS.md` short and directional.
- **Lauren** (Cursor): prefer fixes in this order: architecture, then lint and CI, then skills and rules, then asking a human.
- **Robert C. Martin**: impose values, not disciplines.

The levels this project aims at are Dan Shapiro's. See [The levels](docs/guides/levels.md).

## License

MIT. See [LICENSE](LICENSE).

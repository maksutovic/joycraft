# Install Joycraft

The easiest way is the [install prompt](prompts.md#install): paste it into your coding
agent and it runs the steps below for you. This page explains each step.

## 1. See the plan

```bash
npx joycraft@latest init . --plan --json
```

This changes nothing. It lists the files Joycraft would add and the lines it would add
to `.gitignore` (`.joycraft/local/` and `.joycraft-backups/`).

If the project has Joycraft 0.7, `init` and `update` print the migration plan and exit 1
instead. See [Migrating from 0.7](migrating-from-0.7.md).

## 2. Install for your hosts

```bash
npx joycraft@latest init . --harness claude,codex --yes
```

`--harness` takes any of `claude`, `codex`, `pi`, `omp`, `copilot`, `opencode`, comma
separated. Without it, Joycraft reuses the hosts it recorded last time, or asks, with
the host you are running inside as the default.

| Host | What Joycraft adds | Your step |
|---|---|---|
| Claude Code | `.claude/skills/joycraft-*`, `.claude/agents/joycraft-implementer.md` and `joycraft-reviewer.md` | Trust the folder when Claude Code asks |
| Codex, Pi, Oh My Pi, GitHub Copilot CLI, OpenCode | `.agents/skills/joycraft-*` | Trust the folder when the host asks |
| All | The runtime in `.joycraft/` and `.joycraft/installation.json` | Commit them with your project |

Joycraft 1.0 installs no hooks and changes no host settings.

## 3. First use

Ask your agent to set up the project, or just ask for what you want; the
`joycraft-entry` skill does the setup on first use. It writes a concise `AGENTS.md`
(and a `CLAUDE.md` pointer) from what your repository shows.

On a **new or empty project**, it offers a **kickoff** first: you talk freely about what
you want to build, it asks a few short rounds of questions, and it writes
`docs/context/project.md`, a decision log and your first brief. It does not pick a
stack or create app files during the kickoff.

## 4. The review loop's tools

During setup the agent runs the review-loop plan:

```bash
node .joycraft/runtime/review-tools.mjs plan --root .
```

It detects the project type (web, iOS, Android, Flutter, React Native, Expo, Electron,
API, CLI or library) and shows each verification tool the review loop needs as present,
missing or not needed. It asks one question before installing anything. It installs
only project-local tools (for example Playwright with your package manager) and only
after your yes. Xcode, simulators and the Android SDK are steps for you. The choice is
recorded in the `Review loop` section of `AGENTS.md`. If you skip a UI tool, UI claims
stay unverified in reviews.

## Update

```bash
npx joycraft@latest update . --yes
```

A Joycraft file you did not edit is replaced. An edited one is copied to
`.joycraft-backups/update-<time>/` first. A file Joycraft did not install is never
replaced. Check an install at any time:

```bash
npx joycraft@latest doctor .
```

If an update is interrupted, `npx joycraft@latest update . --recover` puts the files back.

Joycraft 1.0.0 has no automatic update check. Run `update` when you want a new version.

## Uninstall

Remove the files listed in `.joycraft/installation.json`, then `.joycraft/` itself.
Your `AGENTS.md`, `CLAUDE.md` and `docs/` are yours; Joycraft does not remove them.

# Security

Joycraft is a CLI that installs agent skills and a small set of scripts into a
project. This page says what it executes, how it keeps an AI agent in bounds,
and where to report a problem.

## What Joycraft executes

The CLI (`npx joycraft init`, `update`, `rollback`, `doctor`) reads and writes
files. It never runs your code: no build, test, lint or install of your project.

- It **reads** your manifest files (`package.json`, `pyproject.toml`,
  `Cargo.toml`, `go.mod` and others), your `AGENTS.md` and `CLAUDE.md`, and its
  own install manifest.
- It **writes** skills to `.claude/skills/` or `.agents/skills/`, scripts and
  templates to `.joycraft/`, and adds lines to `AGENTS.md`, `CLAUDE.md`,
  `.gitignore` and `.gitattributes`. It never removes your lines from those files.
- It **overwrites nothing of yours.** `init` and `update` show a plan first and
  apply only with `--yes`. When `update` replaces a Joycraft file that you
  edited, it saves your copy under `.joycraft-backups/` first. `rollback` undoes
  a 0.7 → 1.0 migration from its backup.
- Its only runtime dependency is
  [commander](https://www.npmjs.com/package/commander). Its only network use is
  the npm version check, at most once a day, which sends no project data.

The installed scripts in `.joycraft/runtime/` run when your agent calls them.
They run the commands the agent passes (for example your test command through
`evidence.mjs`), and `delivery.mjs` pushes to Git only when the agent asks it to
and its verifier passed. They run with the agent's permissions, inside your
agent's own permission model.

## How Joycraft keeps the agent in bounds

- **Rules in `AGENTS.md`.** Setup records your project's rules: what the agent
  must always do, ask first about, or never do. A cleanup changes a rule only on
  your answer, and lists every changed rule in a permission ledger before the
  commit.
- **Questions go to you.** Every choice that changes scope, cost or what is
  built is a decision you answer. An agent never answers it for you.
- **Independent review.** A second agent that did not write the code checks
  each spec. A spec is done only with an accepted review or your explicit
  acceptance.
- **The gate hook.** On Claude Code you can turn on one Stop hook that stops
  the agent while a spec is not accepted. Joycraft adds no other hook and
  changes no agent setting.
- **Git authority is yours.** The agent pushes only where your project permits
  it, and Joycraft never merges for you.
- **Permission modes.** You do not need `--dangerously-skip-permissions` to run
  Joycraft's workflow. See [Permission modes](docs/guides/permission-modes.md).
- **Rules are guidance, not a sandbox.** They guide a cooperative agent. They do
  not protect you from untrusted code or a compromised model. Review what an
  agent changes; Joycraft makes that review cheap, it does not remove it.

## Your AI tool's own safety model

Joycraft runs inside Claude Code, Codex, Pi, Oh My Pi, GitHub Copilot CLI or
OpenCode. Each has its own permission and sandbox model, and that model is the
layer that enforces. Read your tool's documentation for what it blocks:

- Claude Code — https://code.claude.com/docs
- Anthropic trust and safety — https://www.anthropic.com/trust

## Reporting a vulnerability

Report security issues privately via
[GitHub security advisories](https://github.com/maksutovic/joycraft/security/advisories/new)
rather than a public issue. Include the version, the commands you ran, and what
was written or read that should not have been. Expect an initial response within
a few business days.

Supported versions: the latest published release on npm. Fixes ship forward —
there are no long-term maintenance branches.

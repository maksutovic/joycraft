# Security

Joycraft is a scaffolding CLI. This page describes what it executes, how it
constrains the AI agents that run alongside it, and where to report a problem.

## What Joycraft executes

`npx joycraft init` and `npx joycraft upgrade` read and write files. That is the
whole runtime.

- It **reads** your manifest files (`package.json`, `pyproject.toml`, `Cargo.toml`,
  `go.mod`, and friends) to detect your stack, and reads existing `CLAUDE.md`,
  `AGENTS.md`, and Joycraft-installed files to decide what to update.
- It **writes** markdown, skill, and template files into your repo, plus
  `.gitignore` / `.gitattributes` lines (append-only — existing lines are never
  rewritten or removed) and hidden upgrade state at `docs/.joycraft/state.json`.
- It **never runs your code**: no build, test, lint, install, or arbitrary shell
  command is executed on your behalf. Detected build/test commands are written
  into your instruction files as text for a human or an agent to run later.
- It **never runs git for you.** Where an operation would need git (for example
  untracking previously committed harness files), Joycraft prints the command
  and stops.
- It **overwrites nothing without consent.** `init` skips files that already
  exist; `upgrade` shows a diff for any file you customized and asks. `--force`
  and `--yes` are the explicit opt-outs.
- Its only runtime dependency is [commander](https://www.npmjs.com/package/commander)
  for argument parsing. Network access is limited to the npm registry version
  check that tells you a newer Joycraft exists.

## Boundaries and deny patterns

The files Joycraft installs exist to *narrow* what an AI coding agent will do in
your repo — this is the "how do I keep it from going rogue" layer.

- **Behavioral boundaries.** The generated `AGENTS.md` / `CLAUDE.md` carries
  ALWAYS / ASK FIRST / NEVER sections. `/joycraft-tune` runs a short risk
  interview and writes rules specific to your project (what must never be
  touched, what requires a human yes).
- **Deny patterns.** `/joycraft-harden` promotes eligible prose rules into
  machine-checked deny patterns enforced by the harness itself, so the rule
  holds even when a model would drift past prose. Each pattern is stamped with
  its provenance and a probation marker so you can audit and revert it.
- **Git autonomy is a choice.** Tuning asks how much git authority the agent
  gets. Push, force-push, branch deletion, and merges to the default branch are
  ASK FIRST by default.
- **Permission modes.** You do not need `--dangerously-skip-permissions` to run
  Joycraft's workflow. See [Permission modes](docs/guides/permission-modes.md).
- **Boundaries are guidance, not a sandbox.** They constrain a cooperative
  agent; they are not a security boundary against untrusted code or a
  compromised model. Treat agent-authored changes as untrusted input and review
  them — the harness is built to make that review cheap, not to remove it.

## Your AI tool's own safety model

Joycraft runs inside Claude Code, Codex, Pi, or GitHub Copilot, and each brings
its own permission and sandboxing model. Those are the enforcing layer; read
your tool's documentation for what it actually blocks:

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

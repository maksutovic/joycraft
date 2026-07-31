# Platform Support

> [Back to README](../../README.md)

## Platform support

Joycraft supports **Claude Code**, **OpenAI Codex**, **Pi**, and **GitHub Copilot** out of the box. When you run `npx joycraft init`, it opens with a quick picker — choose any combination, and only the harnesses you select get installed:

```
Which AI harnesses should Joycraft install?
  claude  — Claude Code (.claude/)
  codex   — OpenAI Codex (.agents/)
  pi      — Pi (.pi/)
  copilot — GitHub Copilot (.github/)
Harnesses [comma-separated, or "all"] (none): claude,pi
```

| Harness | Skills installed to | Invocation |
|---------|---------------------|------------|
| Claude Code | `.claude/skills/` | `/joycraft-*` |
| Codex | `.agents/skills/` (+ `AGENTS.md`) | `$joycraft-*` |
| Pi | `.pi/skills/` (+ pipeline runtime, see below) | `/skill:joycraft-*` |
| GitHub Copilot | `.github/skills/` | — |

All four get the same structured workflows, adapted for each tool's invocation model. A single-harness install carries **no footprint from the others** — pick `copilot` only and you get `.github/skills/` with no `.claude/`, `.agents/`, or `.pi/` in sight. In a non-interactive run (CI, piped, no TTY) `init` installs all available harnesses so existing scripts keep working. The shared docs (`CLAUDE.md`, `AGENTS.md`, `docs/`) are written regardless of which harnesses you pick.

> Pick nothing at the harness prompt and `init` installs nothing — it tells you to re-run and choose at least one harness.

## Headless spec execution (Pi)

Pi is the one harness where the workflow can run **fully autonomously** — no human keystrokes between specs. Beyond the skills, `init` installs a pipeline runtime to `.pi/scripts/joycraft/` whose driver, `joycraft-implement-loop`, runs an entire feature's spec queue end to end:

```
next-spec → pi -p "/skill:joycraft-implement <spec>" → pi -p "/skill:joycraft-spec-done <spec>" → repeat
```

Each spec runs in **one fresh OS process** (`pi -p`), so the context isolation is the process boundary itself — verified, not in-conversation trickery. The loop is fail-fast (stops and names the failing spec) and runs `session-end` exactly once when the queue is exhausted.

This is what Claude Code and Codex can't do out of the box: an unattended `interview → PR` line where the machine does everything convergent in between. It is Pi-specific by design — the driver targets Pi with a BYO API key or open-weight model (Commercial/API terms, no automation restriction); pointing a consumer Claude/ChatGPT *subscription* at an automated loop would violate those tools' terms.

On Claude Code, `/joycraft-implement-feature` gets you the in-session equivalent: one interactive invocation runs the whole queue with a fresh-context **subagent** per spec — the subagent boundary plays the role of Pi's process boundary. You're at the keyboard and it's one command, so none of the headless ToS/cost caveats apply.

## Supported Stacks

Node.js (npm/pnpm/yarn/bun), Python (poetry/pip/uv), Rust, Go, Swift, and generic (Makefile/Dockerfile).

Frameworks auto-detected: Next.js, FastAPI, Django, Flask, Actix, Axum, Express, Remix, and more.

## How It Works with AI Agents

Claude Code reads CLAUDE.md, Codex and Pi read AGENTS.md — and Claude Code does **not** read AGENTS.md natively. On a multi-tool install Joycraft therefore keeps one shared AGENTS.md and writes CLAUDE.md as an `@AGENTS.md` import (Anthropic's documented pattern), so every tool reads the same instructions without duplication. [Read the full guide →](agent-compatibility.md)

# Token Discipline

Joycraft's workflow produces file artifacts at every step — briefs, specs, discoveries, context docs. This means your conversation context is scaffolding, not the product. You can discard it after each phase without losing work.

## Why It Matters

Every token in your context window costs money and attention. Context accumulates across workflow phases — the interview context is still there when you're decomposing, the decomposition context is still there when you're implementing. This compounding makes later turns slower and more expensive, and can degrade output quality as the model juggles stale context alongside current work.

## `/clear` > `/compact`

In artifact-producing workflows, `/clear` is better than `/compact`:

- **`/compact`** summarizes the conversation and keeps going. The summary is lossy — it might drop details you need, or preserve details you don't. You're paying tokens for a compressed version of work that's already saved to files.
- **`/clear`** starts a fresh context. Since every Joycraft step writes its output to a file, the next step can read that file directly. No summary needed — the source of truth is the artifact, not the conversation.

On Codex, use `/new` for the same effect.

## Skills vs Plugins vs Hooks vs MCP Servers

Not everything in your harness costs the same:

| Component | When it loads | Token cost |
|-----------|--------------|------------|
| **Skills** (`.claude/skills/`, `.agents/skills/`) | On demand — only when invoked | Zero boot cost |
| **Plugins** | At session start | Loaded into context at boot |
| **Hooks** | On trigger events | Minimal — shell commands, not context |
| **MCP servers** | At session start | Server definitions loaded at boot |

Skills are Joycraft's primary mechanism precisely because they're lazy-loaded. A skill with 150 lines of instructions costs nothing until you invoke it. A plugin with 150 lines of system prompt costs that on every turn.

## What `/joycraft-optimize` Checks

The optimize skill audits your session overhead and reports:

- **Harness file sizes** — CLAUDE.md and AGENTS.md against a 200-line threshold. Files over 200 lines should split reference content into `docs/`.
- **Skill file sizes** — each skill against the same 200-line threshold.
- **Plugin count** — installed vs enabled. Unused plugins are free to uninstall.
- **MCP server count** — each server adds boot cost. Disable unused ones.
- **Hook definitions** — listed for awareness, not flagged (hooks are lightweight).

The 200-line threshold is a guideline, not a hard limit. It reflects the point where a harness file starts competing with your actual work for context space.

## Both Platforms

These principles apply equally to Claude Code and Codex:

- **Claude Code:** `/clear` to reset, skills in `.claude/skills/`, plugins and MCP in `~/.claude/settings.json`
- **Codex:** `/new` to reset, skills in `.agents/skills/`, config in `~/.codex/config.toml`

## Further Reading

- [Nate B Jones — Token optimization techniques](https://www.youtube.com/watch?v=bDcgHzCBgmQ)
- [OB1 repo](https://github.com/nate-b-j/OB1) — Heavy File Ingestion skill and stupid button prompt kit
- [Anthropic — Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

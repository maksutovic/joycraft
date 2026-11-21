# Token Discipline

> [Back to README](../../README.md)

Joycraft's workflow writes a file at every step: briefs, specs, review reports, context pages. This means your conversation context is scaffolding, not the product. You can discard it after each phase without losing work.

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
| **Skills** (`.claude/skills/` for Claude Code, `.agents/skills/` for the other hosts) | On demand: only the name and description at boot, the body when used | Small boot cost |
| **Plugins** | At session start | Loaded into context at boot |
| **Hooks** | On trigger events | Minimal: shell commands, not context |
| **MCP servers** | At session start | Server definitions loaded at boot |

Skills are Joycraft's main mechanism because they load on demand. A skill with 150
lines of instructions costs almost nothing until the agent uses it. A plugin with
150 lines of system prompt costs that on every turn.

## Keep `AGENTS.md` short

`AGENTS.md` loads in every session, so every line in it costs tokens on every turn.
Joycraft keeps it short: a few managed lines and a context map that links out to the
pages in `docs/context/`. The agent reads a page only when its row applies.

When `AGENTS.md` grows, ask for a cleanup. `joycraft-cleanup` removes false, stale
and dated text, moves detail to the page that owns it, and changes no rule without
your answer:

```text
Clean up my AGENTS.md and context pages.
Do not commit, publish, or ask me for API keys.
```

## Every host

These principles apply to every host Joycraft supports:

- **Claude Code:** `/clear` to reset, skills in `.claude/skills/`, plugins and MCP in `~/.claude/settings.json`
- **Codex:** `/new` to reset, skills in `.agents/skills/`, config in `~/.codex/config.toml`
- **Pi, Oh My Pi, GitHub Copilot CLI, OpenCode:** start a new session to reset; skills in `.agents/skills/`

## Further Reading

- [Nate B Jones — Token optimization techniques](https://www.youtube.com/watch?v=bDcgHzCBgmQ)
- [OB1 repo](https://github.com/nate-b-j/OB1) — Heavy File Ingestion skill and stupid button prompt kit
- [Anthropic — Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

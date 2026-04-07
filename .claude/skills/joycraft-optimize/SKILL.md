---
name: joycraft-optimize
description: Audit your Claude Code or Codex session overhead — harness file sizes, plugins, MCP servers, hooks — and report actionable recommendations
instructions: 20
---

# Optimize — Session Overhead Audit

You are auditing the user's AI development session for token overhead. Produce a conversational diagnostic report — no files created.

## Step 1: Detect Platform

Check which platform is active:
- **Claude Code:** Look for `.claude/` directory, `CLAUDE.md`
- **Codex:** Look for `.agents/` directory, `AGENTS.md`

If both exist, run both checks. If neither, default to Claude Code checks and note the uncertainty.

## Step 2: Audit Harness Files

### Claude Code Path

1. **CLAUDE.md** — count lines. Threshold: ≤200 lines.
2. **Skill files** — glob `.claude/skills/**/*.md`. Count lines per file. Threshold: ≤200 lines each.

### Codex Path

1. **AGENTS.md** — count lines. Threshold: ≤200 lines.
2. **Skill files** — glob `.agents/skills/**/*.md`. Count lines per file. Threshold: ≤200 lines each.

## Step 3: Audit Plugins & MCP Servers

### Claude Code Path

1. **Installed plugins** — read `~/.claude/plugins/installed_plugins.json`. List plugin names and versions. If not found, report "no plugins file found."
2. **Enabled plugins** — read `~/.claude/settings.json`, check `enabledPlugins` array. Show enabled vs installed count.
3. **MCP servers** — read `~/.claude/settings.json`, count entries under `mcpServers`. List server names.

### Codex Path

1. **Plugin config** — read `~/.codex/config.toml`. List any plugin toggles. Note: Codex syncs its curated plugin marketplace at startup — this is a boot cost even if you don't use them.
2. **MCP servers** — check `~/.codex/config.toml` for MCP server entries. List server names.

## Step 4: Audit Hooks (Claude Code Only)

Read `.claude/settings.json` in the project directory. List all hook definitions under the `hooks` key — show the event name and command for each.

For Codex: note "hook auditing not yet supported on Codex."

## Step 5: Report

Organize findings by category. Use pass/warn indicators:

```
## Session Overhead Report

### Harness Files
- CLAUDE.md: [N] lines [PASS ≤200 / WARN >200]
- Skills: [N] files, [list any over 200 lines]

### Plugins
- Installed: [N] ([list names])
- Enabled: [N] of [M] installed
- [If 0: "No plugins — zero boot cost from plugins."]

### MCP Servers
- Count: [N] ([list names])
- [If 0: "No MCP servers — zero boot cost from servers."]

### Hooks
- [N] hook definitions ([list event names])

### Recommendations
- [Specific, actionable items for anything over threshold]
- [e.g., "CLAUDE.md is 312 lines — consider splitting reference sections into docs/"]
- [e.g., "3 MCP servers load at boot — disable unused ones in settings.json"]
```

## Step 6: Further Resources

End with:

> For deeper token optimization, see:
> - [Nate B Jones's token optimization techniques](https://www.youtube.com/watch?v=bDcgHzCBgmQ)
> - [OB1 repo](https://github.com/nate-b-j/OB1) — Heavy File Ingestion skill and stupid button prompt kit
> - [Joycraft's token discipline guide](docs/guides/token-discipline.md)

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Config files don't exist | Report "not found" for that check, don't error |
| No plugins installed | Report 0 plugins — this is good, say so |
| CLAUDE.md/AGENTS.md exactly 200 lines | PASS — threshold is ≤200 |
| `~/.claude/` or `~/.codex/` not accessible | Skip user-level checks, note limitation |
| Both platforms detected | Run both audits, report separately |

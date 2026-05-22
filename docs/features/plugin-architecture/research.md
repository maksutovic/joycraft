# Claude Code Plugin Architecture — Research for Joycraft

**Date:** 2026-03-24
**Status:** Research complete, implementation deferred (Phase 5)

---

## Plugin Directory Structure

```
.claude-plugin/
  plugin.json          # name, description, author
skills/
  skill-name/
    SKILL.md           # skill definition (same format as project skills)
    references/        # optional supporting files
hooks/
  hooks.json           # hook definitions (SessionStart, PreToolUse, etc.)
commands/              # optional: user-invocable slash commands
agents/                # optional: custom subagents
.mcp.json              # optional: MCP server config
```

## plugin.json (Minimal)

```json
{
  "name": "joycraft",
  "description": "The craft of AI development — assess, tune, and safeguard your AI harness",
  "author": { "name": "Joycraft" }
}
```

## Distribution Options

1. **Official marketplace** — PR to `anthropics/claude-plugins-official`. Install: `claude plugin install joycraft`. Auto-updates.
2. **Third-party marketplace** — Own GitHub repo. Users: `claude plugin marketplace add github:maksutovic/joycraft-plugin`, then install.

## Key Trade-Off: Global vs Per-Project

| | CLI (current) | Plugin |
|---|---|---|
| Skills location | `.claude/skills/` (per-project, git-committed) | `~/.claude/plugins/` (global, per-developer) |
| Team sharing | Git commit | Each dev installs plugin |
| Namespacing | Manual (`joycraft-tune`) | Automatic (`joycraft:tune`) |
| Updates | `npx joycraft upgrade` | `claude plugin update joycraft` |
| Project scaffolding | `npx joycraft init` | Still needed for CLAUDE.md, docs/, templates |

## Recommended Approach

**Both:** Plugin provides skills globally. CLI still scaffolds per-project artifacts (CLAUDE.md, docs/, templates, context docs, hooks). This is how Vercel plugin + framework CLIs coexist.

## Decision: Defer to Phase 5

Finish Phases 1-4 (namespace, permissions, risk interview, context docs) on the npm package first. Package as plugin once feature set is stable to avoid iterating on two distribution formats.

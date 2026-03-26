# Dangerous Assumptions

> Things the AI agent might assume that are wrong in this project.

## Assumptions

| Agent Might Assume | But Actually | Impact If Wrong |
|-------------------|-------------|----------------|
| Templates are just docs | Templates are the core product — they get copied into every user's project | Bad template = bad experience for every user |
| Skills can import other files | Skills must be fully self-contained — `.claude/skills/` files can't import | Broken skill for every user who installs it |
| CLAUDE.md merge is append-only | `improve-claude-md.ts` does section-level parsing and merging | Overwriting user's existing CLAUDE.md content |
| Test fixtures are stubs | Fixtures should mirror real-world manifest files (real package.json structures) | False confidence — tests pass but detection fails on real projects |
| Absolute paths are fine in templates | All templates and skills must use project-relative paths | Templates break when copied into user projects |

## Historical Incidents

| Date | What Happened | Lesson | Rule Added |
|------|-------------|--------|------------|
| 2026-03-25 | Level 5 autofix workflow used `--model` flag with Claude CLI | Claude Code has its own model resolution, not an API wrapper | Discovery logged, workflow templates updated |
| 2026-03-25 | pnpm/action-setup conflicted with packageManager in package.json | Use `packageManager` field, don't set explicit `version:` in action | Workflow template fixed |

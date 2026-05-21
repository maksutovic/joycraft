# Claude Code Plugin Migration — Draft Brief

> **Date:** 2026-03-26
> **Status:** DRAFT (future — not spec-ready)
> **Origin:** /joycraft-interview session — skill naming research

---

## The Idea

Migrate Joycraft from project-level skills (`.claude/skills/`) to a proper Claude Code plugin. This would give us automatic colon-namespacing (`/joycraft:tune` instead of `/joycraft-tune`), plugin-level hooks, and a cleaner installation story.

## Current State

- Skills are copied as markdown files to `.claude/skills/joycraft-*.md`
- Names use hyphen prefix (`joycraft-tune`) as a manual collision-avoidance convention
- Installation is via `npx joycraft init` which copies files
- Upgrades require `npx joycraft upgrade` to diff and apply changes

## What Changes as a Plugin

- Skills would use short names in frontmatter (`name: tune`, `name: decompose`)
- Claude Code would auto-namespace them as `/joycraft:tune`, `/joycraft:decompose`
- Installation would be `claude plugin add joycraft` or similar
- Plugin hooks (`SessionStart`, `PreToolUse`) would replace the current session-start hook
- `CLAUDE.md` generation could move to a plugin hook instead of file copying

## Why Not Now

- The Claude Code plugin system may still be evolving
- Current approach works and is battle-tested
- Plugin migration is a breaking change for existing users (skill names change)
- Need to understand plugin distribution (npm? Claude Code marketplace?)

## Open Questions

- How are plugins distributed? npm package? GitHub repo? Claude Code marketplace?
- Can a plugin also install project-level files (docs/templates, CLAUDE.md)?
- What's the upgrade story for plugins vs. current `npx joycraft upgrade`?
- How do we handle the migration for existing users? (old skill names stop working)

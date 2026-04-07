# Build Optimize Skill — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-token-discipline.md`
> **Status:** Complete
> **Date:** 2026-04-06
> **Estimated scope:** 1-2 sessions / 4 files / ~200 lines
> **Depends on:** Spec 0 (restructure-spec-directories)

---

## What

Create a new `/joycraft-optimize` skill that audits a user's Claude Code or Codex session overhead and reports actionable recommendations. The skill detects which platform it's running on, reads the relevant config files, and produces a conversational diagnostic report covering harness file sizes, plugin counts, MCP server counts, and hook definitions.

## Why

Users accumulate boot tax and context overhead without visibility into what's costing them. Plugins, MCP servers, oversized CLAUDE.md/AGENTS.md files, and verbose hooks all add tokens before the first prompt. Without a diagnostic, users can't make informed decisions about what to trim.

## Acceptance Criteria

- [ ] `src/claude-skills/joycraft-optimize.md` exists with complete skill content
- [ ] `src/codex-skills/joycraft-optimize.md` exists with Codex-equivalent checks
- [ ] Skill detects platform (Claude Code vs Codex) and runs appropriate checks
- [ ] Checks CLAUDE.md / AGENTS.md line count against 200-line threshold
- [ ] Checks each skill file in `.claude/skills/` or `.codex/skills/` against 200-line threshold
- [ ] Reads `~/.claude/plugins/installed_plugins.json` (Claude Code) or `~/.codex/config.toml` (Codex) to list installed plugins
- [ ] Reads `~/.claude/settings.json` `enabledPlugins` (Claude Code) or config.toml plugin toggles (Codex) to show enabled vs installed
- [ ] Counts MCP servers from settings.json (Claude Code) or config.toml (Codex)
- [ ] Lists hook definitions from `.claude/settings.json` hooks (Claude Code)
- [ ] Produces a clear conversational report with counts, threshold violations, and recommendations
- [ ] Output is conversational only — no files created
- [ ] Links to Nate B Jones's resources (OB1 repo, stupid button prompt kit) for further optimization
- [ ] `bundled-files.ts` is updated with the new skill
- [ ] `init.ts` installs the new skill (added to SKILLS/CODEX_SKILLS maps)
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Skill file exists and has valid frontmatter | Check file exists, parse YAML frontmatter | manual |
| Platform detection logic described | Review skill instructions for both paths | manual |
| All audit checks present | Grep skill content for each check category | manual |
| Init installs the skill | Existing init tests cover skill installation via SKILLS map | unit |
| Upgrade handles the new skill | Existing upgrade tests cover new skills | unit |
| Build passes | `pnpm build` | build |
| No regressions | `pnpm test --run` | unit |

**Execution order:**
1. Write `src/claude-skills/joycraft-optimize.md` with full skill content
2. Write `src/codex-skills/joycraft-optimize.md` with Codex-adapted content
3. Add both to `bundled-files.ts` (SKILLS and CODEX_SKILLS maps)
4. Run build and tests

**Smoke test:** `pnpm build && pnpm test --run`

## Constraints

- MUST: Work on both Claude Code and Codex with full parity
- MUST: Output is conversational only — no files written
- MUST: Use 200 lines as threshold for all harness files
- MUST: Skill file itself must be under 200 lines
- MUST: Link to Nate B Jones's resources, don't reimplement
- MUST NOT: Add runtime dependencies
- MUST NOT: Actively prevent or block anything — diagnostics and recommendations only
- MUST NOT: Read file contents of plugins/MCP servers — just count and list names

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/claude-skills/joycraft-optimize.md` | New skill file |
| Create | `src/codex-skills/joycraft-optimize.md` | New skill file (Codex version) |
| Edit | `src/bundled-files.ts` | Add skill to SKILLS and CODEX_SKILLS maps |

## Approach

The skill is a markdown instruction file that tells Claude/Codex how to run the audit. It does NOT contain executable code — it instructs the agent to read specific files and report findings. The skill has two main branches:

**Claude Code path:**
1. Check for CLAUDE.md → count lines
2. Glob `.claude/skills/**/*.md` → count lines per file
3. Read `~/.claude/plugins/installed_plugins.json` → list plugins with versions
4. Read `~/.claude/settings.json` → count enabledPlugins, mcpServers, hooks
5. Summarize with thresholds and recommendations

**Codex path:**
1. Check for AGENTS.md → count lines
2. Glob `.codex/skills/**/*.md` → count lines per file
3. Read `~/.codex/config.toml` → parse plugin toggles, MCP servers
4. Note: Codex syncs curated plugin marketplace at startup — mention this as a boot cost
5. Summarize with thresholds and recommendations

**Report format:** Organized by category with pass/warn indicators, counts, and specific recommendations for anything over threshold.

**Rejected alternative:** Making this an executable script rather than a skill. A skill leverages the agent's ability to read files and reason about findings, which produces better recommendations than a static script could.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Config files don't exist | Report "not found" for that check, don't error |
| User has no plugins installed | Report 0 plugins — this is good, say so |
| CLAUDE.md/AGENTS.md is exactly 200 lines | Pass — threshold is ≤200 |
| Platform can't be detected | Default to Claude Code checks, note uncertainty |
| `~/.claude/` or `~/.codex/` not accessible | Skip user-level checks, note limitation |
| Codex hooks equivalent unknown | Note "hook auditing not yet supported on Codex" |

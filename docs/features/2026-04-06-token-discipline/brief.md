# Token Discipline — Feature Brief

> **Date:** 2026-04-06
> **Project:** Joycraft
> **Status:** Specs Ready

---

## Vision

Joycraft's workflow naturally produces file artifacts at every step — briefs, specs, discoveries, session summaries. That means conversation context is disposable: the real work lives in files, not chat history. We should lean into this by nudging users to `/clear` between major workflow phases, and by giving them a diagnostic skill to audit their Claude Code and Codex session overhead.

Inspired by Nate B Jones's research on token waste patterns, the insight is that token discipline shouldn't be a conscious habit — it should be infrastructure. Joycraft is already well-positioned (skills are lazy-loaded, not boot-loaded), but users still accumulate context debt from long conversations, oversized harness files, and plugin/MCP bloat without realizing it.

This feature adds two things: lightweight clear nudges in existing skill handoffs, and a `/joycraft-optimize` diagnostic skill that audits the user's session overhead with actionable recommendations.

## User Stories

- As a Joycraft user, I want to be reminded to clear context between workflow phases so that I don't waste tokens on stale conversation history
- As a Joycraft user, I want to audit my Claude Code or Codex session overhead so that I can identify and reduce boot tax from plugins, MCP servers, and oversized harness files
- As a Joycraft user running `/tune`, I want to be nudged toward `/joycraft-optimize` so that I know the diagnostic exists

## Hard Constraints

- MUST: Work on both Claude Code and Codex with full parity
- MUST: Clear nudges are one-line additions to existing skill handoff sections — not workflow interruptions
- MUST: `/joycraft-optimize` output is conversational only — no file artifacts
- MUST: Use 200 lines as the threshold for CLAUDE.md, AGENTS.md, and individual skill files
- MUST: Installed via `joycraft init` (not a standalone tool)
- MUST NOT: Add runtime dependencies
- MUST NOT: Reimplement diagnostics that Nate B Jones / OB1 already built — reference and link instead
- MUST NOT: Actively prevent or enforce anything — this is awareness and nudges only

## Out of Scope

- `/joycraft-implement` skill (separate brief — noted as a dependency for the cleanest UX)
- Active waste prevention (hooks that block heavy file ingestion, auto-model-routing)
- API-level token optimization (prompt caching, model routing)
- Claude Desktop users
- Building our own "stupid button" diagnostic — link to Nate's instead
- Conversation length warnings or auto-clear — too aggressive for light touch
- Hook output size measurement (no reliable way to measure without running them)

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 0 | restructure-spec-directories | Change spec output from flat to feature-grouped subdirectories | None | M |
| 1 | add-clear-nudges | Add `/clear` nudge lines to existing skill handoff sections (interview, new-feature, decompose, session-end) | Spec 0 | S |
| 2 | build-optimize-skill | Create `/joycraft-optimize` diagnostic skill with platform detection and audit checklist | Spec 0 | L |
| 3 | add-tune-optimize-nudge | Add text line in `/tune` output nudging users to run `/joycraft-optimize` | Spec 2 | S |
| 4 | write-token-discipline-guide | Create `docs/guides/token-discipline.md` and add README section linking to it | Specs 1, 2 | M |

## Execution Strategy

- [x] Mixed
- Spec 0 executes first (changes path conventions used by other specs)
- Specs 1 and 2 can execute in parallel after spec 0 (independent)
- Spec 3 depends on spec 2 (skill must exist before tune references it)
- Spec 4 depends on specs 1 and 2 (documents both features)

## Success Criteria

- [ ] All four existing handoff skills (interview, new-feature, decompose, session-end) include a clear nudge
- [ ] `/joycraft-optimize` correctly detects Claude Code vs Codex and audits the right config paths
- [ ] `/joycraft-optimize` checks: project doc size, skill file sizes, installed plugins, enabled plugins, MCP server count, hook definitions (Claude Code), and reports against 200-line thresholds
- [ ] `/tune` output includes a line nudging users to run `/joycraft-optimize`
- [ ] `docs/guides/token-discipline.md` exists with clear explanation of why `/clear` > `/compact`, skills vs plugins distinction, and links to Nate's resources
- [ ] README links to the guide
- [ ] No regressions — existing tests pass, existing skill behavior unchanged beyond added nudge lines

---

## Reference: Optimize Skill Audit Checklist

| Check | Claude Code Path | Codex Path | Threshold |
|-------|-----------------|------------|-----------|
| Project doc size | CLAUDE.md | AGENTS.md | ≤200 lines |
| Skill file sizes | .claude/skills/*.md | .codex/skills/*.md | ≤200 lines each |
| Installed plugins | ~/.claude/plugins/installed_plugins.json | ~/.codex/config.toml [plugins] | Report count |
| Enabled vs installed | ~/.claude/settings.json enabledPlugins | config.toml plugin enabled flags | Flag disabled bloat |
| MCP server count | ~/.claude/settings.json mcpServers | config.toml mcp_servers | Report count |
| Hook definitions | .claude/settings.json hooks | (Codex equivalent TBD) | Report count |
| Boot tax estimate | Qualitative summary | Include marketplace sync note | Actionable recs |

## Reference: External Resources (link, don't reimplement)

- Nate B Jones's token optimization article (four levels of waste)
- OB1 repo: Heavy File Ingestion skill, stupid button prompt kit
- Claude Code `/context` command for manual inspection

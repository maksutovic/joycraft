# Codex Skills Support — Feature Brief

> **Date:** 2026-04-06
> **Project:** Joycraft
> **Status:** Complete

---

## Vision

OpenAI Codex now supports an agent skills standard that is structurally very similar to Claude Code's — a directory with a `SKILL.md` file containing YAML frontmatter (`name`, `description`) plus markdown instructions. The key difference is location: Codex reads from `.agents/skills/` while Claude Code reads from `.claude/skills/`. The two tools ignore each other's directories entirely, so both can coexist in the same repo without confusion.

Joycraft should output skills for both platforms during `npx joycraft init`. A project that runs init gets `.claude/skills/joycraft-*/SKILL.md` (Claude Code) AND `.agents/skills/joycraft-*/SKILL.md` (Codex) — works with either tool out of the box, no flags, no detection.

The Codex skill variants are manually authored as separate files (not auto-transformed from Claude skills). This avoids fragile text transforms on natural language content and gives full control over Codex-specific wording. Skills are workflow descriptions that change infrequently — the maintenance burden of two sets is low.

## Capability Differences (Research Findings)

Codex has these relevant differences from Claude Code:

- **No `TodoWrite`** — no built-in progress tracking tool
- **No `LSP` tool** — no code intelligence queries
- **No `Skill` tool** — skills invoked via `$skill-name` syntax, not programmatically
- **No `EnterWorktree`** — no worktree management
- **Subagents exist** but work differently — concurrent threads with configurable max (default 6), TOML-based custom agents, no named teammate/team system
- **Implicit skill matching** — Codex auto-selects skills by matching task description to skill `description` field (can be disabled)
- **AGENTS.md** has a 32 KiB default size limit (`project_doc_max_bytes`)

All Joycraft skills can be ported. Most need only tool-name translation (e.g., "use the `Agent` tool" → "spawn a subagent"). Two skills need more adaptation: `joycraft-verify` (spawns a read-only subagent) and `joycraft-implement-level5` (multi-agent orchestration) — both should be simplified to match Codex's subagent model.

## User Stories

- As a developer using Codex, I want Joycraft skills available in `.agents/skills/` so that I get the same structured workflows without switching to Claude Code
- As a developer using both tools, I want `npx joycraft init` to set up both `.claude/skills/` and `.agents/skills/` so my repo works with either tool
- As a developer running `npx joycraft upgrade`, I want Codex skills upgraded alongside Claude skills so both stay current

## Hard Constraints

- MUST: Always output both `.claude/skills/` and `.agents/skills/` — no flags, no platform detection
- MUST: Maintain Codex skills as separate source files in `src/codex-skills/` — no automated transforms
- MUST: Keep the same skill names (`joycraft-tune`, `joycraft-interview`, etc.) across both platforms
- MUST: Use the same directory-per-skill structure for Codex (`.agents/skills/<name>/SKILL.md`)
- MUST: Track Codex skill hashes in `.joycraft-version` for upgrade support
- MUST: Preserve existing non-Joycraft skills in `.agents/skills/` (same additive behavior as `.claude/skills/`)
- MUST NOT: Add `scripts/`, `references/`, `assets/`, or `agents/openai.yaml` — keep it simple, just markdown
- MUST NOT: Add any new CLI flags or modes for this feature
- MUST NOT: Change the existing Claude skill files or their installation behavior

## Out of Scope

- NOT: Codex plugin distribution (the `plugins` system for npm-like skill distribution)
- NOT: `agents/openai.yaml` UI metadata per skill
- NOT: Script directories alongside skills
- NOT: Codex-specific templates in `docs/templates/` (Claude-kit templates are tool-agnostic enough)
- NOT: Changes to AGENTS.md generation beyond optionally referencing `$joycraft-*` syntax
- NOT: Auto-detection of which tool the user is running

## Skill Porting Notes

For each Codex skill variant, adapt the Claude version by:

1. **Tool references** — Replace Claude-specific tool names with generic descriptions (e.g., "use the `Grep` tool to search" → "search the codebase for")
2. **Skill invocation** — Replace `/joycraft-*` with `$joycraft-*`
3. **Subagent patterns** — Simplify multi-agent orchestration to single-agent or basic subagent patterns
4. **Progress tracking** — Remove `TodoWrite` references; describe progress tracking as optional/implicit
5. **Tone** — Keep the same workflow steps and structure; only change tool-specific language

## Test Strategy

- **Existing setup:** Vitest + TypeScript
- **Test types:**
  - Unit test: verify `CODEX_SKILLS` export in `bundled-files.ts` contains all expected skills
  - Unit test: verify every Claude skill in `src/skills/` has a matching Codex skill in `src/codex-skills/` with the same `name` frontmatter
  - Integration test: `init` copies Codex skills to `.agents/skills/<name>/SKILL.md`
  - Integration test: `.joycraft-version` includes hashes for `.agents/skills/` files
  - Integration test: existing `.agents/skills/` content is preserved (non-Joycraft skills not overwritten)
- **Smoke test budget:** <5 seconds

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | codex-skill-source-files | Create `src/codex-skills/` with Codex-adapted variants of all 12 skills | None | L |
| 2 | bundle-codex-skills | Add `CODEX_SKILLS` to `bundled-files.ts` build, mirroring the existing `SKILLS` pattern | Spec 1 | S |
| 3 | init-codex-skills | Update `init.ts` to copy Codex skills to `.agents/skills/<name>/SKILL.md` with same additive/force behavior as Claude skills | Spec 2 | S |
| 4 | upgrade-codex-skills | Update `upgrade.ts` and `.joycraft-version` hash tracking to cover `.agents/skills/` files | Spec 3 | S |
| 5 | codex-skill-parity-test | Add a test that verifies every `src/skills/*.md` has a corresponding `src/codex-skills/*.md` with matching `name` | Spec 1 | S |

## Execution Strategy

- [x] Spec 1 is the bulk of the work (authoring 12 skill files) and can proceed independently
- [x] Specs 2–4 are a sequential chain (bundle → init → upgrade)
- [x] Spec 5 can run in parallel with Specs 2–4 once Spec 1 is done
- [x] All 5 specs generated in `docs/specs/` (2026-04-06)

```
Spec 1 ──→ Spec 2 → Spec 3 → Spec 4
       └─→ Spec 5
```

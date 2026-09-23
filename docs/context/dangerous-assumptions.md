---
last_updated: 2026-09-22
last_updated_by: Maximilian Maksutovic
---

# Dangerous Assumptions

> Things the AI agent might assume that are wrong in this project.

## Assumptions

| Agent Might Assume | But Actually | Impact If Wrong |
|-------------------|-------------|----------------|
| The registered `block-dangerous.sh` hook blocks matching commands | It reads the tool name from `$1`, which Claude Code never passes, so it always exits 0 (found 2026-09-22; fix belongs in `src/safeguard.ts`) | Deny patterns are treated as enforced when they are only documented |
| A hook exit code of 1 asks the user | Exit 1 is a non-blocking warning; an ask is exit 0 plus a JSON `permissionDecision` | A recipe meant to pause silently continues |
| Skill files can grow freely | Tests cap interview (329), optimize (285), tune (228), and session-end (211) lines | Prose edits break the suite after the fact |
| A converged `update --preview` plans zero actions | It lists a `reconcile` for every verified file; only content-changing actions mean drift | A zero-drift check fails on a healthy install |
| A spec's Affected-Files table is the full blast radius | It's a hand-written hint; for a path/constant rename, `grep -rln` is authoritative. A relocated path often has silent readers (existence-gates, `try/catch` reads) the table omits | Feature quietly dies (no crash, no failing test) for those readers — e.g. the version-state relocation missed `init-autofix.ts`/`cli.ts`/the generated hook |
| Templates are just docs | Templates are the core product — they get copied into every user's project | Bad template = bad experience for every user |
| Skills can import other files | Skills must be fully self-contained — `.claude/skills/` files can't import | Broken skill for every user who installs it |
| CLAUDE.md merge is append-only | `improve-claude-md.ts` does section-level parsing and merging | Overwriting user's existing CLAUDE.md content |
| Test fixtures are stubs | Fixtures should mirror real-world manifest files (real package.json structures) | False confidence — tests pass but detection fails on real projects |
| Absolute paths are fine in templates | All templates and skills must use project-relative paths | Templates break when copied into user projects |
| CLAUDE.md and AGENTS.md carry equivalent instructions | They drift — this repo's own AGENTS.md was a stale TODO stub while CLAUDE.md held the real rules. Multi-tool layout now makes AGENTS.md the single source with CLAUDE.md as an `@AGENTS.md` import; only that structure prevents drift | Codex/Pi sessions run without the real boundaries (no scenarios rules, no branch flow) and nobody notices |
| Text in a shared `harness:claude\|codex` block is true for both harnesses | Shared blocks can encode one harness's behavior (decompose's handoff claimed subagent-per-spec — never true for Codex) | A harness ships instructions describing another harness's mechanics |

## Historical Incidents

| Date | What Happened | Lesson | Rule Added |
|------|-------------|--------|------------|
| 2026-03-25 | Level 5 autofix workflow used `--model` flag with Claude CLI | Claude Code has its own model resolution, not an API wrapper | Discovery logged, workflow templates updated |
| 2026-03-25 | pnpm/action-setup conflicted with packageManager in package.json | Use `packageManager` field, don't set explicit `version:` in action | Workflow template fixed |

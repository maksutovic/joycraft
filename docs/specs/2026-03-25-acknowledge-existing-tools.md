# Acknowledge Existing Tools — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-25-incremental-knowledge-capture.md`
> **Status:** Ready
> **Date:** 2026-03-25
> **Estimated scope:** 1 session / 3 files / ~50 lines

---

## What

Make `joycraft init` detect existing non-Joycraft skills in `.claude/skills/` and acknowledge them in the generated CLAUDE.md. This ensures Claude continues to use the user's existing tools alongside Joycraft's skills.

## Why

When Joycraft generates CLAUDE.md content, it focuses entirely on Joycraft's workflow (specs, briefs, discoveries). If the user has other skills and tools installed — custom flash scripts, log watchers, hardware channels — Claude may deprioritize them in favor of Joycraft's documented workflow. An explicit acknowledgment in CLAUDE.md keeps existing tools visible.

## Acceptance Criteria

- [ ] During init, scan `.claude/skills/` for non-Joycraft skill directories (anything not prefixed `joycraft-`)
- [ ] If non-Joycraft skills exist, add a "Project Tools" section to the generated CLAUDE.md listing them
- [ ] The section format: "This project has additional tools beyond Joycraft. Always check `.claude/skills/` for available skills: [list]"
- [ ] If no non-Joycraft skills exist, don't add the section (no empty boilerplate)
- [ ] During init, if existing non-Joycraft skills are detected, print a note: "Found existing skills: [list]. These are preserved — Joycraft is additive."
- [ ] New test: init with pre-existing non-Joycraft skills → CLAUDE.md mentions them
- [ ] New test: init with no pre-existing skills → no "Project Tools" section
- [ ] Build passes

## Constraints

- MUST NOT modify or remove existing skills
- MUST NOT rename or reorganize the user's skill directory structure
- MUST detect skills by directory name, not by reading file contents (fast, non-intrusive)
- SHOULD list skills by their directory name as-is (don't try to parse skill metadata)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/init.ts` | Scan for existing skills, pass to CLAUDE.md generator, print note |
| Modify | `src/improve-claude-md.ts` | Accept existing skills list, generate "Project Tools" section if non-empty |
| Modify | `tests/init.test.ts` | Add tests for existing skill detection and CLAUDE.md section |

## Approach

1. In `init.ts`, before copying Joycraft skills, read `.claude/skills/` directory entries
2. Filter to directories not prefixed with `joycraft-`
3. Pass the list to `generateCLAUDEMd()` / `improveCLAUDEMd()` as a new parameter
4. In `improve-claude-md.ts`, if the list is non-empty, add a "Project Tools" section after the Joycraft sections
5. Print a summary note during init

Rejected alternative: Scanning skill file contents for metadata — slower, more complex, and directory names are sufficient for acknowledgment.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No `.claude/skills/` directory | Skip detection entirely (init creates it fresh) |
| Skills directory exists but is empty | No "Project Tools" section |
| Skills with `joycraft-` prefix from a previous init | Treated as Joycraft skills, not listed |
| Skills with unusual names (spaces, dots) | List as-is — don't try to normalize |
| Hundreds of skills | List first 10, then "and N more — see .claude/skills/" |

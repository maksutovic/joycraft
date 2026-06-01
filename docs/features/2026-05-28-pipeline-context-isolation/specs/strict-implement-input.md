# Strict Implement Input — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-28-pipeline-context-isolation/brief.md`
> **Status:** Ready
> **Date:** 2026-05-28
> **Estimated scope:** 1 session / 3 skill files / ~15 lines

---

## What

Update the `joycraft-implement` skill (all three variants: pi, claude, codex) to **reject directory inputs and only accept a single spec file path**.

## Why

The context isolation test failed because the agent was given a directory path (`docs/features/2026-05-27-context-isolation-test/`) and discovered + read all specs inside it in a single session. There was never a spec boundary to cross.

## Acceptance Criteria
- [ ] Skill instructions tell the user to provide a single spec file path (`.md`), not a directory
- [ ] If the input path is a directory (ends with `/` or contains no `.md` file), the agent stops and tells the user to provide a single spec file
- [ ] If multiple spec paths are provided, the agent only processes the first one and ignores the rest (or warns)
- [ ] The skill no longer has a "Multi-Spec Handling" section that encourages batch processing
- [ ] Tests exist that verify the skill markdown contains the rejection language

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Rejects directories | Search skill markdown for "directory" + "reject" / "single spec file" | unit (content) |
| No multi-spec section | Search skill markdown for "Multi-Spec Handling" — must NOT exist | unit (content) |
| Single spec instruction | Search skill markdown for "single spec file path" or similar | unit (content) |

## Constraints
- MUST: Update all three skill variants: `src/pi-skills/joycraft-implement.md`, `src/claude-skills/joycraft-implement.md`, `src/codex-skills/joycraft-implement.md`
- MUST: Update `src/pi-skills/joycraft-implement.md` last (it is the source of truth for the pi extension)
- MUST NOT: Remove the TDD cycle instructions — only change the input parsing / multi-spec logic

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/pi-skills/joycraft-implement.md` | Step 1 rejects directories; remove multi-spec section |
| Modify | `src/claude-skills/joycraft-implement.md` | Same changes |
| Modify | `src/codex-skills/joycraft-implement.md` | Same changes |

## Approach

Replace the "Parse Arguments" step with strict single-file validation:

```
Step 1: Parse Arguments

The user must provide exactly one spec file path (e.g. docs/features/<slug>/specs/add-widget.md).

If the path is a directory (ends with / or does not end with .md):
  Stop and tell the user: "Please provide a single spec file path, not a directory. Example: /skill:joycraft-implement docs/features/<slug>/specs/spec-name.md"

If no path was provided:
  Tell the user: "No spec path provided. Check docs/features/<slug>/specs/ for available specs, or provide a path like: /skill:joycraft-implement docs/features/<slug>/specs/spec-name.md"
```

Remove the "Multi-Spec Handling" section entirely.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| User provides directory path | Agent refuses and asks for a single `.md` file |
| User provides multiple paths | Agent uses only the first one, warns about ignoring extras |
| User provides non-existent `.md` file | Agent proceeds to read it and gets a file-not-found error (standard behavior) |

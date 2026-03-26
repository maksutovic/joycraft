# Create Lockdown Skill — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-26-test-first-new-feature.md`
> **Status:** Complete
> **Date:** 2026-03-26
> **Estimated scope:** 1 session / 2-3 files / ~80 lines

---

## What

Create a new `/joycraft-lockdown` skill that generates constrained execution boundaries for an implementation session. When invoked, it asks what test files/dirs are off-limits, what commands are allowed (write code, run tests), and what's denied (network access, package installs, log reading, etc.). It then outputs CLAUDE.md NEVER rules and suggested deny patterns for `.claude/settings.json`.

## Why

Agents go rogue during implementation — downloading SDKs, pinging random IPs, clearing test files, reading logs and filling context. Lockdown mode constrains the agent to just writing code and running tests. This is optional and most valuable for complex tech stacks (hardware, firmware, multi-device), but available to anyone who wants tighter control.

## Acceptance Criteria

- [ ] New skill file exists at `src/skills/joycraft-lockdown.md`
- [ ] Skill asks what test files/directories should be read-only (NEVER edit)
- [ ] Skill asks what commands are allowed (defaults: write code, run smoke test, run full test suite)
- [ ] Skill generates CLAUDE.md NEVER rules for: editing test files, downloading packages, reading logs directly, network access beyond tests
- [ ] Skill suggests deny patterns for `.claude/settings.json` (e.g., deny `pip install`, `npm install`, `curl`, `wget`, `ping`)
- [ ] Skill outputs are suggestions the user can accept or modify — not auto-applied
- [ ] Skill explains when lockdown is useful vs. overkill (complex stacks, long-running autonomous sessions)
- [ ] Skill is registered in `src/init.ts` so it gets installed during `npx joycraft init`
- [ ] Skill is registered in `src/bundled-files.ts` if skills are defined there
- [ ] Build passes
- [ ] Tests pass

## Constraints

- MUST: Be a separate optional skill, not built into `/joycraft-new-feature`
- MUST: Output suggestions, not auto-modify CLAUDE.md or settings.json (user must approve)
- MUST: Work with any tech stack — no framework-specific deny patterns
- MUST NOT: Be presented as required or default — it's an advanced option for complex workflows
- MUST NOT: Block the user from running the locked-down session themselves — just provide the boundaries

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/skills/joycraft-lockdown.md` | New skill with lockdown interview + boundary generation |
| Modify | `src/init.ts` | Register the new skill for installation |
| Modify | `src/bundled-files.ts` | Add skill content if skills are inlined here |

## Approach

The skill follows a short interview:

1. "What test files/directories should be off-limits for editing?" → generates NEVER rules
2. "What test commands should the agent run?" (smoke, full suite, specific commands) → generates ALWAYS rules
3. "Any other commands to deny?" (defaults: package installs, network tools, log access) → generates deny patterns

Output format:

```
Lockdown boundaries generated. Add these to your project:

### CLAUDE.md — add to NEVER section:
- Edit any file in `tests/` or `__tests__/`
- Run `npm install`, `pip install`, or any package manager
- Use `curl`, `wget`, `ping`, or any network tool
- Read log files directly — interact with logs only through test assertions

### .claude/settings.json — suggested deny patterns:
["npm install", "pip install", "curl", "wget", "ping"]

Copy these into your project, or I can apply them now (with your approval).
```

**Rejected alternative:** Building lockdown into the execution flow automatically. Many developers working on simple tasks don't need this level of constraint, and forcing it would be annoying. A separate skill lets users opt in.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User has no tests yet | Skill notes that lockdown is most useful after tests are in place; suggest running `/joycraft-new-feature` first |
| User wants to allow some network access (e.g., API tests) | Skill asks which specific commands/endpoints to allow and excludes them from deny patterns |
| User wants to lock down everything including file writes | Skill warns this would prevent the agent from doing any work; suggest keeping code writes allowed |

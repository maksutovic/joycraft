# Generate Permission Rules from Stack Detection — Atomic Spec

> **Parent:** docs/research/contextual-stewardship-evals.md (Phase 1)
> **Status:** Ready
> **Date:** 2026-03-24
> **Estimated scope:** 1-2 sessions / 4 files / ~200 lines

---

## What

During `npx joycraft init` and `/joycraft-tune`, generate `.claude/settings.json` with stack-appropriate deny/ask/allow permission rules.

## Why

Praful's Claude Code agent reconfigured his entire home WiFi network trying to fix a hardware connectivity issue. The Alexi story: an agent wiped 1.9M rows of production data. Both were logically correct actions the agent took because nothing BLOCKED them. CLAUDE.md boundaries are advisory — permissions and hooks are enforcement.

## Acceptance Criteria

- [ ] `npx joycraft init` generates default deny rules in `.claude/settings.json`
- [ ] Merges into existing settings.json without overwriting user config
- [ ] Default deny rules for ALL projects: `rm -rf`, `git push --force`, `git reset --hard`, edit `.env*`/`.pem`/`.key`
- [ ] Stack-specific deny rules based on detected stack:
  - Node.js: deny `npm` (if pnpm detected), scope allowed package managers
  - Python: deny `pip install` without virtualenv
  - Infrastructure: deny `terraform apply`, `kubectl delete`
- [ ] `/joycraft-tune` assesses whether permissions exist and recommends additions
- [ ] Allow rules for common safe operations: `git status`, `git diff`, `git log`, `git add`, `git commit`, test commands
- [ ] Tests verify settings.json generation and merge behavior
- [ ] Build passes, tests pass

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/permissions.ts` | Permission rule generator based on StackInfo |
| Modify | `src/init.ts` | Call permission generator, merge into settings.json |
| Modify | `src/skills/joycraft-tune.md` | Assess permissions in Dimension 4 (Skills & Hooks) |
| Create | `tests/permissions.test.ts` | Test rule generation per stack |

## Approach

Read `.claude/settings.json` if it exists. Deep-merge our `permissions` block into it (never overwrite existing deny/allow rules). Write back. The permission generator takes a `StackInfo` and returns `{ allow: string[], deny: string[] }`.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No settings.json exists | Create it with permissions only |
| settings.json has existing permissions | Merge — add our deny rules, don't remove theirs |
| settings.json has conflicting rules | Our deny rules + their deny rules both apply (deny wins) |
| User explicitly allows something we deny | Their allow stays — we add deny, they can override with ask |

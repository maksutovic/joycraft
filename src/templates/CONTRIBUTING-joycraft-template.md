---
last_updated: YYYY-MM-DD
last_updated_by: <owner>
---

# Joycraft on this project

We use [Joycraft](https://www.npmjs.com/package/joycraft) for AI-assisted development. This doc is the team-specific bit; Joycraft itself is documented in its package README.

## How our team uses it

(Filled in during `/joycraft-collaborative-setup`. Examples: which skills are part of our normal flow, when we use `/joycraft-research` vs. skipping it, who reviews what.)

## Conventions

- Per-feature work goes under `docs/features/<slug>/{brief.md, research.md, design.md, specs/}`
- Area-level work and ownership: see `docs/areas/`
- Bug-fix specs stay under `docs/bugfixes/<area-name>/`
- Deferred work goes to `docs/backlog/`
- For "what is Joycraft?", see the package README

## Onboarding

When a new dev joins:
1. Run `npx joycraft init` (idempotent on already-set-up projects)
2. Read `docs/areas/<your-area>/README.md` for context
3. Read this file for team conventions
4. Skim a few recent `docs/features/*/brief.md` files to see how we frame work

## Skills we lean on

| Skill | When |
|-------|------|
| `/joycraft-new-feature` | Starting any non-trivial feature |
| `/joycraft-decompose` | Once the brief is approved |
| `/joycraft-implement` | Executing an atomic spec with TDD |
| `/joycraft-bugfix` | Bugs that need diagnosis-then-fix discipline |
| `/joycraft-session-end` | Wrapping up any session |

(Add or remove rows to match how your team actually works.)

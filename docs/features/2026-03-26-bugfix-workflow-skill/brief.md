# Bug Fix Workflow Skill — Feature Brief

> **Date:** 2026-03-26
> **Project:** Joycraft
> **Status:** Complete

---

## Vision

When a Joycraft user encounters a bug, they currently have no structured workflow to follow. They either run `/joycraft-new-feature` (which is too heavy — interview phase, feature brief, decomposition for a greenfield feature) or they just wing it. The agent itself recognized this gap: when asked to fix a bug via `/joycraft-new-feature`, it correctly said "this isn't a new feature" and abandoned the workflow entirely.

We need `/joycraft-bugfix` — a structured but lighter workflow purpose-built for diagnosing and fixing bugs. It skips the interview and feature brief but keeps the discipline: reproduce, diagnose, discuss the fix with the user, write a focused spec, and hand off for implementation. The spec goes into the same `docs/specs/` directory as feature specs (with a `bugfix-` prefix) because a spec is a spec regardless of origin.

The workflow is: **Triage → Diagnose → Discuss → Spec → Hand Off**. It's lighter than new-feature (no interview phase, no brief, no decomposition table) but heavier than "just fix it" (still produces a spec with acceptance criteria and a test plan, still enforces test-first discipline).

If someone runs `/joycraft-bugfix` for something that's clearly a new feature, the skill should redirect them to `/joycraft-new-feature` rather than trying to handle it.

## User Stories

- As a developer using Joycraft, I want a structured bug fix workflow so that I don't have to shoehorn bug reports into the new-feature interview process
- As a developer, I want bug fix specs in `docs/specs/` so that all project work has a traceable spec regardless of type
- As a developer, I want the agent to diagnose the root cause and discuss it with me before writing code so that we fix the right thing

## Hard Constraints

- MUST: Follow the existing skill file format (frontmatter with name, description, `---` separator, markdown body)
- MUST: Produce specs in `docs/specs/` with consistent structure (acceptance criteria, test plan, affected files)
- MUST: Use a lighter spec template than feature specs — no "Vision," no "Approach with rejected alternative," no decomposition
- MUST: Include a Discuss phase where findings are presented to the user before speccing the fix
- MUST NOT: Create a separate `docs/bugfixes/` directory — all specs stay in `docs/specs/`
- MUST NOT: Skip test-first discipline — bug fix specs still need a test plan
- MUST NOT: Attempt to handle greenfield features — redirect to `/joycraft-new-feature` if the request is clearly a new feature

## Out of Scope

- NOT: A generic `/joycraft-fix` catchall — we're building specifically for bugs
- NOT: Changes to `/joycraft-new-feature` — it stays as-is
- NOT: Automated bug detection or triage — the user brings the bug to us
- NOT: Integration with issue trackers (GitHub Issues, Linear, etc.)

## Test Strategy

- **Existing setup:** Vitest + TypeScript
- **Test types:** Unit tests for skill content validation, integration test for init copying the new skill
- **Smoke test budget:** <5 seconds

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | create-bugfix-skill | Create the `joycraft-bugfix.md` skill with Triage → Diagnose → Discuss → Spec → Hand Off workflow | None | M |
| 2 | add-bugfix-spec-template | Add a lighter bug fix spec template to the skill that omits Vision/Approach but keeps AC, test plan, and affected files | Spec 1 | S |
| 3 | register-bugfix-skill-in-init | Add the new skill to the init scaffolding so it gets installed to `.claude/skills/` on `npx joycraft init` | Spec 1 | S |

## Execution Strategy

- [x] Sequential (specs have chain dependencies)

Spec 1 creates the skill file, Spec 2 refines the embedded template, Spec 3 wires it into init. Simple chain.

## Success Criteria

- [ ] `/joycraft-bugfix` is available as a skill in projects initialized with Joycraft
- [ ] Running the skill walks through Triage → Diagnose → Discuss → Spec → Hand Off
- [ ] Bug fix specs land in `docs/specs/` with `bugfix-` prefix and lighter template
- [ ] Skill redirects to `/joycraft-new-feature` when the request is clearly a feature, not a bug
- [ ] No regressions in existing skills or init behavior
- [ ] `pnpm test --run && pnpm typecheck` passes

# Pipit Golden Examples — Feature Brief

> **Date:** 2026-04-04
> **Project:** Joycraft
> **Status:** Complete

---

## Vision

Pipit's level classifier starts cold — it has Joycraft skill files and project context, but no examples of "this capture was good enough for decompose" vs "this one needed an interview first." Golden examples close the feedback loop.

After a successful Joycraft pipeline run (interview → brief → specs → execution), the `/joycraft-session-end` skill silently generates a "golden example" — a curated capture-to-classification pair stored in the user's project. Over time, Pipit's classifier gets better per-project because it has real examples of what worked.

The flow: user yaps → Pipit classifies → Joycraft executes → session-end generates golden example → Pipit loads examples as few-shot context → classifications improve. This is a per-project feedback loop — examples reflect the patterns and language of each specific project.

Joycraft's role is write-only: generate and store the files. Pipit's role (future, out of scope) is read-only: load them into the classifier prompt.

## User Stories

- As a developer using Pipit, I want my level classifications to improve over time so that captures route to the right Joycraft skill without manual correction
- As a Joycraft session-end user, I want golden examples generated silently so that the feedback loop works without extra effort or prompting
- As a developer setting up a new project, I want Joycraft init to scaffold the golden examples directory so the storage location exists from the start

## Hard Constraints

- MUST: Develop entirely in the Joycraft repo — no Pipit-side work
- MUST: Be silent — no user prompting, no conversational output about golden example generation
- MUST: Store examples per-project in the user's project directory
- MUST: Use Markdown with YAML frontmatter (consistent with specs/briefs, optimal for LLM context)
- MUST: Be opt-in / gracefully absent — classifier works fine without golden examples
- MUST NOT: Block Pipit Phase 0 — this is an enhancement for when both projects exist
- MUST NOT: Reference absolute paths in templates or generated files

## Out of Scope

- NOT: Pipit-side classifier changes (Pipit reads these files; that's Pipit's feature)
- NOT: Auto-pruning or aging out old golden examples
- NOT: Cross-project golden examples (each project has its own)
- NOT: Using golden examples for fine-tuning (few-shot prompting only)
- NOT: User confirmation before saving (always auto-generate)
- NOT: Golden example quality scoring or validation

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | scaffold-pipit-directory | Add `docs/pipit-examples/` to init scaffolding with a brief README explaining Pipit and that the directory is optional | None | S |
| 2 | define-golden-example-format | Create the golden example Markdown template with YAML frontmatter: capture text, classification, decomposition summary, rationale | None | S |
| 3 | generate-golden-example-in-session-end | Add golden example generation to session-end skill — silently writes a golden example file after a successful pipeline run | Spec 1, 2 | M |

## Execution Strategy

- [x] Sequential (spec 3 depends on 1 and 2)
- [ ] Agent teams
- [ ] Parallel worktrees
- [ ] Mixed

Specs 1 and 2 are independent and can run in parallel. Spec 3 depends on both.

```
Phase 1: Spec 1 (scaffold) + Spec 2 (format) — parallel
Phase 2: Spec 3 (generation logic) — depends on Phase 1
```

## Success Criteria

- [ ] `npx joycraft init` creates `docs/pipit-examples/` with a README
- [ ] After a session that produces a brief + specs, `/joycraft-session-end` writes a golden example to `docs/pipit-examples/`
- [ ] Golden example contains: original capture, classification, decomposition summary, rationale
- [ ] Golden example is valid Markdown with YAML frontmatter
- [ ] No user prompting occurs during golden example generation
- [ ] Projects without `docs/pipit-examples/` don't error — generation is skipped silently
- [ ] No regressions in existing init or session-end behavior

## External Scenarios

| Scenario | What It Tests | Pass Criteria |
|----------|--------------|---------------|
| fresh-init-has-pipit-dir | Init on empty project creates pipit-examples with README | Directory exists, README explains Pipit |
| session-end-no-brief | Session-end without a prior brief/specs run | No golden example generated, no error |
| session-end-with-brief | Session-end after interview → brief → specs | Golden example written with all required fields |
| existing-project-no-dir | Session-end on project that wasn't scaffolded with pipit-examples | Generation skipped silently, no error |

# README Restructure & Skill Workflow Improvements — Feature Brief

> **Date:** 2026-04-06
> **Project:** Joycraft
> **Status:** Decomposing

---

## Vision

Joycraft's README is 376 lines and front-loads philosophy before actionable content. Research into top OSS projects (shadcn/ui, Turborepo, tRPC, Aider, Drizzle) shows the pattern is: tagline, quick start within 20 lines, feature bullets with links to docs, deep content elsewhere. The README should be a lobby, not a manual.

The key addition is a scenario-based quick start that solves the "magic words" problem — new users don't know that saying "decompose" triggers a skill. The quick start maps situations to skills: "When you have X, use Y."

Separately, the skill handoff pipeline has a gap. The intended workflow is interview → research → design → decompose → execute, but actual handoffs skip research and design entirely. The interview skill hands off to new-feature or decompose. The new-feature skill goes straight to decompose. Even the research skill skips design in its handoff. The creator himself skips research and design because the skills don't nudge him there. Fix the handoffs to recommend the full pipeline with a heuristic nudge for complex features.

Additionally, `new-feature` should detect existing draft briefs in `docs/briefs/` and offer to formalize them, preventing the redundant re-interview that happens when users go interview → new-feature.

Finally, `src/skills/` should be renamed to `src/claude-skills/` for clarity alongside the existing `src/codex-skills/` directory.

## User Stories

- As a new Joycraft user, I want to land on the GitHub page and within 30 seconds know which skill to use for my situation
- As a developer who just ran `/joycraft-interview`, I want the next step to suggest research or design when appropriate, not just decompose
- As a developer running `/joycraft-new-feature` after an interview, I want it to find my existing draft brief and offer to formalize it instead of re-interviewing me
- As a contributor to Joycraft, I want `src/claude-skills/` and `src/codex-skills/` to be clearly named so I know which directory serves which platform

## Hard Constraints

- MUST: Keep the "Standing on the Shoulders of Giants" section in the README
- MUST: Preserve all deep content — move to `docs/guides/`, never delete
- MUST: Update both `src/claude-skills/` (renamed from `src/skills/`), `src/codex-skills/`, AND `templates/claude-kit/skills/` for any skill changes
- MUST: Keep skills self-contained (no imports between skill files)
- MUST NOT: Change the post-init flow (tune is still first after init)
- MUST NOT: Delete any methodology or philosophy content — relocate it

## Out of Scope

- NOT: Skill invocation evals (testing whether Claude auto-invokes skills from natural language) — separate session
- NOT: Skill analytics/telemetry — separate session
- NOT: Changes to the post-init flow or tune skill
- NOT: Docs site (just use `docs/` directory for now)
- NOT: Renaming the `joycraft-design` skill (confirmed keeping current name)

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | rename-skills-directory | Rename `src/skills/` → `src/claude-skills/`, update all imports and references | None | S |
| 2 | extract-readme-deep-content | Move interview, research/design, test-first, Level 5, tuning, permissions, and methodology sections to `docs/guides/` files, leaving one-liner + link stubs in README | None | M |
| 3 | add-scenario-quick-start | Add scenario-based "When you have X, use Y" table to README quick start section | Spec 2 (needs final README structure) | S |
| 4 | update-mermaid-diagram | Update the workflow mermaid diagram to show both fast path (brief → decompose) and full path (brief → research → design → decompose) with heuristic guidance | Spec 2 | S |
| 5 | fix-skill-handoffs | Update handoff sections in interview, new-feature, and research skills to recommend research/design with complexity heuristics | None | M |
| 6 | new-feature-draft-detection | Make new-feature skill check `docs/briefs/` for recent draft briefs and offer to formalize instead of re-interviewing | None | S |

## Execution Strategy

- [x] Mixed
- Specs 1, 5, and 6 are independent — can run in parallel worktrees
- Specs 2, 3, 4 are sequential (README restructure flows into quick start and diagram)

## Success Criteria

- [ ] README is ~150 lines with links to `docs/guides/` for deep content
- [ ] A developer lands on the GitHub page and within 30 seconds knows which skill to use
- [ ] `src/claude-skills/` and `src/codex-skills/` are clearly named parallel directories
- [ ] After an interview or new-feature session, Claude suggests research and/or design for complex features (not just decompose)
- [ ] `/joycraft-new-feature` detects existing draft briefs and offers to formalize them
- [ ] All deep methodology/philosophy content preserved in `docs/guides/`
- [ ] "Shoulders of Giants" section remains in README
- [ ] All skill changes reflected in `src/claude-skills/`, `src/codex-skills/`, and `templates/claude-kit/skills/`
- [ ] `pnpm test --run && pnpm typecheck` passes
- [ ] No regressions in existing features

# README Restructure & Skill Workflow Improvements — Draft Brief

> **Date:** 2026-04-06
> **Status:** DRAFT
> **Origin:** /joycraft-interview session

---

## The Idea

Two related improvements to Joycraft's user experience:

**README restructure:** The current README is 377 lines and front-loads philosophy before actionable content. Research into top OSS projects (shadcn/ui, Turborepo, tRPC, Aider, Drizzle) shows the pattern is: tagline, quick start within 20 lines, feature bullets with links to docs, deep content lives elsewhere. The README should be a lobby, not a manual. The key addition is a scenario-based quick start that tells users "when you have X situation, use Y skill" — because new users don't know the skill names (the "magic words" problem). The "Shoulders of Giants" section stays in the README.

**Skill handoff pipeline:** The intended workflow is interview → research → design → decompose → execute, but the actual skill handoffs skip research and design entirely. The interview skill hands off to new-feature or decompose. The new-feature skill goes interview → brief → decompose with no mention of research or design. Even the research skill skips design in its handoff. The creator himself skips research and design because the skills don't nudge him there. Fix: update handoff sections to recommend the full pipeline with an explicit "skip if simple" escape hatch.

## Problem

1. New users can't figure out which skill to use or how to invoke them. They don't know the "magic words" like "decompose" that trigger skill matching. The README doesn't help because it lists features, not scenarios.
2. The research → design pipeline exists as skills but is disconnected from the main workflow. Users go straight from interview/brief to decompose, missing the steps that catch wrong assumptions before they propagate into specs.

## What "Done" Looks Like

- A developer lands on the Joycraft GitHub page and within 30 seconds knows which skill to use for their situation
- The README is ~150 lines with links to docs/ for deep content
- After an interview or new-feature session, Claude naturally suggests research and/or design as the next step (not just decompose)
- A developer who says "I want to understand how endpoints work before building a new one" gets nudged toward /joycraft-research without knowing the skill name
- The "Shoulders of Giants" section stays in the README
- All deep methodology/philosophy content is preserved in docs/ files, not deleted

## Constraints

- Don't change the post-init flow (tune is still the first thing after init)
- Don't delete any content — move it to docs/
- Skill changes must also be reflected in Codex skill variants (src/codex-skills/)
- Keep skill files self-contained (no imports)

## Resolved Questions

1. **Workflow mermaid diagram in README?** Yes — update it to show the full pipeline (interview → research → design → decompose) and distinguish optional from recommended steps.

2. **Should new-feature duplicate the interview?** No — make new-feature check `docs/briefs/` for recent draft briefs first. If one exists, offer to formalize it instead of re-interviewing. This makes interview → new-feature a smooth handoff, not a repeat. New-feature still works standalone for the all-in-one flow.

3. **How aggressively to nudge toward research/design?** Use heuristics. E.g., "this brief touches 5+ files, consider running research first" or "this feature has architectural decisions, consider running design first." Always recommend with an explicit "skip if simple" escape hatch.

4. **Where should deep docs live?** `docs/guides/` per topic — matches the existing pattern (`docs/guides/level-5-autonomy.md`). README links to each guide. No separate docs site for now.

5. **Do README deep-dive docs still get linked?** Yes — every section moved to docs/ gets a one-liner + link in the README so users can opt into the deep content.

## Out of Scope (for now)

- Skill invocation evals (testing whether Claude auto-invokes skills from natural language) — separate session per Atharva conversation
- Skill analytics/telemetry (PostHog events when skills are invoked) — separate session
- Changes to the post-init flow or tune skill
- Docs site (just use docs/ directory for now)

## Raw Notes

- Atharva Vaidya (external dev) reports skills "never get fucking invoked" and "CC does dumb shit" — has to manually invoke skills every time. His team wrote evals for skill invocation. This is a real discoverability problem for non-creator users.
- Praful notes Claude's docs are outdated, which contributes to confusion about how skills work
- Max reports that saying "decompose the draft into specs" works well for natural language invocation — the key is using vocabulary that matches the skill's description field
- The scenario-based approach ("when you have X, use Y") is both a README improvement AND a way to teach users the vocabulary that triggers skill matching
- Research and design were added recently (2026-03-30 specs) — they're the newest skills and haven't been integrated into the workflow handoffs yet
- Interview and new-feature have redundant built-in interviews — fix by making new-feature detect existing draft briefs and offer to formalize them instead of re-interviewing
- Deep docs should follow the existing pattern: `docs/guides/` per topic (like `docs/guides/level-5-autonomy.md`)
- README should always link to docs — it's a lobby with signposts, not the full manual

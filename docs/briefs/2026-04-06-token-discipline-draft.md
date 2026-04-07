# Token Discipline — Draft Brief

> **Date:** 2026-04-06
> **Status:** DRAFT
> **Origin:** /joycraft-interview session

---

## The Idea

Joycraft's workflow already produces documentation at every step — briefs, specs, discoveries, session-end summaries. That means conversation context is disposable: the artifacts live in files, not in the chat history. We should lean into this by nudging users to `/clear` between major workflow steps, and by giving them a diagnostic skill to audit their Claude Code context overhead.

Inspired by Nate B Jones's article on token waste patterns, the insight is that token discipline shouldn't be a conscious habit — it should be infrastructure. Joycraft is already well-positioned (skills are lazy-loaded, not boot-loaded), but we can do more to help users keep their sessions lean.

## Problem

Claude Code users accumulate context debt without realizing it. Long conversations compound cost per turn. Meanwhile, plugin/MCP bloat can load tens of thousands of tokens before the first prompt. Joycraft's own workflow — which naturally produces written artifacts at each phase — creates a perfect opportunity to break sessions cleanly between steps, but currently doesn't nudge users to do so.

## What "Done" Looks Like

1. **Clear nudges in skill handoffs.** After `/joycraft-interview`, `/joycraft-new-feature`, `/joycraft-decompose`, `/joycraft-session-end`, and implementation steps — each skill's handoff section includes a nudge to run `/clear` before starting the next phase. Brief explanation of why: the artifacts are in files, the conversation is disposable.

2. **`/joycraft-optimize` skill.** A diagnostic that audits the user's Claude Code session overhead:
   - Measures CLAUDE.md size (tokens)
   - Counts MCP server tool definitions loaded
   - Checks hook injection patterns and their output sizes
   - Identifies plugin bloat (skills vs plugins distinction — skills are lazy-loaded and free at boot, plugins/hooks may not be)
   - Reports total boot tax with actionable recommendations to trim

3. **Documentation.** README and/or docs explain:
   - Why `/clear` > `/compact` in Joycraft's workflow (artifacts are in files, no context worth preserving)
   - The difference between skills (lazy-loaded, zero boot cost) and plugins/hooks/MCP (potentially always-loaded)
   - Links to Nate B Jones's token optimization resources (stupid button prompt kit, Heavy File Ingestion skill, OB1 repo) as complementary tools

## Constraints

- Light touch — awareness and nudges, not active prevention or enforcement
- No new runtime dependencies
- Clear nudges should be a one-line addition to existing skill handoff sections, not a workflow interruption
- `/joycraft-optimize` should work in any Claude Code project, not just Joycraft-scaffolded ones
- Don't reimplement what Nate/OB1 already built — reference and link instead

## Open Questions

- What's the right threshold for "your CLAUDE.md is too big"? Need to research typical sizes and where diminishing returns kick in
- Can we programmatically count MCP tool definitions from within a skill, or do we need to rely on the user running `/context` and pasting output?
- Should `/joycraft-optimize` be part of `/tune` (a new dimension in the 7-dimension assessment) or a standalone skill?
- Should we suggest specific token counts in the nudges ("your conversation is ~X tokens, clearing saves Y") or keep it qualitative?

## Out of Scope (for now)

- Active waste prevention (hooks that block heavy file ingestion, auto-model-routing) — better suited for Pipit
- API-level token optimization (prompt caching, model routing for API architects)
- Claude Desktop users — staying focused on Claude Code
- Building our own "stupid button" diagnostic — link to Nate's instead
- Conversation length warnings or auto-clear — too aggressive for light touch

## Raw Notes

- Nate's article identifies four levels of token waste: rookie (raw PDF ingestion), intermediate (conversation sprawl), plugin hoarders (boot tax), advanced (unscoped agent context). Joycraft primarily helps with intermediate and plugin hoarder levels.
- Key stat from article: someone loaded 66k tokens of skills/plugins/frontmatter before their first prompt. Skills are NOT part of this problem (lazy-loaded), but hooks and MCP tools are.
- The "KISS commandments" for agents (index refs, prepare context, cache stable context, scope per-agent, measure burn) could be useful as generated CLAUDE.md guidance for projects that detect agent/AI dependencies — but that's a separate feature.
- Nate's OB1 repo: contains Heavy File Ingestion skill and stupid button prompt kit — link don't reimplement.
- The beauty of Joycraft's approach: every workflow step produces a file artifact. Interview -> brief. Brief -> specs. Specs -> code + tests. Session -> discoveries. The conversation is literally just scaffolding that can be thrown away after each step.

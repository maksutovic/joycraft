# Incremental Knowledge Capture — Feature Brief

> **Date:** 2026-03-25
> **Project:** Joycraft
> **Status:** Decomposing

---

## Vision

Joycraft's risk interview captures critical project knowledge during `/joycraft-tune`, but most knowledge surfaces *during development*, not during setup. A developer flashing firmware discovers that Claude keeps connecting to serial directly instead of using the project's flash script. A developer running tests discovers they fail when Wi-Fi is down and Claude spirals trying wrong fixes. These are the facts that matter most — and right now there's no way to capture them without breaking flow.

This feature adds three things:

1. **`/joycraft-add-fact`** — A lightweight skill that takes a fact ("when tests fail with timeout, check Wi-Fi first") and intelligently routes it to the right context document. No interview, no questions — just capture and confirm. This is the incremental counterpart to the risk interview's upfront capture.

2. **Troubleshooting guide** — A new context document (`docs/context/troubleshooting.md`) with a "When X → Do Y" structure for diagnostic knowledge. This is where environment-specific gotchas live: what to do when hardware disconnects, when tests fail for non-code reasons, when Claude should wait instead of acting.

3. **Non-regression safeguards** — Hardening `joycraft init` to never regress a user's existing Claude Code setup. The current `settings.json` merge is additive but has an edge case where malformed JSON causes a fresh start (losing existing config). And CLAUDE.md content should explicitly acknowledge other tools/skills the user has installed.

The unifying insight (from cofounder Praful Mathur): "add a fact" and "diagnosis guide" are two sides of the same coin — both are about capturing what-to-do-when-stuck knowledge incrementally, after the initial setup, during real work.

## User Stories

- As a developer mid-session, I want to say "add fact: always use flash.sh to flash firmware, never connect to serial directly" and have it captured in the right place so Claude remembers next time.
- As a developer whose tests keep failing for environmental reasons, I want a troubleshooting guide that tells Claude "when you see timeout errors, check Wi-Fi first" so it doesn't spiral through wrong solutions.
- As a developer with existing Claude Code tools and skills, I want `joycraft init` to never break my existing setup — it should only add, never remove or overwrite.

## Hard Constraints

- MUST: `/joycraft-add-fact` is a self-contained skill (single markdown file) — routing logic is in the prompt, not TypeScript
- MUST: Facts are appended to existing context docs, never overwriting content
- MUST: The troubleshooting template follows the same pattern as other context docs (copied during init, user owns it)
- MUST: `settings.json` merge preserves ALL existing config, even if the file has unexpected structure
- MUST NOT: Add runtime dependencies
- MUST NOT: Require the user to specify which document to route to (skill infers from content)

## Out of Scope

- NOT: Automatic fact extraction from conversation (detecting when Claude learns something)
- NOT: Fact confidence decay or staleness tracking (future concern)
- NOT: Integration with specific hardware toolchains (the feature is generic)
- NOT: Rewriting the entire `settings.json` merge logic (just fix the malformed-file edge case)
- NOT: Detecting conflicts between Joycraft skills and user skills at the prompt level (complex, separate effort)

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | add-troubleshooting-template | Create `troubleshooting.md` template, add to init, add to bundled-files | None | S |
| 2 | add-fact-skill | Create `/joycraft-add-fact` skill with intelligent routing to context docs | Spec 1 | M |
| 3 | harden-settings-merge | Fix malformed JSON edge case in init.ts, add existing-config preservation | None | S |
| 4 | acknowledge-existing-tools | Add "other tools" note to generated CLAUDE.md, detect existing skills during init | Spec 3 | S |

## Execution Strategy

- [x] Mixed — Specs 1 and 3 are independent (parallel), Spec 2 depends on 1, Spec 4 depends on 3

## Success Criteria

- [ ] `/joycraft-add-fact` correctly routes facts to all 5 context docs (production-map, dangerous-assumptions, decision-log, institutional-knowledge, troubleshooting)
- [ ] `troubleshooting.md` template is installed during `joycraft init`
- [ ] `joycraft init` on a project with existing `settings.json` (including malformed JSON) never loses existing config
- [ ] `joycraft init` on a project with existing `.claude/skills/` warns about potential conflicts
- [ ] Generated CLAUDE.md references existing non-Joycraft tools when they exist
- [ ] All existing tests still pass
- [ ] New tests cover the settings.json hardening and troubleshooting template installation

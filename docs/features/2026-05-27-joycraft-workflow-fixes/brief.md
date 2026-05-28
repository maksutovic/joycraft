# Joycraft Workflow Fixes — Feature Brief

> **Date:** 2026-05-27
> **Project:** joycraft
> **Status:** Interview

---

## Vision

Three small workflow bugs discovered during Pi Support development get fixed: AGENTS.md shouldn't point users to CLAUDE.md (they're independent files for different harnesses), the research and design skills should update the parent brief with back-reference links after writing their artifacts, and the research skill should write to the per-feature layout (`docs/features/<slug>/research.md`) instead of the flat `docs/research/` directory.

Each fix is trivial in scope (1-10 lines) but collectively they make the workflow feel coherent — skills leave breadcrumbs, files stand alone, output lands where you expect it.

## User Stories
- As a Pi/Codex user, I want AGENTS.md to stand alone without pointing me to a Claude-specific file
- As a spec author, I want research and design artifacts to automatically link back to the feature brief so the decompose skill can find them
- As a Joycraft user, I want research output to land in the feature's own folder, not a flat global directory

## Hard Constraints
- MUST: Changes are additive — do not break existing AGENTS.md generation or skill behavior
- MUST: Back-reference format matches existing brief conventions (`> **Research:**`, `> **Design:**`)
- MUST: Research skill fallback to flat layout when no feature brief exists
- MUST NOT: Change the AGENTS.md section-merging logic — only change the one line

## Out of Scope
- NOT: OpenSpec-style delta markers (separate feature)
- NOT: Changing the research/design artifact content format
- NOT: Adding back-references to other skills

## Test Strategy
- **Existing setup:** vitest, 594 tests passing
- **User expertise:** comfortable
- **Test types:** unit (AGENTS.md output verification, skill content grep)
- **Smoke test budget:** < 5 seconds
- **Lockdown mode:** no

## Decomposition
| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | remove-agents-md-claude-cross-ref | Drop "See CLAUDE.md" from AGENTS.md auto-generation | None | S |
| 2 | add-brief-backreferences-from-skills | Research and design skills update parent brief with back-reference links after writing artifacts | None | S |
| 3 | fix-research-skill-output-path | Research skill writes to per-feature layout instead of flat docs/research/ | None | S |

## Execution Strategy
- [ ] Sequential (specs have chain dependencies)
- [x] Parallel (specs are independent)
- [ ] Mixed

## Success Criteria
- [ ] `generateAgentsMd()` output no longer contains "See CLAUDE.md"
- [ ] Research skill includes instructions to update brief with `> **Research:**` back-reference
- [ ] Design skill includes instructions to update brief with `> **Design:**` back-reference
- [ ] Research skill writes to `docs/features/<slug>/research.md` when a brief exists
- [ ] Research skill falls back to `docs/research/` when no brief exists
- [ ] All existing tests pass
- [ ] `pnpm build` passes
- [ ] `pnpm typecheck` passes

# Fix Skill Handoffs — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-readme-and-workflow-improvements.md`
> **Status:** Ready
> **Date:** 2026-04-06
> **Estimated scope:** 1 session / 9 files / ~60 lines changed

---

## What

Update the handoff sections of the interview, new-feature, and research skills to recommend research and/or design as the next step when the feature is complex. Currently all three skills skip research and design entirely — interview hands off to new-feature or decompose, new-feature hands off to decompose, and research hands off to decompose. After this change, each handoff nudges toward the full pipeline with a complexity heuristic and a "skip if simple" escape hatch.

## Why

The research → design pipeline exists as skills but is disconnected from the main workflow. Users go straight from interview/brief to decompose, missing the steps that catch wrong assumptions before they propagate into specs. Even the creator skips research and design because the skills don't nudge him there.

## Acceptance Criteria

- [ ] `joycraft-interview` handoff suggests research and/or design between new-feature and decompose
- [ ] `joycraft-new-feature` handoff suggests research and/or design before decompose, with a complexity heuristic
- [ ] `joycraft-research` handoff suggests design as the next step before decompose
- [ ] Each handoff includes a "skip if simple" escape hatch (e.g., "skip to decompose if scope is clear and < 5 files")
- [ ] Complexity heuristic is present: e.g., "this brief touches multiple files, has architectural decisions, or you're unfamiliar with this area"
- [ ] Changes applied to all three directories: `src/claude-skills/`, `src/codex-skills/`, `templates/claude-kit/skills/`
- [ ] Skills remain self-contained (no imports)
- [ ] Build passes (`pnpm build`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Handoff text updated in all 3 skills | Read each skill file, verify handoff section contains research/design suggestions | manual review |
| All three directories updated | Diff claude-skills vs codex-skills vs templates for each skill — handoff sections match | manual review |
| Skills self-contained | Grep for `import` or `require` in updated skill files — none found | manual review |
| Build passes | `pnpm build` succeeds | integration |

**Smoke test:** `pnpm build` — confirms no syntax issues in skill files that break the build.

## Constraints

- MUST: Keep each skill self-contained
- MUST: Apply changes to `src/claude-skills/`, `src/codex-skills/`, AND `templates/claude-kit/skills/`
- MUST: Include a "skip if simple" escape hatch in every handoff
- MUST NOT: Change any skill behavior outside the handoff section
- MUST NOT: Make research or design mandatory — they are recommended with heuristics

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/claude-skills/joycraft-interview.md` | Handoff section (lines ~77-88): add research/design suggestions |
| Modify | `src/claude-skills/joycraft-new-feature.md` | Handoff section (Phase 4, lines ~157-183): add research/design before decompose |
| Modify | `src/claude-skills/joycraft-research.md` | Handoff section (Phase 3, lines ~89-100): add design before decompose |
| Modify | `src/codex-skills/joycraft-interview.md` | Same handoff changes |
| Modify | `src/codex-skills/joycraft-new-feature.md` | Same handoff changes |
| Modify | `src/codex-skills/joycraft-research.md` | Same handoff changes |
| Modify | `templates/claude-kit/skills/new-feature.md` | Same handoff changes (note: filename is `new-feature.md` not `joycraft-new-feature.md`) |
| Modify | `templates/claude-kit/skills/interview.md` | Same handoff changes (if exists; check filename) |
| Modify | `templates/claude-kit/skills/research.md` | Same handoff changes (if exists; check filename) |

## Approach

For each of the three skills, replace the existing handoff text with a version that:

1. Lists the recommended next step based on complexity:
   - **Complex features** (touches 5+ files, has architectural decisions, unfamiliar codebase area): recommend research → design → decompose
   - **Medium features** (clear scope but non-trivial): recommend design → decompose
   - **Simple features** (scope is clear, < 5 files, well-understood area): skip to decompose
2. Presents this as a heuristic recommendation, not a gate
3. Uses consistent language across all three skills

**Alternative rejected:** Making research/design mandatory gates in the handoff. Rejected because simple bugfixes and clear features don't need them — forced steps would slow users down and train them to skip the workflow entirely.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User runs interview for a trivial idea | Handoff still mentions research/design but the "skip if simple" text makes it clear they can go straight to decompose |
| Codex skill variants have different formatting | Adapt the handoff text to match Codex's existing style (e.g., `$joycraft-*` instead of `/joycraft-*`) |
| Template skills have different filenames | Use the correct filename for each directory (e.g., `new-feature.md` vs `joycraft-new-feature.md`) |

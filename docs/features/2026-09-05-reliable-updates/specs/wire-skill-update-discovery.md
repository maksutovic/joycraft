---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
mode: checkpoint
---

# Wire Skill Update Discovery — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Spec:** 10 of 15
> **Dependencies:** 9 — implement-shared-update-checker.md
> **Status:** In Review
> **Date:** 2026-09-06
> **Estimated scope:** 1 session / 8–12 files plus generated copies / ~250 lines

---

## What

Add one short common checker instruction to the canonical skill-generation path so every rendered Joycraft skill can run the local checker at entry without changing its frontmatter. Replace the existing Claude SessionStart version-check script with an adapter to that same checker and register it as a managed artifact, while leaving non-Claude native hooks untouched until their APIs are verified.

## Why

The current update notices are scattered among the CLI, upgrade path, and a Claude-only registry script, so skills have no consistent, policy-aware discovery behavior and installed harness copies can drift after a source edit.

## Acceptance Criteria

- [x] All five generated harness variants invoke the checker once through a short common entry instruction without changing skill frontmatter. [src: design §2]
- [x] Missing/failed checker execution continues the skill without repeated bootstrap attempts; current/postponed/offline checks stay quiet. [src: design §2]
- [x] The verified Claude SessionStart adapter invokes the same checker and belongs to the managed inventory; no unverified native hook is added. [src: design §2]
- [x] Updates occur at a workflow boundary and explain skill reinvocation or session restart; every source edit synchronizes all generated and installed copies in its own commit. [src: design §2]
- [x] Position-sensitive tests still check the intended semantic sections after the common entry is inserted. [src: design §2]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Five generated variants and unchanged frontmatter | Iterate over every canonical skill and all five fresh transformations, asserting exactly one rendered common entry instruction per skill and byte-identical frontmatter to its source. | unit |
| Quiet, non-blocking skill entry | Test the shared rendered instruction’s documented command and failure branch against a missing checker, an error exit, and checker output for current/postponed/unknown, asserting it directs the agent to continue the requested skill without a bootstrap retry. | content regression |
| Claude adapter and managed inventory | Initialize a Claude target, inspect generated settings and managed inventory, and launch the hook adapter with a fixture checker to prove it calls `check.mjs` rather than fetching npm directly; assert no Codex, Pi, Copilot, or omp hook registration is created. | integration |
| Workflow boundary and synchronized trees | Assert the rendered instruction says updates happen after the active skill through reinvocation or restart; run the repository generation/sync verification tests and compare source, all five generated trees, and all five installed trees. | regression |
| Semantic-section resilience | Update or add targeted skill tests that locate named semantic sections, then assert the common entry appears in the intended shared position without weakening position-sensitive coverage to a broad substring check. | unit |

**Execution order:**

1. Add the semantic and transformation tests before changing canonical skill source or hook generation; confirm they fail.
2. Implement the shared instruction, adapter, inventory registration, generation, and sync.
3. Run focused skill/init tests, `pnpm sync-skills`, then `pnpm test && pnpm typecheck` with the working tree clean of generated drift.

**Smoke test:** transform one canonical skill for all five harnesses and inspect the generated Claude SessionStart adapter in a temporary initialized project.

**Before implementing, verify your test harness:**

1. New tests must be red before the canonical source and hook implementation change.
2. Each test must consume `src/skills/`, `applyTemplate`, generated output, or `init()` rather than copying expected instruction text into a substitute implementation.
3. Use the per-skill transform smoke test for seconds-fast feedback; reserve the full freshness/sync suite for validation after generation.

## Constraints

- MUST: Preserve user files, selections, unrelated config, and unknown state fields; missing state and `--yes` never grant blanket overwrite permission. [src: brief "Hard Constraints"]
- MUST: Use one canonical skill source and regenerate all bundled and installed harness variants after source edits. [src: brief "Hard Constraints"]
- MUST: Keep shipped paths project-relative and honor the external validation boundary. [src: brief "Hard Constraints"]
- MUST: Keep skill checks quiet when current, postponed, offline, or unavailable, and honor the user’s notification policy. [src: brief "Hard Constraints"]
- MUST: Put the common entry instruction in the canonical generation path, keep it to a short paragraph plus its command, render it once per skill, and leave frontmatter unchanged. [src: design §2]
- MUST: Update at a workflow boundary and explain reinvocation or restart when the harness cannot reload a changed skill. [src: design §2]
- MUST: Regenerate and sync source-derived artifacts in every affected commit, including generated and installed copies for Claude, Codex, Pi, Copilot, and omp. [src: brief "Hard Constraints"]
- MUST: Use meaningful production-function tests and run the required build/test/type checks; never defer a red suite to a final sync step. [src: brief "Test Strategy"]
- MUST NOT: Add a native hook whose API has not been verified, alter unrelated skill behavior, or modify CLAUDE.md merge/improve logic. [src: design §2]
- MUST NOT: Inspect the external holdout repository or change its dispatch behavior. [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|--------|------|--------------|
| Modify | `scripts/lib/skill-template.mjs` | Render the short shared entry instruction in every harness variant. |
| Modify | `src/skills/*.md` | Add only the canonical common-entry source needed by the renderer. |
| Modify | `src/init.ts` | Generate and register a Claude SessionStart adapter that delegates to `docs/.joycraft/check.mjs`. |
| Modify | `src/bundle-inventory.ts` | Mark the Claude adapter and checker as managed artifacts after inventory work is available. |
| Modify | `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/copilot-skills/`, `src/omp-skills/` | Regenerated harness variants; never hand-edit. |
| Modify | `.claude/skills/`, `.agents/skills/`, `.pi/skills/`, `.github/skills/`, `.omp/skills/` | Synced installed copies; never hand-edit. |
| Modify | `tests/skill-template.test.ts`, `tests/init.test.ts`, and affected skill tests | Cover rendering, semantic placement, SessionStart behavior, and no unverified hooks. |

## Approach

Use the template engine as the one insertion point, with harness-neutral language that tells the agent to invoke the local checker once and proceed quietly when it cannot help. Keep the canonical skill text and frontmatter stable except for the shared generated entry behavior. Replace the inlined Claude fetch script with a tiny delegating adapter, preserving the existing verified SessionStart registration shape and making both files inventory-owned. Regenerate with `pnpm sync-skills` in the same source-changing commit so all five generated and five installed trees remain byte-synchronized.

Reject adding five harness-specific native hooks. Their capabilities have not been verified, they add independent lifecycle contracts, and the approved design explicitly limits this work to the portable entry instruction plus Claude’s existing adapter.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Checker file is absent after a partial or legacy installation | The skill continues its requested work and does not attempt to install or repeatedly bootstrap the checker. |
| Checker returns current, postponed, offline, or unknown | No update offer is repeated; the entry instruction remains quiet. |
| A skill is already loaded when an update becomes available | The agent defers any update until the workflow boundary and says to reinvoke the skill or restart the session as applicable. |
| Existing Claude settings contain other SessionStart hooks | Preserve them and add or replace only the managed Joycraft adapter registration. |
| A source skill is changed | The same commit regenerates all five source trees and syncs all five installed harness trees. |
| Non-Claude harness supports an undocumented hook format | Do not create a hook registration based on inference. |

## Implementation Evidence

All 110 canonical skill/harness combinations preserve their existing transformed frontmatter and body with one common entry. The managed Claude adapter delegates to the shared checker, bounds stdin, and shares its documented session identity with later commands. Installed-script subprocess tests cover quiet failures, explicit acknowledgement, separate postponement, and session suppression. All five generated and installed trees were synchronized. Build, type checking, and the full staged suite passed: 3,356 tests, one skipped.

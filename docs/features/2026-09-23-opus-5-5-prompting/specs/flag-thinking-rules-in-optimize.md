---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-24
feature: 2026-09-23-opus-5-5-prompting
mode: checkpoint
---

# Flag Thinking Rules in Optimize — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-23-opus-5-5-prompting/brief.md`
> **Status:** Ready
> **Date:** 2026-09-24
> **Estimated scope:** 1 session / 1 skill + regen + tests / ~40 lines

---

## What

`src/skills/joycraft-optimize.md` Step 2c ("Compare Rules Against the Model Profile") flags a third class of rule beside anti-formatting and hand-holding:

- **Thinking instructions** — rules that tell the model to think harder or longer ("think step by step", "think carefully", "ultrathink") or to write its reasoning into the reply ("explain your reasoning before you code", "show your work"). Check them against *Drop Thinking Instructions*, citing the profile path and heading.
- **Model-aware disposition (decision D4).** Read the block's `Applies to:` line and work out which harnesses read the file that holds the rule: `CLAUDE.md` is read by Claude Code; `AGENTS.md` is read by the harnesses the project selected (Codex, Pi, omp, Copilot, and Claude Code when CLAUDE.md imports it). A harness counts as covered when it is Claude Code, or when its Execution Profile row names a model the block covers. `RETIRE` only when every reading harness is covered. Otherwise `PROBATION`, with a Reason that says to scope the rule to the model that needs it instead of deleting it.
- The Reason for a write-out-your-reasoning rule names the `reasoning_extraction` refusal.

Update the sentence "Flag two classes of rule" to three classes. Evidence stays `MODEL_SUPERSEDED`; no new evidence label and no new disposition, so the hard-coded label and disposition counts do not change.

## Why

Old memory files carry think-harder rules that cost latency on Opus 5.5 and can trigger refusals, but other models reading the same file can still need them.

## Acceptance Criteria

- [ ] Step 2c names three rule classes and describes Thinking instructions with the example phrases above. [src: D4]
- [ ] Step 2c states the RETIRE-or-PROBATION rule by reading harnesses and the Execution Profile. [src: D4]
- [ ] The step cites `docs/templates/reference/model-profile-claude.md` and *Drop Thinking Instructions*. [src: brief "Decomposition"]
- [ ] Evidence label and disposition counts in the skill are unchanged. [src: INVENTED]
- [ ] Generated variants and installed trees regenerated in the same commit. [src: brief "Hard Constraints"]
- [ ] Build passes; tests pass. [src: brief "Success Criteria"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Three classes | `tests/upgrade-optimize-v2.test.ts`: Step 2c section of `src/claude-skills/joycraft-optimize.md` contains "three classes" (or the exact phrase you write) and "Thinking instructions" | unit |
| Example phrases | Same: contains "think step by step" and "explain your reasoning" | unit |
| Model-aware rule | Same: contains `RETIRE`, `PROBATION`, "Execution Profile", and "scope" within Step 2c | unit |
| Citation | Same: contains the profile path and "Drop Thinking Instructions" | unit |
| Counts unchanged | Existing count assertions in `tests/upgrade-optimize-v2.test.ts` stay green without edits | unit |
| Citation heading exists | `tests/upgrade-optimize-v2.test.ts`: the existing "cites at least one block by a heading that exists in the profile doc" test reads the headings of `docs/templates/reference/model-profile-claude.md`; add an assertion that "Drop Thinking Instructions" is one of those headings and appears in Step 2c (the heading exists after spec 2). `tests/model-profile-citations.test.ts` does not cover optimize: its `SKILLS` list holds five other skills and it parses quoted block names, while optimize cites blocks in italics | unit |

**Execution order:**
1. Write the tests — red.
2. Confirm.
3. Edit the skill, `pnpm sync-skills`, until green.

**Smoke test:** `pnpm vitest run tests/upgrade-optimize-v2.test.ts`

**Before implementing, verify your test harness:**
1. The new assertions must FAIL first
2. They read the generated claude variant
3. Seconds to run

## Constraints

- MUST: keep optimize advisory; it never edits a memory file. [src: brief "Hard Constraints"]
- MUST: keep six dispositions and the existing evidence labels. [src: INVENTED]
- MUST: run `pnpm sync-skills` and commit variants and installed trees together. [src: brief "Hard Constraints"]
- MUST NOT: change the anti-formatting and hand-holding classes. [src: D4]
- ASK FIRST boundary: skill content. The approved brief (D4) names this change. [src: D4]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-optimize.md` | Step 2c |
| Regenerate | `src/{claude,codex,pi,copilot,omp}-skills/joycraft-optimize.md`, `src/bundled-files.ts` | `pnpm sync-skills` (generate-bundled-files) |
| Regenerate | `.claude/skills/joycraft-optimize/SKILL.md`, `.agents/skills/joycraft-optimize/SKILL.md`, `.pi/skills/joycraft-optimize/SKILL.md`, `.github/skills/joycraft-optimize/SKILL.md`, `.omp/skills/joycraft-optimize/SKILL.md` | `pnpm sync-skills` (sync-skills) |
| Modify | `tests/upgrade-optimize-v2.test.ts` | New assertions |

## Approach

Add one bullet-style paragraph for the new class and one for the model-aware rule, inside the existing Step 2c prose. The existing PROBATION definition ("unverified under the current model, or the user wrote it on purpose") already fits the scoping case.

Rejected alternative: always RETIRE thinking rules. The human's D4 rationale says other models can still need them.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| This repo: AGENTS.md read by Codex (5.6 terra) and Pi (kimi-k3) | Any thinking rule there gets PROBATION with scoping advice |
| Claude-only project, rule in CLAUDE.md | RETIRE |
| Execution Profile row says `session default` | That harness is not covered unless it is Claude Code |
| No profile doc (Codex-only) | Existing `INACCESSIBLE` path |

---
status: done
owner: Maximilian Maksutovic
created: 2026-09-22
feature: 2026-09-22-fable-native-sdlc-harness
mode: checkpoint
---

# Cite Profile In Skills — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-22-fable-native-sdlc-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-09-22
> **Estimated scope:** 1 session / 5 skill sources + generated variants + installed trees / ~40 lines of prose

---

## What

Five skill sources under `src/skills/` gain a one-line citation of the model-profile doc at the exact point where the cited behavior matters. Each citation names the installed path `docs/templates/reference/model-profile-claude-fable-5-1.md` **and one block name** from that doc. No block prose is copied — the whole point of D1 is one home per fact.

The five skills and the placement for each, verified against the current sources:

| Skill source | Placement | Block to cite |
|---|---|---|
| `src/skills/joycraft-implement.md` | Step 6 "Wrap Up and Continue", at the mode-aware wrap-up instruction that already tells the agent not to hand back to the human (the paragraph beginning "**You perform the wrap-up. You find the next spec.**", currently around line 125) | finish the whole task |
| `src/skills/joycraft-implement-feature.md` | Step 3 "Fail-Fast" / Step 4 "Finish — Session-End Once" region in the `harness:claude` branch, where the driver is told to keep running the queue rather than stop and report | finish the whole task; keep changes and tests to what the task asks |
| `src/skills/joycraft-session-end.md` | Section 3 "Graduate Specs `in-review → done`", beside the rule that only `in-review` specs graduate and nothing is marked to cover a failure | keep changes and tests to what the task asks |
| `src/skills/joycraft-new-feature.md` | Phase 1 interview technique block, next to the existing style-contract line at the head of Phase 2 (currently around line 112) | progress updates; end state |
| `src/skills/joycraft-interview.md` | The "Play Back Understanding" slot block and the "Hand Off" block, both of which already carry a style-contract line naming `docs/templates/reference/output-style.md` (currently around lines 97 and 270) | progress updates; end state |

The citation reads as one sentence appended next to the existing instruction, in the same register as the existing `output-style.md` style-contract lines those skills already carry. `joycraft-implement.md` alone already cites `output-style.md` at its report block, so the idiom is established and the new line copies it: name the doc, name the block, do not restate the block.

Because `tests/regenerate-bundled-files.test.ts` runs `scripts/generate-bundled-files.mjs` in a `beforeAll`, any edit under `src/skills/` regenerates `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/copilot-skills/`, and `src/omp-skills/` on the next `pnpm test` and turns the installed-sync suites red until `pnpm sync-skills` runs. Regeneration and sync therefore land in **this** spec's commit, never deferred.

## Why

The profile doc is inert unless the skills that run at the moments it governs point at it. An agent wrapping up a spec, driving a feature queue, graduating specs, or running an interview gate is exactly where Fable 5.1's stop-short, scope-creep, and silent-agent behaviors surface, and a citation at that line is what makes the doc load at the moment it changes behavior rather than never.

## Acceptance Criteria

- [ ] `src/skills/joycraft-implement.md` cites `docs/templates/reference/model-profile-claude-fable-5-1.md` by path and names the "finish the whole task" block, inside Step 6's wrap-up region [src: brief "Decomposition"]
- [ ] `src/skills/joycraft-implement-feature.md` cites the doc by path and names at least one block, in the `harness:claude` queue-driving region [src: brief "Decomposition"]
- [ ] `src/skills/joycraft-session-end.md` cites the doc by path and names at least one block, in the spec-graduation region [src: brief "Decomposition"]
- [ ] `src/skills/joycraft-new-feature.md` cites the doc by path and names at least one block [src: brief "Decomposition"]
- [ ] `src/skills/joycraft-interview.md` cites the doc by path and names at least one block [src: brief "Decomposition"]
- [ ] Every citation names the **installed** path `docs/templates/reference/model-profile-claude-fable-5-1.md`, never `src/templates/...`, because a user project only ever has the installed copy [src: brief "Hard Constraints"]
- [ ] No skill body contains more than one line of text copied from any profile-doc block — citations point, they do not restate [src: D1]
- [ ] Every block name cited by a skill exists as a `## ` heading in `src/templates/reference/model-profile-claude-fable-5-1.md`, asserted mechanically so a heading rename in spec 1 breaks this test rather than drifting silently [src: D1]
- [ ] `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/copilot-skills/`, and `src/omp-skills/` are regenerated and the installed trees `.claude/skills`, `.agents/skills`, `.pi/skills`, `.github/skills`, `.omp/skills` are synced in this same commit [src: brief "Hard Constraints"]
- [ ] `tests/artifact-render-steps.test.ts` and `tests/gate-slot-contract-placement.test.ts` still pass, or their character-window thresholds are widened with a comment citing this spec [src: brief "Test Strategy"]
- [ ] A new vitest file `tests/model-profile-citations.test.ts` asserts the five citations and the block-name-exists check [src: brief "Test Strategy"]
- [ ] Build passes [src: brief "Test Strategy"]
- [ ] Tests pass [src: brief "Test Strategy"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Five skills cite the path | for each of the five sources, content matches `docs/templates/reference/model-profile-claude-fable-5-1.md` | unit |
| Placement: implement | the citation's index falls after the Step 6 heading and before the Report block | unit |
| Placement: interview | the citation's index falls inside the playback or hand-off region, not in the frontmatter or Guidelines tail | unit |
| Installed path only | no source of the five matches `src/templates/reference/model-profile` | unit |
| Block names resolve | every block name cited across the five skills exists as a `## ` heading in the profile doc | unit |
| No copied prose | no cited block's body sentence appears verbatim in any of the five skill sources | unit |
| Generated variants regenerated | the five citations are present in the corresponding `src/claude-skills/` files after regeneration | unit |
| Installed sync green | the existing `tests/installed-skills-sync*.test.ts` suites pass | integration |
| Character windows | `tests/artifact-render-steps.test.ts` and `tests/gate-slot-contract-placement.test.ts` pass | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the five-citation presence test (`pnpm test tests/model-profile-citations.test.ts`).

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: regenerate bundled variants (`scripts/generate-bundled-files.mjs`) and run `pnpm sync-skills` in the same commit as the skill edits [src: brief "Hard Constraints"]
- MUST: cite by path plus block name, copying no block text — one home per fact [src: brief "Hard Constraints"]
- MUST: name the installed path `docs/templates/reference/model-profile-claude-fable-5-1.md`, which is what a user project has [src: brief "Hard Constraints"]
- MUST: copy no block text — cite by path plus block name [src: D1]
- MUST NOT: defer regeneration or sync to a later spec — the test suite regenerates bundles on every run, so a deferral commits a red suite [src: brief "Hard Constraints"]
- MUST NOT: edit `src/templates/reference/model-profile-claude-fable-5-1.md` — spec 1 owns the doc, and a heading rename here would silently break spec 11's citations too [src: brief "Decomposition"]
- MUST NOT: edit any of `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/copilot-skills/`, `src/omp-skills/` by hand — they are generated, and the 0.7.3 twelve-wrong-copilot-skills incident came from a hand edit [src: brief "Hard Constraints"]
- MUST NOT: add a runtime dependency [src: brief "Hard Constraints"]
- MUST NOT: add a citation to `src/skills/joycraft-bugfix.md` or any skill outside the five named — the roster is fixed by the brief [src: brief "Decomposition"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-implement.md` | One citation line in Step 6's wrap-up region |
| Modify | `src/skills/joycraft-implement-feature.md` | One citation line in the claude-branch queue-driving region |
| Modify | `src/skills/joycraft-session-end.md` | One citation line in the spec-graduation region |
| Modify | `src/skills/joycraft-new-feature.md` | One citation line at the Phase 1/Phase 2 boundary |
| Modify | `src/skills/joycraft-interview.md` | Citation lines at the playback and hand-off blocks |
| Modify | `src/claude-skills/*.md`, `src/codex-skills/*.md`, `src/pi-skills/*.md`, `src/copilot-skills/*.md`, `src/omp-skills/*.md` | Generated — regenerated from the five edited sources |
| Modify | `.claude/skills/`, `.agents/skills/`, `.pi/skills/`, `.github/skills/`, `.omp/skills/` | Installed copies synced by `pnpm sync-skills` |
| Create | `tests/model-profile-citations.test.ts` | Citation presence, placement, installed-path-only, block-name resolution |
| Modify | `tests/artifact-render-steps.test.ts`, `tests/gate-slot-contract-placement.test.ts` | Only if a character-window threshold trips — widen with a comment citing this spec |
| Modify | `src/bundled-files.ts` | Generated — skill bodies change |

## Approach

Verify the target step still exists in each skill source before editing it — the line numbers in this spec's placement table were read on 2026-09-22 and drift. Open each of the five sources, locate the target step by its heading text rather than by line number, and append one sentence beside the instruction already there. Keep each citation to one sentence, so the five skills stay inside optimize's per-skill line budget. Model the wording on the existing style-contract idiom those skills carry, so the new line reads as a sibling of `Write this report to the style contract in docs/templates/reference/output-style.md.` rather than as a new kind of directive.

The placement in `joycraft-interview.md` needs care: both target blocks sit inside fixed-slot templates whose per-slot caps are declared hard, so the citation goes in the prose immediately **above** the fenced slot template, never inside the fence. Same rule for the optimize-style gate blocks elsewhere.

After editing, run `pnpm sync-skills` (which runs the generator then the sync), then `pnpm test`. Expect the two character-window suites to be the first to complain if any edit lands inside a measured window; widen the threshold and comment it with this spec's name, exactly as the stamp-gate spec did when it moved 2500 to 3600.

**Rejected alternative:** a single citation in one shared preamble that all skills inherit. Skills must be self-contained once installed to `.claude/skills/`, so there is no shared preamble to inherit from, and a pointer that is not at the line where the behavior matters gets skipped at output time.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| A target step has a `<!-- harness:... -->` branch | Put the citation in the shared prose outside the branch when the behavior is harness-neutral; duplicate it into each branch only when the surrounding instruction already differs per harness |
| The citation would land inside a fenced slot template | Place it in the prose immediately above the fence — slot caps are hard and the fence is byte-governed |
| `tests/artifact-render-steps.test.ts` trips on the new distance | Widen the threshold, comment the change with this spec's name, and keep the citation where the behavior is |
| Spec 1 has not landed yet | The block-name-resolution test fails because the doc does not exist — correct behavior; this spec depends on spec 1 |
| A block name in spec 1 gets renamed later | The block-name-resolution test goes red, which is the intended coupling rather than silent drift |
| `pnpm sync-skills` reports no change | Something did not regenerate; re-run the generator and inspect `src/claude-skills/` before committing |

---
status: in-review
owner: Maximilian Maksutovic
created: 2026-06-14
feature: 2026-06-11-single-source-skills
mode: checkpoint
---

# Canonicalize Boundary Forms — Atomic Spec

> **Parent Brief:** `docs/features/2026-06-11-single-source-skills/brief.md`
> **Status:** Ready
> **Date:** 2026-06-14
> **Estimated scope:** 1 session / ~60 per-harness files swept / mechanical text replacement

---

## What

Sweep all 20 skills × 3 harnesses (`src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`) to one canonical form per category D ("boundary file" — `CLAUDE.md` / `AGENTS.md` / both). Per research.md Q3 RE-AUDIT "Substitution-category inconsistencies", the codebase currently carries **5 distinct in-the-wild forms**:

1. `the project boundary file` (abstracted prose)
2. `CLAUDE.md and/or AGENTS.md` (**allowlisted** — this is the target canonical form)
3. `CLAUDE.md or AGENTS.md`
4. `CLAUDE.md/AGENTS.md`
5. bare `AGENTS.md` (in codex/pi only)

Only form 2 is allowlisted as the legal Cat D expansion. The other 4 are drift that, if left unfixed, will force the per-skill migration in specs 4–6 to make a Cat D judgment call on every occurrence — multiplying decision surface across 18 dirty skills.

**This spec does NOT create `src/skills/` files.** It edits the per-harness dirs in place so that each harness file uses the canonical-for-that-harness Cat D form (`CLAUDE.md` in claude, `AGENTS.md` in codex/pi). Per-skill migration in spec 4+ then has a uniform drift surface and a single `{{boundary_file}}` substitution to make.

## Why

Research.md "Implications for spec 3 / spec 4 decomposition" explicitly recommends this: "The Cat D inconsistency (5 forms, only 1 allowlisted) is the most pervasive drift and should be addressed before per-skill migration — pick one canonical form, sweep all 20 skills, then migrate. Doing the sweep first reduces drift surface and lets more skills be authored as truly clean canonicals." Without this sweep, every per-skill migration re-litigates the Cat D form and the chance of inconsistency compounds.

## Acceptance Criteria

- [ ] In `src/claude-skills/`: every reference to the user's boundary file uses literal `CLAUDE.md`. No `AGENTS.md`, no `CLAUDE.md and/or AGENTS.md`, no `the project boundary file`, no `CLAUDE.md/AGENTS.md`, no `CLAUDE.md or AGENTS.md`.
- [ ] In `src/codex-skills/` and `src/pi-skills/`: every reference to the user's boundary file uses literal `AGENTS.md` (matching how `{{boundary_file}}` will expand for codex/pi when post-migration generation runs — see Edge Cases for the codex/pi expansion).
- [ ] Literal references to *this Joycraft repo's own* `CLAUDE.md` (not the user's boundary file) are left alone — judgment per occurrence; document any kept-as-is occurrences in the PR description.
- [ ] No `src/skills/` files are created in this spec.
- [ ] `src/bundled-files.ts` is regenerated in the same commit as the per-harness edits (per [[project_frictionless_implement]] and `docs/discoveries/2026-06-11-bundle-regen-per-commit.md`).
- [ ] `pnpm test --run && pnpm typecheck` pass (existing sync tests will catch any bundle/disk drift).
- [ ] After this spec lands, `git grep -nE '(CLAUDE\.md and/or AGENTS\.md|CLAUDE\.md or AGENTS\.md|CLAUDE\.md/AGENTS\.md|the project boundary file)' src/claude-skills/ src/codex-skills/ src/pi-skills/` returns zero matches.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Claude harness uses only `CLAUDE.md` | `git grep -n 'AGENTS\.md' src/claude-skills/` returns 0 matches (or only matches that are about *this* repo's AGENTS.md, documented in PR) | manual / scripted grep |
| Codex/Pi harnesses use only `AGENTS.md` | `git grep -n 'CLAUDE\.md' src/codex-skills/ src/pi-skills/` returns 0 matches (or documented exceptions) | manual / scripted grep |
| No drift forms remain | `git grep -nE '(CLAUDE\.md and/or AGENTS\.md\|CLAUDE\.md or AGENTS\.md\|CLAUDE\.md/AGENTS\.md\|the project boundary file)' src/claude-skills/ src/codex-skills/ src/pi-skills/` returns 0 matches | scripted grep |
| Bundle stays in lockstep | `pnpm test --run tests/bundled-files-sync.test.ts` passes | integration |
| Generator residue tests still pass | `pnpm test --run tests/generate-bundled-files.test.ts` passes | integration |
| Codex parity preserved | `pnpm test --run tests/codex-skill-parity.test.ts` passes | integration |
| Pi content preserved | `pnpm test --run tests/pi-skill-content.test.ts` passes (or expectations updated to match canonical Cat D form) | integration |

**Execution order:**
1. Run the four grep commands above against the current tree to enumerate every occurrence. Save the list — that's your worklist.
2. For each occurrence: decide if it refers to the user's boundary file (rewrite to canonical) or this repo's own file (leave alone, note in PR).
3. Edit each per-harness file to use the canonical form for its harness.
4. Run `pnpm build` to regenerate `src/bundled-files.ts`.
5. Run the full test suite. Sync tests will fail if `bundled-files.ts` is stale; parity/content tests will fail if a per-harness expectation was hand-coded against the old drift forms — update those expectations as needed (note in PR).
6. Commit per-harness edits + `src/bundled-files.ts` together.

**Smoke test:** the grep commands above run in <1s — use them after every batch of edits to confirm you're converging.

**Before implementing, verify your test harness:**
1. Run the four greps first — they MUST return non-zero matches today (otherwise the drift has already been fixed and the spec is redundant).
2. Run `pnpm test --run` once on baseline so you know which tests were green before you started.
3. Confirm `src/skills/` is empty / non-existent — this spec does NOT create canonical files.

## Constraints

- MUST: pick `CLAUDE.md` as the canonical claude form and `AGENTS.md` as the canonical codex/pi form (matches how `{{boundary_file}}` will expand post-migration).
- MUST: rewrite every in-the-wild drift form (5 variants) to the per-harness canonical.
- MUST: leave references to *this Joycraft repo's own* CLAUDE.md alone — judgment per occurrence, documented in PR.
- MUST: regenerate `src/bundled-files.ts` in the same commit.
- MUST NOT: create any files in `src/skills/`. That's spec 4+.
- MUST NOT: introduce `{{boundary_file}}` substitutions in per-harness files. The substitution token only appears in `src/skills/` (created later). Per-harness files always carry the resolved literal.
- MUST NOT: rewrite content beyond Cat D drift — no folding sections, no fixing Cat A/B/C drift, no re-wording. Cat A–C and section drift are spec 4+ work.
- MUST NOT: change `pi-skill-content.test.ts` expectations to *hide* a regression. If an expectation must change, that's intentional and noted in the PR.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify (sweep) | `src/claude-skills/joycraft-*.md` (up to 20 files) | Boundary references → `CLAUDE.md` only |
| Modify (sweep) | `src/codex-skills/joycraft-*.md` (up to 20 files) | Boundary references → `AGENTS.md` only |
| Modify (sweep) | `src/pi-skills/joycraft-*.md` (up to 20 files) | Boundary references → `AGENTS.md` only |
| Modify | `src/bundled-files.ts` | Regenerated by `pnpm build` |
| Modify (if expectations clash) | `tests/pi-skill-content.test.ts`, `tests/codex-skill-parity.test.ts` | Update any expected strings that hardcoded the old drift form — only if test failures expose them |

## Approach

**Recipe:**
1. Enumerate occurrences. Run `git grep -nE '(CLAUDE\.md|AGENTS\.md|the project boundary file)' src/claude-skills/ src/codex-skills/ src/pi-skills/` and copy the output. Separate user-boundary references from this-repo references by reading context.
2. Group by harness. Treat `src/claude-skills/` as one batch, `src/codex-skills/` + `src/pi-skills/` as the AGENTS-batch.
3. Rewrite mechanically. For each user-boundary occurrence: pick the canonical for that harness. Watch for compound forms (`CLAUDE.md and/or AGENTS.md`, `CLAUDE.md/AGENTS.md`) — these collapse to the harness-canonical, not both.
4. Build and test. `pnpm build && pnpm test --run`. Investigate any failure as either (a) sync test catching missed regen, (b) parity test catching expectation clash, or (c) genuine regression.
5. Commit. Per-harness edits + `bundled-files.ts` together.

**Rejected alternative:** do the Cat D sweep inside each per-skill migration in spec 4+. Multiplies decision surface (18 dirty-skill migrations × Cat D judgments) and risks inconsistent canonical choices across skills. Doing it as a focused sweep here means one canonical choice, applied uniformly.

**Rejected alternative:** sweep claude to `CLAUDE.md and/or AGENTS.md` (the allowlisted compound form) and codex/pi to the same. That's the substitution *output* shape for some authors' mental model, but the actual `{{boundary_file}}` expansion per design.md Section 4 is `CLAUDE.md` for claude and `AGENTS.md` for codex/pi (with the `and/or` form being a third option for "address both audiences in one canonical sentence"). Standardizing on the simple per-harness form is what the migration in spec 4+ will produce — sweeping to that form now matches the post-migration end state.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| A file references `CLAUDE.md` but in context it means *this Joycraft repo's own* CLAUDE.md (e.g. "look in CLAUDE.md to see Joycraft's own boundaries") | Leave it. Note in PR description. The `{{boundary_file}}` substitution in spec 4+ also only fires for user-boundary references, so consistency is preserved. |
| A file references `AGENTS.md` in a claude-harness file (rare) | Either it's a copy-paste error (rewrite to `CLAUDE.md`) or it's about this repo's own AGENTS.md (leave alone). Read context. |
| `pi-skill-content.test.ts` fails after the sweep because it hard-coded `CLAUDE.md and/or AGENTS.md` as expected pi content | Update the test expectation to `AGENTS.md`. Note in PR. This is the expected outcome of "tests previously matched drift; now they match canonical." |
| The bundle test fails because `bundled-files.ts` wasn't regenerated | Run `pnpm build`. Commit `bundled-files.ts` together with the per-harness edits. |
| You find a Cat A/B/C drift while doing the Cat D sweep | Leave it. This spec is scoped to Cat D only. Note it in the PR description as observed-but-deferred. Spec 5 will pick it up. |
| The compound form `CLAUDE.md and/or AGENTS.md` appears in a sentence that genuinely addresses both audiences (e.g. "Joycraft writes to either CLAUDE.md and/or AGENTS.md depending on harness") | Read carefully — if the sentence is *about* the dual-target behavior, keep the compound. If it's a per-harness instruction to the user, collapse to the harness-canonical. Document any compound-kept occurrences in PR. |

---
status: done
owner: Maximilian Maksutovic
created: 2026-06-14
feature: 2026-06-11-single-source-skills
mode: checkpoint
---

# Migrate Clean Skills (Strict) — Atomic Spec — RETIRED 2026-06-14

> **RETIRED.** The audit's "2 strictly-clean skills" classification was wrong: `joycraft-collaborative-setup` has out-of-allowlist drift (mid-sentence wording rewrite + Cat B codex authoring gap) that the 4-var engine can't express, so the 2-skill POC was unworkable as written. The POC value this spec was meant to provide (engine validation on real content) is already covered by spec 3's sweep over all 60 per-harness files. `joycraft-setup` and `joycraft-collaborative-setup` will be migrated by specs 5/6 alongside the other 18 skills, slotted into the unify or conditional bucket based on each one's actual drift. Spec 5's `depends_on` repointed from `[4]` to `[3]`. See conversation 2026-06-14 for the full reasoning.
>
> **Parent Brief:** `docs/features/2026-06-11-single-source-skills/brief.md`
> **Status:** Retired
> **Date:** 2026-06-14
> **Estimated scope:** 1 session / 2 canonical files created, 6 per-harness files regenerated / ~600 lines moved

---

## What

Migrate the **2 strictly-clean skills** (per research.md Q3 RE-AUDIT) from per-harness dirs to canonical `src/skills/` form:

1. `joycraft-collaborative-setup`
2. `joycraft-setup`

These are the only skills whose per-harness variants are byte-equivalent under just the 4-variable substitution + `instructions:` strip (the strict allowlist defined in research.md Q3 RE-AUDIT). After spec 3 lands the Cat D sweep, the surviving drift in these 2 is purely mechanical (Cat A invocation, Cat B clear verb, Cat C skills dir, Cat E frontmatter).

**Order:**
1. Migrate `joycraft-collaborative-setup` first as the POC. Run `pnpm build`. Verify each of the three regenerated per-harness files diffs cleanly against `main`'s post-spec-3 state. Iterate the canonical until the diff is empty.
2. Then migrate `joycraft-setup` using the same recipe.
3. Commit canonical + 3 regenerated + `bundled-files.ts` together (per skill or once at the end; checkpoint mode allows either).

After this spec, `src/skills/` contains 2 canonical files; the per-harness dirs still hold all 20 (the other 18 are still hand-maintained, to be migrated in specs 5 + 6).

## Why

The 2-skill POC validates the substitution engine + Cat D sweep end-to-end against real content with zero policy decisions. If `joycraft-collaborative-setup` generates byte-identical variants, the engine + sweep work. This isolates engine bugs from drift-resolution judgment calls (which come in specs 5 + 6).

## Acceptance Criteria

- [ ] `src/skills/joycraft-collaborative-setup.md` exists; running `pnpm build` produces `src/{claude,codex,pi}-skills/joycraft-collaborative-setup.md` byte-identical to the post-spec-3 committed state.
- [ ] `src/skills/joycraft-setup.md` exists; same byte-equivalence holds.
- [ ] `ls src/skills/` shows 2 `.md` files. (Specs 5 + 6 grow this to 20.)
- [ ] All existing sync tests (`tests/bundled-files-sync.test.ts`, `tests/generate-bundled-files.test.ts`, `tests/codex-skill-parity.test.ts`, `tests/pi-skill-content.test.ts`) pass unchanged.
- [ ] Residue assertions from spec 2 pass (no `{{` or unclosed harness blocks in any emitted per-harness file).
- [ ] `pnpm test --run && pnpm typecheck` pass.
- [ ] Bundle regeneration commit(s): `src/skills/<name>.md`, `src/{claude,codex,pi}-skills/<name>.md`, and `src/bundled-files.ts` all in the same commit (per [[project_frictionless_implement]] and `docs/discoveries/2026-06-11-bundle-regen-per-commit.md`).

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| `joycraft-collaborative-setup` POC: claude variant matches | `git diff HEAD~ -- src/claude-skills/joycraft-collaborative-setup.md` empty post-`pnpm build` (HEAD~ = post-spec-3 baseline) | integration |
| Same for codex | `git diff HEAD~ -- src/codex-skills/joycraft-collaborative-setup.md` empty | integration |
| Same for pi | `git diff HEAD~ -- src/pi-skills/joycraft-collaborative-setup.md` empty | integration |
| `joycraft-setup` claude variant matches | `git diff HEAD~ -- src/claude-skills/joycraft-setup.md` empty | integration |
| Same for codex | `git diff HEAD~ -- src/codex-skills/joycraft-setup.md` empty | integration |
| Same for pi | `git diff HEAD~ -- src/pi-skills/joycraft-setup.md` empty | integration |
| Bundle stays in lockstep | `tests/bundled-files-sync.test.ts` passes | integration |
| No residue | `tests/generate-bundled-files.test.ts` residue assertions pass | integration |
| Codex parity preserved | `tests/codex-skill-parity.test.ts` passes | integration |
| Pi content preserved | `tests/pi-skill-content.test.ts` passes | integration |

**Execution order:**
1. Pull `joycraft-collaborative-setup` claude variant as the base. Replace Cat A/B/C tokens with `{{skill_prefix}}`, `{{clear}}`, `{{skills_dir}}` substitutions; replace Cat D `CLAUDE.md` with `{{boundary_file}}`; leave `instructions:` in frontmatter (generator strips it for codex/pi).
2. Run `pnpm build`. Diff all three regenerated variants against the pre-canonical state. Iterate the canonical until clean.
3. Once green, repeat for `joycraft-setup`.
4. Run full test suite; commit.

**Smoke test:** `pnpm build && git diff -- src/claude-skills/joycraft-collaborative-setup.md src/codex-skills/joycraft-collaborative-setup.md src/pi-skills/joycraft-collaborative-setup.md`. Empty diff = success for the POC.

**Before implementing, verify your test harness:**
1. Confirm spec 3 has landed (`git log --oneline` shows the canonicalize-boundary-forms commit). If not, this spec is blocked.
2. Confirm `src/skills/` is empty / doesn't exist yet. If it has files, something is wrong — surface to user.
3. Run `pnpm test --run` once on baseline so you know which tests were green before edits.

## Constraints

- MUST: take the claude variant as the canonical base. After spec 3, claude/codex/pi differ only by Cat A/B/C/E mechanical substitutions.
- MUST: substitute the 4 variables (`{{skill_prefix}}`, `{{clear}}`, `{{skills_dir}}`, `{{boundary_file}}`) — not hand-write per-harness text.
- MUST: regenerate `src/<harness>-skills/<name>.md` and `src/bundled-files.ts` in the same commit as the canonical change.
- MUST NOT: introduce `<!-- harness:NAME -->` blocks in either of these 2 skills. Strict-clean means they don't need them.
- MUST NOT: migrate any of the 18 dirty skills in this spec. Those are specs 5 + 6.
- MUST NOT: change skill behavior or content beyond mechanical substitution.
- MUST NOT: skip the `joycraft-collaborative-setup` POC step (do it first, fully, before starting `joycraft-setup`).

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Create | `src/skills/joycraft-collaborative-setup.md` | Canonical version with 4 `{{var}}` substitutions; `instructions:` retained in frontmatter |
| Modify | `src/claude-skills/joycraft-collaborative-setup.md` | Regenerated by `pnpm build` — byte-identical to post-spec-3 state |
| Modify | `src/codex-skills/joycraft-collaborative-setup.md` | Regenerated; byte-identical to post-spec-3 state |
| Modify | `src/pi-skills/joycraft-collaborative-setup.md` | Regenerated; byte-identical to post-spec-3 state |
| Create | `src/skills/joycraft-setup.md` | Same pattern |
| Modify | `src/claude-skills/joycraft-setup.md` | Regenerated; byte-identical |
| Modify | `src/codex-skills/joycraft-setup.md` | Regenerated; byte-identical |
| Modify | `src/pi-skills/joycraft-setup.md` | Regenerated; byte-identical |
| Modify | `src/bundled-files.ts` | Regenerated by `pnpm build` |

## Approach

**Per-skill recipe (apply to each of the 2):**
1. Read `src/claude-skills/joycraft-<X>.md` — this is the base.
2. Read `src/codex-skills/joycraft-<X>.md` and `src/pi-skills/joycraft-<X>.md` to confirm they differ only by Cat A/B/C/D/E after spec 3 landed.
3. Copy claude variant to `src/skills/joycraft-<X>.md`.
4. Substitute the 4 variables:
   - `/joycraft-` → `{{skill_prefix}}` (occurrences referring to user-facing skill invocation, not literal explanatory text about the prefix itself).
   - `/clear` → `{{clear}}` (only where it's the user-instruction "clear context" verb). Note: codex expansion is the multi-surface sentence — phrase canonical sentences so the longer form reads cleanly (e.g. `When done, {{clear}} before the next spec.`).
   - `.claude/skills` → `{{skills_dir}}`.
   - `CLAUDE.md` → `{{boundary_file}}` (only for user-boundary references; this repo's own CLAUDE.md stays literal).
5. Leave `instructions:` in frontmatter — the generator strips it for codex/pi.
6. Run `pnpm build`.
7. `git diff -- src/{claude,codex,pi}-skills/joycraft-<X>.md`. Empty = clean.
8. Iterate on the canonical until the diff is empty.
9. Commit canonical + 3 regenerated + `bundled-files.ts` (per skill in checkpoint mode, or batched at the end).

**POC first (`joycraft-collaborative-setup`)** — finish steps 1–9 entirely before starting `joycraft-setup`. If the POC reveals an engine bug, that's spec 1/2 work; stop here, surface to user, don't continue.

**Rejected alternative:** migrate all 20 skills in this spec. The strict re-audit said only 2 are clean. Trying to force the other 18 through this recipe would either fail (sync tests catch diff) or silently introduce drift (decision deferred to spec 5/6). Keep this spec narrowly scoped.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| A "clean" skill turns out to have a Cat D occurrence spec 3 missed | The Cat D sweep was incomplete. Surface to user — either re-run a partial sweep here (one-off fix) or move the skill out of the strict-clean bucket. Don't paper over with a custom substitution. |
| `pnpm build` errors on unknown `{{x}}` | You typo'd a substitution. Fix the canonical and retry. |
| Generated file is byte-identical except trailing newline | Spec 2's writeFileSync should have fixed this. If it appears, it's a spec 2 regression — surface to user. |
| Per-harness file referenced "CLAUDE.md" literally meaning *this Joycraft repo's own* CLAUDE.md | Keep the literal in the canonical (e.g. write `CLAUDE.md` not `{{boundary_file}}` for that occurrence). The 4-variable substitution only fires where it makes sense. |
| Generated codex `{{clear}}` expansion makes the surrounding sentence read awkwardly | Re-word the canonical sentence so the longer codex form fits cleanly. Don't author per-harness wordings — that defeats the point of a single canonical. |
| You discover `joycraft-collaborative-setup` actually has Cat A/B/C drift the audit missed (e.g. wording rewrite mid-sentence) | Surface to user. Likely the skill belongs in the dirty bucket (specs 5/6). Don't silently introduce conditional blocks. |

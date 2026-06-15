---
status: todo
owner: Maximilian Maksutovic
created: 2026-06-14
feature: 2026-06-11-single-source-skills
mode: isolated
---

# Migrate Clean Skills — Atomic Spec

> **Parent Brief:** `docs/features/2026-06-11-single-source-skills/brief.md`
> **Status:** Ready
> **Date:** 2026-06-14
> **Estimated scope:** 1 session / ~11 canonical files created, 33 per-harness files regenerated / ~3500 lines moved

---

## What

Move the 11 skills with **no out-of-category deltas** (per research.md Q3) from per-harness dirs into canonical `src/skills/` form. The 11 skills:

`joycraft-add-context`, `joycraft-bugfix`, `joycraft-collaborative-setup`, `joycraft-gather-context`, `joycraft-implement-level5`, `joycraft-interview`, `joycraft-optimize`, `joycraft-session-end`, `joycraft-setup`, `joycraft-spec-done`, `joycraft-tune`

Start with **`joycraft-add-context` first** as proof-of-concept (zero out-of-category deltas, only mechanical differences). For each: take the Claude variant as the base, replace the 5 known category differences (invocation, clear verb, skills dir, boundary file, frontmatter `instructions:`) with `{{var}}` substitutions, drop hand-maintained per-harness divergences in favor of the substitutions. Regenerate via `pnpm build`; assert the regenerated `src/<harness>-skills/<name>.md` matches the existing committed variant byte-for-byte (or the documented mechanical deltas).

After all 11 land, the only per-harness files in `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/` that exist *without* a canonical source are the 9 dirty skills handled in spec 4.

## Why

Clean skills validate the substitution engine end-to-end against real content. If `joycraft-add-context` generates byte-identical variants, the engine works. The remaining 10 are mechanical follow-ups in one PR. This isolates engine bugs from drift-resolution judgment calls (which come in spec 4).

## Acceptance Criteria

- [ ] `src/skills/joycraft-add-context.md` exists; running `pnpm build` produces `src/claude-skills/joycraft-add-context.md`, `src/codex-skills/joycraft-add-context.md`, `src/pi-skills/joycraft-add-context.md` byte-identical to the pre-migration committed versions on `main` (modulo any documented mechanical drift this spec deliberately resolves — note any in the PR description).
- [ ] The other 10 clean skills follow the same pattern. After all 11 land, `ls src/skills/` shows 11 `.md` files; running `pnpm build` regenerates the per-harness dirs successfully.
- [ ] All existing sync tests (`tests/bundled-files-sync.test.ts`, `tests/generate-bundled-files.test.ts`, `tests/codex-skill-parity.test.ts`, `tests/pi-skill-content.test.ts`) pass unchanged.
- [ ] Residue tests added in spec 2 pass (no `{{` or unclosed harness blocks in emitted files).
- [ ] `pnpm test --run && pnpm typecheck` pass.
- [ ] Bundle regeneration commit: `src/skills/`, `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, and `src/bundled-files.ts` are all updated in the same commit (per [[project_frictionless_implement]] and `docs/discoveries/2026-06-11-bundle-regen-per-commit.md`).

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| `joycraft-add-context` POC: generator output matches committed Claude variant | `git show main:src/claude-skills/joycraft-add-context.md` vs post-regen disk content — byte-identical | integration (manual diff during impl + automated via existing sync tests) |
| Same for Codex | Diff against `main`'s `src/codex-skills/joycraft-add-context.md` | integration |
| Same for Pi | Diff against `main`'s `src/pi-skills/joycraft-add-context.md` | integration |
| All 11 clean skills regenerate cleanly | After all moves, `pnpm build` produces zero unexpected diff vs documented drift | integration |
| Bundle stays in lockstep | `tests/bundled-files-sync.test.ts` passes | integration |
| No residue | `tests/generate-bundled-files.test.ts` residue assertions pass | integration |
| Codex parity preserved | `tests/codex-skill-parity.test.ts` passes (it compares Codex vs Claude under known transforms) | integration |
| Pi content preserved | `tests/pi-skill-content.test.ts` passes | integration |

**Execution order:**
1. Migrate `joycraft-add-context` only. Run `pnpm build`. Diff each per-harness output against the pre-migration committed version. Iterate until clean (or document any drift you deliberately resolved in PR description).
2. Once green, batch-migrate the other 10 clean skills. Same verification.
3. Run full test suite; commit (bundle + per-harness + canonical together).

**Smoke test:** `git diff main -- src/claude-skills/joycraft-add-context.md src/codex-skills/joycraft-add-context.md src/pi-skills/joycraft-add-context.md` after running `pnpm build`. Empty diff = success.

**Before implementing, verify your test harness:**
1. Tests run against actual on-disk generated files, not in-memory records.
2. Diff comparison uses `git show main:<path>` so you're comparing against the pre-migration baseline, not whatever you just wrote.
3. Each `{{var}}` you write must correspond to one of the 4 known variables — otherwise spec 1's engine throws.

## Constraints

- MUST: take the Claude variant as the canonical base (it's the fullest — design.md decision).
- MUST: replace mechanical differences with `{{skill_prefix}}`, `{{clear}}`, `{{skills_dir}}`, `{{boundary_file}}` substitutions — not hand-written per-harness text.
- MUST: regenerate `src/<harness>-skills/<name>.md` and `src/bundled-files.ts` in the same commit as the canonical change.
- MUST: drop the per-harness files in `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/` only after the regenerator overwrites them with content from `src/skills/` (i.e. don't `rm` the per-harness files; let the generator overwrite them).
- MUST NOT: introduce `<!-- harness:NAME -->` blocks in any of these 11 skills (research says they don't need them).
- MUST NOT: change skill behavior or content beyond mechanical substitution. Drift-resolution and content reorganization is spec 4 only.
- MUST NOT: skip the `joycraft-add-context` POC step.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Create | `src/skills/joycraft-add-context.md` | Canonical version with `{{var}}` substitutions, `instructions:` retained (claude keeps it; codex/pi strip via generator). |
| Modify | `src/claude-skills/joycraft-add-context.md` | Regenerated by `pnpm build` — should be byte-identical to current `main` state. |
| Modify | `src/codex-skills/joycraft-add-context.md` | Regenerated; byte-identical to current `main`. |
| Modify | `src/pi-skills/joycraft-add-context.md` | Regenerated; byte-identical to current `main`. |
| Create | `src/skills/joycraft-bugfix.md` | Same pattern. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-bugfix.md` | Regenerated. |
| Create | `src/skills/joycraft-collaborative-setup.md` | Same pattern. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-collaborative-setup.md` | Regenerated. |
| Create | `src/skills/joycraft-gather-context.md` | Same. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-gather-context.md` | Regenerated. |
| Create | `src/skills/joycraft-implement-level5.md` | Same. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-implement-level5.md` | Regenerated. |
| Create | `src/skills/joycraft-interview.md` | Same. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-interview.md` | Regenerated. |
| Create | `src/skills/joycraft-optimize.md` | Same. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-optimize.md` | Regenerated. |
| Create | `src/skills/joycraft-session-end.md` | Same. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-session-end.md` | Regenerated. |
| Create | `src/skills/joycraft-setup.md` | Same. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-setup.md` | Regenerated. |
| Create | `src/skills/joycraft-spec-done.md` | Same. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-spec-done.md` | Regenerated. |
| Create | `src/skills/joycraft-tune.md` | Same. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-tune.md` | Regenerated. |
| Modify | `src/bundled-files.ts` | Regenerated by `pnpm build`. |

## Approach

**Per-skill recipe (apply to each of the 11):**
1. Read the Claude variant (`src/claude-skills/joycraft-X.md`) — this is the base.
2. Read the Codex and Pi variants to confirm research's "no out-of-category delta" finding. Cross-check the 5 known categories.
3. Copy Claude variant to `src/skills/joycraft-X.md`.
4. In the canonical, substitute the 4 variables:
   - `/joycraft-` → `{{skill_prefix}}`
   - `/clear` → `{{clear}}` (only where this is the user-instruction "clear context" verb, not literal explanatory text). **Note:** the Codex expansion is a multi-surface sentence (`/clear` in CLI / `Cmd+N` in desktop), not a single token — so canonical sentences containing `{{clear}}` should read fluently when the multi-surface text is substituted in. Prefer phrasings like `When done, {{clear}} before the next spec.` Avoid `{{clear}}` mid-clause where the longer codex form would break sentence flow.
   - `.claude/skills` → `{{skills_dir}}`
   - `CLAUDE.md` → `{{boundary_file}}` (only where this refers to the project's boundary file, not in the literal Joycraft project's CLAUDE.md, etc. — judgment per occurrence)
5. Leave `instructions:` field in frontmatter (generator strips it for codex/pi).
6. Run `pnpm build`.
7. `git diff main -- src/claude-skills/joycraft-X.md src/codex-skills/joycraft-X.md src/pi-skills/joycraft-X.md`.
8. Iterate on the canonical until the diff is empty (or any drift you accept is intentional and documented in the PR).
9. Commit canonical + all 3 regenerated + `bundled-files.ts` together.

**POC first (`joycraft-add-context`)** — finish steps 1–9 entirely before starting the next skill. If the POC reveals a generator bug, that's spec 1/2 work, not this spec.

**Rejected alternative:** migrate all 11 in one giant batch. Engine bugs would block all 11; per-PR-able batches are easier to review and roll back.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| A "clean" skill turns out to have an out-of-category delta after closer reading | Move it to spec 4 (dirty skills). Don't paper over with an extra `{{var}}` or a one-off conditional block. Update the count in the PR description. |
| `pnpm build` errors on unknown `{{x}}` | You introduced a typo. Fix the substitution. |
| Generated file is byte-identical to `main` except for a trailing newline | Investigate the writeFileSync mode; spec 2 should have established correct trailing-newline behavior. Treat as a spec-2 bug. |
| Per-harness file referenced "CLAUDE.md" literally (e.g. talking about the Joycraft project's own CLAUDE.md, not the user's) | Keep the literal — `{{boundary_file}}` is only for "the user's boundary file" references. Manual judgment per occurrence. |
| Existing per-harness Codex variant says "run /clear" literally | The committed Codex variant is WRONG (silently fails on desktop, the most-used surface). Replacing it with `{{clear}}` will produce a multi-surface sentence — this is an intentional content improvement, NOT a regression. The byte-for-byte diff against `main` will be non-trivial for these spans; note in PR description that the codex expansion was changed per design.md update + web research. Do NOT roll back to the broken wording to make the diff smaller. |
| Generated diff against `main` shows codex/pi gained content that wasn't there before | Likely cause: Claude variant had something codex/pi was missing as in-category drift (e.g. Recommended Next Steps section). For this spec, treat as intentional — codex/pi inherit claude-fullness — and note in PR description. If the delta is truly out-of-category, move the skill to spec 4. |

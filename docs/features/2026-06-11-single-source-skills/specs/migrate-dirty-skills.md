---
status: todo
owner: Maximilian Maksutovic
created: 2026-06-14
feature: 2026-06-11-single-source-skills
mode: isolated
---

# Migrate Dirty Skills — Atomic Spec

> **Parent Brief:** `docs/features/2026-06-11-single-source-skills/brief.md`
> **Status:** Ready
> **Date:** 2026-06-14
> **Estimated scope:** 1 session / ~9 canonical files / per-skill judgment calls

---

## What

Migrate the 9 skills with out-of-category deltas (per research.md Q3) from per-harness dirs to canonical `src/skills/` form. Per design.md Section 4, the default rule is **unify on the Claude variant (fullest)**, treating codex/pi gaps as drift; use `<!-- harness:NAME -->...<!-- /harness -->` conditional blocks ONLY where content is genuinely harness-specific (cannot run on another harness).

**Four skills require conditional blocks** (genuine harness-specific machinery):
1. `joycraft-research` — Agent invocation differs (Claude Code Agent tool vs Pi `subagent` tool with agent name).
2. `joycraft-verify` — same agent-invocation distinction.
3. `joycraft-lockdown` — config target differs (`.claude/settings.json` vs Codex sandbox).
4. `joycraft-implement-feature` — Pi has 3 steps vs Claude/Codex 4 (Pi process-loop collapses two phases).

**Five skills unify on claude-fullness** (drift, not feature):
5. `joycraft-add-fact` — fold Claude's Step 5b (frontmatter update) into canonical; codex/pi inherit it.
6. `joycraft-decompose` — fold Claude's "Execution waves" section, Step 6/7, README generation into canonical.
7. `joycraft-design` — unify on "Present and STOP — Pre-Approval Hold" wording and Claude's concurrency description.
8. `joycraft-implement` — fold Claude's sibling-README check and dependency-warning subsection into canonical.
9. `joycraft-new-feature` — fold Claude's Phase 0 description, scope, and backlog frontmatter schema into canonical.

After this spec, `src/skills/` contains all 20 canonical skill files. The per-harness dirs are fully derived.

## Why

Without these 9 migrations the single-source story is incomplete — 9 skills still need hand-syncing. Each requires a deliberate policy choice (unify vs. conditional block) which the design has already resolved; this spec executes that policy.

## Acceptance Criteria

- [ ] `src/skills/` contains canonical files for all 9 dirty skills listed above.
- [ ] For each of `joycraft-research`, `joycraft-verify`, `joycraft-lockdown`, `joycraft-implement-feature`: canonical uses `<!-- harness:NAME -->...<!-- /harness -->` blocks for the genuinely harness-specific machinery (agent-invocation mechanism, lockdown config target, implement-feature step-count restructure).
- [ ] For each of `joycraft-add-fact`, `joycraft-decompose`, `joycraft-design`, `joycraft-implement`, `joycraft-new-feature`: canonical = Claude's fullness, with codex/pi inheriting the longer content. NO `<!-- harness:NAME -->` blocks added.
- [ ] `pnpm build` regenerates all three per-harness variants for all 9 skills.
- [ ] All existing sync tests (`tests/bundled-files-sync.test.ts`, `tests/generate-bundled-files.test.ts`, `tests/codex-skill-parity.test.ts`, `tests/pi-skill-content.test.ts`) pass.
- [ ] Residue assertions pass (no `{{`, no unclosed `<!-- harness:` blocks).
- [ ] `pnpm test --run && pnpm typecheck` pass.
- [ ] PR description (or descriptions, if split across PRs) documents per-skill decisions: which gained content, what conditional blocks were introduced, and which existing tests confirm no behavior regression.
- [ ] After landing, `ls src/skills/ | wc -l` returns 20.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Conditional-block skills produce correct per-harness variants | For each of the 4 skills, manually verify generated `src/<harness>-skills/<file>` has the right block kept and others stripped (no delimiters surviving) | integration |
| Unified-on-claude skills now have full content in codex/pi | `wc -l src/codex-skills/joycraft-add-fact.md` (etc.) should increase relative to `main`; PR description explains the additions | integration |
| Existing sync tests pass | `pnpm test --run tests/bundled-files-sync.test.ts tests/codex-skill-parity.test.ts tests/pi-skill-content.test.ts` | integration |
| Residue assertions pass | `pnpm test --run tests/generate-bundled-files.test.ts` (residue tests from spec 2) | integration |
| `joycraft-research` Claude variant uses Agent tool wording | Read generated `src/claude-skills/joycraft-research.md`, grep for "Claude Code's Agent tool" — present | integration |
| `joycraft-research` Pi variant uses subagent tool wording | Read generated `src/pi-skills/joycraft-research.md`, grep for "`subagent` tool" — present; "Agent tool" wording absent | integration |
| Same shape for `joycraft-verify` | Same as above with verify | integration |
| `joycraft-lockdown` Claude targets `.claude/settings.json` | Generated Claude variant references it; Codex variant references sandbox/Codex config | integration |
| `joycraft-implement-feature` Pi has 3 steps, Claude/Codex 4 | Count `^## Step` headings in each generated file | integration |
| Bundle regen committed atomically | `git log -p -1` shows `src/skills/`, `src/<harness>-skills/`, and `src/bundled-files.ts` changes in same commit | manual |

**Execution order:**
1. For each skill, draft the canonical with the policy decision noted from design.md.
2. Run `pnpm build`. Compare generated per-harness output against the pre-migration committed version using `git diff main -- src/<harness>-skills/<file>`.
3. Diff should show:
   - For conditional-block skills: zero diff (the conditional blocks reproduce the harness-specific bits exactly).
   - For unified skills: codex/pi gain content that was previously Claude-only; Claude variant byte-identical to `main`.
4. Run full test suite; commit canonical + 3 regenerated variants + `bundled-files.ts` together.

**Smoke test:** `pnpm build && pnpm test --run tests/generate-bundled-files.test.ts tests/bundled-files-sync.test.ts` after each skill — fastest "did I break the contract" feedback.

**Before implementing, verify your test harness:**
1. Re-read research.md Q3 for the specific delta on each skill — don't guess.
2. Verify spec-1 + spec-2 are landed (`scripts/lib/skill-template.mjs` exists, residue tests pass).
3. Smoke test runs in the existing per-file budget.

## Constraints

- MUST: respect design.md Section 4 policy split — 4 skills get blocks, 5 unify on Claude.
- MUST: regenerate per-harness dirs + bundle in same commit as canonical change.
- MUST: document per-skill decisions in PR description (which lines moved, what blocks were introduced, why). No discovery doc per design.md Section 4 — PR description is the audit trail.
- MUST NOT: add `<!-- harness:NAME -->` blocks to any of the 5 "unify on claude" skills, even where it would be locally convenient.
- MUST NOT: invent new template variables. Only the 4 from spec 1 (`skill_prefix`, `clear`, `skills_dir`, `boundary_file`).
- MUST NOT: change skill *behavior* — only restructure/unify *prose*. If a behavioral change is required to ship a skill cleanly, stop and surface it to the user.
- MUST: if you find a conditional-block need that wasn't in design.md's 4-skill list, STOP and surface it. Don't silently add blocks.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Create | `src/skills/joycraft-research.md` | Canonical with `<!-- harness:claude\|codex -->` for Agent tool wording, `<!-- harness:pi -->` for `subagent` tool wording. Fold Claude-only "Scanning Prior Research (Status Filter)" section into canonical (everyone gets it). |
| Modify | `src/{claude,codex,pi}-skills/joycraft-research.md` | Regenerated. |
| Create | `src/skills/joycraft-verify.md` | Canonical with `<!-- harness:claude\|codex -->` for "Spawn the Verifier Subagent" / Agent-tool wording, `<!-- harness:pi -->` for "Deploy" / `subagent`-tool wording. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-verify.md` | Regenerated. |
| Create | `src/skills/joycraft-lockdown.md` | Canonical with `<!-- harness:claude -->` for `.claude/settings.json` config target + table, `<!-- harness:codex\|pi -->` for Codex-sandbox config target + table. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-lockdown.md` | Regenerated. |
| Create | `src/skills/joycraft-implement-feature.md` | Canonical with `<!-- harness:claude\|codex -->` for 4-step "Loop"/"Chain" naming and structure, `<!-- harness:pi -->` for 3-step Pi process-loop structure. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-implement-feature.md` | Regenerated. |
| Create | `src/skills/joycraft-add-fact.md` | Canonical = Claude variant with Step 5b (frontmatter update). NO conditional blocks. |
| Modify | `src/{codex,pi}-skills/joycraft-add-fact.md` | Regenerated — gain Step 5b content. |
| Modify | `src/claude-skills/joycraft-add-fact.md` | Regenerated — byte-identical to `main`. |
| Create | `src/skills/joycraft-decompose.md` | Canonical = Claude variant with Execution waves section + README step. NO conditional blocks. |
| Modify | `src/{codex,pi}-skills/joycraft-decompose.md` | Regenerated — gain wave/README content. |
| Modify | `src/claude-skills/joycraft-decompose.md` | Regenerated — byte-identical to `main`. |
| Create | `src/skills/joycraft-design.md` | Canonical = Claude variant ("Present and STOP — Pre-Approval Hold", Claude's concurrency wording). NO conditional blocks. |
| Modify | `src/{codex,pi}-skills/joycraft-design.md` | Regenerated — pick up unified wording. |
| Modify | `src/claude-skills/joycraft-design.md` | Regenerated — byte-identical to `main`. |
| Create | `src/skills/joycraft-implement.md` | Canonical = Claude variant with sibling-README check + dependency-warning subsection. NO conditional blocks. |
| Modify | `src/{codex,pi}-skills/joycraft-implement.md` | Regenerated — gain the dependency-warning content. |
| Modify | `src/claude-skills/joycraft-implement.md` | Regenerated — byte-identical to `main`. |
| Create | `src/skills/joycraft-new-feature.md` | Canonical = Claude variant Phase 0 + backlog schema. NO conditional blocks. |
| Modify | `src/{codex,pi}-skills/joycraft-new-feature.md` | Regenerated — pick up fuller Phase 0. |
| Modify | `src/claude-skills/joycraft-new-feature.md` | Regenerated — byte-identical to `main`. |
| Modify | `src/bundled-files.ts` | Regenerated by `pnpm build`. |

## Approach

**Order of operations:**
1. Start with the 4 conditional-block skills (`research`, `verify`, `lockdown`, `implement-feature`). These have zero behavior change per harness — diff against `main` should be empty in all three variants once the blocks are right. Land first because they're the highest-risk for regression.
2. Then the 5 unify-on-claude skills. These intentionally change codex/pi content; the PR description must enumerate what moved.

**Per-skill recipe (conditional-block category):**
1. Read all three variants of the skill side by side. Identify the exact span(s) where they differ in a way that's *genuinely* harness-specific (per design.md's reasoning).
2. In the canonical: take Claude variant as base. Wrap Claude/Codex-specific spans in `<!-- harness:claude|codex -->...<!-- /harness -->`; wrap Pi-specific spans in `<!-- harness:pi -->...<!-- /harness -->`. (Or claude/pi pairs if Codex matches Claude on that span — read research.md notes carefully.)
3. Substitute the 4 known variables wherever appropriate.
4. `pnpm build`; `git diff main -- src/<harness>-skills/<file>` should be empty.

**Per-skill recipe (unify-on-claude category):**
1. Read all three variants. Confirm the delta enumerated in research.md.
2. Canonical = Claude variant verbatim, with the 4 variable substitutions.
3. `pnpm build`; `git diff main -- src/claude-skills/<file>` should be empty (or trivial — verify any deltas).
4. `git diff main -- src/codex-skills/<file>` and `src/pi-skills/<file>` will show the codex/pi variants gaining content; this is the intended drift resolution. Capture the diff summary for the PR description.

**Rejected alternatives:**
- Adding `condensed`/`full` toggle for codex — design.md Section 4 explicitly rejects. We treat codex condensation as drift, not feature.
- Writing a `docs/discoveries/2026-06-XX-skill-drift-resolution.md` audit doc — design.md Section 4 explicitly rejects. PR description is the audit trail.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| A 4-block skill reveals a 4th harness-specific span design didn't anticipate | STOP. Add the span to the block list, update brief/design with a note, get user OK before continuing. Don't silently expand the block set. |
| A "unify on claude" skill's codex variant has content that ISN'T in Claude (i.e. codex has something extra) | This contradicts research.md's "Claude is fullest" finding. STOP, re-read the variant, decide whether to fold into canonical or keep as Claude-fullness. Surface to user. |
| Generated diff for codex/pi in a "unify" skill is enormous (e.g. >50% new content) | Verify content is appropriate for that harness — does it reference Claude-only mechanics? If yes, that span needs a conditional block; the skill belongs in the conditional-block category. Re-classify and surface. |
| A unified codex skill references Claude Code's Agent tool literally (e.g. `Use the Agent tool with…`) | If the wording works on codex (codex has its own agent invocation through `$skill:` substitution), fine. If it's literally Claude-Code-specific machinery, the skill needs a conditional block — re-classify and surface. |
| Spec exceeds reasonable single-PR size | Split into 2-3 PRs (e.g. one per category, or 4-block PR + 5-unify PR). PR descriptions still carry the audit trail. |
| `pnpm build` succeeds but `pi-skill-content.test.ts` regresses | A unified skill folded in content Pi shouldn't have. Re-read the test expectations, decide whether the test is now wrong (loosen it) or the canonical needs a Pi-stripping conditional block (re-classify). Surface to user — don't unilaterally loosen tests. |

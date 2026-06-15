---
status: todo
owner: Maximilian Maksutovic
created: 2026-06-14
feature: 2026-06-11-single-source-skills
mode: isolated
---

# Migrate Dirty Skills — Unify on Claude — Atomic Spec

> **Parent Brief:** `docs/features/2026-06-11-single-source-skills/brief.md`
> **Status:** Ready
> **Date:** 2026-06-14
> **Estimated scope:** 1–2 sessions / 15 canonical files / mechanical-unify per skill
>
> **Updated 2026-06-14:** absorbed `joycraft-setup` from retired spec 4 (truly clean — Cat A `{{skill_prefix}}` + `instructions:` frontmatter strip only; smallest item in this batch).

---

## What

Migrate the **15 dirty skills** (14 from research.md Q3 RE-AUDIT plus `joycraft-setup` absorbed from retired spec 4) whose deltas fit the pattern "claude has X, codex/pi don't" — these are drift, not feature. Per design.md Section 4, the policy is **unify on claude-fullness**: take the claude variant as the canonical base, add the 4-variable substitutions, and let codex/pi inherit the fuller content via regeneration. NO `<!-- harness:NAME -->` blocks added for these 15 skills.

**The 15 skills (alphabetical):**

1. `joycraft-add-context` — abstracted boundary phrasing (already fixed by spec 3); "Recommended Next Steps" + Handoff block absent in codex/pi → unify on claude.
2. `joycraft-add-fact` — Step 5b "Update Shared Frontmatter" block + Recommended Next Steps absent in codex/pi → unify on claude.
3. `joycraft-bugfix` — "Read source files" → "Search the codebase and read files"; spec-template body fully rewritten; section drift → unify on claude.
4. `joycraft-decompose` — "worktrees" → "branches"; YAML frontmatter block in claude only; Step 7 README-write replaced by Hand-Off in codex/pi → unify on claude. (Pi-specific Pi-loop language stays out of canonical — fold into claude-fullness only what's universally applicable; surface the pi-loop edge case to user.)
5. `joycraft-design` — YAML frontmatter + owner-resolution + backlog section + Recommended Next Steps in claude only; "Spawn subagents" → "Spawn concurrent subagent threads" in codex/pi → unify on claude.
6. `joycraft-gather-context` — boundary abstraction (fixed by spec 3); "Confirm and Hand Off" → "Confirm"; Recommended Next Steps absent → unify on claude.
7. `joycraft-implement` — Step 2 "Read the Sibling README.md FIRST" block absent in codex/pi; isolated-mode bullet list rewritten differently per harness; pi-only loop-iteration check → unify on claude for sibling-README + isolated bullets; **surface pi-only loop-iteration check to user** — may need a conditional block (re-classify if so).
8. `joycraft-implement-level5` — em-dash → ASCII `--` on ~10 lines (text normalization to em-dash); "Look for" → "Search for"; "Step 6: Update CLAUDE.md" → "Update AGENTS.md" (Cat D — fixed by spec 3); "Claude autofix" → "Autofix agent" (drift) → unify on claude.
9. `joycraft-interview` — slug-derivation + YAML frontmatter + backlog-capture sections in claude only; Handoff replaced by tiered "SIMPLE/MEDIUM/COMPLEX" listing in codex/pi → unify on claude.
10. `joycraft-new-feature` — YAML frontmatter blocks + per-spec backlog content in claude only; "Parallel worktrees" → "Parallel"; Phase 3.5 absent in codex/pi → unify on claude.
11. `joycraft-optimize` — `CLAUDE.md/AGENTS.md` Cat D drift (fixed by spec 3); "settings.json" → "config" → unify on claude.
12. `joycraft-session-end` — YAML frontmatter + shared-frontmatter block in claude only; Cat D drift (fixed by spec 3); Recommended Next Steps absent → unify on claude.
13. `joycraft-spec-done` — pi-only "On the Pi isolated-mode loop" paragraph; codex/pi add `Run /clear before your next step` line absent in claude; code-fence wrapping differs → **surface pi-only paragraph to user** — likely needs a conditional block (re-classify if so).
14. `joycraft-tune` — "Check for:" → "Search the codebase for:"; `.claude/settings.json` deny patterns → "deny patterns configuration" → unify on claude.
15. `joycraft-setup` — absorbed from retired spec 4. Truly clean (Cat A `{{skill_prefix}}` + Cat E `instructions:` frontmatter strip only). Trivial — should land first as a sanity-check that the pipeline still produces byte-identical output before tackling the larger drifts.

After this spec, `src/skills/` contains 15 canonical files. Spec 6 adds the remaining 5 (research, verify, lockdown, implement-feature, **and `joycraft-collaborative-setup`** absorbed from retired spec 4) for a final total of 20.

## Why

Without these 14 migrations the single-source story is 80%-complete and the most common skill edits still need 3-file syncs. Each requires a deliberate policy decision (unify vs. preserve drift) which design.md Section 4 has already resolved (unify on claude). This spec executes that policy across 14 skills.

## Acceptance Criteria

- [ ] `src/skills/` contains canonical files for all 15 skills listed above.
- [ ] For each skill: NO `<!-- harness:NAME -->` blocks added (the unify-on-claude policy means codex/pi inherit the longer content directly).
- [ ] `pnpm build` regenerates all three per-harness variants for all 15 skills.
- [ ] Generated claude variant for each skill is byte-identical to the post-spec-3 baseline (claude variant doesn't change content — only the canonical source moves).
- [ ] Generated codex/pi variants for each skill gain content (the Claude-only sections); PR description enumerates what moved for each skill.
- [ ] All existing sync tests pass: `tests/bundled-files-sync.test.ts`, `tests/generate-bundled-files.test.ts`, `tests/codex-skill-parity.test.ts`. **Note:** `tests/pi-skill-content.test.ts` may need expectation updates — that's expected and noted in PR.
- [ ] Residue assertions pass (no `{{`, no unclosed harness blocks).
- [ ] `pnpm test --run && pnpm typecheck` pass.
- [ ] PR description (or descriptions, if split) documents per-skill: which content blocks moved into codex/pi, what was preserved, and any pi-specific paragraphs that were re-classified (escalated to spec 6).
- [ ] After landing, `ls src/skills/ | wc -l` returns 15.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Each unified skill's claude variant unchanged | `git diff HEAD~ -- src/claude-skills/joycraft-<name>.md` empty (post-spec-3 baseline) for each of 15 | integration |
| Each unified skill's codex variant gains content | `wc -l src/codex-skills/joycraft-<name>.md` increases relative to baseline; PR description has line-count delta per skill | integration |
| Each unified skill's pi variant gains content | same as codex | integration |
| No residue | `pnpm test --run tests/generate-bundled-files.test.ts` passes | integration |
| Bundle in lockstep | `pnpm test --run tests/bundled-files-sync.test.ts` passes | integration |
| Codex parity OK | `pnpm test --run tests/codex-skill-parity.test.ts` passes (may need expectation tweaks — documented in PR if so) | integration |
| Pi content expectations updated | `pnpm test --run tests/pi-skill-content.test.ts` passes (expectations updated to match unified content; documented in PR) | integration |
| No conditional blocks introduced | `git grep -n 'harness:' src/skills/joycraft-*.md` returns 0 matches (block-using skills are spec 6, not this spec) | scripted grep |

**Execution order:**
1. Re-read research.md Q3 RE-AUDIT for the per-skill drift summary.
2. Pick a drift bucket as a starting batch — `Recommended Next Steps + Handoff` is the most common (affects ~9 skills) and a good first batch.
3. For each skill in the batch: draft canonical = claude variant + 4 substitutions; run `pnpm build`; diff codex/pi against baseline to confirm only "gained content" deltas. Capture the line-count delta for the PR.
4. Run full test suite. If `pi-skill-content.test.ts` fails because an expectation hard-coded the old codex/pi content, update the expectation to match the unified content. Note in PR.
5. Commit per skill (or per batch) — isolated mode means a fresh context per spec, but checkpoint-style per-skill commits are fine inside this spec.
6. Move to the next drift bucket (`YAML frontmatter blocks`, then `backlog-capture sections`, etc.).

**Smoke test:** `pnpm build && pnpm test --run tests/generate-bundled-files.test.ts tests/bundled-files-sync.test.ts` — fastest "did I break the contract" feedback. Run after each skill.

**Before implementing, verify your test harness:**
1. Confirm spec 4 has landed (`src/skills/` contains `joycraft-collaborative-setup.md` and `joycraft-setup.md`).
2. Confirm spec 3 has landed (Cat D sweep — `git grep -nE '(CLAUDE\.md and/or AGENTS\.md|CLAUDE\.md or AGENTS\.md)' src/{claude,codex,pi}-skills/` returns 0).
3. Run `pnpm test --run` on baseline; record which tests were green.

## Constraints

- MUST: take the claude variant as the canonical base for all 14 skills (design.md Section 4 policy).
- MUST: substitute the 4 variables (`{{skill_prefix}}`, `{{clear}}`, `{{skills_dir}}`, `{{boundary_file}}`) — not hand-write per-harness text.
- MUST: regenerate per-harness dirs + `bundled-files.ts` in the same commit as each canonical change.
- MUST: document per-skill content movements in PR description. No discovery doc per design.md Section 4 — PR description is the audit trail.
- MUST NOT: add `<!-- harness:NAME -->` blocks for any of these 14 skills. If a skill seems to need one, STOP and surface — it likely belongs in spec 6.
- MUST NOT: invent new template variables. Only the 4 from spec 1.
- MUST NOT: change skill *behavior* — only restructure/unify *prose*. If a behavioral change is required, stop and surface.
- MUST NOT: silently loosen `pi-skill-content.test.ts` or `codex-skill-parity.test.ts` expectations. Expectation updates are expected, but each one is documented in the PR.
- MUST NOT: migrate any of the 4 conditional-block skills (`research`, `verify`, `lockdown`, `implement-feature`) here. Those are spec 6.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Create | `src/skills/joycraft-add-context.md` | Canonical = claude variant + 4 substitutions; no conditional blocks |
| Create | `src/skills/joycraft-add-fact.md` | Same pattern; folds Step 5b into canonical |
| Create | `src/skills/joycraft-bugfix.md` | Same pattern; folds full spec-template body |
| Create | `src/skills/joycraft-decompose.md` | Same pattern; folds Execution waves section + Step 7 README-write |
| Create | `src/skills/joycraft-design.md` | Same pattern; folds YAML frontmatter + backlog + Recommended Next Steps |
| Create | `src/skills/joycraft-gather-context.md` | Same pattern |
| Create | `src/skills/joycraft-implement.md` | Same pattern; folds sibling-README check + isolated-mode bullets; **escalate pi-only loop check to user** |
| Create | `src/skills/joycraft-implement-level5.md` | Same pattern; em-dash normalization |
| Create | `src/skills/joycraft-interview.md` | Same pattern; folds slug-derivation + backlog-capture |
| Create | `src/skills/joycraft-new-feature.md` | Same pattern; folds Phase 0 + backlog frontmatter + Phase 3.5 |
| Create | `src/skills/joycraft-optimize.md` | Same pattern |
| Create | `src/skills/joycraft-session-end.md` | Same pattern; folds shared-frontmatter block |
| Create | `src/skills/joycraft-spec-done.md` | Same pattern; **escalate pi-only isolated-mode paragraph to user** |
| Create | `src/skills/joycraft-tune.md` | Same pattern |
| Modify | `src/{claude,codex,pi}-skills/joycraft-<name>.md` (× 14 × 3 = 42 files) | Regenerated by `pnpm build` |
| Modify | `src/bundled-files.ts` | Regenerated by `pnpm build` |
| Modify (likely) | `tests/pi-skill-content.test.ts` | Expectation updates where pi content gained Claude-only sections; documented in PR |
| Modify (possible) | `tests/codex-skill-parity.test.ts` | Expectation updates if any parity-test string hard-coded the old codex form |

## Approach

**Per-skill recipe (unify-on-claude):**
1. Read all three variants. Confirm the delta matches research.md Q3 RE-AUDIT for that skill.
2. Canonical = claude variant verbatim, with the 4 variable substitutions.
3. `pnpm build`; `git diff -- src/claude-skills/<file>` should be empty (claude content shouldn't change).
4. `git diff -- src/codex-skills/<file>` and `src/pi-skills/<file>` will show gained content — this is the intended drift resolution. Capture the line-count delta + a summary of what moved for the PR.
5. Run test suite. If parity/content tests fail because they hard-coded the pre-unified codex/pi content, update expectations. Note in PR.
6. Commit (per skill, per bucket, or all at once — isolated mode permits any granularity).

**Order of operations:**
1. Easy bucket first — skills where only "Recommended Next Steps + Handoff" moves (`add-context`, `bugfix`, `gather-context`, `optimize`, `session-end`, `tune`). Mechanical, low judgment.
2. Medium bucket — skills with YAML frontmatter / backlog-capture moves (`design`, `interview`, `new-feature`).
3. Per-skill nuance — `add-fact` (Step 5b), `decompose` (Execution waves + README step), `implement-level5` (em-dash normalization).
4. **Escalation skills last** — `implement` and `spec-done` carry pi-specific machinery (loop-iteration check, isolated-mode paragraph) that *might* need conditional blocks. Surface to user before deciding.

**Rejected alternative:** add condensed/full toggle for codex. Design.md Section 4 explicitly rejects — codex condensation is drift, not feature.

**Rejected alternative:** write a `docs/discoveries/2026-06-XX-skill-drift-resolution.md` audit doc. Design.md Section 4 explicitly rejects — PR description is the audit trail.

**Rejected alternative:** add conditional blocks for `implement` / `spec-done` pi-paragraphs without checking with user. Quietly expanding the conditional-block set defeats the design's "unify by default" stance. Surface and let the user decide.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| A skill's codex/pi variant has content that ISN'T in claude (i.e. codex/pi has something extra) | This contradicts research.md's "claude is fullest" finding. STOP, re-read the variants, decide whether to fold into canonical or escalate to spec 6. Surface to user. |
| Generated diff for codex/pi is enormous (>50% new content) | Verify content is appropriate for that harness — does it reference Claude-only mechanics? If yes, that span needs a conditional block; re-classify and escalate to spec 6. |
| A unified codex skill references Claude Code's Agent tool literally | If the wording works on codex (codex has its own agent invocation), fine. If it's literally Claude-Code-specific machinery, escalate to spec 6. |
| `pi-skill-content.test.ts` regresses because pi gained content it shouldn't have | Re-read the test expectations. If the test is now wrong (it hard-coded the pre-unified content), update it and document. If the canonical legitimately introduced Claude-only mechanics into pi, that's a re-classify — escalate to spec 6. |
| The pi-only "On the Pi isolated-mode loop" paragraph in `joycraft-spec-done` | Surface to user. Most likely needs a `<!-- harness:pi -->` block — re-classify and move to spec 6. |
| The pi-only loop-iteration check in `joycraft-implement` | Surface to user. Same as above. |
| Spec exceeds reasonable single-PR size | Split by drift bucket (e.g. PR 1 = 6 "Recommended Next Steps" skills, PR 2 = 3 YAML/backlog skills, PR 3 = 3 nuance skills, PR 4 = 2 escalations after user decision). PR descriptions still carry the audit trail. |
| `pnpm build` succeeds but a parity test fails on a skill that shouldn't have changed | Likely a stale expectation. Read the test, update the expected string, document in PR. |

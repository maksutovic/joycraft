---
status: todo
owner: Maximilian Maksutovic
created: 2026-06-14
feature: 2026-06-11-single-source-skills
mode: isolated
---

# Migrate Dirty Skills — Conditional Blocks — Atomic Spec

> **Parent Brief:** `docs/features/2026-06-11-single-source-skills/brief.md`
> **Status:** Ready
> **Date:** 2026-06-14
> **Estimated scope:** 1 session / 5 canonical files / per-skill judgment, conditional-block authoring
>
> **Updated 2026-06-14:** absorbed `joycraft-collaborative-setup` from retired spec 4. It needs a small `<!-- harness:claude -->` / `<!-- harness:codex|pi -->` block for the `"tells Claude"` / `"tells the agent"` wording rewrite at line 140, plus a decision on the Cat B `/clear` literal at line 158 (codex currently has literal `/clear`, but `{{clear}}` codex expansion is the multi-surface long form — either sweep codex to the long form here as a mini-canonicalization, OR wrap that line in a conditional block).

---

## What

Migrate the **5 dirty skills with genuinely harness-specific machinery** (4 from design.md Section 4 + research.md Q3 RE-AUDIT, plus `joycraft-collaborative-setup` absorbed from retired spec 4) to `src/skills/` using `<!-- harness:NAME -->...<!-- /harness -->` conditional blocks. These are skills where content cannot reasonably run on another harness — it's not drift, it's real machinery difference (or, in `collaborative-setup`'s case, a single wording rewrite that the 4-var allowlist can't express).

**The 5 skills:**

1. **`joycraft-research`** — agent invocation mechanism differs: claude/codex use Claude Code's Agent tool; pi uses `subagent` tool with agent name `joycraft-researcher`. Also fold claude-only "Scanning Prior Research (Status Filter)" section into canonical (universal — all harnesses get it).
2. **`joycraft-verify`** — same agent-invocation distinction: claude/codex "Spawn the Verifier Subagent" via Agent tool; pi "Deploy the Verifier Subagent" via `subagent` + `joycraft-verifier`. Codex also has a "concurrent subagent thread" + read-only paragraph that pi doesn't (research.md Inter-variant divergence).
3. **`joycraft-lockdown`** — config target differs: claude targets `.claude/settings.json` with `permissions.deny`; codex/pi target Codex sandbox / `AGENTS.md` config. Permission-mode table also differs structurally.
4. **`joycraft-implement-feature`** — claude has 4 steps with "The Loop — One Subagent per Spec"; codex has 4 steps with "The Chain — One Spec at a Time"; pi has 3 steps (collapsed via `joycraft-implement-loop` shell command). Three-way divergent Step 2 mechanic.
5. **`joycraft-collaborative-setup`** — absorbed from retired spec 4. Single mid-sentence wording rewrite at line 140 (`tells Claude` / `tells the agent`) needs one `<!-- harness:claude -->` / `<!-- harness:codex|pi -->` pair. Also resolve the Cat B codex `/clear` literal at line 158 (either sweep codex to the long form, or wrap the line in a conditional block — preferred is sweep, matching how the engine intends `{{clear}}` to work).

Also handle the inter-variant divergences research.md called out (codex vs pi divergences inside the original 4 skills, e.g. `verify`'s codex-specific paragraph, `implement-feature`'s three-way Step 2 split).

After this spec, `src/skills/` contains all **20 canonical files** (15 from spec 5 + 5 here). The per-harness dirs are fully derived.

## Why

Without these 4 migrations, single-source coverage is at 16/20 = 80%. These 4 require deliberate conditional-block authoring because the harness machinery genuinely differs — a `subagent` tool invocation can't masquerade as a Claude Code Agent invocation, and `.claude/settings.json` can't be the same target as Codex sandbox config. Design.md Section 4 listed these 4 by name as the exceptions to the "unify on claude" rule.

## Acceptance Criteria

- [ ] `src/skills/joycraft-research.md` exists; uses `<!-- harness:claude|codex -->` for Agent-tool wording and `<!-- harness:pi -->` for `subagent`-tool wording. "Scanning Prior Research" section folded into canonical (outside any block — universal).
- [ ] `src/skills/joycraft-verify.md` exists; similar structure for Agent-tool vs `subagent`-tool spans. Codex-specific "concurrent subagent thread" content placed in a `<!-- harness:codex -->` block (or claude|codex block if claude also benefits).
- [ ] `src/skills/joycraft-lockdown.md` exists; `.claude/settings.json` + permissions.deny + claude-style table in `<!-- harness:claude -->`; Codex sandbox + AGENTS.md + sandbox-style table in `<!-- harness:codex|pi -->`.
- [ ] `src/skills/joycraft-implement-feature.md` exists; 4-step Loop in `<!-- harness:claude -->`, 4-step Chain in `<!-- harness:codex -->`, 3-step Pi process-loop in `<!-- harness:pi -->`. (Each harness needs its own block — no `claude|codex` pair because all three diverge.)
- [ ] For each of the 4 skills: generated per-harness output is byte-identical to the post-spec-5 baseline (no behavioral change, just sourcing reorganization).
- [ ] Residue assertions pass (no `{{`, no unclosed harness blocks).
- [ ] All existing sync tests pass.
- [ ] `pnpm test --run && pnpm typecheck` pass.
- [ ] PR description documents per-skill: which spans were placed in which blocks, what was folded into the universal section, and how inter-variant divergence was resolved.
- [ ] After landing, `ls src/skills/ | wc -l` returns 20.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Conditional-block skills produce correct per-harness variants | For each of 4 skills, manually verify generated `src/<harness>-skills/<file>` has the right block kept, others stripped, no delimiters surviving | integration |
| `joycraft-research` claude variant uses Agent tool wording | `git grep -n 'Claude Code.s Agent tool' src/claude-skills/joycraft-research.md` — present | scripted grep |
| `joycraft-research` pi variant uses subagent wording | `git grep -n 'subagent. tool' src/pi-skills/joycraft-research.md` — present; `Agent tool` absent | scripted grep |
| Same shape for `joycraft-verify` | analogous greps | scripted grep |
| `joycraft-lockdown` claude targets `.claude/settings.json` | `git grep -n 'permissions.deny' src/claude-skills/joycraft-lockdown.md` — present | scripted grep |
| `joycraft-lockdown` codex/pi target sandbox | `git grep -nE '(sandbox|Codex configuration)' src/codex-skills/joycraft-lockdown.md src/pi-skills/joycraft-lockdown.md` — present | scripted grep |
| `joycraft-implement-feature` step counts | `grep -c '^## Step' src/claude-skills/joycraft-implement-feature.md` = 4, codex = 4, pi = 3 | scripted |
| Each generated variant byte-matches baseline | `git diff HEAD~ -- src/{claude,codex,pi}-skills/joycraft-<name>.md` empty for each of 4 skills × 3 harnesses | integration |
| No `{{` residue | `pnpm test --run tests/generate-bundled-files.test.ts` passes | integration |
| Bundle in lockstep | `pnpm test --run tests/bundled-files-sync.test.ts` passes | integration |
| Codex parity OK | `pnpm test --run tests/codex-skill-parity.test.ts` passes | integration |
| Pi content preserved | `pnpm test --run tests/pi-skill-content.test.ts` passes | integration |
| Bundle regen committed atomically | `git log -p -1` shows `src/skills/`, per-harness dirs, and `src/bundled-files.ts` in same commit | manual |

**Execution order:**
1. Start with **`joycraft-research`** — it has the cleanest two-way split (claude/codex vs pi) and a universal section to fold in. Lowest authoring risk, validates the conditional-block machinery.
2. Then **`joycraft-verify`** — same two-way pattern, plus the codex-specific paragraph (chance to exercise a single-harness block).
3. Then **`joycraft-lockdown`** — config-target split. Higher complexity because the permission-mode table differs structurally between claude and codex/pi.
4. Last: **`joycraft-implement-feature`** — three-way divergence. Hardest because every harness needs its own block (no pairs).

**Smoke test:** `pnpm build && pnpm test --run tests/generate-bundled-files.test.ts tests/bundled-files-sync.test.ts` after each skill.

**Before implementing, verify your test harness:**
1. Confirm spec 5 has landed (`ls src/skills/ | wc -l` = 16).
2. Confirm spec 1's `applyTemplate` engine supports the `harness:claude|codex` pipe-list (per design.md Section 4 + spec 1's unit tests).
3. Run `pnpm test --run` on baseline; record green tests.

## Constraints

- MUST: only add conditional blocks to these 4 skills. Adding blocks elsewhere requires user approval — design.md Section 4 enumerates these 4 by name and policy is "unify by default."
- MUST: regenerate per-harness dirs + `bundled-files.ts` in same commit as canonical change.
- MUST: document per-skill decisions in PR description.
- MUST: respect inter-variant divergence — when codex and pi differ from each other (not just both from claude), authoring needs single-harness blocks (`<!-- harness:codex -->`, `<!-- harness:pi -->`) not a `codex|pi` pair.
- MUST NOT: add conditional blocks for any of the 14 skills migrated in spec 5. If you find a span there that *seems* to need one, that's a re-classification request — stop and surface to user.
- MUST NOT: invent new template variables. Only the 4 from spec 1.
- MUST NOT: change skill *behavior* — only restructure *sourcing*. Per-harness output should be byte-identical to the post-spec-5 baseline.
- MUST NOT: silently expand the conditional-block list beyond the 4 named skills. If `implement` or `spec-done` (from spec 5's escalation list) end up here, that's a user-approved re-classification documented in PR.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Create | `src/skills/joycraft-research.md` | Canonical with `<!-- harness:claude\|codex -->` for Agent-tool spans, `<!-- harness:pi -->` for `subagent`-tool spans. "Scanning Prior Research" section outside any block (universal). 4-variable substitutions throughout. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-research.md` | Regenerated by `pnpm build` — byte-identical to post-spec-5 baseline |
| Create | `src/skills/joycraft-verify.md` | Canonical with `<!-- harness:claude\|codex -->` for "Spawn" / Agent-tool wording, `<!-- harness:pi -->` for "Deploy" / `subagent` + `joycraft-verifier`. Codex-specific "concurrent subagent thread" + read-only paragraph in its own `<!-- harness:codex -->` block. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-verify.md` | Regenerated; byte-identical |
| Create | `src/skills/joycraft-lockdown.md` | Canonical with `<!-- harness:claude -->` for `.claude/settings.json` config + permission-mode table; `<!-- harness:codex\|pi -->` for Codex sandbox config + sandbox-style table. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-lockdown.md` | Regenerated; byte-identical |
| Create | `src/skills/joycraft-implement-feature.md` | Canonical with three single-harness blocks: `<!-- harness:claude -->` for 4-step "Loop", `<!-- harness:codex -->` for 4-step "Chain", `<!-- harness:pi -->` for 3-step `joycraft-implement-loop`. Universal intro/setup outside blocks. |
| Modify | `src/{claude,codex,pi}-skills/joycraft-implement-feature.md` | Regenerated; byte-identical |
| Modify | `src/bundled-files.ts` | Regenerated by `pnpm build` |

## Approach

**Per-skill recipe:**
1. Read all three variants of the skill side by side. Identify the exact span(s) that genuinely differ per-harness (the machinery — Agent tool vs subagent, config target, step structure). Distinguish from drift (drift is spec 5's problem; if you find drift here, it should already be unified by spec 5 — confirm).
2. Identify spans that are universal (e.g. "Scanning Prior Research" in `joycraft-research`) and place them OUTSIDE any conditional block — the canonical is the single source.
3. Draft the canonical:
   - Universal prose at top level.
   - Per-harness spans wrapped in `<!-- harness:NAME -->...<!-- /harness -->`. Use pipe-lists (`claude|codex`) where two harnesses share the same content; use single-harness blocks where each diverges.
   - Substitute the 4 variables wherever appropriate.
4. `pnpm build`; `git diff -- src/{claude,codex,pi}-skills/<file>` should be empty. If non-empty, iterate the canonical.
5. Run residue test — no `{{` in output, no unclosed `<!-- harness:` block.
6. Commit canonical + 3 regenerated + `bundled-files.ts`.

**Order of operations (recap):** research → verify → lockdown → implement-feature. Ascending complexity.

**Rejected alternatives:**
- Adding a condensed/full toggle. Design.md Section 4 explicitly rejects.
- Authoring a drift-resolution discovery doc. Design.md Section 4 explicitly rejects; PR description is the audit trail.
- Using `<!-- harness:codex|pi -->` for `joycraft-implement-feature` despite codex/pi diverging. They genuinely diverge (chain vs process-loop) — single-harness blocks for each.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| A 4-block skill reveals a 4th harness-specific span design.md didn't anticipate (e.g. inside `joycraft-research`) | STOP. Surface to user with the span and the rationale. Don't silently expand the block set. Update brief/design with the new span once approved. |
| A skill in this spec has spans that match spec 5's "unify on claude" pattern | Those spans should ALREADY have been unified by spec 5. If they haven't, spec 5 missed them — fix in spec 5 instead, then come back. Don't paper over with a conditional block here. |
| Inter-variant divergence is more complex than expected (e.g. codex and pi need overlapping but non-identical spans) | Use multiple single-harness blocks. Avoid contorting the canonical into one mega-block per harness. |
| Generated diff for any of the 4 skills is non-empty in `git diff HEAD~ -- src/<harness>-skills/<file>` after authoring | The canonical doesn't faithfully reproduce one of the variants. Read the diff, identify which span is wrong, adjust the block placement or content. Iterate. |
| Residue test fires (`{{` or unclosed `<!-- harness:`) | Typo. Find it via grep on the emitted file, fix the canonical. |
| You discover that one of the 4 skills (e.g. `lockdown`) could actually be unified by treating Codex sandbox as drift | STOP. This contradicts design.md Section 4. Surface to user — if they agree, update design.md, re-classify the skill into spec 5 retroactively, and skip it here. |
| `pi-skill-content.test.ts` expects pi-specific content that the conditional-block authoring produces correctly | Test passes — this is the expected outcome. |
| Bundle test fails because `bundled-files.ts` is stale | Run `pnpm build`. Commit `bundled-files.ts` together with canonical + per-harness changes. |

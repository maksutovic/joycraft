---
status: shipped
owner: Maximilian Maksutovic
created: 2026-05-21
feature: context-layer
---

# Update Stale Skill Paths — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-21-context-layer/brief.md`
> **Status:** Complete
> **Date:** 2026-05-21
> **Estimated scope:** 1 session / ~8 files / ~40 changed lines

---

## What
After this spec, no shipped skill references the legacy `docs/specs/<area>/` location for bugfix context, and the generic feature-example placeholders read `docs/features/<slug>/specs/...`. Two classes of edit:

1. **Generic example-path rewrite** in `verify`, `implement`, `tune`, `implement-level5`, `collaborative-setup` (Claude + Codex): the placeholder `docs/specs/my-feature/add-widget.md` (and `docs/specs/<feature-name>/`, `docs/specs/<feature>/`) becomes `docs/features/<slug>/specs/add-widget.md` (and `docs/features/<slug>/specs/`). The intent is that `docs/specs/` stops appearing anywhere in shipped skills as a *feature*-spec convention.
2. **Codex mirror catch-up** for the already-migrated bugfix/per-feature work: `src/codex-skills/joycraft-decompose.md`, `joycraft-bugfix.md`, and `joycraft-new-feature.md` are stale relative to their Claude twins (still reference `docs/briefs/` for input briefs and `docs/specs/<feature-name>/` for spec output). Bring each to parity with its Claude twin: input brief at `docs/features/<slug>/brief.md`, specs output to `docs/features/<slug>/specs/`, bugfix output to `docs/bugfixes/<area>/`, parent-brief references updated, `$` sigil preserved.

## Why
The `docs/specs/` label is confusing because feature specs now live under `docs/features/<slug>/specs/`; leaving the legacy path in shipped skills sends newcomers to a directory the tool no longer scaffolds, and the Codex mirrors silently disagree with their Claude twins.

## Acceptance Criteria
- [ ] No occurrence of `docs/specs/` remains in any file under `src/claude-skills/` or `src/codex-skills/` (verified by grep returning zero hits).
- [ ] `src/codex-skills/joycraft-decompose.md` references the input brief at `docs/features/<slug>/brief.md` and writes specs to `docs/features/<slug>/specs/` — no `docs/briefs/` references remain.
- [ ] `src/codex-skills/joycraft-bugfix.md` writes bugfix specs to `docs/bugfixes/<area>/` matching its Claude twin's path and frontmatter (`area:` field, per-area README).
- [ ] `src/codex-skills/joycraft-new-feature.md` writes decomposed specs to `docs/features/<slug>/specs/` matching its Claude twin.
- [ ] The `$` command sigil is preserved in every Codex file edited (no `/joycraft-` introduced into Codex skills).
- [ ] `pnpm test --run && pnpm typecheck` pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| No `docs/specs/` in shipped skills | `grep -rn "docs/specs/" src/claude-skills/ src/codex-skills/` returns nothing | integration (grep assertion) |
| Codex decompose layout parity | `grep -n "docs/features/<slug>/brief.md\|docs/features/<slug>/specs/" src/codex-skills/joycraft-decompose.md` present; `grep "docs/briefs/" ...` absent | integration (grep assertion) |
| Codex bugfix path parity | `grep -n "docs/bugfixes/<area>/" src/codex-skills/joycraft-bugfix.md` present; matches Claude twin | integration (grep assertion) |
| Codex new-feature path parity | `grep -n "docs/features/<slug>/specs/" src/codex-skills/joycraft-new-feature.md` present | integration (grep assertion) |
| `$` sigil preserved | `grep -c "/joycraft-" src/codex-skills/<edited>.md` returns 0 for each edited Codex file | integration (grep assertion) |
| Build/typecheck green | `pnpm test --run && pnpm typecheck` | integration |

**Execution order:**
1. Write the grep-based assertions above (a shell check or a vitest test that shells out) — they should FAIL against current files.
2. Run to confirm red (current files still contain `docs/specs/`).
3. Edit skills until all assertions pass (green).

**Smoke test:** `grep -rn "docs/specs/" src/claude-skills/ src/codex-skills/` — sub-second, the single fastest signal.

**Before implementing, verify your test harness:**
1. Run the grep assertions — they must FAIL (current files contain `docs/specs/`).
2. Each assertion targets the actual shipped skill files in `src/claude-skills/` / `src/codex-skills/`, not a copy.
3. The grep smoke test runs in well under a second.

## Constraints
- MUST keep `$joycraft-…` sigil in Codex files; never introduce `/joycraft-`.
- MUST mirror the Claude twin's body logic exactly when fixing a stale Codex file (only the platform-specific lines differ: `.claude/`→`.agents/`, `.claude/settings.json`→"deny patterns configuration", drop `instructions:` frontmatter).
- MUST NOT touch the operational fact-doc routing in `add-fact` (unrelated).
- MUST NOT alter `docs/bugfixes/<area>/` usage already correct in the Claude `bugfix` skill.

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Edit | `src/claude-skills/joycraft-verify.md` | `docs/specs/my-feature/...` and `docs/specs/` scan → `docs/features/<slug>/specs/...` |
| Edit | `src/claude-skills/joycraft-implement.md` | example spec path → per-feature |
| Edit | `src/claude-skills/joycraft-tune.md` | any `docs/specs/` example → per-feature (verify; see also wire-tune-context-layer spec) |
| Edit | `src/claude-skills/joycraft-implement-level5.md` | example spec path → per-feature |
| Edit | `src/claude-skills/joycraft-collaborative-setup.md` | `docs/specs/<feature>/` → `docs/features/<slug>/specs/` |
| Edit | `src/codex-skills/joycraft-verify.md` | mirror of Claude verify edit |
| Edit | `src/codex-skills/joycraft-implement.md` | mirror + `docs/specs/<feature-name>/` convention text |
| Edit | `src/codex-skills/joycraft-implement-level5.md` | mirror |
| Edit | `src/codex-skills/joycraft-collaborative-setup.md` | mirror |
| Edit | `src/codex-skills/joycraft-session-end.md` | spec-status scan path → per-feature / `docs/bugfixes/` |
| Edit | `src/codex-skills/joycraft-decompose.md` | bring to parity with Claude twin (input brief, spec output, parent-brief refs) |
| Edit | `src/codex-skills/joycraft-bugfix.md` | bugfix output → `docs/bugfixes/<area>/`, `area:` frontmatter, README index — match Claude twin |
| Edit | `src/codex-skills/joycraft-new-feature.md` | decomposed spec output → `docs/features/<slug>/specs/` |

## Approach
Drive the work off the grep list. Run `grep -rn "docs/specs/\|docs/briefs/" src/claude-skills/ src/codex-skills/` to get the live hit list, then for each Codex file that has a Claude twin already on the new layout, diff against the twin and copy its body verbatim except for the platform-specific lines. For pure example-path placeholders (verify/implement), a mechanical string swap is enough. Do NOT regenerate `bundled-files.ts` here — that is the dedicated final spec (`regenerate-bundled-files`); leaving it stale between specs is expected within a wave.

Rejected alternative: a blanket sed across all skills — too blunt, would rewrite legitimately-different Codex idioms and risk turning `$joycraft-` into `/joycraft-`. Edit per-file against the twin instead.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| A `docs/specs/` reference is inside prose explaining the *old* layout (migration note) | Rewrite to the new layout; this feature removes the old convention entirely |
| Claude twin and stale Codex file differ in more than paths | Treat the Claude twin as source of truth; reconcile body, preserving only Codex-idiomatic lines |
| `tune.md` example path overlaps with the wire-tune spec | Make only the path edit here; leave the Step-5/assessment logic to `wire-tune-context-layer` |

---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
mode: isolated
---

# Upgrade Optimize v2 — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-21-living-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-07-21
> **Estimated scope:** 1 session / ~23 files (1 substantive + 22 frontmatter touches) / ~200 lines

---

## What

`joycraft-optimize` becomes a semantic self-audit (S8): per material control (boundary rule, skill, hook, permission entry, context doc, template pointer) it assigns one of six dispositions — **KEEP / ONE_HOME / LOAD_LATER / MAKE_A_CHECK / PROBATION / RETIRE** — plus an evidence label (**VERIFIED | USER_REPORTED | INFERRED | INACCESSIBLE | NOT_APPLICABLE**), detects cross-file duplication, and enforces the layer-2 line budget (shipped.md + decision-log.md ≤200 lines → over-budget is a MAKE_A_CHECK pointing at the rotation procedure, never silent truncation). The skill taxonomy rides along (D3): every installed skill declares `entry: human | agent | situational` in frontmatter, internals get terse anti-discovery descriptions, and optimize checks the declaration, a human-door budget (≤9), and the description budget. No renames.

## Why

The current optimize is a read-only length audit with no semantic dispositions — harness crud accumulates as context noise with no mechanism to sentence it, and no skill declares whether it's a human door or an internal.

## Acceptance Criteria

- [ ] Optimize's audit emits a disposition table: one row per material control with columns for control, home file, disposition (exactly the six-value vocabulary), evidence label (exactly the five-value vocabulary), and a one-line reason
- [ ] Evidence labels are honest: `VERIFIED` only when optimize actually checked the thing this run (RF-KILL-3: no self-reported nominal); anything not checked is `INFERRED` or `INACCESSIBLE`
- [ ] Cross-file duplication detection: the same rule/fact found in ≥2 homes → both rows get `ONE_HOME` naming the canonical home (S4)
- [ ] Layer-2 budget check (PROTOCOL, deterministic): `wc -l` on `docs/context/shipped.md` and `docs/context/decision-log.md`; >200 → `MAKE_A_CHECK` row pointing at `docs/reference/knowledge-lifecycle.md` rotation — optimize never truncates content itself
- [ ] All 22 installed skills (21 existing + `joycraft-harden`) carry `entry: human | agent | situational` frontmatter; agent/situational internals have terse "Invoked by X after Y — not a user entry point" descriptions; human-door descriptions unchanged
- [ ] Optimize checks (PROTOCOL): every skill declares `entry:`; count of `entry: human` skills ≤9 (over-budget → named in the report); description budget check retained from v1
- [ ] Dispositions are advisory — optimize proposes; it applies nothing without the human (the Reaper's apply path is spec `add-reaper-pass`)
- [ ] Optimize + all touched skill files carry/retain PILOT markers where they diverge from `src/`
- [ ] Build passes (`pnpm typecheck`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Disposition vocabulary | grep optimize SKILL.md for all six dispositions and all five evidence labels, verbatim | structural |
| Budget check wired | grep optimize SKILL.md for `200`, both layer-2 filenames, and the knowledge-lifecycle pointer | structural |
| Taxonomy complete | script: for each dir in `.claude/skills/`, frontmatter contains `entry: (human\|agent\|situational)` — 22/22 | structural |
| Human-door budget | `grep -rl 'entry: human' .claude/skills/*/SKILL.md \| wc -l` ≤ 9 | structural |
| Advisory-only | grep optimize SKILL.md for an explicit propose-don't-apply statement | structural |
| Behavioral (dispositions) | Fresh-subagent eval — run optimize v2 on this repo, table complete with no missing labels — in spec `run-gate-evals` | integration |
| Suite green | `pnpm test --run && pnpm typecheck` | unit |

**Execution order:** write the taxonomy-completeness script and grep assertions (red) → sweep skill frontmatter → rewrite optimize's audit section (green).

**Smoke test:** the 22/22 `entry:` frontmatter script — seconds.

**Before implementing, verify your test harness:**
1. Run all checks — they must FAIL first (no skill has `entry:` today)
2. The taxonomy script reads the real installed skill files
3. Smoke test runs in seconds

## Constraints

- MUST: run after all other skill-editing specs (this spec sweeps every skill file; ordering prevents merge conflicts — deps are serialization, see queue)
- MUST: keep the human-door set at most the current 9 (setup, tune, interview, new-feature, design, decompose, bugfix, implement-feature, session-end are the natural doors — final set is the implementer's judgment call, ≤9 enforced)
- MUST: change only *presentation/discovery* in the taxonomy sweep — no renames, no flow changes, /clear handoff boundary untouched (D3)
- MUST: keep dispositions advisory in this spec — apply paths (delete/archive) are the Reaper's
- MUST NOT: touch `src/` or `templates/` (pilot pattern)
- MUST NOT: mark anything `VERIFIED` that this run didn't mechanically check

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `.claude/skills/joycraft-optimize/SKILL.md` | v2 audit: dispositions, evidence labels, duplication, budget + taxonomy checks |
| Edit | `.claude/skills/*/SKILL.md` (all 22) | `entry:` frontmatter; terse descriptions for internals |

## Approach

The six dispositions + evidence labels are Nate-doc vocabulary (design §1) adopted verbatim — one vocabulary, no synonyms. The taxonomy sweep is mechanical: classify each skill (doors = things a human types to start work; internals = things skills invoke; situational = setup/collaborative-setup-style one-timers), stamp frontmatter, tersen internal descriptions. Optimize's v1 length/plugin checks are kept and folded into the new table as MAKE_A_CHECK-style rows. Rejected alternative: taxonomy as its own early spec — it touches every skill file, so running it first would force wave 1 sequential and every later spec to merge around it; D3 says it rides S8.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| A skill is genuinely both door and internal (e.g. spec-done) | `entry: agent` if any skill invokes it as part of a flow; the human can still type it — entry declares the *primary* door, not a lock |
| Human-door count lands at 10 after classification | Report the overage with a demotion candidate; never silently reclassify to pass the check |
| Duplicate rule found in AGENTS.md and a skill body | ONE_HOME with AGENTS.md canonical for boundaries |
| shipped.md doesn't exist yet in a user project | Budget check reports NOT_APPLICABLE, not a failure |
| Optimize run in a non-Joycraft project (no skills dir) | Taxonomy checks report INACCESSIBLE and skip — v1 behavior preserved |

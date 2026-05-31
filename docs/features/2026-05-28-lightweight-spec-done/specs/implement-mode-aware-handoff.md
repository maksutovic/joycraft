---
status: done
owner: Maximilian Maksutovic
created: 2026-05-28
feature: 2026-05-28-lightweight-spec-done
mode: checkpoint
---

# Implement Mode-Aware Handoff — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-28-lightweight-spec-done/brief.md`
> **Status:** Ready
> **Date:** 2026-05-28
> **Estimated scope:** 1 session / implement skill × 3 variants + 1 test

---

## What
Make `joycraft-implement`'s hand-off (Step 6) **mode-aware**. After implementing a spec, the skill reads the spec's `mode:` frontmatter (written by spec 4) and emits the right next-step:

- **batch** — do NOT wrap per spec; move to the next spec in the same conversation; only at the last spec, hand off to `joycraft-session-end`.
- **checkpoint** — hand off to `joycraft-spec-done` (commit + status bump), then continue to the next spec.
- **isolated** — hand off to `joycraft-spec-done`, then instruct a FRESH context for the next spec: on Pi the loop automates it; on CC/Codex interactive the skill tells the human to `/clear` + re-invoke; on CC/Codex headless it's the opt-in `claude -p`/`codex exec` loop (with the ToS/cost caveat surfaced).

Also update the skill's stale completion-vocabulary reference (currently "complete when `status:` is `shipped`") to the unified `in-review`/`done`. Ships in all 3 variants + installed copies.

## Why
Modes are assigned (spec 4) and a lightweight spec-done exists (spec 5), but `joycraft-implement` still hard-codes a single hand-off to `joycraft-session-end` regardless of mode. The mode only matters if implement acts on it — this spec is where the mode becomes behavior.

## Acceptance Criteria
- [ ] The implement SKILL.md (all 3 variants) reads the spec's `mode:` frontmatter and branches the Step-6 hand-off on it
- [ ] `batch` hand-off: continue to next spec in-conversation; session-end only at the last spec
- [ ] `checkpoint` hand-off: `joycraft-spec-done` then continue
- [ ] `isolated` hand-off: `joycraft-spec-done`, then fresh-context next — with the three harness sub-cases (Pi automates / CC-Codex interactive `/clear`+re-invoke / CC-Codex headless opt-in loop with caveat)
- [ ] The skill's dependency-completion check uses the new vocabulary (a dep is satisfied when `in-review` or `done`, not `shipped`)
- [ ] The skill's directory-mode "find next spec" wording matches the updated `next-spec` semantics (serves `todo`)
- [ ] All 3 variants updated; installed copies synced
- [ ] The vestigial `joycraft_next_spec` TOOL is no longer referenced as the hand-off mechanism in the skill (the skill hands off to spec-done/session-end or the loop, not the old tool) — actual extension/tool removal is spec 8
- [ ] Tests pass
- [ ] Build passes (`pnpm build`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Mode-aware hand-off documented | `tests/implement-mode-handoff.test.ts`: read 3 source skill files; assert each describes branching on `mode` with all three modes | unit |
| batch behavior | Assert skill text: batch continues in-conversation, session-end at end | unit |
| checkpoint behavior | Assert skill text: checkpoint → spec-done → continue | unit |
| isolated behavior + harness cases | Assert skill text references fresh context AND the Pi/CC-interactive/CC-headless sub-cases incl. the ToS/cost caveat | unit |
| new vocabulary | Assert skill text does NOT say completion = `shipped`; uses `in-review`/`done` | unit |
| 3-variant parity | Assert all three variants carry the mode-aware hand-off | unit |

**Execution order:**
1. Write tests over 3 source skill files — MUST fail (current skill is single-hand-off, says `shipped`)
2. Confirm red
3. Edit 3 sources + sync installed copies until green

**Smoke test:** `pnpm vitest run tests/implement-mode-handoff.test.ts`.

**Before implementing, verify your test harness:**
1. Tests read real skill sources (`src/{claude-skills,codex-skills,pi-skills}/joycraft-implement.md` — flat files)
2. Prose ⇒ assert required tokens/branches, not exact wording
3. Single test file = smoke test

## Constraints
- MUST: edit all three flat source variants — `src/claude-skills/joycraft-implement.md`, `src/codex-skills/joycraft-implement.md`, `src/pi-skills/joycraft-implement.md` — and sync installed copies at `.claude/skills/joycraft-implement/SKILL.md`, `.agents/skills/joycraft-implement/SKILL.md`, `.pi/skills/joycraft-implement/SKILL.md`
- MUST: surface the ToS/cost caveat for the CC/Codex headless isolated sub-case (north star: "surface that caveat, not bury it")
- MUST: keep the existing TDD core (Steps 1–5) intact — only the hand-off (Step 6), the dependency-check vocabulary (Step 2), and the directory "next spec" wording (Step 1) change
- MUST: default to `batch` behavior if a spec has no `mode:` frontmatter (back-compat with pre-spec-4 specs)
- MUST NOT: remove the Pi extension or the `joycraft_next_spec` tool code here — this spec only stops the *skill* from depending on that tool; the code removal is spec 8 (which owns the Pi driver)
- MUST NOT: regenerate bundled-files — spec 9
- ASK FIRST (CLAUDE.md): skill content — authorized by the brief

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/claude-skills/joycraft-implement.md` | mode-aware Step 6; vocab fix in Step 2; Step 1 next-spec wording |
| Modify | `src/codex-skills/joycraft-implement.md` | same |
| Modify | `src/pi-skills/joycraft-implement.md` | same |
| Modify | `.claude/skills/joycraft-implement/SKILL.md` | sync installed copy |
| Modify | `.agents/skills/joycraft-implement/SKILL.md` | sync installed copy |
| Modify | `.pi/skills/joycraft-implement/SKILL.md` | sync installed copy |
| Create | `tests/implement-mode-handoff.test.ts` | Skill-content assertions |

## Approach
**Known current state (from reading the source):** Step 6 always emits `/joycraft-session-end`. Step 2 line ~44 says "complete when its frontmatter `status:` is `shipped` (or body `Status: Complete`)". Step 1 directory mode says "first active spec whose dependencies are complete".

Rewrite Step 6 into a small decision table keyed on `mode` (read from the target spec's frontmatter). Under `isolated`, include a clear sub-branch for the three harnesses, importing the caveat language from the north star verbatim-ish. Fix Step 2's completion definition to "satisfied when `in-review` or `done`". Fix Step 1's wording from "active" to "todo" to match the rewritten `next-spec`.

Keep the canonical Handoff block but make the emitted command depend on mode (`/joycraft-spec-done` for checkpoint/isolated; next `/joycraft-implement` for batch-continue; `/joycraft-session-end` at feature end).

**Rejected alternative:** A separate `joycraft-implement-isolated` skill per mode. Rejected — three near-duplicate skills triple the maintenance and the TDD core is identical; mode is a parameter, not a different procedure.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Spec has no `mode:` field | Default to `batch` hand-off |
| `mode: isolated` on CC interactive | Skill instructs human to `/clear` then re-invoke `/joycraft-implement <next>` |
| `mode: isolated` on CC headless | Skill notes the opt-in `claude -p` loop + ToS/cost caveat; does not silently auto-run |
| Last spec in a batch feature | Hand off to `joycraft-session-end` (the feature finisher) |
| Mode value is unrecognized | Treat as `batch` and note the unrecognized value |

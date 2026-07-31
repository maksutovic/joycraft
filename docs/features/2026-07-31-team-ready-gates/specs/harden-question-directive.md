---
status: done
owner: Maximilian Maksutovic
created: 2026-07-31
feature: 2026-07-31-team-ready-gates
mode: batch
---

# Harden Question Directive — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-31-team-ready-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-31
> **Estimated scope:** 1 session / 5 canonical skills + regenerated trees / ~150 lines of skill prose

---

## What

Every human-facing question moment in the five gate skills — `joycraft-interview`, `joycraft-new-feature`, `joycraft-tune`, `joycraft-design`, `joycraft-bugfix` — gains an explicit question directive: on Claude Code, questions MUST go through the AskUserQuestion tool (never a plain Q1/Q2/Q3 chat list); on codex/pi harness variants, questions use the structured chat fallback pattern already present in `joycraft-decide`. The directive enforces ≥2 real options per question and routes free-text answers as `"<choice> because <reason>"` (Pattern B).

## Why

Only `joycraft-decide.md` references AskUserQuestion today (grep-verified 2026-07-31), so every other gate's question format is left to the model and users intermittently get plain-text question lists — the top complaint in the 2026-07-31 team-usage feedback.

## Acceptance Criteria

- [ ] Each of the five skills (`joycraft-interview`, `joycraft-new-feature`, `joycraft-tune`, `joycraft-design`, `joycraft-bugfix`) contains an explicit directive to use the AskUserQuestion tool at every question moment in the Claude variant `[src: D1]`
- [ ] Codex and pi generated variants carry the structured chat fallback instead of the AskUserQuestion directive, following `joycraft-decide`'s existing pattern `[src: D1]`
- [ ] The directive states: every question offers ≥2 real options, and free-text answers are requested as `"<choice> because <reason>"` `[src: D10]`
- [ ] `pnpm sync-skills` run; regenerated (`src/*-skills/`) and installed (`.claude/`, `.agents/`, `.pi/`, `.github/`) copies committed in the same commit `[src: brief "Hard Constraints"]`
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Directive present in all 5 claude-variant skills | `tests/gate-contract.test.ts`: assert `AskUserQuestion` appears in each of the five files under `src/claude-skills/` | unit |
| Codex/pi variants use fallback, not the tool name | assert `AskUserQuestion` does NOT appear in the five files under `src/codex-skills/` and `src/pi-skills/`; assert the fallback marker phrase does | unit |
| ≥2 options + Pattern B wording | assert the directive block contains the literal phrases for the two-option minimum and `<choice> because` | unit |
| Generated trees in sync | existing bundle-drift check (suite regenerates bundles and fails on diff) | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `pnpm test tests/gate-contract.test.ts` — runs in seconds.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: edit only `src/skills/` canonical sources; never hand-edit `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/copilot-skills/` `[src: brief "Hard Constraints"]`
- MUST: run `pnpm sync-skills` and commit regenerated + installed copies in this spec's own commit `[src: brief "Hard Constraints"]`
- MUST: every question directive requires ≥2 real options — a single-option AskUserQuestion is invalid and errors `[src: D10]`
- MUST: locate question moments by reading each skill's interview/review flow, and handoff sites by the `## Recommended Next Steps` heading — never by literal greps for `/clear` or `?` `[src: brief "Hard Constraints"]`
- MUST NOT: change the slot-capped gate chat-message templates or the ten-line cap — this spec touches question moments only `[src: brief "Hard Constraints"]`
- MUST NOT: reference absolute paths in any skill content `[src: brief "Hard Constraints"]`

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-interview.md` | question directive at interview question moments |
| Modify | `src/skills/joycraft-new-feature.md` | question directive at Phase 0/2 review questions |
| Modify | `src/skills/joycraft-tune.md` | question directive at git-autonomy + profile questions |
| Modify | `src/skills/joycraft-design.md` | question directive at design review questions |
| Modify | `src/skills/joycraft-bugfix.md` | question directive at triage/discussion questions |
| Modify | `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/copilot-skills/` (5 files each) | regenerated |
| Modify | `.claude/skills/`, `.agents/`, `.pi/`, `.github/` installed copies | synced via `pnpm sync-skills` |
| Modify | `tests/gate-contract.test.ts` | new directive-presence assertions |

## Approach

Author one canonical directive block (question-tool on claude, structured-chat fallback on codex/pi) and add it at each skill's question moments, using whatever harness-variant mechanism `joycraft-decide` already uses in `src/skills/` (conditional placeholder or per-harness text — read decide first and copy its pattern exactly). Pattern B wording comes verbatim from the proven trial: instruct the user to answer via free text as `"<choice> because <one-sentence reason>"` when rationale matters. Rejected alternative: a shared include file for the directive — skills must be self-contained once installed (no imports), so the block is duplicated inline per skill by design.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| A question moment has only one natural option | Reframe with a genuine second option (e.g. the reject-framing escape) — never emit a single-option question |
| Headless / `-p` runs where no picker can render | Directive applies to interactive sessions; skills already no-op interactive steps headless — do not add a new failure path |
| A skill question is open-ended (no enumerable options) | Offer the 2–4 most likely answers as options plus free-text; the directive never forces fake precision |
| copilot variant | Follows the same fallback as codex/pi (no AskUserQuestion tool) |

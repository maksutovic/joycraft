---
status: in-review
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
mode: checkpoint
---

# Capture Execution Profile — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-29-succinct-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-29
> **Estimated scope:** 1 session / ~4 src files + 2 skills edited + tests / ~150 lines

---

## What

Give every project a per-harness **Execution Profile** (decision D6) —
captured interactively at `npx joycraft init`, offered by `joycraft-tune`
when missing, persisted as a small section in AGENTS.md:

```markdown
## Execution Profile

<!-- joycraft:execution-profile -->
- Swarms: decompose yes · implement yes
- Claude subagents: opus-5 · effort medium
- Codex: gpt-5.6-terra · effort high
<!-- /joycraft:execution-profile -->
```

Behavior:

1. **Init** — after the existing harness multi-select, ask per selected
   harness: use swarms for decompose/implement? (yes/no each) and which
   model + effort for that harness's agents (free-text with the current
   session's model as the suggested default — no hardcoded model list, model
   names age fast). Write the section into the generated AGENTS.md. The
   sentinel comments make the section machine-findable for upgrades.
2. **Improve/merge path** — when AGENTS.md already exists,
   `improve-claude-md`/`agents-md` merge logic inserts the section if absent
   and leaves it untouched if present (sentinel-delimited; user hand-edits
   win — profile is data the user owns, per D7).
3. **Tune** — `joycraft-tune` checks for the sentinel; when missing, offers
   to run the same questions and append the section. Never overwrites an
   existing profile without asking.
4. Skipping is first-class: answering "no swarms" still writes the section
   (`Swarms: decompose no · implement no`) so downstream skills read an
   explicit answer, never absence.

Profile is **data only** (D7): nothing in this spec recommends models or
routes stages — the backlogged model-tiering feature keeps ownership of
opinionated defaults (`docs/backlog/2026-07-20-model-tiering.md`).

## Why

Model/effort/swarm choices are per-project and currently live in the
human's head — they hand-type them into every decompose/implement prompt.
Model-tiering was backlogged 2026-07-20 exactly because this tuneable
configuration surface didn't exist; this spec ships the surface without the
opinions.

## Acceptance Criteria

- [ ] `npx joycraft init` in a TTY asks the profile questions per selected
  harness and writes the sentinel-delimited section into AGENTS.md.
- [ ] Non-interactive init (no TTY / `--yes`) writes the section with
  `Swarms: decompose no · implement no` and the harness's model line as
  `session default` — never blocks.
- [ ] Running init/upgrade over an existing AGENTS.md with a profile leaves
  the user's section byte-identical.
- [ ] Running upgrade over an AGENTS.md without a profile inserts the
  section.
- [ ] `joycraft-tune` (skill text) checks for the sentinel and offers the
  questions when missing.
- [ ] Build passes.
- [ ] Tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Section written at init | extend `tests/init.test.ts` fixture run: generated AGENTS.md contains both sentinels + a Swarms line | integration |
| Non-interactive default | init with prompts stubbed/absent → `decompose no` present | integration |
| Existing profile preserved | `tests/agents-md.test.ts`: merge input with a hand-edited profile → output byte-identical inside sentinels | unit |
| Missing profile inserted | merge input without sentinels → output contains section | unit |
| Tune offer | spec 5's heading-anchored idiom or a grep assertion in `tests/gate-contract.test.ts` for the sentinel reference in `src/skills/joycraft-tune.md` | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the agents-md merge unit tests — sub-second.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL first
2. Tests call the real `init`/merge functions from `src/`, not fixtures of
   expected output alone
3. Smoke test runs in seconds

## Constraints

- MUST: sentinel comments delimit the section — the only machine contract;
  everything inside is user-owned data.
- MUST: free-text model/effort values — no enum of model names anywhere in
  code (model names age faster than releases; the 0.7.x cycle proves it).
- MUST: interactive prompts follow the existing harness-selection idiom in
  `src/init.ts` (same prompt library, same `--yes` bypass).
- MUST NOT: recommend or default to any specific model tier (D7 — that is
  model-tiering's backlogged scope).
- MUST NOT: regenerate bundles or sync installed copies — spec 6 owns both
  (the tune skill edit rides to installed trees there).
- MUST NOT: write the profile anywhere except AGENTS.md (no state.json
  mirror — one home).

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `src/init.ts` | profile questions after harness select; pass answers to AGENTS.md generation |
| Edit | `src/agents-md.ts` | render the sentinel-delimited section |
| Edit | `src/improve-claude-md.ts` (or wherever AGENTS.md merge lives) | preserve-if-present / insert-if-absent |
| Edit | `src/upgrade.ts` | insert-if-absent on upgrade |
| Edit | `src/skills/joycraft-tune.md` | sentinel check + offer |
| Edit | `tests/init.test.ts`, `tests/agents-md.test.ts` | cases above |

## Approach

The sentinel-delimited-section pattern is the same append-don't-modify
posture the CLAUDE.md merge already takes (gotcha #2). Init collects a small
`ExecutionProfile` object (per-harness entries), `agents-md.ts` renders it,
merge logic treats the sentinels as an opaque user region.

Rejected alternative: structured storage in `docs/.joycraft/state.json` with
AGENTS.md as a rendered view — rejected by D6 because state.json is
gitignored (not team-shared) and invisible to hand edits, and two homes for
one fact violates ONE_HOME.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User selected only one harness | only that harness's line is asked/written |
| Harness added later via upgrade | upgrade inserts nothing per-harness on its own; tune's offer covers re-asking |
| User deletes the section entirely | downstream treats as "no profile" — briefings fall back to no injection (spec 9) |
| Malformed hand-edit inside sentinels | preserved verbatim — content is user-owned; skills read it as prose, not schema |

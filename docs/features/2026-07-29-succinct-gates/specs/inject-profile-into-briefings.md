---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
mode: batch
---

# Inject Profile Into Briefings — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-29-succinct-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-29
> **Estimated scope:** 1 session / 3 skill files edited / ~10 lines each

---

## What

Make the D5 handoff briefings (spec 7) carry the project's Execution Profile
(spec 8, decision D7). In `src/skills/joycraft-decompose.md`,
`src/skills/joycraft-new-feature.md` (its implement handoff), and
`src/skills/joycraft-implement-feature.md` (its intake step), add the
instruction:

> Before filling the handoff briefing, read the `## Execution Profile`
> section of AGENTS.md (between the `joycraft:execution-profile` sentinels).
> If swarms are enabled for the next step, add one **Execution:** line to the
> briefing, quoting the profile verbatim — e.g.
> `Execution: swarm implement — claude subagents opus-5 at effort medium.`
> If the section is missing or swarms are off for that step, add no line.

And in `joycraft-implement-feature`: on intake, honor an `Execution:` line
in the invoking prompt — spawn per-spec subagents with the stated model and
effort (the Agent tool's model/effort params are the one enforceable hook).
When no line is present, inherit the session model as today.

## Why

The human hand-types "use subagents on opus-5 medium" into every decompose
and implement prompt. The profile (spec 8) stores the answer; this spec
closes the loop so the briefing carries it and the driver obeys it — the
same carry-context-forward thesis as D5.

## Acceptance Criteria

- [ ] All three skills carry the profile-read instruction at the specified
  step, including the fallback ("no section → no line").
- [ ] `joycraft-implement-feature` maps the `Execution:` line onto subagent
  spawn params and states the inherit default.
- [ ] The briefing stays within its ~8-line budget — the Execution line
  replaces nothing and is one line, verbatim from the profile.
- [ ] Build passes.
- [ ] Tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Instruction present per skill | extend `tests/gate-contract.test.ts` (spec 5 file) with group 6: `joycraft:execution-profile` sentinel referenced in the three skills | unit |
| Spawn-param mapping stated | grep `implement-feature` for model/effort near its subagent-spawn step | manual → unit in the same group |

**Execution order:**
1. This spec runs before spec 5 in the queue — write the edits here, the
   mechanical oracle lands with spec 5's group 6
2. `pnpm test` before and after — identical results expected (installed
   copies stale until spec 6)
3. Edit `src/skills/` only

**Smoke test:** `rg -c "joycraft:execution-profile" src/skills/` — instant.

**Before implementing, verify your test harness:**
1. `pnpm test` green before editing
2. Same windowed-test hazard as specs 2–4/7 — decompose and new-feature are
   windowed files; place edits with the existing briefing blocks
3. Smoke test runs instantly

## Constraints

- MUST: quote the profile verbatim into the briefing — skills never
  translate, validate, or "improve" the user's model names (data only, D7).
- MUST: degrade silently — no profile, no line, no warning.
- MUST NOT: instruct any skill to *recommend* a model (model-tiering's
  backlogged scope).
- MUST NOT: regenerate bundles or sync installed copies — spec 6 owns both.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `src/skills/joycraft-decompose.md` | profile-read + Execution line in its implement handoff briefing |
| Edit | `src/skills/joycraft-new-feature.md` | same, in its Phase 4 handoff |
| Edit | `src/skills/joycraft-implement-feature.md` | honor Execution line → subagent model/effort params; inherit default |

## Approach

Three small edits riding the spec-7 briefing blocks. The enforceable end is
the Agent tool's model/effort params in implement-feature's driver — the
briefing is the transport between sessions, which is exactly why it must be
in the prompt rather than in a doc the cold agent may not read.

Rejected alternative: implement-feature reads AGENTS.md itself and skips the
briefing transport — rejected because the invoking human can override the
profile for one run by editing the pasted briefing line, which matches how
the human works today; the prompt is the authority at execution time.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Profile says swarms off for implement | no Execution line; implement-feature runs inline as today |
| Briefing hand-edited to a different model | the pasted prompt wins — profile is default, prompt is authority |
| Harness in profile ≠ harness running the driver | driver uses its own harness's line; other harnesses' lines are ignored |

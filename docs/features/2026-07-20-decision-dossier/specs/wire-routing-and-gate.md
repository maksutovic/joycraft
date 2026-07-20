---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-20
feature: 2026-07-20-decision-dossier
mode: checkpoint
---

# Wire Routing and Gate — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-20-decision-dossier/brief.md`
> **Status:** Ready
> **Date:** 2026-07-20
> **Estimated scope:** 1 session / 3 modified skill files (repo-local installed copies)

---

## What

Wire the deposition into the loop, repo-local for the pilot: (1)
`joycraft-design` and `joycraft-new-feature` end by routing to
`joycraft-decide`; (2) `joycraft-decompose` gains a gate step that reads the
brief's `decisions:` frontmatter and refuses to decompose while any decision
is `open` — unless the user explicitly defers, which backlogs the decision
and records it. All three edits go to this repo's installed copies in
`.claude/skills/` only, each carrying a pilot divergence marker.

## Why

Without routing the deposition never runs, and without the gate the
three-way terminal lifecycle has no teeth — open questions survive into
specs exactly as they do today.

## Acceptance Criteria

- [ ] `.claude/skills/joycraft-design/` ends its flow with: invoke
      `/joycraft-decide <design path>` before recommending decompose (≤5
      added lines)
- [ ] `.claude/skills/joycraft-new-feature/` same, for the brief path (≤5
      added lines)
- [ ] `.claude/skills/joycraft-decompose/` gains a gate after Step 1: parse
      brief frontmatter `decisions:`; any entry with `status: open` → refuse
      with a message naming the open decisions and pointing at
      `/joycraft-decide`
- [ ] Explicit-defer path: when the user says backlog/skip/don't-worry, the
      gate marks those decisions `backlogged` (with a reason) and proceeds
- [ ] A brief with no `decisions:` block passes the gate (legacy briefs keep
      working)
- [ ] All three edited files carry `<!-- PILOT: diverges from src/ — see
      2026-07-20-decision-dossier brief decision #7 -->`

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Gate refuses on open | Run decompose against a fixture brief with one `open` decision → refusal names it | manual/e2e |
| Explicit defer | Same fixture, reply "backlog it" → decision marked backlogged, decompose proceeds | manual/e2e |
| Legacy pass-through | Run decompose against a decisions-less fixture brief → no gate interference | manual/e2e |
| Divergence markers | Grep the three files for the PILOT marker | unit (grep) |

**Execution order:** create the two fixture briefs, verify current decompose
ignores decisions (red — gate absent), apply edits, re-run both fixtures
(green), delete fixtures before commit.

**Smoke test:** grep for the PILOT marker in all three files (~1s).

**Before implementing, verify your test harness:** fixtures live in a
scratch feature folder (`docs/features/9999-99-99-fixture/`) deleted before
commit; the gate trial must run in a session that has NOT already seen this
spec, or use a subagent, so the refusal comes from the skill text, not from
conversation memory.

## Constraints

- MUST: keep each routing edit ≤5 lines — this feature must not fatten the
  skills it touches (RF-DIET-1)
- MUST: gate reads brief frontmatter only — the single source locked by D3
- MUST NOT: touch `src/claude-skills/`, `templates/claude-kit/`, or codex/pi
  variants — pilot divergence is deliberate and marked
- MUST NOT: run bundle regen or installed-copy sync — that rule applies to
  product skill edits; these are pilot-local edits in the opposite direction
- MUST NOT: make the gate block on `backlogged` or `discarded` decisions —
  only `open` blocks

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| modify | `.claude/skills/joycraft-design/SKILL.md` | +route to decide |
| modify | `.claude/skills/joycraft-new-feature/SKILL.md` | +route to decide |
| modify | `.claude/skills/joycraft-decompose/SKILL.md` | +decisions gate |

## Approach

Three surgical text edits, no logic elsewhere. The gate goes in decompose
(not in decide) so it holds even when a user jumps straight to
`/joycraft-decompose` without ever running the deposition. Rejected
alternative: a shared gate snippet duplicated into implement-feature as
well — rejected for the pilot because decompose is the single entry to spec
generation, and duplicated gates are the drift pattern this repo just
documented (RF-4).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| decisions block malformed YAML | Gate reports the parse error and treats the brief as gated (fail-closed), pointing at the file |
| Mixed statuses (some clarified, one open) | Refusal names only the open one |
| User defers some, answers none | Deferred → backlogged; gate re-evaluates; proceeds only when zero remain open |
| Design ran but user skipped decide | Decompose gate catches it — that's the point |

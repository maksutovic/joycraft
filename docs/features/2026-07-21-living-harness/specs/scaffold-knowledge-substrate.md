---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
mode: checkpoint
---

# Scaffold Knowledge Substrate — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-21-living-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-07-21
> **Estimated scope:** 1 session / 5 files / ~150 lines

---

## What

Create the layer-2 knowledge substrate that later specs consume: `docs/context/anchors.md` (confidence anchors {0,25,50,75,100} + the load-bearing ≤50 block rule), `docs/context/shipped.md` (the empty shipped ledger with its row schema), and `docs/reference/skill-authoring.md` (the PROTOCOL-vs-JUDGMENT authoring rule). Flip `docs/context/decision-log.md` to newest-first and amend the write rule in `joycraft-add-fact` and `joycraft-decide` from append-only to prepend-only — all in the same commit (D7).

## Why

S2 (confidence scoring), S5 (ledger), and S10 (authoring rule) all consume these artifacts; without the same-commit flip+amendment, the most-read context doc is newest-first while its write rule still says append — two versions of the truth.

## Acceptance Criteria

- [ ] `docs/context/anchors.md` exists with the 2-field shared frontmatter schema (`last_updated`, `last_updated_by`), defines all five anchors {0, 25, 50, 75, 100} with one-line meanings, defines "load-bearing," and states the block rule: **load-bearing AND ≤50 blocks propagation — deepen or become a dossier question** (D5, design §4)
- [ ] `docs/context/shipped.md` exists with the 2-field shared schema, header row `| Date | Feature | What shipped | Where (paths) | PR | Owner |`, a "newest-first, prepend-only, 200-line budget" comment, and zero data rows (D2)
- [ ] `docs/reference/skill-authoring.md` exists and states the PROTOCOL-vs-JUDGMENT rule: skill steps are labeled PROTOCOL (deterministic, machine-checkable, deviation is a bug) or JUDGMENT (model discretion, deviation is calibration) — new/changed skills must make the distinction explicit (S10)
- [ ] `docs/context/decision-log.md` data rows are reversed to newest-first (one-time reversal; no row content modified, only order)
- [ ] `joycraft-add-fact/SKILL.md` line "**Append only. Never modify or remove existing real content.**" is amended to: prepend new rows for time-ordered table docs (newest-first); never modify or remove existing rows — with a PILOT marker
- [ ] `joycraft-decide/SKILL.md` decision-log write instruction says prepend, with a PILOT marker
- [ ] Flip + both skill amendments land in one commit (D7 hard constraint)
- [ ] Build passes (`pnpm typecheck`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| anchors.md complete | `grep` for `0`, `25`, `50`, `75`, `100` anchor definitions + "load-bearing" + "≤50" (or `<= 50`) in the file | structural |
| shipped.md schema | `grep -F '| Date | Feature | What shipped | Where (paths) | PR | Owner |' docs/context/shipped.md`; confirm no data rows | structural |
| skill-authoring.md rule | `grep -c 'PROTOCOL\|JUDGMENT'` ≥ 2 | structural |
| decision-log newest-first | first data row's date ≥ last data row's date | structural |
| add-fact amended | `grep -i 'prepend' .claude/skills/joycraft-add-fact/SKILL.md` matches; old "Append only" bold rule gone | structural |
| decide amended | `grep -i 'prepend' .claude/skills/joycraft-decide/SKILL.md` matches near the decision-log step | structural |
| suite green | `pnpm test --run && pnpm typecheck` | unit |

**Execution order:** these are doc/skill-markdown changes — write the grep assertions as a checklist first, confirm they fail against the current tree (red), then create/edit files until all pass (green).

**Smoke test:** the decision-log first-vs-last date comparison — instant, catches the core flip.

**Before implementing, verify your test harness:**
1. Run all checks — they must FAIL against the current tree (anchors.md doesn't exist yet; decision-log is oldest-first)
2. Each check inspects the actual repo files, not a copy
3. Smoke test runs in seconds

## Constraints

- MUST: land the decision-log flip and both skill amendments in the same commit (D7)
- MUST: use the 2-field shared frontmatter schema for `docs/context/*` files (they are shared artifacts, not feature exhaust)
- MUST: mark both skill edits with `<!-- PILOT: diverges from src/ — see 2026-07-21-living-harness brief -->`
- MUST: keep ledger row schema factual and thin — when/what/who/where/PR, no narrative column
- MUST NOT: touch `src/` or `templates/` (ASK FIRST; pilot pattern — repo-local only)
- MUST NOT: modify, merge, or reword any existing decision-log row content during the reversal

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `docs/context/anchors.md` | Anchor definitions + block rule |
| Create | `docs/context/shipped.md` | Empty ledger, schema header, budget note |
| Create | `docs/reference/skill-authoring.md` | PROTOCOL-vs-JUDGMENT rule |
| Edit | `docs/context/decision-log.md` | Reverse data rows newest-first |
| Edit | `.claude/skills/joycraft-add-fact/SKILL.md` | Append-only → prepend-only for time-ordered docs |
| Edit | `.claude/skills/joycraft-decide/SKILL.md` | Decision-log append → prepend |

## Approach

Write the three new docs from the definitions stamped in the brief's Hard Constraints and design §2/§4 (anchors thresholds from CE claude pass: block = load-bearing ∧ ≤50). Reverse decision-log rows mechanically (script or careful edit — row order only). Amend the two skills minimally: the rule sentence plus PILOT marker, nothing else. Rejected alternative: putting the PROTOCOL-vs-JUDGMENT rule inside anchors.md — anchors are consumed by authoring skills scoring *claims*; the authoring rule governs *skill design*. Different audiences, different homes (S4 one-home).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| decision-log gains new rows before this spec runs (file is currently dirty in git) | Reverse whatever rows exist at implementation time; the flip is order-only |
| `docs/reference/` doesn't exist | Create it (`spec-status-lifecycle.md` already implies it does) |
| Two rows share a date during reversal | Preserve their relative order (stable reversal) |

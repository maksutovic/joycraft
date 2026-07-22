---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
mode: checkpoint
---

# Add Confidence Scoring — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-21-living-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-07-21
> **Estimated scope:** 1 session / 3 files / ~100 lines

---

## What

`joycraft-design` and `joycraft-new-feature` self-score load-bearing claims with discrete confidence anchors against `docs/context/anchors.md` at write time; `joycraft-decide` audits those scores while building the dossier (may re-anchor with a note) and **blocks propagation** of any load-bearing claim at ≤50 — it must deepen or become a dossier question (S2, D5). Riders folded in: new-feature's spec template switches `status: active` → `status: todo` + `mode:` field (vocabulary unification), and the repo-local design skill re-absorbs `src/`'s "Reconcile Brief with Findings" step (both resolved design decisions, §4).

## Why

Load-bearing claims currently carry no confidence signal, so vibes-level assumptions propagate into specs with the same authority as verified facts — and two authoring skills emit different initial statuses for the same artifact.

## Acceptance Criteria

- [ ] Design and new-feature instruct: every **load-bearing** claim (per anchors.md's definition) gets a discrete anchor from {0, 25, 50, 75, 100}, written inline as `(anchor: N)` — self-scored against `docs/context/anchors.md`, never a free-form percentage
- [ ] Decide gains an audit step: review self-scores while building the dossier; re-anchoring is allowed and leaves a visible note `(anchor: N→M — <reason>)` (D5: author and judge separated)
- [ ] Decide blocks: a load-bearing claim at ≤50 cannot propagate past the deposition — it is deepened (research) or becomes a dossier question; the block is PROTOCOL
- [ ] New-feature's embedded spec template emits `status: todo` and a `mode:` field (matching decompose and the queue lifecycle `todo → in-review → done`)
- [ ] Design re-includes the "Reconcile Brief with Findings" step from `src/templates/claude-kit/skills/` design skill (S1-adjacent: catches silent brief-vs-reality drift)
- [ ] All three edits carry the PILOT divergence marker
- [ ] Build passes (`pnpm typecheck`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Self-scoring present | grep design + new-feature SKILL.md for `anchor:` and `anchors.md` | structural |
| Audit + block in decide | grep decide SKILL.md for re-anchor note format and the ≤50 block rule | structural |
| Discrete anchors only | grep skills for `{0, 25, 50, 75, 100}` (or equivalent enumeration); no "percentage" language | structural |
| Template vocab unified | grep new-feature SKILL.md spec template for `status: todo` and `mode:`; `status: active` absent from the spec template | structural |
| Reconcile step restored | grep design SKILL.md for `Reconcile Brief with Findings` | structural |
| Suite green | `pnpm test --run && pnpm typecheck` | unit |

**Execution order:** grep assertions first (red), edit the three skills (green).

**Smoke test:** `grep -l 'anchors.md' .claude/skills/joycraft-{design,new-feature,decide}/SKILL.md` → 3 files.

**Before implementing, verify your test harness:**
1. Run all checks — they must FAIL against the current skills
2. Checks inspect the installed `.claude/skills/` files
3. Smoke test runs in seconds

## Constraints

- MUST: depend on `docs/context/anchors.md` as the single definition of anchors, "load-bearing," and the threshold — do not restate numbers that could drift (S4 one-home); quoting the anchor *set* is fine, redefining meanings is not
- MUST: keep decide an auditor, not an author — it re-anchors with a note; it never writes first-pass scores for claims it also selected as questions (RF-KILL-3)
- MUST: preserve reject-framing escape — the human can reject a block verdict and force propagation, visibly logged
- MUST NOT: touch `src/` or `templates/` (the reconcile step is *copied* from src into the repo-local skill, src unchanged)
- MUST NOT: score non-load-bearing prose — anchor load lands only where propagation risk lives

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `.claude/skills/joycraft-design/SKILL.md` | Self-scoring + reconcile step |
| Edit | `.claude/skills/joycraft-new-feature/SKILL.md` | Self-scoring + spec-template vocab (`todo` + `mode:`) |
| Edit | `.claude/skills/joycraft-decide/SKILL.md` | Score audit + ≤50 load-bearing block |

## Approach

Anchor scoring rides existing authoring flows (design §2 Desired End State; new-feature's brief interview) as a one-paragraph instruction plus template placeholders. Decide's audit slots into its existing dossier-construction pass; the block extends its termination rule — a claim can terminate `clarified` only if >50 or deepened. Rejected alternative: decide derives all scores itself (design §5 Q-D5 Option B) — scoring claims it also selected as questions is self-certification, and claims in docs decide never reads would stay unscored.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| anchors.md missing (substrate spec not yet run) | Skills say so and skip scoring loudly — never invent inline anchor definitions |
| Author scores a load-bearing claim 75+, decide's audit disagrees downward past the threshold | Re-anchor note + the claim enters the dossier as a question |
| Human rejects a block (reject-framing escape) | Claim propagates with a visible `(anchor: ≤50, propagated by human override)` stamp |
| Legacy brief with unscored claims enters decide | Decide scores them during audit, marked `(anchor: N — audit-scored, no self-score)` |

---
status: done
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
mode: checkpoint
---

# Add Provenance Gate — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-21-living-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-07-21
> **Estimated scope:** 1 session / 2 files / ~80 lines

---

## What

`joycraft-decompose` stamps a provenance cite on every constraint and acceptance criterion it writes into specs — `[src: D<n>]` (stamped decision), `[src: design §<n>]`, or `[src: brief "<section>"]` — and anything it cannot trace is auto-labeled `[src: INVENTED]` and surfaced in the decomposition table for human review **before** spec files are generated (S1). `joycraft-verify`'s oracle is re-pointed: the verifier judges the implementation against the human-approved brief + Hard Constraints + boundaries, not the spec alone.

## Why

Agent-invented premises currently crystallize unreviewed in specs and steer entire implementations wrong — the spec becomes the oracle for verifying itself.

## Acceptance Criteria

- [ ] Decompose's spec-generation step (Step 5) requires a `[src: …]` cite on every line in Constraints and Acceptance Criteria sections of generated specs
- [ ] The cite vocabulary is exactly: `D<n>` (brief `decisions:` frontmatter), `design §<n>`, `brief "<section>"`, `INVENTED` — extending the existing decisions-frontmatter gate contract, not a parallel scheme
- [ ] Decompose's table-presentation step (Step 4) gains a PROTOCOL sub-step: list all `INVENTED` items and require the human to approve (item becomes a stamped micro-decision in the brief's `decisions:` block), reword to a traceable source, or drop — before any spec file is written
- [ ] Zero-INVENTED decompositions state that explicitly ("all constraints traced") — earned silence, not absence of the check
- [ ] `joycraft-verify`'s verifier prompt includes brief Hard Constraints + `decisions:` block + AGENTS.md boundaries as oracle inputs, and asks the verifier to flag spec-vs-brief drift as a finding
- [ ] Both edits carry the PILOT divergence marker
- [ ] Build passes (`pnpm typecheck`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Cite requirement present | grep decompose SKILL.md for `[src:` and the four-source vocabulary | structural |
| INVENTED gate before generation | grep confirms the INVENTED review sub-step appears in Step 4 (before Step 5's file writes) | structural |
| Verify oracle re-pointed | grep verify SKILL.md for brief/Hard Constraints/boundaries as verifier inputs | structural |
| PILOT markers | `grep -l PILOT` on both files | structural |
| Behavioral | Fresh-subagent eval (fixture brief + one untraceable constraint → INVENTED flag surfaces) in spec `run-gate-evals` | integration |
| Suite green | `pnpm test --run && pnpm typecheck` | unit |

**Execution order:** grep assertions first (red), edit both skills (green).

**Smoke test:** `grep -c '\[src:' .claude/skills/joycraft-decompose/SKILL.md` > 0.

**Before implementing, verify your test harness:**
1. Run all checks — they must FAIL against the current skills
2. Checks inspect the installed `.claude/skills/` files
3. Smoke test runs in seconds

## Constraints

- MUST: extend the existing `decisions:` frontmatter schema for approved-INVENTED micro-decisions (design §3 — never invent a parallel provenance store)
- MUST: keep the INVENTED review human-gated — decompose never self-approves an invented premise (RF: reject-framing escape on every decision UI)
- MUST: label the cite-stamping and INVENTED-surfacing sub-steps PROTOCOL
- MUST NOT: touch `src/` or `templates/` (pilot pattern)
- MUST NOT: require cites outside Constraints/ACs (Approach and Edge Cases stay judgment prose — cite load lands where variance is born)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `.claude/skills/joycraft-decompose/SKILL.md` | Cite vocabulary + INVENTED gate in Steps 4–5 |
| Edit | `.claude/skills/joycraft-verify/SKILL.md` | Oracle inputs: brief + decisions + boundaries |

## Approach

Add the cite vocabulary where Step 5 defines the spec body, and the INVENTED review where Step 4 presents the table — the gate rides existing checkpoints rather than adding a new one. Approved INVENTED items get appended to the brief's `decisions:` block as `id: D<next>` with `status: clarified` so downstream cites resolve. Rejected alternative: flagging INVENTED items inside generated spec files only — by then the human is reviewing 10 files instead of one table, and unreviewed premises are exactly the failure S1 kills.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Brief has no `decisions:` block (legacy/inline feature) | Cites fall back to `brief "<section>"` / `design §<n>` / `INVENTED`; gate still runs |
| A constraint traces to multiple sources | Cite the most specific (D-id > design > brief) |
| Human approves an INVENTED item | Stamp it as a new clarified decision in the brief frontmatter, then cite `[src: D<new>]` |
| Verify finds spec-vs-brief drift | Reported as a finding against the *spec*, not auto-failed against the implementation |

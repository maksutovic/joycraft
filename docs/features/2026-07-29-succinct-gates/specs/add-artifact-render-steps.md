---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
mode: isolated
---

# Add Artifact Render Steps — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-29-succinct-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-29
> **Estimated scope:** 1 session / 6 files edited / ~20-30 lines added each

---

## What

Add a render-and-open artifact step to the gate of the six skills that lack
one — `joycraft-new-feature`, `joycraft-design`, `joycraft-decompose`,
`joycraft-research`, `joycraft-tune`, `joycraft-optimize` (`joycraft-decide`
already has the dossier flow and is untouched). The step, modeled directly on
decide's Step 4 ("Render and open the dossier"):

1. The gate's markdown artifact is written first and stays canonical — agents
   read the `.md`, never the HTML (decision D4). The HTML is a render of it.
2. Read `docs/templates/REVIEW_GATE_TEMPLATE.html` (spec 1). Fill ONLY the
   `<!-- SLOT:… -->` regions; structure, class names, CSS, and theme script
   stay byte-identical — never generate freeform HTML.
3. Write to `docs/features/<slug>/<gate>.html` (e.g. `brief.html`,
   `design.html`, `decompose.html`, `research.html`; tune and optimize write
   next to their reports). Committed, linguist-collapsed via the existing
   `.gitattributes` pattern that already covers `dossier.html`.
4. Open it before asking anything: `open <path>` on darwin, `xdg-open <path>`
   otherwise. If both fail (headless/CI/Pi isolated mode), print the absolute
   path and continue — a no-op, never a failure.
5. Offer — don't push — an optional hosted artifact for a shareable link.

The chat message that follows is the spec-2 slot template, whose "Artifact:"
slot carries the opened HTML path and the canonical md path.

## Why

The dossier proves the pattern: the artifact *appears*, unprompted, and
review costs seconds. Every other gate makes the human excavate a transcript.
This was the second half of the observed 2026-07-29 failure — no artifact at
the decompose gate — and is the `auto-open-review-artifacts` backlog item,
absorbed here.

## Acceptance Criteria

- [ ] All six skills instruct the five-step render flow at their gate,
  including the headless no-op and the offer-don't-push hosted option.
- [ ] Each skill names its canonical md artifact explicitly and states that
  the HTML derives from it (D4 sentence present).
- [ ] `.gitattributes` guidance covers the new `<gate>.html` paths the same
  way it covers `dossier.html` (linguist-generated, collapsed in PRs).
- [ ] Build passes.
- [ ] Tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Render step present in all 6 skills | spec 5 content test; here grep `rg -c "REVIEW_GATE_TEMPLATE.html" src/skills/` = 6 | manual → unit in spec 5 |
| Headless no-op wording | grep for "print the absolute path and continue" in all 6 | manual → unit in spec 5 |
| D4 canonical-md sentence | grep for "canonical" near the render step | manual → unit in spec 5 |
| No regression | `pnpm test` green (installed copies stale until spec 6) | integration |

**Execution order:**
1. Mechanical oracle lands in spec 5; here, edit + grep-verify
2. Run `pnpm test` before and after — identical results expected
3. Implement all six edits in `src/skills/` only

**Smoke test:** `rg -c "REVIEW_GATE_TEMPLATE.html" src/skills/` — instant.

**Before implementing, verify your test harness:**
1. `pnpm test` green before editing
2. Windowed-test hazard identical to spec 2 — same files, same fragile
   regions; place the render step adjacent to the spec-2 slot template, away
   from the sliced windows
3. Smoke test above runs instantly

## Constraints

- MUST: copy decide's graceful degradation exactly — headless is a no-op.
- MUST: markdown remains canonical; HTML never carries content absent from
  the md (D4).
- MUST: reuse the existing dossier `.gitattributes`/linguist approach.
- MUST NOT: touch `joycraft-decide` — its dossier flow is the model, not a
  target.
- MUST NOT: regenerate bundles or sync installed copies — spec 6 owns both.
- MUST NOT: instruct freeform HTML anywhere — slot-fill only.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `src/skills/joycraft-new-feature.md` | render step for `brief.html` at Phase 2 |
| Edit | `src/skills/joycraft-design.md` | render step for `design.html` at Step 4 |
| Edit | `src/skills/joycraft-decompose.md` | render step for `decompose.html` at the review gate |
| Edit | `src/skills/joycraft-research.md` | render step for `research.html` at Present |
| Edit | `src/skills/joycraft-tune.md` | render step beside the assessment report |
| Edit | `src/skills/joycraft-optimize.md` | render step beside the overhead report |
| Edit | `.gitattributes` (or the skill text that generates it) | collapse the new gate HTML paths |

## Approach

Lift decide's Step 4 wording as the shared skeleton, substitute the template
path and per-gate artifact name, add the D4 canonical-md sentence. Where a
gate's md artifact doesn't exist yet as a file (decompose's review content
was previously chat-only), the step first writes the md (e.g.
`docs/features/<slug>/decompose.md`) — the render never invents content.

Rejected alternative: rendering the markdown to HTML mechanically — rejected
because a markdown→HTML library is a runtime dependency (AGENTS.md NEVER) and
default renders are exactly the unreadable page observed 2026-07-29;
slot-fill by the agent is the dependency-free path decide already proves.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Headless / CI / Pi isolated mode | `open` fails → print absolute path, continue; never abort the gate |
| Feature folder doesn't exist yet (tune, optimize) | write beside the report's existing home; lazy-create dirs |
| Re-running a gate (re-decompose) | overwrite the same `<gate>.html` — it is a render, the md is the record |
| Hosted artifact declined | local file remains the artifact; no retry, no nagging |

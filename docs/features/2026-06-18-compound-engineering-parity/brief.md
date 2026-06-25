---
status: in-review
owner: Maximilian Maksutovic
created: 2026-06-18
source: Multi-model competitive analysis of EveryInc/compound-engineering-plugin
panel: ce-vs-joycraft-multimodel
---

# Feature Brief — Compound-Engineering Parity (multi-model panel → convergence → roadmap)

> **Origin:** Max ran a deliberate multi-model exercise — Codex, Claude (Opus 4.8),
> and GLM-5.2 each produce an *independent* exhaustive comparison of Every's
> Compound Engineering plugin (`EveryInc/compound-engineering-plugin`, 37 skills /
> 42–50+ agents) against Joycraft (20 skills, ~2 subagents). Maximum context, maximum
> diversity of opinion, minimum single-model blind spots. The agents then cross-review
> each other's analyses and converge on a central truth, which becomes the roadmap.

## Why this is a feature track, not just research

The *analysis* is research. The *track* is what we do with it: a sequenced set of
changes that close Joycraft's real gaps against CE without diluting Joycraft's spine.
The panel exists to make the prioritization trustworthy — three models agreeing on a
gap is a much stronger signal than one model asserting it.

## The panel

Three independent analyses live in `research/`:

| Author | File | Status | Method (as stated) |
|--------|------|--------|--------------------|
| **Codex** | `research/ce-vs-joycraft-codex.md` | done | Skill-by-skill map + agent-library count + tiered gap list + naming-hazard catch. 211 lines. |
| **Claude (Opus 4.8)** | `research/ce-vs-joycraft-claude.md` | done | Mechanism-level deep read (5 parallel reader subagents over the CE corpus + direct read of the full `docs/solutions/skill-design/` methodology). Headlines the *methodology* gap. ~460 lines. |
| **GLM-5.2** | `research/ce-vs-joycraft-glm.md` | done | Blind rewrite from CE source + Joycraft skills (retracted an earlier brief-contaminated draft — see its frontmatter). Disk-counts: 39 CE skills, 43 CE agents. Adds a value-to-effort roadmap (§9). |

**Rule for the panel:** each model writes *without* reading the others first, so the
independence is real. Cross-review happens only after all three exist. (GLM caught its
own contamination — its first draft had read `brief.md` and inherited its fingerprints;
it retracted and re-derived from source. That self-correction is exactly the integrity
the panel design is meant to enforce.)

**Convergence:** see `convergence.md` — the merged central truth + final roadmap.

## Where the analyses already agree (high-confidence findings)

Codex and Claude converge strongly — treat these as load-bearing:

1. **Multi-agent review is the #1 practical gap.** Joycraft has one read-only
   spec-conformance verifier (`joycraft-verify`); CE has persona panels + confidence
   anchors + dedup + autofix-class routing for both code *and* docs. Both models rank
   this first or near-first.
2. **Compounding-with-maintenance is the #2 gap — and it's CE's literal namesake.**
   Joycraft captures knowledge (facts, discoveries, context docs) but has *no retrieval
   metadata, no retrieval agent, and no refresh/consolidate lifecycle*. It accretes and
   drifts. Both models flag that Joycraft has "only the write half" of its own loop.
3. **No strategy anchor / no read-side outcome loop** (`STRATEGY.md` + `ce-product-pulse`).
4. **No external/web/framework-docs research** — Joycraft research is deliberately
   codebase-only and opinion-free (both models also flag this as a *strength* to preserve).
5. **Joycraft's genuine strengths to protect:** atomic spec queue + `todo→in-review→done`
   lifecycle, OS-process isolation (`pi -p` per spec), independent verification,
   research objectivity (researcher never sees the brief), the design-checkpoint hard
   pause, lockdown, team setup, and the **Level-5 holdout scenario wall** (no CE analog).

## Where they diverge (the panel's value — resolve in convergence)

| Axis | Codex's emphasis | Claude's emphasis | To resolve |
|------|------------------|-------------------|------------|
| **The headline gap** | Two co-equal gaps: review + compounding-with-maintenance | A *meta*-gap above both: CE codified & dogfooded a **skill-design methodology** (PROTOCOL/JUDGMENT, eval harness, confidence anchors as reusable discipline) and uses its own loop to improve its toolchain. | Is "methodology" a separate, higher-priority gap, or is it just the *means* by which the review+knowledge gaps get closed well? |
| **Naming hazards** | Caught the **`optimize` collision** (CE = experiment loops, Joycraft = token audit) and `verify` ≠ `code-review`. | Did not surface naming collisions. | Adopt Codex's naming guidance: a future experiment-loop skill is `joycraft-experiment`/`joycraft-tune-loops`, never `optimize`; review is a *new* `joycraft-review-code`, not an overload of verify. |
| **Breadth enumeration** | Enumerates issue-tracker integration, browser/Xcode tests, post-merge surface (demo/promote/release-notes), `ce-proof` as discrete gap rows. | Folds these into "optional packs, not core." | Agree on pack-vs-core boundary in convergence. |
| **CE agent count** | "50+ agents" (from README) | "42 agents" (from actual file count) | Minor — Claude's count is from disk; README says 50+. Note the discrepancy, don't relitigate. |
| **Self-improvement loop** | Lists `ce-optimize` (real experiment loop) as a Tier-2 capability gap. | Lists `ce-optimize` but is skeptical Joycraft needs it given the holdout wall. | Open question #9 below. |

## Convergence protocol (the cross-review)

Once GLM-5.2's entry lands:

1. **Each model reviews the other two** — not to defend its own doc, but to find: (a)
   claims the others got *wrong* (factual errors about CE or Joycraft mechanics), (b)
   gaps the others *missed*, (c) where a divergence is real disagreement vs just
   different altitude.
2. **Produce `convergence.md`** — a single merged truth with: the agreed gap ranking,
   the resolved divergences (with the reasoning), a corrected-facts list, and the
   final roadmap. Each contested point notes which model(s) held which position.
3. **Max arbitrates** any remaining genuine disagreement.

`convergence.md` — not any single model's doc — becomes the spec source for decompose.

## Decisions already made (Max, this session — pre-convergence steer)

These four came out of the Claude discussion; convergence should pressure-test, not
assume them:

1. **Methodology first.** Stand up Joycraft's own `docs/solutions/skill-design/`
   (PROTOCOL/JUDGMENT, confidence anchors, fresh-subagent eval harness) *before* adding
   breadth — otherwise new skills are debt that can't compound.
2. **Close the knowledge read-loop.** Schemaed `docs/context/solutions/` store
   (`problem_type`/`severity`/`applies_when`) + a `joycraft-learnings` retrieval agent
   dispatched by research/design/implement *before* new work. (This directly answers the
   Codex+Claude #2 gap.)
3. **Risk-gated review panels as core skills** (`joycraft-review-doc`,
   `joycraft-review-code`) — fire only on risk gates (sensitive domain, large diff,
   design-heavy, explicit request). Steal the dedup pipeline + per-finding validator
   wave + P0+50 exception. (Answers the Codex+Claude #1 gap.)
4. **Single-source → converter** for skills — kill the 4× per-harness copy tax (study
   CE's converter CLI as reference). Maps to the existing `single-source-skills` roadmap.

## Proposed phasing (subject to convergence)

- **Phase 0 — Methodology spine.** Cheap version: the eval harness + confidence-anchor
  definitions + the PROTOCOL/JUDGMENT authoring rule. Let the rest of the corpus
  accrete from building Phase 1–2.
- **Phase 1 — Knowledge read-loop.** Schema + `joycraft-learnings` retrieval agent +
  (later) a refresh/consolidate skill. Smallest mechanical change, biggest
  philosophical payoff (turns "capture" into "compound").
- **Phase 2 — Risk-gated review.** `joycraft-review-doc` first (cheaper, fits existing
  design/spec checkpoints), then `joycraft-review-code`. The **project-standards
  reviewer that cites Joycraft's own generated CLAUDE.md boundaries** is the unfair
  advantage — no other tool owns that scaffolding.
- **Phase 3 — Single-source → converter.** Independent track; grows more valuable as
  Phase 2 adds skills.

Confidence anchors (Phase 0) are the linchpin consumed by Phase 2 — that's why
methodology-first isn't a detour.

## Out of scope (this track)

- Post-merge marketing surface (demo-reel/promote/release-notes), browser/Xcode test
  skills, image-gen, Proof/collaborative sharing — candidate *optional packs*, not core.
- Full marketplace distribution — separate concern from the 4× copy-tax fix.
- Becoming Compound Engineering. The spine (feature→spec→TDD→holdout→autonomy) is the moat.

## Open questions (for convergence + Max)

1. Is "methodology" a distinct top-priority gap (Claude) or the means to close the
   review+knowledge gaps (implicit in Codex)? Affects whether Phase 0 is its own
   deliverable or folded into Phase 1–2.
2. `STRATEGY.md` as a new root file, or fold strategy into `docs/context/`?
3. Solutions store at `docs/context/solutions/` vs top-level `docs/solutions/`?
4. Doc review auto-run inside new-feature/design/decompose, or explicit-invocation only?
5. Code review: default pre-PR gate, or risk-gated escalation only? (Decision 3 leans
   risk-gated.)
6. Support universal/non-software planning (CE does), or stay software-focused?
7. Self-improvement loop (`ce-optimize` analog) for Joycraft's own skills — worth it, or
   is the holdout-scenario wall sufficient? (Codex says gap; Claude is skeptical.)
8. Which external research source first if we add breadth: session history (cheapest,
   local), framework-docs, or web?
9. Adopt Codex's naming guidance now (reserve `joycraft-experiment`, `joycraft-review-code`)
   so we don't paint ourselves into a collision?

## Next steps

1. GLM-5.2 authors `research/ce-vs-joycraft-glm.md` (independent).
2. Three-way cross-review → `convergence.md`.
3. Max arbitrates; `convergence.md` finalized.
4. `/joycraft-decompose` against the agreed roadmap → atomic specs, starting Phase 0.

---
title: "CE vs Joycraft — Panel Convergence (central truth + roadmap)"
date: 2026-06-19
status: in-review
panel: ce-vs-joycraft-multimodel
synthesized_by: claude-opus-4-8
inputs:
  - research/ce-vs-joycraft-codex.md (Codex, independent)
  - research/ce-vs-joycraft-claude.md (Claude Opus 4.8, independent)
  - research/ce-vs-joycraft-glm.md (GLM-5.2, independent blind rewrite)
---

# Panel Convergence — Compound Engineering vs Joycraft

Three models analyzed `EveryInc/compound-engineering-plugin` against Joycraft
independently, then cross-reviewed. This document is the merged central truth: what
all three agree on (treat as settled), where they diverged and how each divergence
resolves, the corrected-facts list, and the final roadmap that feeds `/joycraft-decompose`.

## Panel integrity note (why the agreement is trustworthy)

- **Codex** and **Claude** were independent from the start and reached the same top-2
  gaps by different routes (Codex via a skill-by-skill map; Claude via a mechanism-level
  deep read of CE's `docs/solutions/skill-design/`).
- **GLM-5.2's** first draft had read `brief.md` (which encodes the Codex/Claude
  convergence) and inherited its fingerprints. GLM caught this itself, **retracted, and
  re-derived blind from CE source + Joycraft skill files.** The blind rewrite still
  landed on the same top-2 gaps and *independently* reproduced the naming hazards and
  the ~43 agent count.

So the core findings below are **genuine 3-way independent agreement**, not one doc
echoed three times. That is the strongest signal this exercise can produce.

---

## Part A — Settled truth (unanimous, high confidence)

### A1. The two biggest gaps (all three, independently, ranked identically)
1. **Multi-agent review.** Joycraft has one read-only spec-conformance verifier
   (`joycraft-verify`). CE has ~14 single-lens reviewer personas + confidence anchors +
   dedup + autofix-class routing, for both code *and* docs. **#1 practical gap.**
2. **Compounding *with maintenance*.** Joycraft captures knowledge (facts, discoveries,
   context docs) but has **no retrieval metadata, no retrieval agent, and no
   refresh/consolidate lifecycle** — it accretes and drifts. CE's `ce-compound` +
   `ce-compound-refresh` + `ce-learnings-researcher` close the loop. This is CE's literal
   namesake; Joycraft has only the *write* half. **#2 gap.**

### A2. The other agreed gaps
- No **strategy anchor + read-side outcome loop** (`STRATEGY.md` / `ce-product-pulse`).
- No **doc review before implementation** (multi-persona review of brief/design/specs).
- **Debugging is lighter** than `ce-debug` (no causal-chain gate / assumption audit).
- No **external/web/framework-docs research** (Joycraft research is codebase-only —
  also flagged unanimously as a *strength to preserve*).
- No **simplify-the-diff-before-PR** step.
- **Git/PR/worktree** is folded into `session-end`, not first-class.
- No **session-history mining**, **issue-tracker integration**, or
  **headless/JSON skill contracts** for pipeline composition.

### A3. Joycraft's genuine strengths — protect these, do not dilute (unanimous)
Atomic spec model + queue manifest + `todo→in-review→done` lifecycle; OS-process
isolation (`pi -p` per spec); independent verification as a discipline; research
objectivity by construction (researcher never sees the brief); the design-checkpoint
hard pause; the fact-vs-reference context layer; the harness maturity model
(`joycraft-tune`); lockdown; team setup; two-tier wrap-up; backlog discipline; and the
**Level-5 holdout-scenario wall** (no CE analog — Joycraft's deepest moat).

### A4. Naming hazards (Codex caught it; GLM independently confirmed)
- **`optimize` collision:** CE `ce-optimize` = metric-driven experiment loops;
  `joycraft-optimize` = token/session audit. A future experiment-loop skill must NOT be
  named `optimize` → use `joycraft-experiment`.
- **`verify` ≠ code review:** a new review skill must be distinct from `joycraft-verify`,
  not an overload. **Resolved name: `joycraft-review-code`** (and `joycraft-review-doc`).

### A5. Corrected facts (for any downstream doc)
- CE agent count: **43 on disk** (Claude said 42, GLM said 43 — call it 43; the README's
  "50+" is rounding). CE skills: **~37–39** depending on how beta/variant dirs are counted.
- Joycraft: **20 skills, ~2 subagents** (`joycraft-researcher`, `joycraft-verifier`).

---

## Part B — Divergences and their resolutions

### B1. The methodology meta-gap — raised only by Claude
**Claude's position:** CE's biggest edge isn't any skill — it's that CE *codified and
dogfooded a skill-design methodology* (`docs/solutions/skill-design/`: PROTOCOL-vs-
JUDGMENT, confidence anchors as a reusable discipline, a fresh-subagent eval harness
graded mechanically with N≥3, load stubs, script-first, beta-skills, model tiering),
**with measured token reductions and A/B evals.** Joycraft preaches compounding but
doesn't apply it to its own toolchain. Codex and GLM list the *components* (load stub,
model tier, evidence dossier) as scattered Tier-2/3 capability gaps but do not frame the
methodology itself as a headline.

**Resolution — ACCEPT, but reframe as an enabler, not a separate deliverable.**
Codex/GLM didn't *contradict* this; they undercounted it because their reads were
skill-by-skill and the methodology lives in CE's solution-docs corpus, which a
description-level pass skips. Claude read it directly, so this is a depth difference, not
a disagreement. The right synthesis: the methodology is **not a parallel work-item** — it
is the *quality bar* the review and knowledge work must be built to. Concretely: define
**confidence anchors + the PROTOCOL/JUDGMENT authoring rule + a minimal skill-eval
harness** as Phase 0, because Phase 1–2 *consume* them. Don't build a 16-doc corpus up
front; let it accrete from building the first real skills (which is exactly how CE's
corpus grew).

### B2. Is the self-improvement loop (`ce-optimize` analog) worth importing?
**Codex/GLM:** list it as a real capability gap. **Claude:** skeptical — Joycraft's
holdout-scenario wall already provides an anti-gaming evaluation surface.
**Resolution — DEFER, reframed.** Joycraft doesn't need CE's *experiment-loop* skill for
user projects. But it *does* need the **eval-harness subset** of that idea aimed at its
own skills (B1's Phase 0). So: import the *evaluation discipline*, skip the
*experiment-loop product*. If a metric-driven loop is ever added, name it
`joycraft-experiment` (per A4).

### B3. Breadth: discrete gap rows vs "optional packs"
**Codex/GLM:** enumerate issue-tracker integration, browser/Xcode tests, post-merge
surface (demo/promote/release-notes), Proof as individual gaps. **Claude:** folds these
into "optional packs, not core."
**Resolution — AGREE on substance; adopt the pack framing.** All three agree these are
real but lower-priority and partly against Joycraft's stack-agnostic grain. They are
**out of scope for this track**, revisited as optional packs only if goals expand.

### B4. Strategy anchor placement
All three flag the gap; none commits to *where* it lives.
**Resolution — defer to Max (open question).** Two live options: a `joycraft-strategy`
skill writing `STRATEGY.md`, or a `## Product context` block folded into
`gather-context`. GLM leans lightweight (fold-in); lean that way unless Max wants a
first-class skill.

### B5. Knowledge-store location
**Resolution — `docs/context/solutions/`** (not top-level `docs/solutions/`), so the
schemaed solved-problem store sits beside, and does not compete with, the existing
safety-context fact-docs. Both Claude and the brief already lean this way; no dissent.

---

## Part C — The converged roadmap

Phasing reconciles "methodology first" (Max's steer + Claude's B1) with "cheapest
high-value imports first" (the unanimous Part-A finding that refresh + retrieval metadata
are the cheapest "compound" wins).

### Phase 0 — Methodology spine (thin; enables everything after)
- Define **confidence anchors** `{0,25,50,75,100}` once (consumed by Phase 2).
- Write the **PROTOCOL-vs-JUDGMENT** authoring rule into a new
  `docs/solutions/skill-design/` (Joycraft's own, seeded — not a 16-doc port).
- Stand up a **minimal skill-eval harness**: a fresh subagent reads a skill from disk,
  graded mechanically from the tool-call timeline, N≥3 on anything ambiguous.
- *Why first:* anchors + eval are dependencies of trustworthy review skills. Keep it
  small; let the corpus accrete.

### Phase 1 — Close the knowledge read-loop (cheapest high-value win, unanimous)
- Add retrieval frontmatter (`problem_type` / `severity` / `applies_when` / tags) to a
  new `docs/context/solutions/` store.
- Build **`joycraft-learnings`** — a grep-first retrieval agent dispatched by
  research/design/implement *before* new work. (This is the mechanism that turns
  "capture" into "compound.")
- Add **`joycraft-knowledge-refresh`** — Keep/Update/Consolidate/Replace/Delete;
  delete-don't-archive. (GLM's #1 cheapest win.)

### Phase 2 — Risk-gated review panels (the #1 gap)
- **`joycraft-review-doc`** first (cheaper, no apply step, fits existing design/spec
  checkpoints): personas product/scope, feasibility, testability, coherence,
  security-lens; confidence-anchored.
- **`joycraft-review-code`** second, risk-gated (sensitive domain / large diff /
  design-heavy / explicit request): start 3–5 personas (correctness, security,
  maintainability, testing, project-standards). Steal CE's dedup pipeline + per-finding
  validator wave + P0+50 exception.
- **Unfair advantage:** the project-standards reviewer cites *Joycraft's own generated
  CLAUDE.md boundaries + Context Map* — no other tool owns that scaffolding.

### Phase 3 — Single-source → converter (maintainability; parallelizable)
- Kill the 4× per-harness skill-copy tax; one canonical source → per-harness output.
  Study CE's converter CLI as reference. Maps to the existing `single-source-skills`
  roadmap item.

### Augmentations (fold into existing skills, not new tracks)
- Strengthen **`joycraft-bugfix`** with the causal-chain gate + assumption audit +
  predictions (CE's investigation rigor without the bulk).
- Add a **simplify-the-diff** step to `session-end` (or a small `joycraft-simplify`).
- **Headless/JSON contracts** on pipeline skills (implement, verify, spec-done) so
  `implement-feature` + Level-5 compose programmatically.
- A lightweight **strategy anchor** (B4 — Max to choose skill vs fold-in).
- **Model-tier hints** on subagent dispatches in research/verify/review.

### Out of scope (optional packs, revisit only if goals expand)
43-agent library; stack-specific skills (frontend-design/polish/rails/agent-native);
cross-platform converter *targets* beyond what Phase 3 needs; post-merge marketing
surface; Slack/Proof; browser/Xcode tests.

### Remove
Nothing. Unanimous: Joycraft's set is coherent; the issue is gaps, not redundancy.

---

## Part D — Decisions confirmed vs still open

**Confirmed by convergence (Max's four session decisions all survive cross-review):**
1. Methodology first ✓ (reframed as Phase 0 enabler, not a standalone corpus build).
2. Close the knowledge read-loop ✓ (Phase 1 — and it's the *cheapest* win, so it can run
   alongside Phase 0).
3. Risk-gated review panels as core skills ✓ (Phase 2).
4. Single-source → converter ✓ (Phase 3).

**Still open for Max:**
- B4: strategy anchor as a skill vs a `gather-context` fold-in?
- Doc review auto-run inside new-feature/design/decompose, or explicit-invocation only?
- Phase 1 vs Phase 0 ordering — they're near-independent; run Phase 1's refresh+metadata
  in parallel with Phase 0's anchors/eval, or strictly serial?
- Universal/non-software planning: support it (CE does) or stay software-focused?

---

## Bottom line (the central truth)

Three independent models agree: Joycraft's spine is genuinely differentiated and in
places stronger than CE (atomic specs, process isolation, research objectivity, the
holdout wall). Its two real gaps are **multi-agent review** and **compounding-with-
maintenance** — the second being the thing that makes "compound" true rather than just
"accumulate." The cheapest high-value moves (refresh skill + retrieval metadata +
doc-review) require none of CE's 43-agent surface area. Build them to a real quality bar
(confidence anchors + an eval harness, Phase 0) so the new skills *themselves* compound —
then add review and the knowledge read-loop around the spec factory without touching it.

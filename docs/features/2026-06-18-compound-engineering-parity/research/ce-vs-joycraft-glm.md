---
author: GLM-5.2 (running in the pi harness)
model: GLM-5.2
date: 2026-06-18
status: done
independence: REWRITTEN BLIND. This version was produced from the CE source repo (cloned to /tmp/pi-github-repos/EveryInc/compound-engineering-plugin: CONCEPTS.md, root + plugin README, and the SKILL.md bodies of the core skills) and the 20 Joycraft skill files only. It does NOT read brief.md, ce-vs-joycraft-codex.md, or ce-vs-joycraft-claude.md. The prior version of this file is retracted — it was written after I read the feature brief.md, which encodes the codex/claude convergence, so it carried brief-derived fingerprints (notably the skill name `joycraft-review-code` and the "50+ vs ~43, note in convergence" hedge). This rewrite removes those and re-derives from source. Counts are from disk, not memory: 39 CE skills, 43 CE agents on disk (README says "50+"), 20 Joycraft skills.
---

# Compound Engineering vs Joycraft — Exhaustive Comparison (GLM-5.2, blind rewrite)

## 1. Philosophy, as read from source

### Compound Engineering
Read from `CONCEPTS.md` and the root `README.md`. The namesake sentence: **"Each unit of engineering work should make subsequent units easier — not harder."** The README's split: 80% in planning and review, 20% in execution.

The pipeline is a chain where each stage hands a durable artifact to the next: **strategy → ideate → brainstorm → plan → work → review → compound → (refresh) → repeat**, with `ce-product-pulse` as a read-side companion that reports real user outcomes back into strategy. Research is gathered at the stage that needs it rather than re-gathered downstream.

`CONCEPTS.md` defines the reusable mechanics that make the methodology transferable:
- **Learning** — a documented solution to a past problem, stored as the unit of compounded knowledge, carrying structured metadata (category, tags, problem type) for retrieval. A **Pattern doc** is generalized from several learnings — higher leverage, higher staleness risk.
- **Model tier** — extraction / generation / ceiling, declared once per skill so model names never hardcode into skill content. When a platform can't select models per agent, cost control falls back to read budgets and output caps.
- **Evidence dossier** — bulk evidence (verbatim quotes + source pointers) gathered by a cheap scout agent and written to scratch storage, so the orchestrator carries only a short gist and downstream agents read the full dossier themselves.
- **Load stub** — the inline remnant left when load-bearing content moves to a reference file: it names what the reference contains and the failure mode of skipping it, while keeping no detail an agent could improvise from. Makes reference-loading structurally necessary, not advisory.
- **Reviewer persona** — a single-lens reviewer dispatched in panels; the review skill merges findings.
- **Confidence anchor** — a discrete, self-scored value on a small fixed scale, each level tied to a behavioral criterion, used to gate and rank findings instead of a continuous score that invites false precision. Corroboration across personas promotes a finding by one level.
- **Autofix class** — gated_auto / manual / advisory — classifies a finding by how safely its fix can be applied.
- **Headless mode** — opt-in unattended run that produces a written report and defers ambiguous decisions rather than guessing. `mode:agent` is the JSON contract for skill-to-skill / cross-harness callers.
- **Beta skill** — a parallel `-beta` copy to trial a new version alongside stable without disrupting users; promotion is an orchestration change, not a rename.

### Joycraft
Read from the 20 skill files. The spine is: **Feature Brief → atomic specs → TDD implementation → session-end**, with a per-feature folder `docs/features/<slug>/{brief,research,design,specs}`.

- **Atomic specs** — self-contained, one-per-session, explicitly to defeat what the skills call the "Curse of Instructions." A machine-readable queue (`.joycraft-spec-queue.json`) plus a wave-plan README make the queue consumable by a loop driver.
- **Status lifecycle** — `todo → in-review → done`, tracked in *two* places (queue JSON + frontmatter) precisely to kill desync between them.
- **Execution modes per spec** — batch / checkpoint / isolated, human-approved. Process isolation is enforced by spawning a fresh `pi -p` per spec in `joycraft-implement-loop`.
- **Context layer** — five flat fact-docs (production-map, dangerous-assumptions, decision-log, institutional-knowledge, troubleshooting) plus long-form `docs/context/reference/*`, indexed by a Context Map pointer table in AGENTS.md. An explicit shape test routes a fact: "could be one row in a table" → fact-doc; "takes paragraphs" → reference doc.
- **Independent verification** — `joycraft-verify` spawns a separate verifier subagent with a clean context and a hard "no edits, report observations" contract, on the stated grounds that agents skew positive when grading their own work.
- **Research objectivity by construction** — `joycraft-research` generates questions from the brief, but the researching subagent receives *only the questions, never the brief*, so opinions can't contaminate facts.
- **Harness maturity model** — `joycraft-tune` scores 7 dimensions and lays out a Level 2–5 roadmap. Level 5 is an autonomous loop with a **holdout scenario repo**: a separate AI writes behavioral tests the coding agent never sees — the skill frames this as a validation set, to prevent the agent from gaming the test suite.
- **Lockdown** — `joycraft-lockdown` generates NEVER rules + deny patterns to constrain risky or autonomous sessions.
- **Team setup** — `joycraft-collaborative-setup` scaffolds per-area folders with owners and a CONTRIBUTING doc.

### Agreement
Plan-before-execute; durable artifacts handed between stages; TDD; capture knowledge; human checkpoints; keep units small; avoid context pollution.

### Divergence
CE puts weight on **multi-agent panels, review rigor, compounding with maintenance, external research, cross-platform reach, per-agent cost tiers, and headless/JSON automation contracts**. Joycraft puts weight on **atomic specs with a queue + lifecycle, OS-process isolation, independent verification, research objectivity, a structured fact-vs-reference context layer, a harness maturity model, lockdown, and team ownership**.

---

## 2. Skill-by-skill map (re-derived from the directory listings + skill bodies)

| CE skill | Joycraft counterpart | Relationship |
|----------|----------------------|--------------|
| `ce-setup` | `joycraft-setup` → `joycraft-tune` | CE bootstraps env + tools; joycraft routes setup into a 7-dimension assessment and upgrade. |
| `ce-strategy` | none | **Gap.** No product-level strategy anchor (target problem, persona, metrics, tracks). The joycraft brief is feature-scoped, not product-scoped. |
| `ce-ideate` | `joycraft-interview` (partial) | CE generates and critiques ranked ideas; joycraft interviews the user's own ideas. |
| `ce-brainstorm` | `joycraft-interview` + `joycraft-new-feature` | CE writes a requirements doc; joycraft writes a Feature Brief. Close equivalents. |
| `ce-plan` | `joycraft-design` + `joycraft-decompose` | CE produces one plan with stable U-IDs; joycraft splits a design artifact from atomic-spec generation with a queue. |
| `ce-work` / `ce-work-beta` | `joycraft-implement` + `joycraft-implement-feature` | CE executes in one session with task tracking; joycraft runs a fresh process per spec. |
| `ce-debug` | `joycraft-bugfix` | CE investigates to a causal-chain gate then fixes; joycraft triages → diagnoses → specs → hands off. CE is the more rigorous investigator. |
| `ce-code-review` | `joycraft-verify` (partial) | CE runs ~14 reviewer personas + confidence anchors + autofix-class + dedup; joycraft runs one read-only spec-conformance verifier. **Largest gap.** |
| `ce-compound` | `joycraft-add-fact` + discoveries + context docs (partial) | CE writes a structured solution doc with retrieval metadata; joycraft writes fact rows + discovery stubs. **Gap on metadata + retrieval.** |
| `ce-compound-refresh` | none | **Gap.** No maintenance/consolidation lifecycle for captured knowledge. |
| `ce-optimize` | `joycraft-optimize` | **Name collision, different purpose.** CE = metric-driven experiment loops; joycraft = session/token overhead audit. |
| `ce-product-pulse` | none | **Gap.** No read-side outcome/observability loop feeding back into planning. |
| `ce-doc-review` | `joycraft-design` human checkpoint (partial) | CE runs multi-persona doc review with autofix; joycraft relies on a single human review pass. **Gap.** |
| `ce-simplify-code` | none | **Gap.** No "simplify the diff before PR" step. |
| `ce-frontend-design` | none (external `swiftui-pro` exists) | Gap by design — joycraft is stack-agnostic. |
| `ce-polish` | none | Gap — no dev-server + browser iterate-together loop. |
| `ce-sessions` | none | Gap — no session-history mining. |
| `ce-slack-research` | none | Gap — no org-context research. |
| `ce-web-researcher` / `ce-best-practices-researcher` / `ce-framework-docs-researcher` / `ce-repo-research-analyst` | `joycraft-research` (codebase-only) | **Gap.** Joycraft research is deliberately codebase-only and opinion-free; no external/web/framework-docs research. (This is also a strength to preserve.) |
| `ce-worktree` | mentioned in `joycraft-decompose` only | Gap — no dedicated ensure-worktree skill. |
| `ce-commit` / `ce-commit-push-pr` | `joycraft-session-end` (folds push/PR in) | CE splits commit-message craft as its own skill; joycraft only pushes/PRs at feature end. |
| `ce-resolve-pr-feedback` | none | Gap. |
| `ce-test-browser` / `ce-test-xcode` | none | Gap. |
| `ce-clean-gone-branches` | none | Minor gap. |
| `ce-demo-reel` / `ce-promote` / `ce-release-notes` | none | Gap — post-merge marketing/shipping surface. |
| `ce-proof` | none | Gap — collaborative doc sharing. |
| `ce-dogfood-beta` | `joycraft-implement-level5` (holdout) | Different anti-gaming mechanisms. |
| `lfg` | `joycraft-implement-level5` + `joycraft-implement-feature` | Both autonomous pipelines; different mechanisms. |
| `ce-agent-native-architecture` / `ce-agent-native-audit` / `ce-dhh-rails-style` | none | Stack/style skills — gap by design. |
| `ce-riffrec-feedback-analysis` / `ce-gemini-imagegen` / `ce-report-bug` / `ce-update` | none | Niche / plugin-internal. |
| — | `joycraft-add-context` | joycraft-only: scaffold a long-form reference doc + Context Map row. |
| — | `joycraft-add-fact` | joycraft-only: route a fact to one of 5 fact-docs + optional AGENTS rule. |
| — | `joycraft-gather-context` | joycraft-only: read-then-offer first-run onboarding pass. |
| — | `joycraft-tune` | joycraft-only: 7-dim harness assessment + Level 2–5 roadmap. |
| — | `joycraft-lockdown` | joycraft-only: deny patterns + NEVER rules. |
| — | `joycraft-collaborative-setup` | joycraft-only: per-area ownership + CONTRIBUTING. |
| — | `joycraft-spec-done` | joycraft-only: light per-spec wrap-up (status bump + commit). |
| — | `joycraft-decompose` | joycraft-only: atomic-spec generation + queue manifest + per-spec execution modes. |

---

## 3. Agent library

Counted from disk: CE ships **43 agent files** under `plugins/compound-engineering/agents/` (the plugin README rounds this to "50+"). Grouped by role: review personas (correctness, testing, maintainability, project-standards, security, performance, api-contract, data-migration, reliability, adversarial, plus others), document-review personas (coherence, feasibility, design-lens, product-lens, scope-guardian, security-lens, adversarial-document), research agents (web, best-practices, framework-docs, repo, git-history, issue-intelligence, learnings, session-historian, slack), design agents (design-implementation-reviewer, design-iterator, figma-design-sync), and workflow/docs agents.

Joycraft ships **~2 subagents** (`joycraft-researcher`, `joycraft-verifier`). Joycraft's power lives in skills + process, not in a deep agent library. **Gap:** joycraft has almost no specialized reviewer/researcher personas.

---

## 4. Where CE is stronger — Joycraft's gaps

### Tier 1 — core methodology
1. **Multi-agent review.** `ce-code-review` dispatches ~14 single-lens personas in parallel, returns structured JSON, confidence-anchors each finding, merges/dedups, and classifies autofix safety. `joycraft-verify` is a single read-only verifier checking spec conformance. No security, performance, maintainability, or adversarial lenses; no confidence gating; no dedup; no autofix-class routing. This is the biggest practical gap.
2. **Compounding with maintenance.** CE learnings carry retrieval metadata (category, tags, problem type); `ce-compound-refresh` audits them against the current codebase with a five-way outcome model — Keep / Update / Consolidate / Replace / Delete — deletes stale ones, and consolidates overlaps. Joycraft captures knowledge (facts, discoveries, context docs) but has no retrieval metadata and no refresh/consolidation skill. It accretes and drifts. This is CE's namesake and joycraft has only the write half.
3. **Strategy anchor + outcome loop.** `ce-strategy` maintains `STRATEGY.md` (target problem, approach, persona, metrics, tracks) read as grounding by ideate/brainstorm/plan; `ce-product-pulse` is the read-side outcome report that feeds back. Joycraft has no product-level anchor and no "close the loop with real signal" half.
4. **Doc review before implementation.** `ce-doc-review` runs multi-persona review on requirements/plan documents with autofix. Joycraft's `joycraft-design` human checkpoint is a single review pass — no automated coherence/feasibility/scope-guardian/security-lens review on briefs/design/specs.
5. **Debugging rigor.** `ce-debug` enforces a causal-chain gate (no fix until the full chain from trigger to symptom is explained with no gaps), an assumption audit before hypothesis formation, predictions for uncertain links, smart escalation, git bisect, and observability integration. `joycraft-bugfix` is lighter: triage → diagnose → discuss → spec → hand off.

### Tier 2 — capabilities
6. **Metric-driven iterative optimization.** `ce-optimize` runs a spec-driven experiment loop with parallel experiments, measurement gates, LLM-as-judge, and a disk-persisted experiment log with crash-recovery checkpoints. Joycraft has no experimentation loop. (Joycraft's `optimize` is a different, smaller thing — a token-overhead audit.)
7. **External research pipeline.** CE has web/best-practices/framework-docs/repo researchers with intent classification (implementation-guidance vs landscape vs mixed) and explicit gates for when external research is warranted. Joycraft research is codebase-only by design.
8. **Code simplification before PR.** `ce-simplify-code` runs parallel reuse/quality/efficiency reviewers on a diff, applies fixes, verifies behavior with tests. Joycraft stops at green tests.
9. **Per-agent cost control.** CE declares model tiers (extraction/generation/ceiling) per dispatched agent. Joycraft has no model-tier concept.
10. **Evidence dossier + load stub.** Bulk evidence to scratch (orchestrator carries a gist); structurally-necessary reference loading. Joycraft inlines content or says "read X" without the load-stub framing.

### Tier 3 — automation + ecosystem
11. **Headless mode + `mode:agent` JSON contracts.** Enables unattended runs and programmatic skill-to-skill / cross-harness chaining. Joycraft skills are interactive-human-oriented; no JSON contracts — this limits Level-5 pipeline composition.
12. **Beta-skill framework.** Parallel `-beta` copies to trial new skill versions with promotion orchestration. Joycraft has no skill-versioning mechanism.
13. **Dedicated git skills.** commit, commit-push-pr, worktree, clean-gone-branches, resolve-pr-feedback. Joycraft folds push/PR into session-end only; no commit-message craft, no PR-feedback resolver.
14. **Cross-harness / multi-platform architecture.** CE's converter/writer/bundle/marketplace design targets Claude, Codex, Cursor, Copilot, Gemini. Joycraft is pi-native. (May be intentional.)
15. **Stack-specific skills.** frontend-design, polish, dhh-rails-style, agent-native-architecture. Joycraft is stack-agnostic and relies on external skills.
16. **Issue-tracker integration.** GitHub/Linear/Jira fetch in debug; issue creation in plan handoff. Joycraft has none.
17. **Post-merge surface.** demo-reel, promote, release-notes. Joycraft stops at PR.
18. **Session-history + Slack research.** Joycraft has neither as a skill (pi has librarian/web_search built in, but unwrapped into the workflow).
19. **Browser/Xcode test skills.** Joycraft has none.
20. **Collaborative doc sharing (proof).** Joycraft has none.

---

## 5. Where Joycraft is stronger

1. **Atomic spec model + queue manifest + status lifecycle.** Self-contained one-per-session specs, `.joycraft-spec-queue.json`, wave-plan README, `todo→in-review→done` tracked in two systems. More automation-friendly than CE's plan U-IDs, which have no queue and no lifecycle.
2. **Process-isolated execution loop.** A fresh `pi -p` per spec is a stronger context-isolation guarantee than CE's in-session task list.
3. **Independent verification as a first-class discipline.** A separate verifier with a clean context and a hard "no edits" contract — a research-backed separation of implement-agent ≠ judge-agent. CE's personas live inside the review skill.
4. **Research objectivity by construction.** Question generation is isolated from fact-gathering; the researcher never sees the brief. CE's researchers get planning context and can opine.
5. **Explicit design checkpoint with a hard pause.** `joycraft-design` produces a ~200-line artifact and refuses to proceed until human approval. CE folds design into planning; its synthesis confirmation is softer.
6. **Structured context layer with fact-vs-reference routing.** Five flat fact-docs + long-form reference + a Context Map pointer table + a literal shape test. Navigable. CE lumps everything into `docs/solutions/` plus a CONCEPTS.md glossary.
7. **Harness tuning + maturity model.** `joycraft-tune` scores 7 dimensions and shows a Level 2–5 roadmap. CE has `ce-setup` bootstrap but no assessment/scoring/upgrade-path equivalent.
8. **Lockdown mode.** Deny patterns + NEVER rules for risky/autonomous sessions. CE has no hard execution-boundary mechanism.
9. **Collaborative/team setup.** Per-area folders + ownership + CONTRIBUTING. CE is more single-user-oriented.
10. **Personal vs shared frontmatter + owner resolution.** Consistent schema discipline across all artifacts. CE uses YAML too but less systematically.
11. **Per-spec execution modes (batch/checkpoint/isolated) with human approval.** CE has complexity tiers but not the same per-unit context-isolation framing.
12. **Two-tier wrap-up (spec-done vs session-end).** Light per-spec (status + commit) vs heavy once-per-feature (validate + consolidate + push + PR). Cleaner than CE's ce-work + commit-push-pr; prevents per-spec over-ceremony.
13. **Backlog discipline.** `docs/backlog/` with its own lifecycle, user-confirmed, never auto-written. CE routes tangents to "Deferred to Follow-Up Work" inside plans only.
14. **Level-5 holdout-scenario concept.** A separate AI writes tests the coding agent never sees — framed as a validation set to prevent gaming. More principled than CE's `ce-dogfood-beta` browser QA for autonomous verification.

---

## 6. Exhaustive gap list (Joycraft → could benefit from)

**Knowledge & compounding**
- [ ] Retrieval metadata on captured facts/learnings (category, tags, problem type)
- [ ] A refresh/maintenance skill (audit captured knowledge vs codebase: Keep/Update/Consolidate/Replace/Delete)
- [ ] Consolidation logic for overlapping context docs
- [ ] A pattern-doc concept (generalized from several facts)

**Review**
- [ ] Multi-persona code review (security, performance, maintainability, correctness, adversarial, …)
- [ ] Confidence-anchored findings + corroboration-promotion
- [ ] Autofix-class routing (gated_auto / manual / advisory)
- [ ] A merge/dedup pipeline for review findings
- [ ] Multi-persona doc review on briefs/design/specs before implementation

**Strategy & outcomes**
- [ ] Product-level strategy anchor (target, persona, metrics, tracks) read as grounding by planning
- [ ] A read-side outcome/observability report (the "close the loop" half)

**Research**
- [ ] External/web research with intent classification (implementation-guidance / landscape / mixed)
- [ ] Framework-docs research (version-specific)
- [ ] Best-practices research
- [ ] Session-history mining
- [ ] (Optional) Slack/org-context research

**Debugging**
- [ ] Causal-chain gate, assumption audit, prediction-for-uncertain-links, smart escalation, git bisect, observability integration — strengthen `joycraft-bugfix`

**Optimization & simplification**
- [ ] Metric-driven iterative optimization loop (experiment log, measurement gates, LLM-as-judge) — distinct from the token-audit `optimize`
- [ ] A "simplify the diff before PR" step

**Automation & contracts**
- [ ] Headless mode + `mode:agent` JSON contracts on skills (for Level-5 pipeline composition + cross-harness)
- [ ] Model tier / cost-control per dispatched subagent
- [ ] Evidence dossier + load stub patterns (scratch evidence, structurally-necessary reference loading)
- [ ] Beta-skill versioning mechanism

**Git & shipping**
- [ ] Dedicated commit-message craft skill
- [ ] ensure-worktree skill
- [ ] PR-feedback resolver
- [ ] (Optional) post-merge surface: release notes, promote/demo

**Integration**
- [ ] Issue-tracker integration (GitHub/Linear/Jira fetch + create)
- [ ] Browser/Xcode test skills (or wrappers)

**Cross-platform (optional, if reach is a goal)**
- [ ] Converter/writer/marketplace architecture for non-pi targets

---

## 7. Naming hazards (independently observed)

- **`optimize` collision.** `ce-optimize` is a metric-driven experiment loop; `joycraft-optimize` is a session/token overhead audit. If Joycraft adopts an experiment-loop skill, it should not reuse the name `optimize` — a natural independent name is `joycraft-experiment` (anything-but-optimize).
- **`verify` ≠ code review.** `joycraft-verify` is read-only spec-conformance checking with one verifier; CE-style code review is broad multi-persona quality review. They are different things. If Joycraft adds the latter, it should be a distinct skill — I'd name it `joycraft-code-review` (paralleling `ce-code-review`), not an overload of `verify`.

---

## 8. Summary verdict

- **Joycraft is stronger on:** spec structure (atomic + queue + lifecycle), process isolation, independent verification, research objectivity, structured context layer, harness maturity model, lockdown, team ownership, two-tier wrap-up, backlog discipline, and the Level-5 holdout concept.
- **CE is stronger on:** multi-agent review rigor, knowledge compounding *with maintenance*, product strategy + outcome loops, external research, debugging rigor, metric-driven optimization, per-agent cost control, headless/JSON automation contracts, git skills, and ecosystem reach.
- **The two biggest gaps for Joycraft:** (1) multi-agent review, and (2) compounding-with-maintenance — the latter being CE's literal namesake and the thing that makes "compound" true rather than just "accumulate."
- **Cheapest high-value imports:** a knowledge-refresh skill, retrieval metadata on facts, multi-persona doc-review on specs, and a stronger debug skill. None require a 43-agent library.

---

## 9. GLM-5.2's recommended roadmap (value-to-effort)

**Add (high value, low-ish effort):**
1. `joycraft-compound-refresh` — audit context docs/discoveries against the codebase (Keep/Update/Consolidate/Replace/Delete). The missing half of Joycraft's own knowledge story; the cheapest "compound" win.
2. Retrieval metadata on facts/discoveries (category/tags) — a schema bump, not a new skill.
3. `joycraft-code-review` — a *distinct* multi-persona review skill (don't overload `verify`). Start small: 3–4 personas (correctness, security, maintainability) + confidence-anchored findings + autofix-class. Grow the panel later.
4. Strengthen `joycraft-bugfix` with the causal-chain gate + assumption audit + predictions — CE's investigation rigor without the bulk.
5. Headless mode + a JSON contract on the pipeline-oriented skills (implement, verify, spec-done) so `implement-feature` and Level-5 compose programmatically.

**Augment:**
6. A lightweight strategy anchor — either a `joycraft-strategy` skill or a `## Product context` block folded into `gather-context`. Pair with an optional outcome/observability read later.
7. A simplify-the-diff step in `session-end` (or a small `joycraft-simplify` skill) before push/PR.
8. Model-tier hints on subagent dispatches in research/verify/review.

**Defer / don't import:**
- The 43-agent library, stack-specific skills (frontend-design/polish/rails), cross-platform converter, marketing surface (demo-reel/promote/release-notes), Slack/proof — CE's surface area, not Joycraft's center of gravity. Import only if goals expand there.
- Don't rename `optimize`; if experiment loops are added, name them `joycraft-experiment`.

**Remove:** nothing — Joycraft's existing set is coherent; the issue is gaps, not redundancy.

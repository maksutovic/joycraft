# Compound Engineering (CE) vs Joycraft — Exhaustive Comparison

> **Date:** 2026-06-18
> **Source:** analysis of `EveryInc/compound-engineering-plugin` (37 skills, 50+ agents) vs Joycraft (20 skills, ~2 subagents)
> **Purpose:** find every gap joycraft has vs CE, where joycraft is stronger, and what to add/remove/augment.

---

## 1. Philosophy

### CE
- **Namesake:** "Each unit of engineering work should make subsequent units easier — not harder." Knowledge compounds.
- **Split:** 80% planning + review, 20% execution.
- **Pipeline (durable artifact per stage):** strategy → ideate → brainstorm → plan → work → review → compound → repeat. Research gathered *at the stage that needs it*, not re-gathered downstream.
- **Compounding units:** a *Learning* = documented solution with YAML metadata (category, tags, problem_type) for retrieval. A *Pattern doc* = generalized from several learnings (higher leverage, higher staleness risk).
- **Cost control:** *Model tier* (extraction / generation / ceiling) declared per dispatched agent. *Evidence dossier* = bulk evidence to scratch storage, orchestrator carries only a gist. *Load stub* = inline remnant that makes loading a reference file *structurally necessary* (names content + failure mode, no detail to improvise).
- **Review rigor:** *Reviewer persona* (single-lens, dispatched in panels + merged), *Confidence anchor* (discrete self-score, gated/ranked, corroboration promotes a level), *Autofix class* (gated_auto / manual / advisory).
- **Automation contracts:** *Headless mode* (unattended, written report as deliverable), `mode:agent` JSON contract for skill-to-skill / cross-harness callers. *Beta skill* (`-beta` parallel copy) to trial new versions.

### Joycraft
- **Core model:** Feature Brief → atomic specs → TDD implementation → session-end. Per-feature folder `docs/features/<slug>/{brief,research,design,specs}`.
- **Atomic specs:** self-contained, one-per-session, defeats the "Curse of Instructions." Machine-readable queue (`.joycraft-spec-queue.json`) + wave-plan README.
- **Status lifecycle:** `todo → in-review → done`, tracked in *two* systems (queue JSON + frontmatter) — the desync this exists to kill.
- **Execution modes per spec:** batch / checkpoint / isolated (human-approved). Process isolation via fresh `pi -p` per spec (`joycraft-implement-loop`).
- **Context layer:** 5 flat fact-docs (production-map, dangerous-assumptions, decision-log, institutional-knowledge, troubleshooting) + long-form `docs/context/reference/*` + a Context Map pointer table in AGENTS.md. Shape test: "one row" → fact; "paragraphs" → reference.
- **Verification:** independent verifier subagent (clean context, no edits) — "agents skew positive grading their own work."
- **Research objectivity:** question generation (sees brief) is isolated from fact-gathering (sees only questions, never the brief).
- **Maturity model:** `joycraft-tune` scores 7 dimensions, shows a Level 2–5 roadmap. Level 5 = autonomous loop with **holdout scenario repo** (separate AI writes tests the coding agent never sees — validation-set analogy to prevent gaming).
- **Lockdown:** NEVER rules + deny patterns for risky/autonomous sessions.
- **Team:** per-area folders + ownership + CONTRIBUTING doc.

### Where they agree
Plan-before-execute; durable artifacts handed between stages; TDD; knowledge capture; human checkpoints; avoid context pollution; small units.

### Where they diverge
- **CE leans** on multi-agent panels, review rigor, compounding *with maintenance*, external research, cross-platform reach, cost tiers, headless/JSON contracts, and the post-merge marketing surface.
- **Joycraft leans** on atomic specs, process isolation, independent verification, research objectivity, a structured context layer, a harness maturity model, lockdown, team ownership, and a status lifecycle + queue.

---

## 2. Skill-by-Skill Map

| CE skill | Joycraft equivalent | Relationship |
|----------|---------------------|--------------|
| `ce-setup` | `joycraft-setup` → `joycraft-tune` | CE bootstraps env+tools; joycraft routes to a full assessment+upgrade. |
| `ce-strategy` | *(none — brief is feature-scoped)* | **GAP.** No product-level strategy anchor or metrics. |
| `ce-ideate` | `joycraft-interview` (partial) | CE generates+critiques ranked ideas; joycraft interviews user's own ideas. |
| `ce-brainstorm` | `joycraft-interview` + `joycraft-new-feature` | CE writes a requirements doc; joycraft writes a Feature Brief. Close. |
| `ce-plan` | `joycraft-design` + `joycraft-decompose` | CE = one plan with U-IDs; joycraft = design artifact + atomic specs + queue. |
| `ce-work` | `joycraft-implement` + `joycraft-implement-feature` | CE = one session, task tracking; joycraft = fresh process per spec. |
| `ce-debug` | `joycraft-bugfix` | CE investigates deeply + fixes; joycraft triages → specs → hands off. CE is more rigorous. |
| `ce-code-review` | `joycraft-verify` (partial) | CE = 14 personas + confidence + autofix-class + dedup. joycraft = one verifier, spec-conformance only. **Big gap.** |
| `ce-compound` | `joycraft-add-fact` + discoveries + context docs (partial) | CE = structured solution doc w/ retrieval metadata. joycraft = fact rows + discovery stubs. **Gap on metadata + retrieval.** |
| `ce-compound-refresh` | *(none)* | **GAP.** No maintenance/consolidation of captured knowledge. |
| `ce-optimize` (experiments) | `joycraft-optimize` (token audit) | **NAME COLLISION, different purpose.** CE = metric-driven experiment loops. joycraft = session overhead audit. |
| `ce-product-pulse` | *(none)* | **GAP.** No outcome/observability read-side loop. |
| `ce-doc-review` | `joycraft-design` human checkpoint (partial) | CE = multi-persona doc review w/ autofix. joycraft = single human review. **Gap.** |
| `ce-simplify-code` | *(none)* | **GAP.** No "simplify the diff before PR" step. |
| `ce-frontend-design` | *(external `swiftui-pro` only)* | **Gap** (philosophical — joycraft is stack-agnostic). |
| `ce-polish` | *(none)* | **Gap.** No dev-server+browser iterate-together loop. |
| `ce-sessions` | *(none)* | **Gap.** No session-history mining. |
| `ce-slack-research` | *(none)* | **Gap.** No org-context research. |
| `ce-web-researcher` / `ce-best-practices-researcher` / `ce-framework-docs-researcher` / `ce-repo-research-analyst` | `joycraft-research` (codebase-only) | **Gap.** joycraft research is deliberately codebase-only + opinion-free; no external/web/framework-docs research. |
| `ce-worktree` | (decompose mentions parallel worktrees) | **Gap.** No dedicated ensure-worktree skill. |
| `ce-commit` / `ce-commit-push-pr` | `joycraft-session-end` (folds push/PR in) | CE splits commit as a first-class skill; joycraft only at feature end. |
| `ce-resolve-pr-feedback` | *(none)* | **Gap.** |
| `ce-test-browser` / `ce-test-xcode` | *(none)* | **Gap.** |
| `ce-clean-gone-branches` | *(none)* | Minor gap. |
| `ce-demo-reel` / `ce-promote` / `ce-release-notes` | *(none)* | **Gap** — post-merge marketing/shipping surface. |
| `ce-proof` | *(none)* | **Gap** — collaborative doc sharing. |
| `ce-dogfood-beta` | `joycraft-implement-level5` (holdout) | Different anti-gaming mechanisms. |
| `lfg` | `joycraft-implement-level5` + `joycraft-implement-feature` | Both autonomous pipelines; different mechanisms. |
| `ce-agent-native-architecture` / `ce-dhh-rails-style` | *(none)* | Stack/style skills — gap (by design). |
| `ce-riffrec-feedback-analysis` | *(none)* | Niche. |
| `ce-gemini-imagegen` | *(none)* | Niche. |
| — | `joycraft-add-context` | **joycraft-only.** Scaffolds long-form reference + Context Map row. |
| — | `joycraft-add-fact` | **joycraft-only.** Routes facts to 5 docs + optional AGENTS rule. |
| — | `joycraft-gather-context` | **joycraft-only.** Read-then-offer onboarding pass. |
| — | `joycraft-tune` | **joycraft-only.** 7-dim harness assessment + Level 2–5 roadmap. |
| — | `joycraft-lockdown` | **joycraft-only.** Deny patterns + NEVER rules. |
| — | `joycraft-collaborative-setup` | **joycraft-only.** Per-area ownership + CONTRIBUTING. |
| — | `joycraft-spec-done` | **joycraft-only.** Light per-spec wrap-up (status bump + commit). |
| — | `joycraft-decompose` | **joycraft-only.** Atomic spec generation + queue manifest + execution modes. |

---

## 3. Agent Library

- **CE: 50+ specialized subagents** — 14 review personas (correctness, testing, maintainability, project-standards, security, performance, api-contract, data-migration, reliability, adversarial, …), 7 doc-review personas (coherence, feasibility, design-lens, product-lens, scope-guardian, security-lens, adversarial-document), 9 research agents (web, best-practices, framework-docs, repo, git-history, issue-intelligence, learnings, session-historian, slack), 3 design agents, workflow agents, docs agents.
- **Joycraft: ~2 subagents** (`joycraft-researcher`, `joycraft-verifier`). Joycraft's power lives in *skills + process*, not a deep agent library.

**Gap:** joycraft has almost no specialized reviewer/researcher personas. Its review is one verifier; its research is one codebase researcher.

---

## 4. What CE Does Better (Joycraft Gaps)

### Tier 1 — core methodology gaps
1. **Multi-agent review (personas + confidence + autofix-class + dedup).** The single biggest gap. joycraft-verify is spec-conformance only; no security/performance/maintainability/adversarial lenses, no confidence-gated findings, no merge/dedup, no autofix-safety routing.
2. **Knowledge compounding with retrieval metadata + refresh.** CE learnings carry `category/tags/problem_type` for retrieval; `ce-compound-refresh` audits them against the codebase (Keep/Update/Consolidate/Replace/Delete), deletes stale, consolidates overlaps. joycraft's facts/discoveries/context-docs have **no retrieval metadata and no maintenance skill** — they accrete and drift. This is CE's *namesake* and joycraft has only the write half.
3. **Strategy anchor + outcome loop (STRATEGY.md + ce-strategy + ce-product-pulse).** No product-level target/persona/metrics/tracks anchor; no read-side outcome report feeding back into planning. joycraft's brief is feature-scoped, not product-scoped; no "close the loop with real signal."
4. **Doc review (ce-doc-review).** Multi-persona review of briefs/design/specs *before* implementation, with autofix. joycraft's design checkpoint is a single human pass — no automated coherence/feasibility/scope-guardian/security-lens review.
5. **Debugging rigor (ce-debug).** Causal-chain gate (no fix until full chain explained), assumption audit, predictions for uncertain links, smart escalation, git bisect, observability integration. joycraft-bugfix is lighter (triage → diagnose → spec → handoff).

### Tier 2 — capability gaps
6. **Metric-driven iterative optimization (ce-optimize real).** Spec YAML, parallel experiments, measurement gates, LLM-as-judge, disk-persisted experiment log with crash-recovery checkpoints. joycraft has no experimentation loop. *(And a name collision: joycraft-optimize = token audit.)*
7. **External research pipeline.** web-researcher, best-practices-researcher, framework-docs-researcher, repo-research-analyst, with intent classification (implementation-guidance / landscape / mixed) and explicit gates. joycraft-research is codebase-only and opinion-free by design.
8. **Code simplification (ce-simplify-code).** Parallel reuse/quality/efficiency reviewers on a diff, apply, verify behavior. joycraft stops at green tests.
9. **Model tier / cost control.** CE declares extraction/generation/ceiling per agent. joycraft has no model-tier concept.
10. **Evidence dossier + load stub patterns.** Bulk evidence to scratch (orchestrator carries a gist); structurally-necessary reference loading. joycraft inlines content or says "read X" without the load-stub framing.

### Tier 3 — automation + ecosystem gaps
11. **Headless mode + `mode:agent` JSON contracts.** Enables unattended runs + programmatic skill-to-skill / cross-harness chaining. joycraft skills are interactive-human-oriented; no JSON contracts — limits L5 pipeline composition.
12. **Beta-skill framework.** Parallel `-beta` copies to trial new skill versions w/ promotion orchestration. joycraft has no skill versioning.
13. **Dedicated git skills.** commit, commit-push-pr, worktree, clean-gone-branches, resolve-pr-feedback. joycraft folds push/PR into session-end only; no commit-message craft, no PR-feedback resolver.
14. **Cross-harness / multi-platform architecture.** Converter/Writer/Bundle/Marketplace across Claude/Codex/Cursor/Copilot/Gemini. joycraft is Pi-native. *(May be intentional.)*
15. **Framework/stack-specific skills.** frontend-design, dhh-rails-style, agent-native-architecture, polish. joycraft is stack-agnostic (relies on external skills like swiftui-pro).
16. **Issue-tracker integration.** GitHub/Linear/Jira fetch in debug; issue creation in plan handoff. joycraft has none.
17. **Post-merge surface.** demo-reel, promote, release-notes. joycraft stops at PR.
18. **Session-history + Slack research.** ce-sessions, ce-slack-research. joycraft has neither as a skill (pi has librarian/web_search built in, but unwrapped).
19. **Browser/Xcode test skills.** ce-test-browser, ce-test-xcode. joycraft has none.
20. **Collaborative doc sharing (ce-proof).** joycraft has none.

---

## 5. What Joycraft Does Better

1. **Atomic spec model + queue manifest + status lifecycle.** Self-contained one-per-session specs, `.joycraft-spec-queue.json`, wave-plan README, `todo→in-review→done` tracked in two systems. More automation-friendly than CE's plan U-IDs (no queue, no lifecycle).
2. **Process-isolated execution loop.** Fresh `pi -p` per spec = verified context isolation. CE's ce-work runs in one session with a task list.
3. **Independent verification as a first-class discipline.** Separate verifier, clean context, hard "no edits, report observations" contract — research-backed separation of implement-agent ≠ judge-agent. CE's personas live inside the review skill.
4. **Research objectivity by construction.** Question generation isolated from fact-gathering (researcher never sees the brief). CE's researchers get planning context and can opine.
5. **Explicit design checkpoint with a hard pause.** `joycraft-design` produces a ~200-line artifact and *refuses to proceed* until human approval — catches wrong assumptions before specs. CE folds design into planning; its synthesis confirmation is softer.
6. **Structured context layer with fact-vs-reference routing.** 5 flat fact-docs + long-form reference + Context Map pointer table + a literal shape test. Navigable. CE lumps everything into `docs/solutions/` + a CONCEPTS.md glossary.
7. **Harness tuning + maturity model.** `joycraft-tune` scores 7 dimensions, shows a Level 2–5 roadmap. CE has `ce-setup` bootstrap but no assessment/scoring/upgrade-path equivalent.
8. **Lockdown mode.** Deny patterns + NEVER rules for risky/autonomous sessions. CE has no hard execution-boundary mechanism.
9. **Collaborative/team setup.** Per-area folders + ownership + CONTRIBUTING. CE is more single-user-oriented.
10. **Personal vs shared frontmatter + owner resolution.** Consistent schema discipline across all artifacts. CE uses YAML too but less systematically.
11. **Per-spec execution modes (batch/checkpoint/isolated) w/ human approval.** CE has complexity tiers but not the same per-unit context-isolation framing.
12. **Two-tier wrap-up (spec-done vs session-end).** Light per-spec (status + commit) vs heavy once-per-feature (validate + consolidate + push + PR). Cleaner than CE's ce-work + commit-push-pr; prevents per-spec over-ceremony.
13. **Backlog discipline.** `docs/backlog/` with its own lifecycle, user-confirmed, never auto-written. CE routes tangents to "Deferred to Follow-Up Work" inside plans only.
14. **Level 5 holdout-scenario concept.** Separate AI writes tests the coding agent never sees (validation-set analogy). More principled anti-gaming than CE's ce-dogfood-beta browser QA.

---

## 6. Exhaustive Gap List (joycraft → could benefit from)

**Knowledge & compounding**
- [ ] Retrieval metadata on captured facts/learnings (category, tags, problem_type)
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
- [ ] Causal-chain gate, assumption audit, prediction-for-uncertain-links, smart escalation, git bisect, observability integration — strengthen joycraft-bugfix

**Optimization & simplification**
- [ ] Metric-driven iterative optimization loop (experiment log, measurement gates, LLM-as-judge) — *distinct from the token-audit optimize*
- [ ] A "simplify the diff before PR" step

**Automation & contracts**
- [ ] Headless mode + `mode:agent` JSON contracts on skills (for L5 pipeline composition + cross-harness)
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
- [ ] Converter/Writer/Marketplace architecture for non-Pi targets

---

## 7. Collisions & Naming Hazards

- **`optimize` collision.** CE `ce-optimize` = metric-driven experiment loops; joycraft `joycraft-optimize` = token/session overhead audit. If joycraft adopts an experiment-loop skill, name it `joycraft-experiment` or `joycraft-tune-loops`, **not** optimize.
- **`verify` vs `code-review`.** joycraft-verify = spec-conformance (one verifier); CE code-review = broad multi-persona quality review. They are *not* the same — joycraft needs a distinct `joycraft-code-review`, not an overload of verify.

---

## 8. Summary Verdict

- **Joycraft is stronger** on: spec structure, process isolation, independent verification, research objectivity, structured context, harness maturity, lockdown, team ownership, status lifecycle, and the Level-5 holdout concept.
- **CE is stronger** on: multi-agent review rigor, knowledge compounding *with maintenance*, product strategy + outcome loops, external research, debugging rigor, metric-driven optimization, cost tiers, headless/JSON automation contracts, git skills, and ecosystem reach.
- **The two biggest gaps** for joycraft are (1) **multi-agent review** and (2) **compounding-with-maintenance** — the latter being literally CE's namesake and the thing that makes "compound" true rather than just "accumulate."
- **The cheapest high-value imports:** a knowledge-refresh skill, retrieval metadata on facts, multi-persona doc-review on specs, and a stronger debug skill. None require a 50-agent library.

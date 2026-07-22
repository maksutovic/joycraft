---
title: "Compound Engineering vs Joycraft — Exhaustive Comparison (Claude)"
author: claude-opus-4-8
date: 2026-06-18
status: active
panel: ce-vs-joycraft-multimodel
source_commit: "EveryInc/compound-engineering-plugin (cloned 2026-06-18, plugin v3.13.1)"
method: "Deep read of both corpora — 37 CE skills + 42 CE agents + the full docs/solutions/skill-design methodology corpus, vs all 20 Joycraft skills + CLI. Mechanism-level, not description-level. Fanned out 5 parallel reader subagents over the CE corpus, read the skill-design methodology + CLI-principles docs directly."
note: "One of three independent panel entries (codex, claude, glm). Not a supersession of the codex doc — parallel analyses for cross-review and convergence."
---

# Compound Engineering vs Joycraft — Exhaustive Comparison

## Method note

This is the **Claude** entry in a three-model panel (Codex, Claude, GLM-5.2), each
analyzing independently before cross-review and convergence. My analysis is grounded
in a **mechanism-level deep read** of both codebases (every CE skill's `SKILL.md` +
references, all 42 agents, and the entire `docs/solutions/skill-design/` methodology
corpus — fanned out across 5 parallel reader subagents, with the methodology and
CLI-principles docs read directly). The headline conclusion:

> The biggest gap is not a missing skill. It is that **Compound has codified — and
> measurably dogfooded — a methodology for building agentic skills**, and uses it to
> make its own toolchain compound. Joycraft has the *philosophy* of compounding but
> does not yet apply it to itself. Closing the skill-by-skill gaps without stealing
> the methodology would just produce more skills that don't get better over time.

Everything below is at the level of "here is the specific mechanic, here is whether
Joycraft has it, here is what to do." Mechanics the earlier draft missed entirely are
flagged **[NEW]**.

---

## Executive Summary

Joycraft and Compound are philosophically adjacent, optimized for different failure modes.

**Joycraft** is a *harness installer + spec factory*. Its differentiated bets:
research-isolated-from-intent (the researcher subagent never sees the brief), atomic
spec queues with a `todo→in-review→done` lifecycle, TDD-as-default, OS-process
isolation on Pi (`joycraft-implement-loop`), and a Level-5 **holdout scenario wall**
(a private test repo the coding agent is forbidden to read — an ML validation-set
analogy with no Compound equivalent). It owns project-local scaffolding: stack
detection, generated boundaries, selectable harness footprint, gitignore profiles,
hash-tracked upgrades.

**Compound** is an *engineering operating system*. Its differentiated bets: a closed
compounding loop (`STRATEGY.md` → ideate → brainstorm → plan → work → review →
`ce-compound` learning → repeat), serious multi-agent review panels with
confidence-anchored dedup pipelines, a schemaed/dedup'd/refreshable solution-doc
knowledge store, broad context retrieval (sessions, Slack, GitHub issues, git
archaeology, web), explicit git/PR state machines, a self-improvement engine
(`ce-optimize`), and a converter CLI that turns one Claude plugin into Codex/Gemini/
OpenCode/Pi/Kiro bundles. **And a codified skill-design methodology that it applies
to itself.**

### Joycraft's ten largest gaps (mechanism-level)

1. **No codified skill-design methodology, and no dogfooding of the compounding loop on its own toolchain.** [NEW — this is the meta-gap that subsumes several below]
2. **No persona-based code review** — Joycraft has one read-only `joycraft-verify`; Compound has a 13-persona dynamic panel + validator wave + confidence-anchored dedup pipeline.
3. **No persona-based document review** before specs (brief/design/spec get human eyes only).
4. **No confidence-anchored scoring** anywhere. Compound's `{0,25,50,75,100}` behavioral anchors are load-bearing across all review.
5. **Knowledge store is append-only and unschemaed.** `docs/discoveries/` + `docs/context/` capture facts but have no dedup, no retrieval agent, no refresh/stale/consolidate lifecycle, no `applies_when` retrieval metadata.
6. **No strategy anchor** (`STRATEGY.md`) read by downstream skills.
7. **No ideation layer** that proactively generates and critiques opportunities.
8. **No context-retrieval breadth** — no session-history mining, no git archaeology, no issue/Slack/web research agents.
9. **Git/PR/worktree flows are prose, not state machines** — Compound has a documented learning ("git-workflow skills need explicit state machines") born from real whack-a-mole regressions Joycraft will hit.
10. **Skills duplicate per-harness (4 parallel copies) instead of converting from one source** — a maintainability tax Compound eliminated with its converter. [NEW]

### Compound's largest gaps relative to Joycraft

1. No per-feature **atomic spec queue** with a status lifecycle.
2. No **TDD contract** every implementation unit carries by default.
3. No **external holdout scenario wall** (Level 5) — its reviews are all in-loop, gameable in principle.
4. No **OS-process-per-spec** headless loop (CE's isolation is worktree/subagent, in-session).
5. **Weaker research isolation** — CE separates research *by information type per stage*, but its planning researchers still operate inside an intent-aware workflow; Joycraft's researcher is structurally blind to the brief.
6. More **moving parts** — 37 skills / 42 agents is a large prompt + dependency surface.
7. No **project-local install/upgrade discipline** — CE assumes you live inside its plugin; it doesn't own your repo's scaffolding, boundaries, or upgrade state.

---

## Part 1 — Philosophy

### Shared
Both reject vibe coding for artifact-mediated development; both treat conversation
context as disposable and files as durable; both phase the work and fight silent
requirement invention; both claim to compound knowledge.

### The divergence that matters
- **Joycraft's thesis:** move the developer up Dan Shapiro's 5 Levels (L2 prompting →
  L4/L5 spec-driven/autonomous). Highest-leverage human acts: interview, research
  isolation, design checkpoint, decomposition, spec approval. Autonomy is *earned*
  through tests + holdout scenarios. Safety = boundaries + fresh context + research
  isolation + TDD + independent verifier + holdout wall.
- **Compound's thesis:** *each unit of work makes the next easier.* 80% planning/review,
  20% execution. Safety = right-sized artifacts + multi-agent review + confidence
  anchors + validation passes + schemaed reusable learnings + broad context retrieval +
  git state machines.

**The asymmetry:** Joycraft's compounding is *forward* (specs → autonomy ladder).
Compound's compounding is *cumulative* (every solved problem becomes a retrievable
learning that sharpens the next plan/review). Joycraft captures discoveries but rarely
*retrieves* them mid-workflow. Compound's `ce-learnings-researcher` is dispatched by
plan/review/optimize/ideate *before new work begins*. **That retrieval step is the
literal mechanism of "compounding," and Joycraft is missing the read side of its own
knowledge loop.**

---

## Part 2 — The Methodology Gap (the most important section) [NEW]

Compound's `docs/solutions/skill-design/` is 16 cross-linked docs encoding *how to
build agentic skills*, derived empirically, with **measured token reductions and A/B
evals**. This is compound engineering applied to the tools themselves. Joycraft has
no analog — its skill-authoring knowledge lives only in CLAUDE.md gotchas and the
author's head. The principles, and Joycraft's status on each:

| # | Compound principle (mechanism) | Joycraft status |
|---|---|---|
| 1 | **PROTOCOL vs JUDGMENT split.** Classify every block: PROTOCOL (*what to do* — paths, counts, formats; workflow breaks without it → keep verbatim) vs JUDGMENT (*how to think* — example lists; a frontier model already has the capability → compress to principle + ONE contrast pair). "Skills built for prior models are too prescriptive for current models and degrade output." | **Absent.** Joycraft skills are uniformly prescriptive; no compression discipline. |
| 2 | **Load-bearing rules inline, conditional/late content in references with information-asymmetric load stubs** (5 required properties: load-only, names-contents-and-uniqueness, names-skip-failure, closes-leaks, pre-empts-rationalization). | **Partial.** Joycraft skills are mostly self-contained (good), but have no stub discipline for the few that should externalize. |
| 3 | **Pass paths, not content, to subagents** + **file+gist** (subagent writes a dossier to scratch, returns 3-5 line gist + path; downstream reads the file; orchestrator never carries bulk). Inlined dossiers can cost more tokens-per-turn than the whole SKILL.md. | **Absent.** `joycraft-research`/`verify` return prose inline. Fine at current scale; a tax as panels grow. |
| 4 | **Script-first architecture** — offload deterministic processing to bundled scripts; model presents, never re-parses. Measured **60-75% token cut** on data-heavy skills. | **Partial.** Pi scripts do this for the loop; `joycraft-optimize` has the model count lines itself (a candidate to scriptify). |
| 5 | **Confidence-anchored scoring** — discrete `{0,25,50,75,100}` behavioral anchors over continuous floats (models can't honestly calibrate 0.65 vs 0.72; continuous invites false precision + coin-flip gates). Threshold tuned to economics (≥80 code / ≥75 / ≥50 doc). | **Absent everywhere.** |
| 6 | **Eval methodology** — fresh subagent reads skill from disk (cache bypass), graded mechanically from the JSONL tool-call timeline, **N≥3 minimum on ambiguous fixtures** (N=1 produced two confidently-wrong opposite conclusions), **variance reduction > rate-shift** as the headline metric, keep a negative-control fixture. | **Absent.** Joycraft has unit tests for the CLI but no skill-behavior evals. (The holdout scenarios are the closest analog but test *user projects*, not Joycraft's own skills.) |
| 7 | **Git-workflow skills need explicit state machines** — branch/upstream/untracked/PR are independent state dimensions; prose lets a skill observe one once then assume it holds after a mutation. Born from real whack-a-mole regressions (detached HEAD, untracked-only, `gh pr list` fork ambiguity, default-branch bypass). | **Absent + at risk.** `joycraft-session-end` does commit/push/PR in prose. |
| 8 | **Capability-first platform language** — "use the platform's blocking question tool (AskUserQuestion in Claude / request_user_input in Codex / ask_user in Gemini/Pi); never silently skip" beats "use AskUserQuestion when available" (the latter gives permission to skip). | **Worth auditing.** Joycraft is multi-harness; same hazard applies. |
| 9 | **Beta-skills framework** — trial risky rewrites as parallel `<name>-beta/` with `disable-model-invocation`, `[BETA]`-prefixed description (promotion = prefix removal). | **Absent.** Joycraft rewrites skills in place. |
| 10 | **Model tiering by semantic name, never model id** (extraction/generation/ceiling; ceiling = omit the param to inherit). + degradation rule when a platform lacks per-agent selection. | **Absent** (Joycraft subagents inherit; fine, but no tier vocabulary for when panels arrive). |
| 11 | **Couple-load-bearing-changes land atomically** (schema + template + synthesis + tests in one PR; partial migration fails validation everywhere). | Implicit in Joycraft's same-commit bundle-regen rule; not generalized. |
| 12 | **Conventions enforced in tests + allowlist, not prose** (a prose rule with visible counterexamples is, in practice, advisory). | **Partial** — Joycraft has CLI contract tests; no skill-content convention tests. |

**The recommendation that dominates all others:** before adding Compound-style
breadth, Joycraft should **start its own `docs/solutions/skill-design/` and adopt the
PROTOCOL/JUDGMENT + confidence-anchor + eval-harness subset.** Otherwise every new
skill is debt that can't compound.

---

## Part 3 — Skill-by-skill mapping (with the mechanics that matter)

### Strategy / product direction
- **CE:** `ce-strategy` (durable `STRATEGY.md`; rigor lives in the *interview
  questions* built on Rumelt's kernel, with named anti-patterns the agent fires but
  never names to the user; 2-pushback-rounds cap; rerunnable in-place).
  `ce-product-pulse` (read-side telemetry loop, single-page constraint, strategy-seeded,
  read-only DB access refused). `ce-promote` (launch copy).
- **Joycraft:** none. Closest: `joycraft-interview`/`new-feature` + context docs.
- **Gap:** Joycraft starts at feature conception. No upstream "why this product exists"
  anchor downstream skills read. The *interview-as-rigor-engine* pattern (anti-patterns
  → sharper question, never leak the label) is independently worth stealing into
  `joycraft-interview`.

### Ideation / brainstorming
- **CE:** `ce-ideate` (their densest skill — generate-many → critique-ALL →
  explain-survivors; **mandatory tagged basis** `direct:`/`external:`/`reasoned:` is the
  anti-AI-slop mechanism; frames × axes two-axis decomposition; tiered fleet; web-research
  cache + checkpoints). `ce-brainstorm` (Product Pressure Test gap scan; two-stage
  synthesis where the user only sees stage 2; Path-A/B two-signal gate).
- **Joycraft:** `joycraft-interview` (yap → draft brief), `joycraft-new-feature`
  (guided → brief + specs).
- **Joycraft wins** at conversation → atomic specs. **CE wins** at proactive idea
  generation with falsifiable basis. **Gap:** no "AI proposes + critiques directions"
  flow; Joycraft assumes a seed idea.

### Planning / decomposition
- **CE:** `ce-plan` (approach-altitude "one level up" mode; confidence-gap deepening with
  risk-weighted section scoring + deterministic section→agent mapping; stable U-IDs that
  survive reordering; always dispatches repo-research + learnings-researcher;
  mandatory `ce-doc-review` on md plans).
- **Joycraft:** `joycraft-design` (~200-line, 5-section, **hard human-approval gate** —
  "the value is the pause"), `joycraft-decompose` (machine-readable
  `.joycraft-spec-queue.json` + wave plan with parallel-safety markers + per-spec
  execution mode).
- **Joycraft wins** at forcing small independent specs with a machine-readable queue —
  CE has *no equivalent to the spec queue*. **CE wins** at making one plan rigorous +
  reviewed before execution. **Gap:** no multi-persona review of brief/design/specs;
  no deepening pass.

### Research
- **CE:** `ce-plan` dispatches `ce-repo-research-analyst` + `ce-learnings-researcher`;
  plus `ce-best-practices-researcher`, `ce-framework-docs-researcher`,
  `ce-web-researcher`, `ce-slack-research(er)`, `ce-issue-intelligence-analyst`,
  `ce-git-history-analyzer`, `ce-sessions`/`ce-session-historian`. Research is
  **separated by information type per stage** (brainstorm = WHAT, plan = HOW, work =
  reads the plan) — a documented design, not an accident.
- **Joycraft:** `joycraft-research` (**structural isolation** — subagent gets ONLY
  questions written to a temp file, never the brief; enforces fact-only),
  `gather/add-context`, `add-fact`.
- **Joycraft wins** decisively on *objectivity* (the researcher literally cannot be
  contaminated by intent — CE has nothing this strong). **CE wins** decisively on
  *breadth* (Slack, sessions, issues, git archaeology, web). **Gap:** Joycraft has zero
  external/org-memory research and no session-history mining.

### Implementation
- **CE:** `ce-work` (subagent-per-unit context isolation; parallel safety check with
  worktree isolation + abort-and-re-dispatch on merge conflict; idempotent
  re-execution; System-Wide Test Check tracing two levels out; two-tier review with
  `ce-code-review` as escalation-only; residual-work gate; knowledge-work carve-out).
  `ce-work-beta` (Codex delegation with per-batch effort tiering + circuit breaker).
  `lfg` (full headless: plan→work→review→apply→test→commit→PR→CI-watch-autofix, with
  durable residual sinks and "never prompt" autopilot contract).
- **Joycraft:** `joycraft-implement` (strict red-green TDD; flags tests passing
  pre-impl; mode-aware self-driven wrap-up + auto-continues queue),
  `joycraft-implement-feature` (subagent-per-spec orchestrator, verify-don't-trust,
  fail-fast), Pi `joycraft-implement-loop` (**OS-process-per-spec**, the strongest
  isolation either system has).
- **Joycraft wins** on repeatable spec-queue execution + true process isolation + TDD
  as a hard contract. **CE wins** on rich single-plan execution: worktree parallelism,
  merge orchestration, integration-test gating, residual handling, CI-autofix loop.
  **Gap:** no worktree-aware parallel execution; no integration-test "trace two levels
  out" gate; no residual-findings handling.

### Debugging
- **CE:** `ce-debug` (causal-chain gate — no fix until trigger→symptom chain has no
  gaps; **prediction requirement** for uncertain links; assumption audit; smart
  escalation table; conditional defense-in-depth; deep investigation-technique library).
- **Joycraft:** `joycraft-bugfix` (triage → diagnose → **discuss-before-code** → spec →
  handoff; bugfixes live area-shaped in `docs/bugfixes/<area>/`).
- **Joycraft wins** at turning a bug into a controlled spec. **CE wins** at in-session
  forensic root-causing. **Gap:** Joycraft's bugfix is spec-producing, not a diagnostic
  methodology — consider a diagnostic mode rather than bloating it.

### Review & verification — *the largest practical gap*
- **CE `ce-code-review` mechanics (steal these):** 6-stage pipeline; **dynamic panel**
  (4 always-on + conditionals chosen by the orchestrator reading the diff);
  **model-tiering** (only correctness/security/adversarial inherit the ceiling, rest
  forced mid-tier — skipping this "3-4×'s the cost"); **two-tier finding return** (full
  schema → scratch file, compact fields → orchestrator); **confidence-anchored dedup
  pipeline** (fingerprint dedup → cross-reviewer corroboration promotes one anchor step
  → mode-aware demotion → late confidence gate with P0+50 exception); **per-finding
  validator subagent wave** (fresh second opinion prompted to refute, budget cap 15,
  asymmetric infra-failure handling that never silently drops a P0); scope-mode safety
  (remote modes use `git show`, never stale workspace reads); trivial-PR skip; never
  pushes. `ce-doc-review` mirrors it for plans/requirements with origin-gated technique
  suppression and premise-dependency chain linking. `ce-simplify-code` is a 3-agent
  quality-only pass with opposite-failure-mode guards.
- **Joycraft:** `joycraft-verify` (one read-only QA verifier, can run named tests,
  cannot edit/install/network, structured PASS/FAIL, "do NOT offer to fix"),
  `joycraft-session-end` (the validation gate).
- **Joycraft wins** at *spec-conformance* verification with clean read-only separation
  (CE's validator wave is finer-grained but CE has no single "does this match its spec"
  gate). **CE wins** overwhelmingly at *multi-perspective* review before merge and
  before plan execution. **This is the #1 quality gap.**

### Knowledge capture
- **CE:** `ce-compound` (orchestrator-writes-one-file; overlap assessment across 5
  dimensions → update-vs-create; grep-first retrieval; parser-safety validator;
  discoverability check every run). `ce-compound-refresh` (five-outcome model
  keep/update/consolidate/replace/delete; "delete don't archive — git is the archive";
  inbound-link classification gates deletion; document-set analysis for cross-doc
  contradictions). `CONCEPTS.md` (vocabulary that accretes + seeds). `ce-learnings-researcher`
  (the **read side** — dispatched before new work). Solution docs carry typed
  frontmatter (`problem_type`, `severity`, `applies_when`, `root_cause`, tags, category).
- **Joycraft:** `joycraft-session-end` (discoveries), `joycraft-add-fact` (routes to 5
  fact-docs by signal words), `joycraft-add-context` (reference docs + Context Map row),
  `joycraft-gather-context` (first-run onboarding with read-then-offer, gap-only,
  batch-write — a genuinely nice pattern CE lacks).
- **Joycraft wins** at *project-safety* framing (dangerous-assumptions, production-map,
  troubleshooting are explicitly "what agents get wrong") and at first-run context
  onboarding. **CE wins** at the *full lifecycle*: retrieval metadata, dedup,
  update-existing, refresh/stale/consolidate, and — critically — **the retrieval agent
  that feeds learnings back into planning/review.** **Gap:** Joycraft's knowledge is
  write-mostly; it has no `applies_when`-style retrieval and no refresh lifecycle, so it
  drifts and is rarely read back.

### Git / PR / shipping
- **CE:** `ce-worktree`, `ce-commit`, `ce-commit-push-pr` (adaptive descriptions,
  default-branch gate, the documented **state-machine** discipline), `ce-clean-gone-branches`,
  `ce-resolve-pr-feedback` (6-verdict vocabulary, file-conflict-avoidance scheduling,
  bounded fix-verify loop, GraphQL thread resolution).
- **Joycraft:** `joycraft-session-end` (commit/push/PR per autonomy config),
  `joycraft-spec-done` (per-spec commit), `joycraft-tune` (autonomy + boundary config).
- **Joycraft wins** at simple spec-driven commits + configurable autonomy. **CE wins**
  at explicit state machines + rich shipping. **Gap:** port the git-state-machine
  pattern *before* Joycraft hits the same regressions; split commit/PR/worktree out of
  `session-end`.

### Visual / UX / product evidence — Joycraft has none
- **CE:** `ce-frontend-design`, `ce-polish` (dev-server + browser iterate, 8-framework
  auto-detect), `ce-demo-reel` (tiered capture + secret-scrub + GitHub 10MB GIF
  handling), `ce-test-browser`, `ce-test-xcode`, `ce-proof`, `ce-gemini-imagegen`.
- **Gap:** entirely absent from Joycraft core — correctly so for now; candidate
  *optional packs*, not core.

### Domain / framework packs — Joycraft has none
- **CE:** `ce-dhh-rails-style`, `ce-agent-native-architecture` (a methodology framework
  they *ship* — five principles: parity/granularity/composability/emergence/improvement;
  "features are outcomes an agent achieves in a loop, not functions you write"),
  `ce-agent-native-audit` (8 parallel scored sub-agents). Plus domain review agents.
- **Gap:** Joycraft is intentionally general. Optional packs > core bloat.

### Setup / distribution / platform [NEW depth]
- **CE:** native Claude/Cursor/Copilot/Droid/Qwen plugin install + a **converter CLI**
  (`@every-env/compound-plugin`) that parses *one* Claude plugin and emits
  Codex/Gemini/OpenCode/Pi/Kiro bundles (model-field normalization, path-name
  sanitization for Windows, `~/.agents/skills` shadow-hazard avoidance). Manual
  release-please across 5 components with version-invariant validation in CI.
- **Joycraft:** `npx joycraft init`/`upgrade` — interactive harness multi-select,
  stack detection → generated CLAUDE.md/AGENTS.md, **hash-tracked upgrade state**
  (`docs/.joycraft/state.json`) with customization preservation, gitignore profiles,
  forced docs migration.
- **Joycraft wins** decisively at *project-local scaffolding + controlled upgrades* —
  CE doesn't try to own your repo. **CE wins** at *distribution reach*.
- **[NEW] The maintainability gap:** Joycraft ships **4 parallel copies** of every skill
  (`src/claude-skills/`, codex, pi, `src/skills/`) kept in sync by hand. CE maintains
  **one** Claude source and *converts*. As Joycraft's skill count grows, the 4×
  duplication is a real tax. Either adopt a converter/generator (single-source →
  per-harness output) or a build step that emits the variants. This is independently
  on Joycraft's roadmap (`single-source-skills`) — the CE converter is the reference
  implementation to study.

---

## Part 4 — What Joycraft does better (keep, don't dilute)

1. **Atomic spec discipline** + a machine-readable queue (`.joycraft-spec-queue.json`)
   with a real `todo→in-review→done` lifecycle. CE has no equivalent.
2. **TDD as a hard contract** every implementation spec carries (flags tests that pass
   before implementation — CE's test-first posture is lighter/contextual).
3. **Structural research isolation** — the researcher subagent *cannot see the brief*.
   Stronger than CE's stage-based information separation.
4. **Design-checkpoint restraint** — a deliberate ~200-line artifact with a *hard
   human-approval pause* ("the value is the pause").
5. **Level-5 holdout wall** — a private scenario repo the implementer is forbidden to
   read. No CE analog; this is Joycraft's deepest moat.
6. **OS-process-per-spec isolation** on Pi — the strongest context guarantee in either
   system (CE isolation is worktree/subagent, in-session).
7. **Project-local installer/upgrader** with hash-tracked state, selectable footprint,
   gitignore profiles. CE doesn't own your repo this way.
8. **Safety-context framing** — production-map / dangerous-assumptions / troubleshooting
   are explicitly "what agents get wrong," not generic docs.
9. **First-run context onboarding** (`gather-context`: read-then-offer, gap-only,
   batch-write). CE has no comparable cold-start ramp.
10. **Minimal conceptual spine + a legible L1-5 adoption path.** 20 skills vs 37/42 —
    clarity is an asset.

---

## Part 5 — Exhaustive gap list (actionable)

**Methodology (do first):**
- Start `docs/solutions/skill-design/` for Joycraft itself; adopt PROTOCOL/JUDGMENT
  classification, confidence anchors, and the fresh-subagent eval harness (N≥3,
  variance-first).
- Add a skill-content convention test + a `--force`-style behavior eval for the
  highest-stakes skills (implement, research, decompose).

**Review/quality (highest user value):**
- `joycraft-review-doc` — small persona panel (product/scope, feasibility, testability,
  security/risk, coherence) over brief/design/specs, confidence-anchored.
- `joycraft-review-code` — risk-gated pre-PR panel (start: correctness, testing,
  maintainability, security, project-standards; add conditionals later). Steal the
  dedup pipeline + validator wave + P0+50 exception.
- `joycraft-simplify` — behavior-preserving pass before review on larger diffs.
- Residual-findings handling (fix / file / accept-and-record / stop) in session-end.
- A **project-standards reviewer** that checks diffs against the project's own
  CLAUDE.md/AGENTS.md + Context Map (cheap, high-signal, uniquely fits Joycraft's
  boundary model).

**Knowledge (close the read side of the loop):**
- A schemaed solved-problem store (`docs/context/solutions/` to avoid competing with
  the safety-context docs) with `problem_type`/`severity`/`applies_when`/tags.
- A `joycraft-learnings` retrieval agent dispatched by research/design/decompose/
  implement *before* new work — this is what turns "capture" into "compounding."
- `joycraft-knowledge-refresh` — keep/update/consolidate/replace/delete; delete-don't-archive.
- Decide: extend the Context Map to cover domain vocabulary, or add a `CONCEPTS.md`.

**Strategy/ideation:**
- `joycraft-strategy` (`STRATEGY.md` read by interview/new-feature/research/design).
- `joycraft-ideate` (generate → critique-all → tagged-basis → route one in).
- Steal the *interview-as-rigor-engine* (anti-patterns fire questions, never named to
  the user) into `joycraft-interview`.

**Context breadth:**
- `joycraft-sessions` — script-first session-history mining for Claude/Codex/Pi
  (never read raw MB transcripts into context).
- Optional org-memory pack later (issues, git archaeology, web/framework docs).

**Git/shipping:**
- Model branch/push/PR as an explicit state machine; split commit / commit-push-pr /
  worktree out of session-end; add `joycraft-resolve-pr-feedback`; add stale-branch cleanup.

**Architecture/maintainability:**
- Single-source skills → per-harness output (study CE's converter); kills the 4× copy tax.
- Reference load-stubs for any bulky guidance; beta-skills framework for risky rewrites.
- Move deterministic parsing (e.g. `joycraft-optimize` line counting) into scripts.

---

## Part 6 — What NOT to copy

1. Don't pull 42 agents into core — Joycraft's clarity is a feature. Optional packs.
2. Don't replace atomic specs with giant plans — decomposition is the differentiator.
3. Don't run review panels on every path — risk-gate them (sensitive domain, large
   diff, design-heavy, explicit request).
4. Don't let a solutions store compete with the safety-context docs — different jobs.
5. Don't dilute research isolation — keep "the researcher never sees the brief" even if
   you add breadth around it.
6. Don't prioritize marketplace conversion over closing workflow gaps — but DO fix the
   4× skill-copy tax, which is a separate (maintainability) concern.
7. Don't adopt CE's full shipping ceremony in core — port the git state machine and
   residual gate; leave demo-reels/Proof/promote as optional.

---

## Part 7 — Proposed augmented Joycraft flow (conservative, risk-gated)

1. `joycraft-strategy` — once per product/direction change.
2. `joycraft-ideate` — when the user wants options.
3. `joycraft-interview` / `joycraft-new-feature` (interview now carries the rigor engine).
4. `joycraft-review-doc` — on medium/high-risk briefs.
5. `joycraft-research` — **unchanged isolation guarantee.**
6. `joycraft-design`.
7. `joycraft-review-doc` — on design for high-risk work.
8. `joycraft-decompose`.
9. `joycraft-review-doc` — on specs when large/sensitive.
10. `joycraft-implement` / `implement-feature` (+ `joycraft-learnings` retrieval before each).
11. `joycraft-review-code` — only when risk gates fire.
12. `joycraft-verify`.
13. `joycraft-session-end` (+ residual gate; git state machine).
14. `joycraft-compound` — only when a reusable solved problem/surprise exists.
15. Level 5 remains the separate autonomy path.

The spine is unchanged. Everything added is optional and risk-gated.

---

## Part 8 — Open decisions for our discussion

1. **Methodology-first?** Do we agree the skill-design corpus + confidence anchors +
   eval harness come *before* new skills? (My strong recommendation: yes.)
2. `STRATEGY.md` as a new root file, or fold strategy into `docs/context/`?
3. Solutions store at `docs/context/solutions/` vs a top-level `docs/solutions/`?
4. Review panels: core skills or optional packs? Auto-run inside new-feature/design/
   decompose, or explicit-invocation only?
5. Code review: default pre-PR gate, or risk-gated escalation only?
6. Universal/non-software planning: support it (CE does) or stay software-focused?
7. The 4× skill-copy tax: converter, build-step generator, or single canonical + thin
   per-harness shims?
8. Which context source first if we add breadth: session history (cheapest, local),
   GitHub issues, or external docs?
9. Do we want a self-improvement loop (`ce-optimize` analog) for Joycraft's own skills,
   or is the holdout-scenario wall enough?

---

## Bottom line

Joycraft should not become Compound. Its moat — clean feature→spec→TDD→holdout→autonomy
with structural research isolation and a real installer — is genuinely differentiated
and in places *stronger* than anything Compound ships.

But Joycraft preaches compounding without yet practicing it on itself. Compound's
deepest lesson isn't any single skill — it's that **they codified how to build skills
and used their own loop to make the toolchain better, with measurements to prove it.**
The highest-leverage move is to steal that *methodology* (skill-design corpus,
confidence anchors, eval harness, the learnings-retrieval read-path) and then add a
thin, risk-gated set of review + knowledge + strategy layers around the atomic-spec
factory — without touching the spine.

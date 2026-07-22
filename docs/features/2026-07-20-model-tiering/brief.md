---
status: backlog
owner: Maximilian Maksutovic
created: 2026-07-20
source: Anthropic multi-model orchestration guidance + OpenAI GPT-5.6 tier guidance, verified 2026-07-20
backlogged: 2026-07-20 — via reject-framing on the dossier; routing must be
  user-tuneable, which belongs to the living-harness sprint's configuration
  work. See docs/backlog/2026-07-20-model-tiering.md
decisions:
  - id: D1
    question: routing encoding mechanism
    status: backlogged
    reason: tuneability requirement moves this to the living-harness sprint
  - id: D2
    question: verifier model tier
    status: backlogged
    reason: deferred with D1
  - id: D3
    question: degradation policy
    status: backlogged
    reason: deferred with D1
---

# Feature Brief — model tiering: right model, right stage, both harnesses

> **Origin:** Anthropic's published orchestration pattern (Fable 5 as
> planner/advisor, Sonnet 5 workers — benchmark: 96% of all-Fable performance
> at 46% cost; Opus 4.8 for everyday complex load) and OpenAI's GPT-5.6 tier
> guidance (Sol for ambiguous/high-value planning, Terra 2x cheaper for scoped
> implementation). Joycraft's skills currently say nothing about models — every
> stage runs on whatever the user's session happens to be, which wastes frontier
> tokens on mechanical work and starves planning stages of frontier reasoning.

## TL;DR for the implementer

Bake stage-appropriate model routing into the joycraft skills:

**Claude Code users (three-tier, Max's adaptation of Anthropic's two-tier):**
| Stage | Skills | Model |
|-------|--------|-------|
| Planning / dialogue / research | interview, new-feature, design, decide, decompose, research, bugfix (triage) | **Fable 5** (recommend at skill start) |
| Orchestration | implement-feature (the driver conversation) | **Opus 4.8** |
| Implementation | implement subagents spawned per spec/wave | **Sonnet 5** (Agent-tool model param) |

**Codex users (two-tier, per OpenAI guidance):**
| Stage | Model |
|-------|-------|
| Planning / dialogue / research | **GPT-5.6 Sol** |
| Orchestration + implementation | **GPT-5.6 Terra** |

Skills cannot force the main-loop model — routing is: (a) a short "recommended
model" preamble per skill that checks the running model and suggests a switch
when mismatched, and (b) hard model params on spawned subagents, which skills
CAN control. Codex variants get the equivalent recommendation text + a
config.toml profile snippet in docs.

## Locked decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Claude tiering | Fable plan / Opus orchestrate / Sonnet implement | Anthropic's advisor+worker pattern, with an Opus middle tier because implement-feature drivers run long and Fable-as-daily-driver is cost-prohibitive |
| 2 | Codex tiering | Sol plan / Terra orchestrate+implement | Matches OpenAI's published handoff guidance; codex has no subagent fan-out so no third tier |
| 3 | Enforcement stance | Recommend main-loop model, enforce only on subagent spawns | Skills are prompts; only the Agent tool's model param is actually enforceable |
| 4 | Scope | All planning-stage + implementation-stage joycraft skills, both harness variants; pi deferred | Pi is single-model per session today |

## Open decisions — resolve via dossier before decompose

- **D1 — Routing encoding:** recommendation text inline in each skill +
  Agent-tool model params (self-contained, gotcha #3) vs shipped
  `.claude/agents/` definitions with model frontmatter (visible, configurable,
  but a new install/upgrade surface) vs both.
- **D2 — Verifier tier:** joycraft-verify subagent on Sonnet (cheap), inherit
  (runs at orchestrator tier), or explicitly frontier. The panel made verify
  the independent sensor that earns not-reading (RF-KILL-3) — tier choice is
  a trust decision, not a cost decision.
- **D3 — Degradation policy:** what happens for users whose plan lacks Fable
  access — hard requirement vs recommend-and-degrade gracefully.

## Constraints

- Model names change; encode tier INTENT ("frontier planner", "workhorse
  implementer") alongside current names so upgrades are one-line swaps —
  never scatter bare model IDs across 24 synced files (RF-4).
- The routing preamble is ≤3 lines per skill — this feature must not fatten
  the skills it touches (RF-DIET-1).
- Skill edits: src/ source of truth, bundle regen + installed-copy sync
  same-commit (established rule).

## Out of scope

Pi variants, automatic cost tracking, per-user model overrides in state.json
(revisit after pilot feedback), changing the tune scoring dimensions.

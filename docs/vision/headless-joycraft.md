# Headless Joycraft — North Star

> **Type:** Vision / strategy (durable — NOT a feature brief; never "done")
> **Created:** 2026-05-28
> **Owner:** Maximilian Maksutovic
> **Status:** Living doc — sprint briefs point UP at this; update as the thesis evolves
> **Related thesis:** the dark-factory model (Level 5) — CI as a sensor network, variance management, open-weight models

---

## The thesis (one paragraph)

Joycraft's end state is **headless**: a developer states intent at the front door (interview) and reviews the result at the back door (the PR), and the machine does everything convergent in between — research, decomposition, implementation, verification — with **no human keystrokes per step**. The human is the bookends, not the glue. This is the dark-factory model applied to software: humans set the spec and inspect the output; the line runs itself.

## The core distinction: convergent vs. human-paced steps

Not every Joycraft step can or should be automated. The line that defines what "headless" can swallow:

| Class | Definition | Steps | Headless? |
|---|---|---|---|
| **Convergent** | Has a definition of done; the work is *executing toward a known target*; quality is checkable | **research, decompose, implement, verify** | YES — these are loopable |
| **Human-paced** | The value IS the judgment / back-and-forth; no mechanical "done" | **interview, design, PR review** | NO — these stay interactive |

- **interview** — "what do we build" is iterative discovery; the worth is the dialogue.
- **design** — produces an artifact, but its purpose is *catching wrong assumptions before they propagate*. Can be drafted headless, but **must be human-approved** before specs derive from it.
- **PR review (after session-end)** — the final human gate; graduates work to merged. Stays human by design.

Everything between the bookends is convergent and is fair game for the headless driver. **implement is just the first one we build.**

## The mechanism: the process boundary, not in-conversation tricks

Context isolation between units of work must live where the guarantee is **unconditional** — the **OS process boundary**. Each convergent unit runs as its own single-shot CLI invocation; a fresh process cannot see another's context. This is verified, not theoretical (a 2-process secret test passed isolation where an in-process extension failed).

The three harnesses all expose the same single-shot primitive:

| Harness | Single-shot (fresh context per call) |
|---|---|
| **Pi** | `pi -p "<prompt>"` — verified |
| **Claude Code** | `claude -p "<prompt>"` — "each new session starts with a fresh context window" |
| **Codex** | `codex exec "<task>"` — "initiate new sessions unless explicitly told to resume" |

In-conversation `compact()` only *summarizes* (leaks); in-TUI `newSession()`/`/clear` only works interactively. The single-shot process is the only mechanism that gives clean isolation **without a human in the loop**.

## Why Pi-first is strategic, not just convenient (the ToS reality)

The autonomous headless loop is **cleanly in-bounds and cost-predictable only on Pi** (with a BYO API key or open weights). This is a documented 2026 policy reality, not a guess:

- **Anthropic** is metering programmatic use. From **2026-06-15**, `claude -p` / Agent SDK draws from a **separate pool billed at full API rates, no rollover** (interactive stays on the flat subscription). Documented runaway case: **$1,800 in 2 days**. Third-party harnesses routing subscription OAuth are **prohibited and actively blocked** (the OpenClaw creator was temporarily banned). Source: Anthropic legal-and-compliance docs + Agent SDK credit help article.
- **OpenAI/Codex** is softer — subscription auth for `codex exec` is officially supported — but the industry trend is toward metering agent workloads.
- **Pi + BYO API key = Commercial/API terms, which carry NO automation restriction. Pi + local/open-weight model = no provider terms at all.** The consumer-subscription ToS problem simply doesn't arise. (The only way Pi re-introduces it is if a user configures it with Claude/ChatGPT *subscription* OAuth — then it's just another harness under the same upstream rules.)

**Consequence for product:** the autonomous path is Pi-first because Pi is the only harness where pointing users at unattended loops is responsible. On Claude/Codex, the honest split is:
- **Interactive-guided** (human runs `/clear`, re-invokes) — always fine, no ToS/cost surprise.
- **Headless-autonomous** (`claude -p` / `codex exec` loop) — works technically, but users must **knowingly opt in** to the ToS posture and metered cost. Joycraft should surface that caveat, not bury it.

## What this implies for the build

1. **Execution modes** (batch / checkpoint / isolated) are the user-facing knob. "Isolated mode" *is* the single-shot loop. On Pi it's automated; on Claude/Codex interactive it's guided-manual; on Claude/Codex headless it's opt-in-with-caveats.
2. **A general headless driver** eventually runs any convergent step. We **earn that abstraction** rather than design it up front — build `implement` concretely first; let the general shape emerge when `verify` becomes the second step (sprint 2).
3. **The lifecycle states** (`todo → in-review → done`) give the quality-gate seam: `in-review` = a convergent step finished but nothing independent has checked it; `done` = verified + human-reviewed. The middle state is where the dark-factory's automated checks (verify) and the human PR gate attach.
4. **session-end is the back-door bookend** — the one mandatory validation + push + PR step, run once per feature.

## Roadmap (sequence, not schedule)

| Phase | What | Status |
|---|---|---|
| 0 | Pi implement-loop proven (single-shot isolation verified) | research done; `pi -p` confirmed |
| 1 | **THIS sprint:** spec-done + execution modes + status unification + Pi implement-loop | brief: `docs/features/2026-05-28-lightweight-spec-done/` |
| 2 | verify-in-loop (`in-review → done`); the general driver abstraction emerges here | designed in sprint-1 brief, built next |
| 3 | research + decompose headless under the same driver | future |
| 4 | Generalize the driver to claude/codex headless (with ToS/cost guardrails) | future, gated on the policy reality above |
| — | interview / design / PR review remain human-paced | by design, permanently |

## Non-goals (permanent)

- Automating the human-paced steps away (interview/design/PR review). The bookends are the point.
- Recommending subscription-OAuth headless loops without the cost/ToS caveat.
- In-conversation or in-TUI context tricks as the isolation mechanism for autonomous runs (process boundary only).

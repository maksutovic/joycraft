---
status: backlog
owner: Maximilian Maksutovic
created: 2026-11-23
priority: later
source: https://www.youtube.com/watch?v=eNhiHP7t5bo
---

# Trial: project context in Postgres / a graph store instead of Markdown

## Why

Joycraft keeps project context as Markdown: the `AGENTS.md` Context Map, `docs/context/*.md` pages, the records (`decision-log.md`, `shipped.md`) and JSON state under `.joycraft/`. Would a database give agents better context for less reading? The 2026-08-30 curated-harness brief made "no embeddings, graphs, or retrieval machinery" a non-goal. The 2026-09-01 panel verdict called that a standing challenge at large scale. Nobody has measured it.

## What the video says

Vasilije Markovic, founder of Cognee, "Why We Built Agent Memory on Postgres, Not Markdown" (14:47, 2026 conference talk, channel The Multimodal Society). It is a vendor pitch. The live demo failed (6:22): slides and claims only.

- **Markdown does not scale (1:23–2:19).** "MD files don't work really that well at scale." Databases exist for concurrency, locking and indexing. *Opinion; no data shown for repo-sized context.*
- **Postgres per agent (3:34–4:13).** Everything goes in Postgres; one small instance per agent ("memory box"), isolated per agent, team, user or org. *Design claim.*
- **Layers (4:27–6:13, slide at 4:31).** Ingestion, graph structuring, access control, retrieval (semantic, graph, temporal), feedback.
- **Session vs permanent memory (6:29–8:02, slide at 6:48).** Hooks on Claude Code and Codex prompt submit feed a session cache. Distillation moves facts into a permanent graph. Data sources are mapped, not copied: "more as a mind map of the system."
- **Numbers (9:16–9:27, slide at 9:16).** 79% on the BEAM memory benchmark; slide also says "86% cheaper than context stuffing". *Vendor-reported; method not shown; LoCoMo results "coming out this week".*
- **Cost (9:54–10:48).** A small-model runtime does extraction without frontier API calls. *Vendor estimate.*
- **Self-improvement (12:15–13:06).** Soft deletes and embedding re-weighting; papers not yet out.
- **Distribution (14:07).** Open source; plugins for Claude Code, Codex and OpenClaw.

## How it maps to Joycraft

- **Could move to the store:** the records (`decision-log.md`, `shipped.md`) and `docs/context/institutional-knowledge.md`, `dangerous-assumptions.md`. These are searched, not read at start, so retrieval is their natural form. Session distillation would overlap with the session-end knowledge rows.
- **Stays Markdown:** the `AGENTS.md` managed block and Rules (they must load every session and be human-editable), specs and briefs (reviewed in PRs), and `.joycraft/` JSON runtime state (small, deterministic, no search need).
- **What users would install:** Python plus Cognee, a Postgres (or Docker), an embedding model, and an LLM or small-model runtime for extraction. That breaks two rules: "Never add a runtime dependency that is not strictly necessary," and the stack-agnostic stance. Ops cost too: a running service, backups, and memory outside Git that no PR can review. Any trial must count this cost, not treat it as free.
- **Lighter middle option:** keep Markdown as the source and build a local index (for example SQLite FTS) as a disposable cache. Include it as an arm.

## A trial sketch

Reuse the ride-trial harness: same tasks, fresh worktrees, same model and effort, logged transcripts.

- **Arms:** (A) Markdown as today; (B) Markdown plus a local derived index, read-only; (C) Cognee on Postgres via its Claude Code plugin, ingested from the same docs.
- **Corpus:** this repo's `docs/context/` and records, plus one synthetic repo grown to 10x the records size to test the scale claim.
- **Tasks:** about 20 questions about the project with known answers (why was X decided, what shipped in which release, which trap applies), plus 3 small jobs that need a past decision.
- **Metrics:** answer correctness; context retrieved per step; tokens of instructions read; tool calls to the first right answer; stale or wrong facts surfaced; setup time and steps for a new user; ongoing cost.

## Open questions

- Does any gain appear at Joycraft's real scale, or only at 10x?
- Can the store stay a derived cache, with Markdown kept as the reviewed source?
- Graph vs code conflict: does "trust the code" still hold?
- Does the hook-based ingestion work on Pi, Copilot CLI and OpenCode, or only on Claude Code and Codex?
- Can BEAM and the "86% cheaper" claim be reproduced?

## Not before

After the 1.9.x release fixes ship.

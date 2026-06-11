# Frictionless Implement — Feature Brief

> **Date:** 2026-06-11
> **Project:** joycraft
> **Status:** Decomposed — specs at `specs/`
> **North star:** `docs/vision/headless-joycraft.md`
> **Builds on:** `docs/features/2026-05-28-lightweight-spec-done/brief.md` (execution modes, spec-done, status lifecycle)

---

## TL;DR

The lightweight-spec-done sprint built the right machinery (modes, queue JSON, spec-done, wave READMEs) but left the human as the message bus: after every spec the agent *tells the user* to run `/joycraft-spec-done`, and the next prompt is usually just the file path of the next spec. This feature removes the human from the convergent middle on Claude Code and Codex, the way the Pi loop already does:

1. **`joycraft-implement` wraps up itself** — in `checkpoint`/`isolated` mode the agent performs spec-done's four steps directly (status bump in both systems, terse discovery stub, commit) instead of handing back to the human.
2. **`joycraft-implement` continues the queue itself** — in `batch`/`checkpoint` mode it re-reads `.joycraft-spec-queue.json`, picks the next ready spec, and keeps going. After the feature's last spec it runs `joycraft-session-end` itself.
3. **New `joycraft-implement-feature` driver** — one invocation runs the whole queue. On Claude Code: a fresh-context subagent per spec (the subagent boundary is the context isolation, the in-session equivalent of Pi's `pi -p` process boundary). Fail-fast, session-end once at the end.
4. **`joycraft-decompose` hands off to the driver** and marks which waves are parallel-safe, so the README + queue JSON it already writes become a complete, machine-followable run plan.

## Problem

- **Per-spec overhead is on the human.** In practice the agent never runs `joycraft-spec-done` itself — implement's Step 6 renders "run `/joycraft-spec-done`" as a display. Every spec costs the user two interactions that carry zero information.
- **Batching doesn't batch.** The prompt after each spec is the file path of the next one — the queue JSON already knows the order and the dependencies, but only the Pi scripts read it.
- **No whole-queue entry point on Claude Code / Codex.** Pi has `joycraft-implement-loop`; Claude Code and Codex have nothing, even though Claude Code's subagents give fresh-context-per-spec *inside* an interactive session — no headless loop, no ToS/cost caveat.

## Decided (this conversation, 2026-06-11)

- Implement **performs** spec-done's steps in checkpoint/isolated (doesn't ask). The standalone `joycraft-spec-done` skill **stays** — the Pi loop invokes it as its own `pi -p` step, and humans can run it manually after ad-hoc work.
- Implement **auto-continues** through the queue in batch/checkpoint and runs session-end after the last spec. Session-end keeps its own gates (validation must pass; push/PR honors CLAUDE.md git autonomy).
- The Claude Code driver uses **one subagent per spec, sequential by default**; the subagent reads `.claude/skills/joycraft-implement/SKILL.md` + `.claude/skills/joycraft-spec-done/SKILL.md` and follows them (robust regardless of whether subagents can invoke skills directly). Parallel waves are opt-in and only for waves the decompose README marks parallel-safe.
- Codex driver variant is a **sequential in-conversation chain** (no subagent isolation available); the headless `codex exec` caveat stays surfaced, not buried.
- Pi driver variant **delegates** to the existing `joycraft-implement-loop` script — no second loop implementation.
- Fail-fast on a failing spec: stop, name the spec, leave the queue intact (matches the Pi loop).

## Out of scope (separate threads)

- Single-source skill generation (kill the 3-variant duplication at build time) — own feature.
- `minimal` gitignore/footprint profile (`docs/templates/` etc.) — own feature.
- verify-in-loop (`in-review → done` via independent verifier) — designed in lightweight-spec-done, still next.
- Parallel subagents in worktrees with automatic merge — driver v1 is sequential-first; parallel is documented as opt-in only.

## Decomposition

| # | Spec | Description | Depends | Mode |
|---|------|-------------|---------|------|
| 1 | `implement-auto-wrapup` | implement performs spec-done itself (checkpoint/isolated) and auto-continues the queue (batch/checkpoint), session-end after last spec — 3 variants | — | batch |
| 2 | `implement-feature-driver` | new `joycraft-implement-feature` skill, 3 variants (subagent loop / sequential chain / delegate to Pi loop) | 1 | batch |
| 3 | `decompose-driver-handoff` | decompose hands off to the driver; wave plan marks parallel-safe waves — 3 variants | 2 | batch |
| 4 | `wire-and-bundle` | regenerate bundled-files, bump skill count 19→20 (README + tests), full validation | 1, 2, 3 | batch |

All `batch`: skill-text edits in one session, one wrap-up at the end.

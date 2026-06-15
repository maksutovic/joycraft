# Frictionless Implement — Feature Specs

> **Parent Brief:** `docs/features/2026-06-11-frictionless-implement/brief.md`
> **Status:** Decomposed 2026-06-11, ready for implementation

## What this feature does

Removes the human from the convergent middle of spec execution on Claude Code and Codex: `joycraft-implement` performs the per-spec wrap-up itself and auto-continues the queue; a new `joycraft-implement-feature` driver runs a whole feature's queue from one invocation (fresh-context subagent per spec on Claude Code); `joycraft-decompose` hands off to the driver and marks parallel-safe waves.

## Specs

| # | Spec | Depends On | Mode | Notes |
|---|------|-----------|------|-------|
| 1 | [implement-auto-wrapup.md](implement-auto-wrapup.md) | — | batch | implement performs spec-done + auto-continues the queue |
| 2 | [implement-feature-driver.md](implement-feature-driver.md) | 1 | batch | new whole-queue driver skill, 3 variants |
| 3 | [decompose-driver-handoff.md](decompose-driver-handoff.md) | 2 | batch | decompose recommends the driver; parallel-safe wave notes |
| 4 | [wire-and-bundle.md](wire-and-bundle.md) | 1, 2, 3 | batch | regenerate bundle, 19→20 counts, validation |

## Execution waves

- Wave 1: spec 1 (sequential — defines the wrap-up semantics specs 2–3 reference)
- Wave 2: spec 2, then spec 3 (sequential — NOT parallel-safe: 2 and 3 both touch the three skill source dirs and 3 references 2's skill name)
- Wave 3: spec 4 (sequential — regeneration must see all source edits)

## How to use this file

Run the whole queue with `/joycraft-implement-feature docs/features/2026-06-11-frictionless-implement/` (after spec 2 lands — bootstrap irony acknowledged), or per spec with `/joycraft-implement <spec-path>`. Each spec is self-contained; this README provides ordering context only.

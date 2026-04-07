# Skill Invocation Eval Infrastructure — Draft Brief

> **Date:** 2026-04-07
> **Status:** DRAFT
> **Origin:** /joycraft-interview session

---

## The Idea

Joycraft's scenarios repo currently supports one type of holdout test: CLI behavioral tests that spawn the built binary and assert on stdout, exit codes, and filesystem state. But Joycraft's core value proposition is its skills — and there's no way to verify that skills actually get invoked by natural language prompts, or that skill output (like `/clear` nudges) actually appears in Claude's response.

We proved in an experimental session that Claude Code's `--output-format stream-json` mode emits structured events for every tool call, including `Skill` invocations. By spawning `claude -p "<prompt>" --output-format stream-json --verbose --dangerously-skip-permissions` in a Joycraft-initialized temp project, we can:

1. Detect which skills were invoked (`"name":"Skill"` tool calls in the stream)
2. Assert on assistant text output (e.g., does the response contain `/clear`?)
3. Measure cost and turn count per eval run

This infrastructure should be scaffolded by Joycraft as part of the scenarios repo template, so any project running Level 5 gets both CLI behavioral tests and skill invocation evals out of the box.

## Problem

1. **No skill invocation testing.** No way to verify that natural language prompts trigger the correct skills. The only tester is the creator, who knows the exact trigger words.
2. **No output content testing.** Changes to skill wording (like adding a `/clear` nudge) can't be verified — Claude may treat `**Tip:**` as optional and skip it.
3. **Skill competition is invisible.** Plugins (like superpowers) can intercept prompts meant for project skills. Without evals, this goes undetected. (We discovered `superpowers:brainstorming` hijacking `joycraft-interview` prompts during this session.)
4. **Scenarios repo only supports CLI tests.** The template and scenario agent prompt are oriented entirely around `spawnSync` + exit code assertions.
5. **No backfill path.** Existing specs merged before Level 5 setup have no scenario coverage. Projects need a way to generate scenarios for their full spec backlog.

## What "Done" Looks Like

- Scenarios repo template includes a skill eval helper that wraps `claude -p --stream-json` parsing
- Scenario agent prompt is updated to handle both CLI behavioral tests and skill invocation evals
- Helper provides assertion primitives: `assertSkillInvoked(stream, "joycraft-bugfix")`, `assertOutputContains(stream, "/clear")`
- Template includes an example skill eval test alongside the existing CLI example
- `/joycraft-implement-level5` does a one-time bulk backfill of existing specs when setting up a scenarios repo
- Cost tracking is built into eval output (from `total_cost_usd` in result events)

## Constraints

- Skill evals spawn real Claude Code instances — each eval costs API tokens (~$0.10–$0.30 per run based on experiments)
- Must use `--dangerously-skip-permissions` for non-interactive execution
- Each eval needs a Joycraft-initialized temp project (`npx joycraft init` in a temp git repo)
- Stream-json requires `--verbose` flag
- Non-deterministic by nature — same prompt may invoke different skills across runs. Need pass-rate thresholds, not binary pass/fail
- Must not leak scenario test content back to the main repo (holdout wall)

## Open Questions

- What pass-rate threshold makes sense? Run each scenario N times and require >80%? >90%?
- How do we handle skill competition from plugins? Should evals run with `--disable-slash-commands` for non-Joycraft skills, or test the full environment?
- Should the temp project fixture be cached across eval runs (expensive to `npx joycraft init` each time)?
- How does the scenario agent distinguish "write a CLI test" vs "write a skill eval" when triaging a spec? Is it based on whether the spec touches skills?
- What's the right budget cap per eval run? ($0.50? $1.00?)
- Should backfill be automatic in Level 5 setup or a separate manual step?

## Out of Scope (for now)

- **Skill analytics/telemetry** — PostHog-style tracking in the wild. Separate concern, not appropriate for OSS.
- **Multi-model testing** — testing across Sonnet/Opus/Haiku. Future phase.
- **Skill invocation evals as a user-facing Joycraft feature** — for now this is infrastructure in the scenarios template. Could become a skill later.
- **Fixing skill competition** — the superpowers plugin conflict is a real problem but a separate fix. Evals detect it; fixing it is a different brief.

## Raw Notes

### Experimental Results (2026-04-07)

**Setup:** Temp dir → `git init` → `npx joycraft init` → `git add -A && git commit`

| Prompt | Expected Skill | Actual Skill | /clear Nudge | Cost | Turns |
|--------|---------------|--------------|--------------|------|-------|
| "assess my project and see what level it's at" | joycraft-tune | joycraft-tune | N/A (no nudge in tune) | $0.28 | 13 |
| "I want to brainstorm an idea..." | joycraft-interview | superpowers:brainstorming | No | $0.22 | 9 |
| "explore a feature idea..." | joycraft-interview | superpowers:brainstorming | No | $0.22 | 9 |
| `/joycraft-interview` (explicit slash) | joycraft-interview | joycraft-interview (via slash) | Yes — paraphrased | $0.20 | 3 |

### Key Discoveries

1. **stream-json is the right detection mechanism.** Tool calls appear as `{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":"..."}}]}}` — completely deterministic.
2. **File-based detection is worse.** Tests two things at once (invocation + execution), paths vary, skill might invoke but fail to write.
3. **Skill competition is real.** `superpowers:brainstorming` consistently beats `joycraft-interview` for creative/exploratory prompts. This is the exact problem Atharva/Tolan described.
4. **Explicit slash commands bypass the Skill tool.** When using `/joycraft-interview`, the skill loads directly — no `Skill` tool call in the stream. Evals need to handle both paths.
5. **`--bare` mode breaks auth and skill discovery.** Must not use it. Regular mode with `--dangerously-skip-permissions` works.
6. **Temp project must be a git repo.** Skills aren't discovered without git init.
7. **`--append-system-prompt` can force single-shot completion** of interactive skills, useful for testing handoff output.

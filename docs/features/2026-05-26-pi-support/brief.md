# Pi Support — Draft Brief

> **Date:** 2026-05-26
> **Status:** DECOMPOSED
> **Origin:** pi session / joycraft-interview
> **Research:** `docs/research/2026-05-26-pi-support.md`
> **Design:** `docs/features/2026-05-26-pi-support/design.md` — all open questions resolved

---

## The Idea

Add first-class Pi coding agent support to Joycraft so the full spec→implement→session-end→next-spec pipeline runs autonomously. Joycraft skills already work in Pi (they're standard Agent Skills markdown), but the human is currently the glue between steps. Pi's extension system and self-extending philosophy make it possible to automate that glue away — the agent drives the entire Level 4 workflow without being told what to do next.

The integration follows Pi's philosophy: bash scripts with READMEs for progressive disclosure, existing Joycraft skills dropped into `.pi/skills/`, and one small extension (~40 lines) as surgical glue for what bash literally cannot do (session lifecycle). This keeps everything Pi-idiomatic — no MCP, no heavy framework, the agent can even maintain its own tooling.

A secondary goal is ensuring the skills and automation work reliably on open-weight models (DeepSeek v4, Kimi K2.6, Qwen 3.5) — not just Claude Opus. This may require simplified skill variants or prompt tuning, but should be validated experimentally rather than assumed.

## Problem

**For Joycraft users on Pi:** The skills exist but must be manually invoked step by step. After `/joycraft-implement` finishes a spec, the human must run `/joycraft-session-end`, then manually clear context, then manually find and invoke the next spec. This breaks flow and keeps the human as the orchestrator — precisely what Level 4+ should eliminate.

**For the Joycraft project itself:** Claude Code and Codex are closed-source platforms. Joycraft can never feel truly "native" there. Pi's open-source, extensible architecture offers a path to deep integration that isn't possible on proprietary harnesses.

**For open-weight model users:** Claude Opus is expensive. Many developers want to run local or cheap cloud models. If Joycraft skills only work reliably on frontier models, that's a real adoption barrier.

## What "Done" Looks Like

1. **`npx joycraft init` detects Pi** and installs skills + a bootstrap script + the minimal extension to `.pi/`
2. **Skills work as-is** — all 12 Joycraft skills loadable via `/skill:joycraft-*` in Pi, with only `research` and `verify` adapted for Pi's session API instead of Claude sub-agents
3. **The pipeline is autonomous** — when a spec is implemented, the agent auto-runs session-end, captures discoveries, clears context, and loads the next spec without human intervention
4. **It's Pi-idiomatic** — bash scripts + READMEs for the tool belt, skills for instructions, a single minimal extension for session lifecycle
5. **Tested on open-weight models** — at minimum DeepSeek v4 and Kimi K2.6 pass the full pipeline; simplified skill variants exist if needed

## Constraints

- **Pi-idiomatic first.** Bash + READMEs for progressive disclosure. Extensions only when bash literally can't reach (session lifecycle).
- **No MCP.** Joycraft's Pi integration must not add MCP server dependencies.
- **Skills must remain valid Agent Skills standard** — they already are, just need verification in Pi context.
- **`npx joycraft init` should be the single entry point** — a user init's Joycraft and gets everything wired up for whatever agent they're using.
- **Open-weight model support is aspirational.** Don't pre-optimize for weaker models without data. Test first, then tune.

## Open Questions

- **Research and verify redesign.** How exactly to adapt the sub-agent-dependent skills? The session API answer (`ctx.newSession()` + `pi.sendUserMessage()`) is architecturally clean, but the skill instructions need rewriting. Does the approach degrade the quality of research/verification vs. Claude's sub-agent spawning?
- **Model reliability threshold.** At what point does a model become "too weak" for the skills? Should there be a `joycraft-tune` check that scores model capability and flags if it's below a threshold?
- **Spec queue format.** Should it be a JSON manifest, alphabetical order, or dependency-ordered from the decomposition table? The bash script approach means this is easy to change later.
- **Error recovery.** If the agent breaks mid-spec (bad implementation, test failure it can't fix), how does the pipeline recover? Pause and flag? Skip the spec? Fork a debugging session?
- **Skill adaptation for weaker models.** Should we pre-build simplified variants or let the agent generate them on-the-fly? Pi's self-extending philosophy suggests the latter, but we need a baseline.
- **`joycraft` as a pi package?** Could the whole thing ship as `pi install npm:joycraft` instead of `npx joycraft init`? Tradeoffs: simpler install but loses the CLI's stack detection and CLAUDE.md generation.
- **Codex support in Pi?** Joycraft currently supports both Claude Code and Codex. Pi can use OpenAI models. Does the Codex skill format (different invocation model) still matter in Pi, or do we just use the standard Agent Skills format?

## Execution Strategy

See `docs/specs/pi-support/README.md` for the full decomposition and dependency graph.

| # | Spec | Dependencies | Wave |
|---|------|-------------|------|
| 1 | `add-pi-skills` | — | 1 (parallel) |
| 2 | `add-spec-queue-manifest` | — | 1 (parallel) |
| 3 | `add-pi-pipeline-runtime` | 2 | 1 (parallel) |
| 4 | `wire-pi-init` | 1, 3 | 2 (after 1+3) |
| 5 | `wire-pi-upgrade` | 1, 4 | 3 (parallel) |
| 6 | `add-pi-tests` | 1, 4 | 3 (parallel) |

**Estimated:** 6 sessions (3 parallel slots → ~3 sequential execution slots).

---

## Out of Scope (for now)

- **Level 5 autofix loop / holdout scenarios.** The user explicitly wants to set Level 5 aside for now. Focus is Level 4++ autonomy.
- **Pi package distribution.** The `pi install npm:joycraft` question is open but not part of the initial implementation.
- **MCP bridge.** No MCP server that wraps Joycraft. Pi-idiomatic means bash + extensions.
- **Codex-on-Pi support.** For v1, focus on the Agent Skills format. Codex skill variants can follow.

## Raw Notes

### Architecture (from conversation)

```
Bash scripts (tool belt)
├── joycraft-spec-status    — reads spec queue, shows progress
├── joycraft-mark-done      — marks spec ✅ in manifest
├── joycraft-session-end    — captures discoveries, commits
└── joycraft-next-spec      — prints path to next uncompleted spec

Skills (instructions) — drop into .pi/skills/
├── All 12 joycraft skills  — standard Agent Skills format
└── Adapted research/verify — use session API instead of sub-agents

Extension (minimal glue) — ~40 lines
└── 1 tool: joycraft_next_spec
    Calls bash scripts → session-end → newSession → sendUserMessage
```

### Key Pi features leveraged

- **Skills auto-discovery:** `.pi/skills/` or `.agents/skills/` (both work)
- **Extensions API:** `ctx.newSession()`, `pi.sendUserMessage()`, `pi.registerTool()`
- **Session management:** session files as JSONL trees, branch/fork/navigate
- **Progressive disclosure:** bash scripts loaded via `read` on-demand (README pattern)
- **Self-extending:** the agent can write and improve its own tooling
- **Pi packages:** future distribution path (`pi install npm:joycraft`)

### Open-weight model context

- User is running DeepSeek v4 Pro on this conversation
- Keller Coders group ranked Kimi K2.6 as favorite, Qwen 3.5 next
- Key concern: do weaker models follow complex multi-step skill instructions reliably?
- Pi's lean system prompt (~300 words) may actually help — less context pollution
- Approach: test-first, benchmark the pipeline on each model, tune only where it breaks

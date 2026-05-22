# Role Separation & Subagent Launcher — Draft Brief

> **Date:** 2026-03-26
> **Status:** DRAFT (exploratory — not spec-ready)
> **Origin:** /joycraft-interview session (conversation with Praful Mathur, cofounder)

---

## The Idea

An agent writing code and orchestrating its own workflow simultaneously leads to context pollution, wasted tokens, and dangerous behavior (downloading SDKs, pinging random IPs, clearing tests). The fix: separate concerns into distinct roles, each with strict boundaries. Joycraft could help by defining role profiles and making it easy to launch the right subagent for the job.

## The Three Roles

### 1. Planner / Test Writer
- Designs the approach and writes tests
- Has access to specs, briefs, existing code (read-only), and test infrastructure
- Produces: failing test suite, execution plan, lockdown configuration
- Does NOT write implementation code

### 2. Code Implementer
- Locked down: writes code, runs tests, nothing else
- Cannot download packages, read logs, ping networks, flash devices
- Cannot edit tests (read-only)
- Interacts with the world only through code changes and test results
- "A widget person and nothing else"

### 3. Orchestrator
- Decides what happens next
- Routes work between roles
- Manages the spec queue
- Does NOT write code itself

Key insight from Praful: "If it's writing code and orchestrating, it gets context polluted."

## What Joycraft Could Do Today (Simple Version)

Using Claude Code's existing subagent/teammate feature:

- **`/joycraft-execute`** (or similar) spawns a locked-down coding subagent with:
  - Strict deny patterns (no network, no log reading, no package installs)
  - NEVER rules for test editing
  - Only allowed: write code in specified files, run specified test commands
  - Auto-runs smoke tests after each file change

- Role profiles defined in skills — the skill sets up the right CLAUDE.md-style constraints for each subagent

- Handoff protocol: planner's output (test suite + execution plan) becomes the implementer's input

This doesn't require SDK work or custom tooling — just smart use of subagent spawning with constrained instructions.

## The Bigger Vision (Requires Custom Tooling)

- Multiple persistent Claude instances with distinct roles
- A non-LLM orchestrator that routes work (LLMs should not orchestrate themselves)
- Spec queue that feeds work continuously ("level 5.5")
- Inspired by Karpathy's auto-research: fan out ideas, test in parallel, prune bad paths, combinatorial exploration

This likely lives in Pipit (command center for Claude Code) rather than Joycraft, since it requires:
- Claude Code SDK for spawning/managing instances
- A backend for orchestration logic
- Persistent state across sessions

## Where Things Live

| Capability | Home | Why |
|------------|------|-----|
| Test-first new feature flow | Joycraft | Skill + spec template enhancement |
| Lockdown mode for execution | Joycraft | CLAUDE.md boundaries + deny patterns |
| Subagent role launcher (simple) | Joycraft | Leverages existing teammate feature |
| Multi-instance orchestrator | Pipit | Requires SDK, backend, persistent state |
| Spec queue + continuous execution | Pipit | Requires runtime control beyond skills |
| Auto-research / exploration mode | Pipit | Long-running, needs instance management |

## Open Questions

- How much can subagent instructions actually constrain behavior? Can we deny network access? Package installs?
- Does Claude Code's teammate feature give us enough isolation, or do we need fully separate processes?
- Can a Joycraft skill effectively "launch" a constrained subagent, or does the user need to do it manually?
- What's the handoff format between planner and implementer? Just specs, or something more structured?
- How does the open-source model angle play in? Praful is convinced consistency matters more than capability for the implementer role — could the implementer be a local model?

## Raw Notes

- "Execution and everything else has to be different. Execution is like, you just have somebody writing code."
- "As soon as this thing starts talking to the logs, it'll start doing things like change the code, flash the firmware, talk to the logs, get the logs back, and then it just fills up the context really fast."
- "I only want the LLM to do one possible thing and the rest, like there's things like, okay, if I need to do an integration, an LLM doing an integration is very expensive, but Zapier is super cheap."
- "For 95% of the stuff I need to do right now, there are a bunch of scripts. They're just handful of scripts that do really basic stuff."
- Re: open source models — "Gemma's planning is insanely good and it runs beautifully on my computer... consistency is going to become more interesting"
- The missing link between Level 5 and full autonomy: "there needs to be some way of it figuring out the next thing to do"

# Why This Exists

> [Back to README](../../README.md)

Most developers using AI tools are at Level 2. They prompt, they iterate, they feel productive. But [METR's randomized control trial](https://metr.org/) found experienced developers using AI tools actually completed tasks **19% slower**, while *believing* they were 24% faster. The problem isn't the tools. It's the absence of structure around them.

The teams seeing transformative results ([StrongDM](https://factory.strongdm.ai/) shipping an entire product with 3 engineers, [Spotify Honk](https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/) merging 1,000 PRs every 10 days, Anthropic generating effectively 100% of their code with AI) all share the same pattern: **they don't prompt AI to write code. They write specs and let AI execute them.**

Joycraft packages that pattern into something anyone can install.

## The origin story

This project started as a personal exploration by [@maksutovic](https://github.com/maksutovic). I was working across multiple client projects, spending more time wrestling with prompts than building software. I knew Claude Code was capable of extraordinary work, but my *process* was holding it back. I was vibe coding - and vibe coding doesn't scale.

The spark was [Nate B Jones' video on the 5 Levels of Vibe Coding](https://www.youtube.com/watch?v=bDcgHzCBgmQ). It mapped out a progression I hadn't seen articulated before - from "spicy autocomplete" to fully autonomous development - and lit my brain up to the potential of what Claude Code could do with the right harness around it. Joycraft is the result of that exploration: a tool that encodes the patterns, boundaries, and workflows that make AI-assisted development actually deterministic.

StrongDM calls their Level 5 fully autonomous loop a "Dark Factory" - which, albeit a cool name, the world has so much darkness in it right now. I wanted a name that extolled more of what I believe tools like this can provide: joy and craftsmanship. Hence "Joycraft."

## The methodology

Joycraft's approach is synthesized from several sources:

**Spec-driven development.** Instead of prompting AI in conversation, you write structured specifications. Feature Briefs capture the *what* and *why*, then Atomic Specs break work into small, testable, independently executable units. Each spec is self-contained: an agent can pick it up without reading anything else. This follows [Addy Osmani's](https://addyosmani.com/blog/good-spec/) principles for AI-consumable specs and [GitHub's Spec Kit](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) 4-phase process (Specify → Plan → Tasks → Implement).

**Context isolation.** [Boris Cherny](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens) (Head of Claude Code at Anthropic) recommends: interview in one session, write the spec, then execute in a *fresh session* with clean context. [Dex Horthy](https://humanlayer.dev) at HumanLayer took this further: even *research* should be isolated from intent — the researching agent should never see the ticket, only objective questions derived from it. Joycraft's `/joycraft-research` → `/joycraft-design` → `/joycraft-decompose` pipeline enforces this at every stage: the interview captures intent, research gathers objective facts, design aligns human and agent on approach, and the execution session has only the spec.

**Behavioral boundaries.** CLAUDE.md isn't a suggestion box, it's a contract. Joycraft installs a three-tier boundary framework (Always / Ask First / Never) that prevents the most common AI development failures: overwriting user files, skipping tests, pushing without approval, hardcoding secrets. This is [Addy Osmani's](https://addyosmani.com/blog/good-spec/) "boundaries" principle made concrete.

**Test-first as the mechanism to autonomy.** Tests aren't a nice-to-have, they're the bridge between "agent writes code" and "agent writes *correct* code." Every spec includes a Test Plan mapping acceptance criteria to tests, and the agent must write failing tests before implementing. This follows the three laws of test harnesses discovered through real autonomous development, and aligns with [Anthropic's harness design research](https://www.anthropic.com/engineering/harness-design-long-running-apps) which found that agents reliably skip verification unless explicitly constrained.

**Separation of evaluation from implementation.** [Anthropic's research](https://www.anthropic.com/engineering/harness-design-long-running-apps) found that "agents reliably skew positive when grading their own work." Joycraft addresses this at two levels: `/joycraft-verify` spawns a separate subagent with clean context to independently verify against the spec, and Level 5's holdout scenarios provide external evaluation the implementation agent can never see.

**Knowledge capture over session notes.** Most session notes are never re-read. Joycraft's `/joycraft-session-end` skill captures only *discoveries*: assumptions that were wrong, APIs that behaved unexpectedly, decisions made during implementation that aren't in the spec. If nothing surprising happened, you capture nothing. This keeps the signal-to-noise ratio high.

**External holdout scenarios.** [StrongDM's Software Factory](https://factory.strongdm.ai/) proved that AI agents will [actively game visible test suites](https://palisaderesearch.org/blog/specification-gaming). Their solution: scenarios that live *outside* the codebase, invisible to the agent during development. Like a holdout set in ML, this prevents overfitting. Joycraft now implements this directly. `init-autofix` sets up the holdout wall, the scenario agent, and the GitHub App integration.

**The 5-level framework.** [Dan Shapiro's levels](https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/) give you a map. Level 2 (Junior Developer) is where most teams plateau. Level 3 (Developer as Manager) means your life is diffs. Level 4 (Developer as PM) means you write specs, not code. Level 5 (Dark Factory) means specs in, software out. Joycraft's `/joycraft-tune` assessment tells you where you are and what to do next.

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

**Context isolation.** [Boris Cherny](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens) (Head of Claude Code at Anthropic) recommends: interview in one session, write the spec, then execute in a *fresh session* with clean context. [Dex Horthy](https://humanlayer.dev) at HumanLayer took this further: even *research* should be isolated from intent — the researching agent should never see the ticket, only objective questions derived from it. Joycraft applies this at every stage: the interview captures intent in a brief, `joycraft-decompose` turns it into specs, each spec is built from the spec and its declared inputs, and the reviewer gets a fresh context.

**Behavioral boundaries and a context map.** `AGENTS.md` isn't a suggestion box, it's a contract. During setup, `joycraft-entry` reads the project, asks you what the repo cannot tell it, and writes a short context map: one row per project document, with when to read it. Your boundaries (Always / Ask First / Never) stay yours; Joycraft never replaces `AGENTS.md` or `CLAUDE.md`. This is [Addy Osmani's](https://addyosmani.com/blog/good-spec/) "boundaries" principle made concrete.

**Test-first as the mechanism to autonomy.** Tests aren't a nice-to-have, they're the bridge between "agent writes code" and "agent writes *correct* code." Every spec has acceptance criteria with stable IDs, and tests name the criterion they check (`[AC:<criterion-id>]`). `joycraft-testing` picks the evidence that can tell a correct change from a plausible fault. See [Test-first development](test-first-development.md). This follows the three laws of test harnesses discovered through real autonomous development, and aligns with [Anthropic's harness design research](https://www.anthropic.com/engineering/harness-design-long-running-apps) which found that agents reliably skip verification unless explicitly constrained.

**Separation of evaluation from implementation.** [Anthropic's research](https://www.anthropic.com/engineering/harness-design-long-running-apps) found that "agents reliably skew positive when grading their own work." Joycraft addresses this with `joycraft-verify`: a separate reviewer, with clean context, checks each spec. Only its accepted PASS completes the spec.

**Knowledge capture over session notes.** Most session notes are never re-read. `joycraft-session-end` records only facts a later session needs and cannot cheaply get from the code, each in the one home the context map names for it. A changed fact is rewritten in place, and the reason goes to the decision log. If nothing reusable happened, no context file changes.

**The 5-level framework.** [Dan Shapiro's levels](https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/) give you a map. Level 2 (Junior Developer) is where most teams plateau. Level 3 (Developer as Manager) means your life is diffs. Level 4 (Developer as PM) means you write specs, not code. Level 5 (Dark Factory) means specs in, software out. Joycraft aims to make you excellent at Levels 3 and 4. See [The levels](levels.md).

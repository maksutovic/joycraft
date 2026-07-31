# The Levels

> [Back to README](../../README.md)

## The core idea

- **The product:** Skills like `/joycraft-tune`, `/joycraft-new-feature`, and `/joycraft-interview` replace unstructured prompting with spec-driven development — you interview, you write specs, the agent executes — plus a harness (boundaries, context docs, skills) that gets better as you work.
- **The experimental frontier:** For teams with the budget and infrastructure to maintain it, the `/joycraft-implement-level5` skill sets up an autonomous loop with holdout scenario testing, and on Pi the workflow can run fully headless. Powerful, but genuinely expensive to run and maintain with current models — treat it as a north star, not the next step.

## What are the levels?

[Dan Shapiro's 5 Levels of Vibe Coding](https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/) provides the framework:

| Level | Name | What it looks like | Joycraft's role |
|-------|------|--------------------|-----------------|
| 1 | Autocomplete | Tab-complete suggestions | - |
| 2 | Junior Developer | Prompt → iterate → fix → repeat | `/joycraft-tune` assesses where you are |
| 3 | Developer as Manager | Your life is reviewing diffs | Behavioral boundaries in CLAUDE.md |
| 4 | Developer as PM | You write specs, agent writes code | `/joycraft-new-feature` + `/joycraft-decompose` |
| 5 | Software Factory | Specs in, validated software out | `/joycraft-implement-level5` (experimental) |

Most developers plateau at Level 2. Joycraft's job is to make you excellent at
Levels 3-4: spec-driven development with a well-maintained harness. Level 5 is
real — StrongDM proved it — but with current models it takes serious budget and
a team to maintain, so Joycraft treats it as an experimental north star rather
than the destination.

## Level 5: The Autonomous Loop (experimental)

Level 5 is where specs go in and validated software comes out — four GitHub Actions workflows, a separate scenarios repo, and two AI agents that can never see each other's work. It works, but budget for real token costs and ongoing scenario maintenance before committing to it. [Read the full guide →](level-5-autonomy.md)

## Why This Exists

Most developers using AI tools are at Level 2 — and [METR's research](https://metr.org/) found they're actually slower, not faster. Joycraft packages the patterns used by teams seeing transformative results into something anyone can install. [Read the full methodology →](methodology.md)

## Standing on the Shoulders of Giants

Joycraft synthesizes ideas and patterns from people doing extraordinary work in AI-assisted software development:

- **[Dan Shapiro](https://x.com/danshapiro)** for the [5 Levels of Vibe Coding](https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/) framework that Joycraft's assessment and level system is built on
- **[StrongDM](https://www.strongdm.com/)** / **[Justin McCarthy](https://x.com/BuiltByJustin)** for the [Software Factory](https://factory.strongdm.ai/): spec-driven autonomous development, NLSpec, external holdout scenarios, and the proof that 3 engineers can outproduce 30
- **[Dex Horthy](https://x.com/dexhorthy)** / **[HumanLayer](https://humanlayer.dev)** for the [RPI to CRISPY evolution](https://humanlayer.dev/blog): research isolation (hide the ticket from the researcher), the instruction budget concept (~150-200 instructions max), design discussions as high-leverage checkpoints, vertical-over-horizontal planning, and the conviction that "if your tool requires magic words, go fix the tool"
- **[Boris Cherny](https://x.com/bcherny)**, Head of Claude Code at Anthropic, for the interview → spec → fresh session → execute pattern and the insight that [context isolation produces better results](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens)
- **[Addy Osmani](https://x.com/addyosmani)** for [What makes a good spec for AI](https://addyosmani.com/blog/good-spec/): commands, testing, project structure, code style, git workflow, and boundaries
- **[METR](https://metr.org/)** for the [randomized control trial](https://metr.org/) that proved unstructured AI use makes experienced developers slower, validating the need for harnesses
- **[Nate B Jones](https://x.com/natebjones)** whose [video on the 5 Levels of Vibe Coding](https://www.youtube.com/watch?v=bDcgHzCBgmQ) made this research accessible and inspired turning Joycraft into a tool anyone can use
- **[Simon Willison](https://x.com/simonw)** for his [analysis of the Software Factory](https://simonwillison.net/2026/Feb/7/software-factory/) that helped contextualize StrongDM's approach for the broader community
- **[Anthropic](https://www.anthropic.com/)** for Claude Code's skills, hooks, and CLAUDE.md system that makes tool-native AI development possible, and the [harness patterns for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

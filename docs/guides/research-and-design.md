# Research Isolation & Design Checkpoints

> [Back to README](../../README.md)

These two skills were inspired by [Dex Horthy](https://x.com/dexhorthy)'s work at [HumanLayer](https://humanlayer.dev) on what went wrong with the Research-Plan-Implement (RPI) methodology and the evolution to [CRISPY](https://humanlayer.dev/blog) (Context, Research, Investigate, Structure, Plan, Yield).

## The problem with "research the codebase"

When you tell an agent "research how endpoints work — I'm going to build a new one," the research comes back contaminated with opinions about how to build the new endpoint. Good research is pure facts. The moment the researcher knows the intent, it editorializes.

**`/joycraft-research`** fixes this with context isolation: one context window generates research questions from the brief, then a separate subagent researches the codebase using *only those questions* — it never sees the brief. The output is a research document in `docs/research/` that contains file paths, function signatures, data flows, and patterns. No recommendations. No opinions. Just compressed truth.

This is the same "query planning" technique Dex describes: separate the intent from the investigation, like a database separates query planning from execution.

## The 200-line checkpoint

HumanLayer found that engineers were reviewing 1,000-line plans — which is the same effort as reviewing 1,000 lines of code, and the plans often diverged from what was actually implemented. The leverage was terrible.

**`/joycraft-design`** produces a ~200-line design discussion artifact instead. It contains five sections: current state, desired end state, patterns to follow, resolved design decisions, and open questions with concrete options. This is where you catch "that's not how we do atomic SQL updates — go find the pattern in `/services/billing`" *before* 2,000 lines of code follow the wrong pattern.

[Matt Pocock](https://x.com/mattpocockuk) calls this the "design concept" — the shared understanding between you and the agent that exists separately from the code. Joycraft materializes it as a markdown document and forces a human checkpoint: the skill will not proceed to decomposition until you've reviewed and approved.

Both steps are optional. You can skip straight from brief to decompose for simple features. But for anything complex enough to get wrong, the 15 minutes of human review on a 200-line document saves hours of rework on code that followed the wrong patterns.

## Instruction budget discipline

Every Joycraft skill now includes an `instructions` count in its frontmatter. No skill exceeds 40 instructions. This is based on [research](https://arxiv.org/pdf/2507.11538) showing that frontier LLMs can reliably follow ~150-200 instructions — but your skill shares that budget with the system prompt, CLAUDE.md, tools, and MCP servers. A skill with 85 instructions (as Joycraft's `/joycraft-tune` had before this refactor) is competing for attention with everything else in the context window. Smaller, focused skills with clear handoffs produce more reliable results than monolithic mega-prompts.

## What a good spec looks like

An atomic spec produced by `/joycraft-decompose` has:

- **What:** One paragraph. A developer with zero context understands the change in 15 seconds.
- **Why:** One sentence. What breaks or is missing without this?
- **Acceptance criteria:** Checkboxes. Testable. No ambiguity.
- **Affected files:** Exact paths, what changes in each.
- **Edge cases:** Table of scenarios and expected behavior.

The agent doesn't guess. It reads the spec and executes. If something's unclear, the spec is wrong. Fix the spec, not the conversation.

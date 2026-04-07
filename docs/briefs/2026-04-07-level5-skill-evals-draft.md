# Level 5 for Joycraft + Skill Invocation Evals — Draft Brief

> **Date:** 2026-04-07
> **Status:** DRAFT
> **Origin:** /joycraft-interview session

---

## The Idea

Joycraft teaches projects to reach Level 5 autonomous development, but Joycraft itself hasn't gone through the `/joycraft-implement-level5` setup. There's no scenario repo, no GitHub Actions autofix loop, no holdout validation. The project that sells autonomy doesn't have autonomy.

The catalyst was a conversation with Atharva Vaidya (Tolan) about skill invocation reliability. Atharva's team — well-funded, talented engineers, beautifully handwritten skills — found that their skills "never get fucking invoked" without explicit `/slash` commands. They built evals to catch this: give Claude a natural language prompt, assert it invokes the right skill. They also built analytics (PostHog events on every skill invocation, correlated with commits). Even Praful confirmed: "They will say something works but it'll stop working randomly."

The insight: Joycraft's Level 5 scenario testing agent is exactly the eval system Atharva built manually. The scenarios repo should contain skill invocation evals as its primary test type — spawn a real Claude Code instance with Joycraft installed, give it natural language prompts, and verify the correct skills fire.

This is especially critical because the sole developer (Max) knows all the "magic words" to invoke skills organically. There's zero observability into whether skills work for anyone else, or whether changes (like the recent `/clear` nudge PR) actually function in practice. Unit tests validate logic but cannot validate that Claude Code picks up and runs a skill correctly in a real session.

## Problem

1. **No Level 5 infrastructure.** Joycraft has no scenario repo, no autofix loop, no holdout validation — the things it teaches other projects to set up.
2. **No skill invocation testing.** No way to verify that natural language prompts trigger the correct skills. The only tester is the creator, who already knows the exact words.
3. **No regression detection.** When a skill's wording changes, there's no automated check that it still gets invoked by the same prompts.
4. **Dogfooding gap.** Joycraft can't credibly teach Level 5 if it doesn't run Level 5 itself.

## What "Done" Looks Like

- `joycraft-scenarios` private repo exists with holdout tests
- GitHub Actions autofix loop is live (up to 3 retries on CI failure)
- Holdout validation runs against PRs and posts results as comments
- **Skill invocation eval scenarios exist** for every Joycraft skill:
  - Natural language prompt → assert correct skill invoked
  - Workflow handoff prompts → assert correct next skill suggested
  - Edge cases: ambiguous prompts, prompts that sound like one skill but should be another
- Scenario generation triggers when new specs are pushed to `docs/specs/`
- CLAUDE.md updated with holdout wall (coding agent cannot see scenarios)

## Constraints

- Must use the existing `/joycraft-implement-level5` skill flow — don't reinvent
- Scenarios must spawn real Claude Code instances (not mock/simulate)
- Costs API calls — acceptable, but scenarios should be efficient (minimal tokens per eval)
- GitHub App required for autofix identity (anti-recursion protection)
- Scenario repo must be private — holdout wall is the core guarantee

## Open Questions

- What's the right set of natural language prompts per skill? Need to cover: obvious triggers, near-misses, ambiguous cases
- How do we parse Claude Code output to detect which skill was invoked? (Tool call logs? Output patterns?)
- Should scenarios test against a minimal fixture project or a copy of Joycraft itself?
- How long does a single skill invocation eval take? (Spawn CC + one prompt + assert) — this drives CI time and cost
- Should we test both explicit `/slash` invocation AND organic natural language invocation?
- How do we handle nondeterminism? Run each scenario N times and check pass rate > threshold?

## Out of Scope (for now)

- **Skill analytics/telemetry** — PostHog-style tracking of skill invocations in the wild. Separate brief. Likely not feasible for an OSS project (network calls to third-party services are inappropriate for open-source tools).
- **Skill invocation evals as a Joycraft feature for users** — right now this is just for Joycraft itself. Could become a feature later.
- **Multi-model testing** — testing skill invocation across different Claude models (Sonnet vs Opus). Future phase.

## Raw Notes

### Atharva/Tolan Conversation Key Takeaways
- Tolan has a "shepherd agent" that auto-fixes PR errors and addresses review comments. "Shepherd this PR" = 100% invocation rate because it's very specific words.
- Atharva: "very specific words are good for skill invocation" — generic descriptions fail
- Their eval format: `Prompt: "make a ui component for feature X,Y,Z" → Test: Does it invoke the UI principles skill?`
- They also do analytics: PostHog event on every skill invocation, correlate with commit count to understand usage
- Praful: "I can only get the skill when I tell it explicitly" / "They will say something works but it'll stop working randomly"
- Max's experience differs — Joycraft skills have been "very good about evocation" in daily use — but acknowledges sample size of 1 is not sufficient

### Scenario Types to Consider
1. **Direct invocation** — `/joycraft-bugfix` should always work
2. **Natural language invocation** — "I have a bug" should invoke bugfix skill
3. **Workflow handoff** — after interview, does it suggest research/design for complex features?
4. **Anti-patterns** — prompts that sound like one skill but should be another (or none)
5. **Post-change regression** — after editing a skill, do the same prompts still work?

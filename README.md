# Joycraft

<p align="center">
  <img src="docs/joycraft-banner.png" alt="Joycraft — the craft of AI development" width="700" />
</p>

> The craft of AI development — with joy, not darkness.

## What is Joycraft?

Joycraft is a CLI tool and [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin that upgrades your AI development workflow. It installs skills, behavioral boundaries, templates, and documentation structure into any project — taking you from unstructured prompting to autonomous spec-driven development.

If you've been using Claude Code (or any AI coding tool) and your workflow looks like this:

> Prompt → wait → read output → "no, not that" → re-prompt → fix hallucination → re-prompt → manually fix → "ok close enough" → commit

...then Joycraft is for you.

This project started as a personal exploration by [@maksutovic](https://github.com/maksutovic). I was working across multiple client projects, spending more time wrestling with prompts than building software. I knew Claude Code was capable of extraordinary work, but my *process* was holding it back. I was vibe coding — and vibe coding doesn't scale.

The spark was [Nate B Jones' video on the 5 Levels of Vibe Coding](https://www.youtube.com/watch?v=bDcgHzCBgmQ). It mapped out a progression I hadn't seen articulated before — from "spicy autocomplete" to fully autonomous development — and lit my brain up to the potential of what Claude Code could do with the right harness around it. Joycraft is the result of that exploration: a tool that encodes the patterns, boundaries, and workflows that make AI-assisted development actually deterministic.

### The core idea

Joycraft is simple. It's a set of **skills** (slash commands for Claude Code) and **instructions** (CLAUDE.md boundaries) that guide you and your agent through a structured development process:

- **Levels 1-4:** Skills like `/joycraft-tune`, `/joycraft-new-feature`, and `/joycraft-interview` replace unstructured prompting with spec-driven development. You interview, you write specs, the agent executes. No back-and-forth.
- **Level 5:** The `/joycraft-implement-level5` skill sets up the autonomous loop — where specs go in and validated software comes out, with holdout scenario testing that prevents the agent from gaming its own tests.

The name is a deliberate counter-narrative to "dark factory." Autonomous software development should bring craft and joy to engineering, not darkness.

### What are the levels?

[Dan Shapiro's 5 Levels of Vibe Coding](https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/) provides the framework:

| Level | Name | What it looks like | Joycraft's role |
|-------|------|--------------------|-----------------|
| 1 | Autocomplete | Tab-complete suggestions | — |
| 2 | Junior Developer | Prompt → iterate → fix → repeat | `/joycraft-tune` assesses where you are |
| 3 | Developer as Manager | Your life is reviewing diffs | Behavioral boundaries in CLAUDE.md |
| 4 | Developer as PM | You write specs, agent writes code | `/joycraft-new-feature` + `/joycraft-decompose` |
| 5 | Software Factory | Specs in, validated software out | `/joycraft-implement-level5` sets up the autonomous loop |

Most developers plateau at Level 2. Joycraft's job is to move you up.

### Platform support

Joycraft is currently focused on making the Claude Code experience state-of-the-art. Better [Codex](https://openai.com/codex) support is coming — `AGENTS.md` generation is already included, and deeper integration is on the roadmap.

## Quick Start

```bash
npx joycraft init
```

That's it. Joycraft auto-detects your tech stack and creates:

- **CLAUDE.md** with behavioral boundaries (Always / Ask First / Never) and correct build/test/lint commands
- **AGENTS.md** for Codex compatibility
- **Claude Code skills** installed to `.claude/skills/`:
  - `/joycraft-tune` — Assess your harness, apply upgrades, see your path to Level 5
  - `/joycraft-new-feature` — Interview → Feature Brief → Atomic Specs
  - `/joycraft-interview` — Lightweight brainstorm — yap about ideas, get a structured summary
  - `/joycraft-decompose` — Break a brief into small, testable specs
  - `/joycraft-session-end` — Capture discoveries, verify, commit
  - `/joycraft-implement-level5` — Set up Level 5: autofix loop, holdout scenarios, scenario evolution
- **docs/** structure — `briefs/`, `specs/`, `discoveries/`, `contracts/`, `decisions/`
- **Templates** — Atomic spec, feature brief, implementation plan, boundary framework, and workflow templates for scenario generation and autofix loops

Once you reach Level 4, you can set up the autonomous loop with `/joycraft-implement-level5`. See [Level 5: The Autonomous Loop](#level-5-the-autonomous-loop) below.

### Supported Stacks

Node.js (npm/pnpm/yarn/bun), Python (poetry/pip/uv), Rust, Go, Swift, and generic (Makefile/Dockerfile).

Frameworks auto-detected: Next.js, FastAPI, Django, Flask, Actix, Axum, Express, Remix, and more.

## The Workflow

After init, open Claude Code and use the installed skills:

```
/joycraft-tune                  # Assess your harness, apply upgrades, see path to Level 5
/joycraft-interview             # Brainstorm freely — yap about ideas, get a structured summary
/joycraft-new-feature           # Interview → Feature Brief → Atomic Specs → ready to execute
/joycraft-decompose             # Break any feature into small, independent specs
/joycraft-session-end           # Wrap up — discoveries, verification, commit
/joycraft-implement-level5     # Set up Level 5 — autofix, holdout scenarios, evolution
```

The core loop:

```
Interview → Spec → Fresh Session → Execute → Discoveries → Ship
```

## The Interview: Why It Matters

The single biggest upgrade Joycraft makes to your workflow is replacing the prompt-iterate-fix cycle with a **structured interview**.

Here's the problem with how most of us use AI coding tools: we open a session and start typing. "Build me a notification system." The agent starts writing code immediately. It makes assumptions about your data model, your UI framework, your error handling strategy, your deployment target. You catch some of these mid-flight, correct them, the agent adjusts, introduces new assumptions. Three hours later you have something that *kind of* works but is built on a foundation of guesses.

Joycraft flips this. Before the agent writes a single line of code, you have a conversation about *what you're building and why*.

### Two interview modes

**`/joycraft-interview`** — The lightweight brainstorm. You yap about an idea, the agent asks clarifying questions, and you get a structured summary saved to `docs/briefs/`. Good for early-stage thinking when you're not ready to commit to building anything yet. No pressure, no specs — just organized thought.

**`/joycraft-new-feature`** — The full workflow. This is the structured interview that produces a **Feature Brief** (the what and why) and then decomposes it into **Atomic Specs** (small, testable, independently executable units of work). Each spec is self-contained — an agent in a fresh session can pick it up and execute without reading anything else.

### Why this works

The insight comes from [Boris Cherny](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens) (Head of Claude Code at Anthropic): interview in one session, write the spec, then execute in a *fresh session* with clean context. The interview captures your intent. The spec is the contract. The execution session has only the spec — no baggage from the conversation, no accumulated misunderstandings, no context window full of abandoned approaches.

This is what separates Level 2 (back-and-forth prompting) from Level 4 (spec-driven development). You stop being a typist correcting an agent's guesses and start being a PM defining what needs to be built.

```mermaid
flowchart LR
    A["/joycraft-interview<br/>(brainstorm)"] --> B["Draft Brief<br/>docs/briefs/"]
    B --> C["/joycraft-new-feature<br/>(structured interview)"]
    C --> D["Feature Brief<br/>(what & why)"]
    D --> E["/joycraft-decompose"]
    E --> F["Atomic Specs<br/>docs/specs/"]
    F --> G["Fresh Session<br/>Execute each spec"]
    G --> H["/joycraft-session-end<br/>(discoveries + commit)"]

    style A fill:#e8f4fd,stroke:#369
    style C fill:#e8f4fd,stroke:#369
    style F fill:#cfc,stroke:#393
    style G fill:#ffd,stroke:#993
```

### What a good spec looks like

An atomic spec produced by `/joycraft-decompose` has:

- **What** — One paragraph. A developer with zero context understands the change in 15 seconds.
- **Why** — One sentence. What breaks or is missing without this?
- **Acceptance criteria** — Checkboxes. Testable. No ambiguity.
- **Affected files** — Exact paths, what changes in each.
- **Edge cases** — Table of scenarios and expected behavior.

The agent doesn't guess. It reads the spec and executes. If something's unclear, the spec is wrong — fix the spec, not the conversation.

## Upgrade

When Joycraft templates and skills evolve, update without losing your customizations:

```bash
npx joycraft upgrade
```

Joycraft tracks what it installed vs. what you've customized. Unmodified files update automatically. Customized files show a diff and ask before overwriting. Use `--yes` for CI.

## Level 5: The Autonomous Loop

Level 5 is where specs go in and validated software comes out. Joycraft implements this as four interlocking GitHub Actions workflows, a separate scenarios repository, and two independent AI agents that can never see each other's work.

Run `/joycraft-implement-level5` in Claude Code for a guided setup, or use the CLI directly:

```bash
npx joycraft init-autofix --scenarios-repo my-project-scenarios --app-id 3180156
```

### Architecture Overview

Level 5 has four moving parts. Each is a GitHub Actions workflow that communicates via `repository_dispatch` events — no custom servers, no webhooks, no external services.

```mermaid
graph TB
    subgraph "Main Repository"
        A[Push specs to docs/specs/] -->|push to main| B[Spec Dispatch Workflow]
        C[PR opened] --> D[CI runs]
        D -->|CI fails| E[Autofix Workflow]
        D -->|CI passes| F[Scenarios Dispatch Workflow]
        G[Scenarios Re-run Workflow]
    end

    subgraph "Scenarios Repository (private)"
        H[Scenario Generation Workflow]
        I[Scenario Run Workflow]
        J[Holdout Tests]
        K[Specs Mirror]
    end

    B -->|repository_dispatch: spec-pushed| H
    H -->|reads specs, writes tests| J
    H -->|repository_dispatch: scenarios-updated| G
    G -->|repository_dispatch: run-scenarios| I
    F -->|repository_dispatch: run-scenarios| I
    I -->|posts PASS/FAIL comment| C
    E -->|Claude fixes code, pushes| D

    style J fill:#f9f,stroke:#333
    style K fill:#bbf,stroke:#333
```

### The Four Workflows

#### 1. Autofix Workflow (`autofix.yml`)

Triggered when CI **fails** on a PR. Claude Code CLI reads the failure logs and attempts a fix.

```mermaid
sequenceDiagram
    participant CI as CI Workflow
    participant AF as Autofix Workflow
    participant Claude as Claude Code CLI
    participant PR as Pull Request

    CI->>AF: workflow_run (conclusion: failure)
    AF->>AF: Generate GitHub App token
    AF->>AF: Checkout PR branch
    AF->>AF: Count previous autofix attempts

    alt attempts >= 3
        AF->>PR: Comment: "Human review needed"
    else attempts < 3
        AF->>AF: Fetch CI failure logs
        AF->>AF: Strip ANSI codes
        AF->>Claude: claude -p "Fix this CI failure..." <br/> --dangerously-skip-permissions --max-turns 20
        Claude->>Claude: Read logs, edit code, run tests
        Claude->>AF: Exit (changes committed locally)
        AF->>PR: Push fix (commit prefix: "autofix:")
        AF->>PR: Comment: summary of fix
        Note over CI,PR: CI re-runs automatically on push
    end
```

**Key details:**
- Uses a GitHub App identity for pushes — avoids GitHub's anti-recursion protection
- Concurrency group per PR — only one autofix runs at a time per PR
- Max 3 iterations — posts "human review needed" if it can't fix it
- No `--model` flag — Claude CLI handles model selection
- Strips ANSI escape codes from logs so Claude gets clean text

#### 2. Scenarios Dispatch Workflow (`scenarios-dispatch.yml`)

Triggered when CI **passes** on a PR. Fires a `repository_dispatch` to the scenarios repo to run holdout tests against the PR branch.

```mermaid
sequenceDiagram
    participant CI as CI Workflow
    participant SD as Scenarios Dispatch
    participant SR as Scenarios Repo

    CI->>SD: workflow_run (conclusion: success, PR)
    SD->>SD: Generate GitHub App token
    SD->>SR: repository_dispatch: run-scenarios<br/>payload: {pr_number, branch, sha, repo}
```

#### 3. Spec Dispatch Workflow (`spec-dispatch.yml`)

Triggered when spec files are pushed to `main`. Sends the spec content to the scenarios repo so the scenario agent can write tests.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Main as Main Repo (push to main)
    participant SPD as Spec Dispatch Workflow
    participant SR as Scenarios Repo

    Dev->>Main: Push specs to docs/specs/
    Main->>SPD: push event (docs/specs/** changed)
    SPD->>SPD: git diff --diff-filter=AM (added/modified only)

    loop For each changed spec
        SPD->>SR: repository_dispatch: spec-pushed<br/>payload: {spec_filename, spec_content, commit_sha, branch, repo}
    end

    Note over SPD: Deleted specs are ignored —<br/>existing scenario tests remain
```

#### 4. Scenarios Re-run Workflow (`scenarios-rerun.yml`)

Triggered when the scenarios repo updates its tests. Re-dispatches all open PRs to the scenarios repo so they get tested with the latest holdout tests.

```mermaid
sequenceDiagram
    participant SR as Scenarios Repo
    participant RR as Re-run Workflow
    participant SRun as Scenarios Run

    SR->>RR: repository_dispatch: scenarios-updated
    RR->>RR: List open PRs via GitHub API

    alt No open PRs
        RR->>RR: Exit (no-op)
    else Has open PRs
        loop For each open PR
            RR->>SRun: repository_dispatch: run-scenarios<br/>payload: {pr_number, branch, sha, repo}
        end
    end
```

**Why this exists:** There's a race condition. The implementation agent might open a PR before the scenario agent finishes writing new tests. The re-run workflow handles this — when new tests land, all open PRs get re-tested. Worst case: a PR merges before the re-run, and the new tests protect the very next PR. You're never more than one cycle behind.

### The Holdout Wall

The core safety mechanism. Two agents, two repos, one shared interface (specs):

```mermaid
graph LR
    subgraph "Implementation Agent (main repo)"
        IA_sees["Can see:<br/>Source code<br/>Internal tests<br/>Specs"]
        IA_cant["Cannot see:<br/>Scenario tests<br/>Scenario repo"]
    end

    subgraph "Specs (shared interface)"
        Specs["docs/specs/*.md<br/>Describes WHAT should happen<br/>Never describes HOW it's tested"]
    end

    subgraph "Scenario Agent (scenarios repo)"
        SA_sees["Can see:<br/>Specs (via dispatch)<br/>Scenario tests<br/>Specs mirror"]
        SA_cant["Cannot see:<br/>Source code<br/>Internal tests"]
    end

    IA_sees --> Specs
    Specs --> SA_sees

    style IA_cant fill:#fcc,stroke:#933
    style SA_cant fill:#fcc,stroke:#933
    style Specs fill:#cfc,stroke:#393
```

This is the same principle as a holdout set in machine learning. If the implementation agent could see the scenario tests, it would optimize to pass them specifically — not to build correct software. By keeping the wall intact, scenario tests catch real behavioral regressions, not test-gaming.

### Scenario Evolution

Scenarios aren't static. When you push new specs, the scenario agent automatically triages them and writes new holdout tests.

```mermaid
flowchart TD
    A[New spec pushed to main] --> B[Spec Dispatch sends to scenarios repo]
    B --> C[Scenario Agent reads spec]
    C --> D{Triage: is this user-facing?}

    D -->|Internal refactor, CI, dev tooling| E[Skip — commit note: 'No scenario changes needed']
    D -->|New user-facing behavior| F[Write new scenario test file]
    D -->|Modified existing behavior| G[Update existing scenario tests]

    F --> H[Commit to scenarios main]
    G --> H
    H --> I[Dispatch scenarios-updated to main repo]
    I --> J[Re-run workflow tests open PRs with new scenarios]

    style D fill:#ffd,stroke:#993
    style E fill:#ddd,stroke:#999
    style F fill:#cfc,stroke:#393
    style G fill:#cfc,stroke:#393
```

**The scenario agent's prompt instructs it to:**
- Act as a QA engineer, never a developer
- Write only behavioral tests (invoke the built artifact, assert on output)
- Never import source code or reference internal implementation
- Use a triage decision tree: SKIP / NEW / UPDATE
- Err on the side of writing a test if the spec is ambiguous

**The specs mirror:** The scenarios repo maintains a `specs/` folder that mirrors every spec it receives. This gives the scenario agent historical context ("what features already exist?") without access to the main repo's codebase.

### The Complete Loop

Here's the full lifecycle from spec to shipped, validated code:

```mermaid
sequenceDiagram
    participant Human as Human (writes specs)
    participant Main as Main Repo
    participant ScAgent as Scenario Agent
    participant ScRepo as Scenarios Repo
    participant ImplAgent as Implementation Agent
    participant Autofix as Autofix Workflow

    Human->>Main: Push spec to docs/specs/
    Main->>ScAgent: spec-pushed dispatch

    par Scenario Generation
        ScAgent->>ScAgent: Triage spec
        ScAgent->>ScRepo: Write/update holdout tests
        ScRepo->>Main: scenarios-updated dispatch
    and Implementation
        Human->>ImplAgent: Execute spec (fresh session)
        ImplAgent->>Main: Open PR
    end

    Main->>Main: CI runs on PR

    alt CI fails
        Main->>Autofix: Autofix workflow triggers
        Autofix->>Main: Push fix, CI re-runs
    end

    alt CI passes
        Main->>ScRepo: run-scenarios dispatch
        ScRepo->>ScRepo: Clone PR branch, build, run holdout tests
        ScRepo->>Main: Post PASS/FAIL comment on PR
    end

    alt Scenarios PASS
        Note over Human,Main: Ready for human review and merge
    else Scenarios FAIL
        Main->>Autofix: Autofix attempts fix
        Note over Autofix,ScRepo: Loop continues (max 3 iterations)
    end
```

### What Gets Installed

| Where | File | Purpose |
|-------|------|---------|
| Main repo | `.github/workflows/autofix.yml` | CI failure → Claude fix → push |
| Main repo | `.github/workflows/scenarios-dispatch.yml` | CI pass → trigger holdout tests |
| Main repo | `.github/workflows/spec-dispatch.yml` | Spec push → trigger scenario generation |
| Main repo | `.github/workflows/scenarios-rerun.yml` | New tests → re-test open PRs |
| Scenarios repo | `workflows/run.yml` | Clone PR, build, run tests, post results |
| Scenarios repo | `workflows/generate.yml` | Receive spec, run scenario agent |
| Scenarios repo | `prompts/scenario-agent.md` | Scenario agent prompt template |
| Scenarios repo | `example-scenario.test.ts` | Example holdout test |
| Scenarios repo | `package.json` | Minimal vitest setup |
| Scenarios repo | `README.md` | Explains holdout pattern to contributors |

### Prerequisites

- **GitHub App** — Provides a separate identity for autofix pushes (avoids GitHub's anti-recursion protection). You can install the shared [Joycraft Autofix](https://github.com/apps/joycraft-autofix) app (App ID: `3180156`) or create your own.
- **Secrets** — `JOYCRAFT_APP_PRIVATE_KEY` and `ANTHROPIC_API_KEY` on both the main and scenarios repos.
- **Scenarios repo** — A private repository where holdout tests live. Created during setup.

### Cost

Validated in the Pipit trial (~3 minutes, one iteration, zero human intervention). With Claude Sonnet + `--max-turns 20` + max 3 iterations per PR:
- **Autofix:** ~$0.50 per attempt, worst case ~$1.50 per PR (3 iterations)
- **Scenario generation:** ~$0.20 per spec dispatch
- **Solo dev with ~10 PRs/month:** ~$5-10/month for the full loop

The iteration guard and max-turns cap prevent runaway costs.

## Git Autonomy

When `/joycraft-tune` runs for the first time, it asks one question: **how autonomous should git be?**

- **Cautious** (default) — commits freely, asks before pushing or opening PRs. Good for learning the workflow.
- **Autonomous** — commits, pushes to feature branches, and opens PRs without asking. Good for spec-driven development where you want full send.

Either way, Joycraft generates explicit git boundaries in your CLAUDE.md: commit message format (`verb: message`), specific file staging (no `git add -A`), no secrets in commits, no force-pushing.

## How It Works with AI Agents

**Claude Code** reads `CLAUDE.md` automatically and discovers skills in `.claude/skills/`. The behavioral boundaries guide every action. The skills provide structured workflows accessible via `/slash-commands`.

**Codex** reads `AGENTS.md` — same boundaries and commands in a concise format optimized for smaller context windows.

Both agents get the same guardrails and the same development workflow. Joycraft doesn't write your project code — it builds the *system* that makes AI-assisted development reliable.

### Team Sharing

Skills live in `.claude/skills/` which is **not** gitignored by default. Commit it so your whole team gets the workflow:

```bash
git add .claude/skills/ docs/
git commit -m "add: Joycraft harness"
```

Joycraft also installs a session-start hook that checks for updates — if your templates are outdated, you'll see a one-line nudge when Claude Code starts.

## Why This Exists

Most developers using AI tools are at Level 2 — they prompt, they iterate, they feel productive. But [METR's randomized control trial](https://metr.org/) found experienced developers using AI tools actually completed tasks **19% slower**, while *believing* they were 24% faster. The problem isn't the tools. It's the absence of structure around them.

The teams seeing transformative results — [StrongDM](https://factory.strongdm.ai/) shipping an entire product with 3 engineers, [Spotify Honk](https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/) merging 1,000 PRs every 10 days, Anthropic generating effectively 100% of their code with AI — all share the same pattern: **they don't prompt AI to write code. They write specs and let AI execute them.**

Joycraft packages that pattern into something anyone can install.

### The methodology

Joycraft's approach is synthesized from several sources:

**Spec-driven development.** Instead of prompting AI in conversation, you write structured specifications — Feature Briefs that capture the *what* and *why*, then Atomic Specs that break work into small, testable, independently executable units. Each spec is self-contained: an agent can pick it up without reading anything else. This follows [Addy Osmani's](https://addyosmani.com/blog/good-spec/) principles for AI-consumable specs and [GitHub's Spec Kit](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) 4-phase process (Specify → Plan → Tasks → Implement).

**Context isolation.** [Boris Cherny](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens) (Head of Claude Code at Anthropic) recommends: interview in one session, write the spec, then execute in a *fresh session* with clean context. Joycraft's `/joycraft-new-feature` → `/joycraft-decompose` → execute workflow enforces this naturally. The interview session captures intent; the execution session has only the spec.

**Behavioral boundaries.** CLAUDE.md isn't a suggestion box — it's a contract. Joycraft installs a three-tier boundary framework (Always / Ask First / Never) that prevents the most common AI development failures: overwriting user files, skipping tests, pushing without approval, hardcoding secrets. This is [Addy Osmani's](https://addyosmani.com/blog/good-spec/) "boundaries" principle made concrete.

**Knowledge capture over session notes.** Most session notes are never re-read. Joycraft's `/joycraft-session-end` skill captures only *discoveries* — assumptions that were wrong, APIs that behaved unexpectedly, decisions made during implementation that aren't in the spec. If nothing surprising happened, you capture nothing. This keeps the signal-to-noise ratio high.

**External holdout scenarios.** [StrongDM's Software Factory](https://factory.strongdm.ai/) proved that AI agents will [actively game visible test suites](https://palisaderesearch.org/blog/specification-gaming). Their solution: scenarios that live *outside* the codebase, invisible to the agent during development. Like a holdout set in ML, this prevents overfitting. Joycraft now implements this directly — `init-autofix` sets up the holdout wall, the scenario agent, and the GitHub App integration, not just provides templates for it.

**The 5-level framework.** [Dan Shapiro's levels](https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/) give you a map. Level 2 (Junior Developer) is where most teams plateau. Level 3 (Developer as Manager) means your life is diffs. Level 4 (Developer as PM) means you write specs, not code. Level 5 (Dark Factory) means specs in, software out. Joycraft's `/joycraft-tune` assessment tells you where you are and what to do next.

## Standing on the Shoulders of Giants

Joycraft synthesizes ideas and patterns from people doing extraordinary work in AI-assisted software development:

- **[Dan Shapiro](https://www.danshapiro.com/)** ([@danshapiro](https://github.com/danshapiro)) — The [5 Levels of Vibe Coding](https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/) framework that Joycraft's assessment and level system is built on
- **[StrongDM](https://www.strongdm.com/)** / **Justin McCarthy** ([@justinmccarthy](https://github.com/justinmccarthy)) — The [Software Factory](https://factory.strongdm.ai/): spec-driven autonomous development, NLSpec, external holdout scenarios, and the proof that 3 engineers can outproduce 30
- **[Boris Cherny](https://performancejs.com/)** ([@bcherny](https://github.com/bcherny)) — Head of Claude Code at Anthropic. The interview → spec → fresh session → execute pattern, and the insight that [context isolation produces better results](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens)
- **[Addy Osmani](https://addyosmani.com/)** ([@addyosmani](https://github.com/addyosmani)) — [What makes a good spec for AI](https://addyosmani.com/blog/good-spec/): commands, testing, project structure, code style, git workflow, and boundaries
- **[METR](https://metr.org/)** — The [randomized control trial](https://metr.org/) that proved unstructured AI use makes experienced developers slower, validating the need for harnesses
- **[Nate B Jones](https://www.youtube.com/@natebj)** ([@nateBJ](https://github.com/nateBJ)) — His [video on the 5 Levels of Vibe Coding](https://www.youtube.com/watch?v=bDcgHzCBgmQ) made this research accessible and inspired turning Joycraft into a tool anyone can use
- **[Simon Willison](https://simonwillison.net/)** ([@simonw](https://github.com/simonw)) — [Analysis of the Software Factory](https://simonwillison.net/2026/Feb/7/software-factory/) that helped contextualize StrongDM's approach for the broader community
- **[Anthropic](https://www.anthropic.com/)** — Claude Code's skills, hooks, and CLAUDE.md system that makes tool-native AI development possible, and the [harness patterns for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

## License

MIT

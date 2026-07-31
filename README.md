# Joycraft

<p align="center">
  <img src="docs/joycraft-banner.png" alt="Joycraft, the craft of AI development" width="700" />
</p>

> The craft of AI development. With joy, not darkness.

## What is Joycraft?

Joycraft is a CLI tool that installs structured development skills into [Claude Code](https://code.claude.com/docs), [OpenAI Codex](https://openai.com/codex), [Pi](https://github.com/earendil-works/pi-coding-agent), and [GitHub Copilot](https://github.com/features/copilot), along with behavioral boundaries, templates, and documentation structure.

It replaces unstructured prompting with spec-driven development: you interview, you write specs, the agent executes. The harness it installs — boundaries, context docs, skills — matures alongside your project instead of rotting.

```bash
cd /path/to/your/project
npx joycraft init
```

That is the whole install. `init` asks which AI harnesses to set up, detects your stack, and scaffolds the rest. Full step-by-step: [Setup walkthrough](docs/guides/setup-walkthrough.md).

## Contents

- [Setup walkthrough](docs/guides/setup-walkthrough.md) — every step from install to first feature
- [Quick start](#quick-start) — what `init` creates
- [Which skill do I need?](#which-skill-do-i-need) — the skill table and the core loop
- [Platform support](docs/guides/platform-support.md) — Claude Code, Codex, Pi, Copilot, supported stacks, headless execution on Pi
- [The levels](docs/guides/levels.md) — Dan Shapiro's 5 Levels, where Joycraft aims, and the credits
- [Upgrading](docs/guides/upgrading.md) — `npx joycraft upgrade` and what's new in 0.7
- [Git tracking](docs/guides/git-tracking.md) — shared vs private profiles, reviewable PRs
- [Migration: flat → per-feature layout](docs/guides/migration-per-feature-layout.md) — the v0.6 docs move
- [Security](SECURITY.md) — what Joycraft executes, boundaries, deny patterns
- [Guides](#guides) — interview, research and design, test-first, tuning, token discipline
- [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) · [License](LICENSE)

## Quick Start

Install the CLI (optional — `npx` works without it):

```bash
npm install -g joycraft
```

Then, from your project's root directory:

```bash
npx joycraft init
```

`init` first asks which harnesses to install and whether to commit or gitignore them, then auto-detects your tech stack and creates:

- **AGENTS.md** with behavioral boundaries (Always / Ask First / Never) and correct build/test/lint commands — the single shared instruction file when more than one tool is selected
- **CLAUDE.md** — on a multi-tool install this is [Anthropic's documented import pattern](https://code.claude.com/docs/en/memory): `@AGENTS.md` plus a `## Claude Code` section for Claude-specific additions, so every tool reads one source and nothing drifts. A Claude-only install gets the classic full CLAUDE.md instead
- **22 skills** installed to the selected harnesses — `.claude/skills/` (Claude Code), `.agents/skills/` (Codex), `.pi/skills/` (Pi), and/or `.github/skills/` (GitHub Copilot) — see [Which skill do I need?](#which-skill-do-i-need) below
- **Pi pipeline runtime** in `.pi/scripts/joycraft/` (when Pi is selected) — the headless spec-execution driver and its helpers
- **Agent teams enabled** — when Claude Code is selected, `init` sets `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.json` so subagent-driven skills like `/joycraft-research` work out of the box (idempotent — it never clobbers a value you already set)
- **docs/** structure: `docs/context/` is created up front; feature work lands in `docs/features/<slug>/{brief.md, research.md, design.md, specs/}` and deferred work in `docs/backlog/` — these are created lazily by the skills that write to them. Joycraft's own upgrade state lives hidden at `docs/.joycraft/state.json` (harness-neutral, gitignored — never committed)
- **Context documents** in `docs/context/`: production map, dangerous assumptions, decision log, institutional knowledge, and troubleshooting guide
- **Templates** including atomic spec, feature brief, implementation plan, boundary framework, and workflow templates for scenario generation and autofix loops

`init` only creates *missing* files, so it is safe to re-run on a project that already has Joycraft or a hand-tuned `CLAUDE.md` — details in [Git tracking](docs/guides/git-tracking.md#re-running-init-on-an-existing-project).

Harness choice, invocation syntax per tool, supported stacks, and Pi's headless loop are covered in [Platform support](docs/guides/platform-support.md).

## The Workflow

### Which skill do I need?

| You want to... | Use | What happens |
|---|---|---|
| Brainstorm an idea before committing to building it | `/joycraft-interview` | Free-form conversation → structured draft brief |
| Build a new feature from scratch | `/joycraft-new-feature` | Guided interview → Feature Brief → Atomic Specs |
| Understand existing code before building on it | `/joycraft-research` | Objective codebase research — facts only, no opinions |
| Align on approach before writing code | `/joycraft-design` | Design discussion → ~200-line artifact for human review |
| Break a feature into small, independent tasks | `/joycraft-decompose` | Feature Brief → testable Atomic Specs |
| Fix a bug with a structured workflow | `/joycraft-bugfix` | Reproduce → isolate → fix → verify loop |
| Implement a spec with TDD | `/joycraft-implement` | Read spec → failing tests → implement until green → wrap up → continue the queue |
| Run a feature's whole spec queue from one command | `/joycraft-implement-feature` | Fresh-context subagent per spec → fail-fast → session-end once |
| Run specs autonomously without hand-holding | `/joycraft-implement-level5` | Experimental — autofix loop + holdout scenario testing |
| Verify an implementation independently | `/joycraft-verify` | Read-only subagent checks work against the spec |
| Wrap up when a feature's specs are done | `/joycraft-session-end` | Consolidate discoveries → validate → graduate specs → ledger row → push/PR |
| Assess and mature your harness | `/joycraft-tune` | Score 7 dimensions → apply fixes → maturity roadmap |
| Audit harness overhead and prune | `/joycraft-optimize` | Six-disposition self-audit; its Reaper pass retires shipped/abandoned feature folders |
| Set up Joycraft for a team | `/joycraft-collaborative-setup` | Scaffold `docs/areas/`, owner conventions, a team CONTRIBUTING doc |

The core loop:

```mermaid
flowchart LR
    A[Interview] --> B[Feature Brief]
    B --> C{Complex?}
    C -- "Simple" --> F[Decompose]
    C -- "Complex" --> D[Research]
    D --> E[Design]
    E --> F
    F --> G[Atomic Specs]
    G --> H[Implement]
    H --> I[Session End]

    style A fill:#fff,stroke:#333,stroke-width:2px
    style B fill:#fff,stroke:#333,stroke-width:2px
    style C fill:#fff,stroke:#333,stroke-width:2px
    style D fill:#e8e8e8,stroke:#333,stroke-width:2px
    style E fill:#e8e8e8,stroke:#333,stroke-width:2px
    style F fill:#fff,stroke:#333,stroke-width:2px
    style G fill:#fff,stroke:#333,stroke-width:2px
    style H fill:#333,stroke:#333,color:#fff,stroke-width:2px
    style I fill:#333,stroke:#333,color:#fff,stroke-width:2px
```

## Guides

| Guide | What it covers |
|---|---|
| [Setup walkthrough](docs/guides/setup-walkthrough.md) | Every step from `npm install` to your first shipped feature |
| [The interview](docs/guides/interview-workflow.md) | The structured interview that replaces prompt-iterate-fix — the single biggest upgrade Joycraft makes |
| [Research and design](docs/guides/research-and-design.md) | Objective research via context isolation, and 200-line design checkpoints before decomposition |
| [Test-first development](docs/guides/test-first-development.md) | Tests are the mechanism to autonomy — every spec ships a test plan, failing tests come first |
| [Tuning: risk interview and git autonomy](docs/guides/tuning.md) | The 2–3 minute risk interview that generates your safety boundaries |
| [Token discipline](docs/guides/token-discipline.md) | Why file artifacts at every step make your conversation context disposable |
| [Permission modes](docs/guides/permission-modes.md) | Why you do **not** need `--dangerously-skip-permissions` |
| [Agent compatibility](docs/guides/agent-compatibility.md) | How CLAUDE.md and AGENTS.md stay one source across four tools |
| [Level 5: the autonomous loop](docs/guides/level-5-autonomy.md) | Experimental — workflows, holdout scenarios, and what it really costs |
| [Methodology](docs/guides/methodology.md) | Why this exists: METR's slowdown finding and the teams that beat it |

## Security

Joycraft scaffolds files and never runs your code. What it reads and writes, how boundaries and deny patterns constrain your AI agent, and where to report a vulnerability: [SECURITY.md](SECURITY.md).

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

The short version:

1. Fork, branch from `main`
2. `pnpm install && pnpm test --run` to verify your setup
3. Write tests first, then implement
4. `pnpm test --run && pnpm typecheck && pnpm build`
5. Open a PR (one approval required)

Look for [`good first issue`](https://github.com/maksutovic/joycraft/labels/good%20first%20issue) labels if you're new. Areas we'd especially love help with: stack detection for new languages, skill improvements, and documentation.

## License

MIT. See [LICENSE](LICENSE) for details.

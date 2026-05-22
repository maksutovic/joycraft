# Joysmith CLI + Plugin — Feature Brief

> **Date:** 2026-03-23
> **Project:** Joysmith
> **Status:** Decomposing

---

## Vision

Joysmith is currently a methodology repo — templates, research, and manual workflows that get applied to projects through conversation with Claude. The friction is high: you have to know the templates exist, point Claude at them, and manually shepherd the process every time.

This feature turns Joysmith into a distributable tool that anyone can install and run. The tool has two parts:

1. **`npx joysmith init`** — A thin CLI that scaffolds the Joysmith harness into any project. It auto-detects the tech stack, copies skills and templates, creates or improves CLAUDE.md, sets up the docs/ directory structure, and optionally registers hooks. After init, everything is native Claude Code — no external dependencies, no API keys, no running servers.

2. **Claude Code skills** (installed by init) — `/joysmith` as the main entry point. It detects the project's current state: no harness (scaffold), partial harness (assess + upgrade), or full harness (ready to work). It runs assessments, scores the project against the 5-level framework, identifies gaps, and provides a concrete upgrade plan. It installs the full interview → brief → decompose → atomic specs → execute → discoveries workflow.

The goal: take any project from wherever it is to as close to Level 4 as the infrastructure can get it, then light the path to Level 5. Joysmith doesn't build features or write project code — it builds the *system* that enables Level 4+ development.

This is open source. Anyone with a Claude Code or Codex project can run `npx joysmith init` and immediately have a dramatically better harness.

## User Stories

- As a developer starting a new project, I want to run `npx joysmith init` and immediately have a production-quality CLAUDE.md, behavioral boundaries, skills, and documentation structure so I start at Level 3.5+ instead of Level 1.
- As a developer with an existing project, I want to run `/joysmith` inside Claude Code and get an honest assessment of my harness quality with specific, actionable steps to improve it.
- As a developer who just got assessed, I want Joysmith to apply the recommended upgrades to my project — improve my CLAUDE.md, add missing skills, create the docs/ structure — so I don't have to do it manually.
- As a developer at Level 4, I want the installed skills (`/new-feature`, `/decompose`, `/session-end`) to guide my workflow so I naturally follow the interview → spec → execute → discoveries pattern.
- As a developer six months later, I want to run `npx joysmith upgrade` and get the latest templates and skills merged into my project without losing my customizations.

## Hard Constraints

- MUST work inside Claude Code sessions — skills are the primary interface, not a standalone CLI
- MUST NOT require `--dangerously-skip-permissions` — the tool should work within normal Claude Code permission flows
- MUST NOT require API keys, running servers, or external services — everything runs locally via Claude Code
- MUST be language/stack agnostic — templates are markdown, only build/test/lint commands are stack-specific
- MUST preserve existing user customizations when upgrading — never overwrite user modifications to CLAUDE.md or templates
- MUST auto-detect tech stack from manifest files (package.json, Cargo.toml, pyproject.toml, go.mod, Package.swift, Makefile, etc.)
- SHOULD copy templates into the project (user owns them, can modify) rather than referencing a central location
- SHOULD work with both Claude Code and Codex (AGENTS.md support)

## Out of Scope

- NOT: Writing project-specific specs, features, or code — Joysmith provides infrastructure, not implementation
- NOT: Running tests or CI/CD — Joysmith sets up the structure for these but doesn't execute them
- NOT: MCP server — unnecessary complexity for what is fundamentally file scaffolding + Claude Code skills
- NOT: Web UI or dashboard — this is a CLI + skills tool
- NOT: Hosting or cloud features — everything is local
- NOT: Building external scenarios for the user — Joysmith explains what they are and provides the template, but scenario design is project-specific work
- NOT: Integration with specific CI providers (GitHub Actions, etc.) — future concern
- NOT: Automated Level 5 features (spec queues, autonomous feedback loops) — the tool gets you to 4 and shows the path to 5

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | init-cli-scaffold | `npx joysmith init` — detect stack, scaffold dirs, copy templates/skills, create/improve CLAUDE.md | None | L |
| 2 | assess-skill | `/joysmith` skill — detect harness state, score against 5-level framework, output assessment + upgrade plan | None | M |
| 3 | upgrade-apply-skill | After assessment, apply recommended upgrades — improve CLAUDE.md, add missing skills/templates/dirs | Spec 2 | M |
| 4 | new-feature-skill | `/new-feature` skill — interview → Feature Brief (adapted from current template for installed use) | Spec 1 | S |
| 5 | decompose-skill | `/decompose` skill — break Feature Brief into atomic specs (adapted from current template) | Spec 1 | S |
| 6 | session-end-skill | `/session-end` skill — discoveries pattern, verify, commit (adapted from current template) | Spec 1 | S |
| 7 | upgrade-cli-command | `npx joysmith upgrade` — diff installed templates against latest, offer updates, preserve customizations | Spec 1 | M |
| 8 | stack-detection | Auto-detect tech stack from manifest files, populate CLAUDE.md with correct build/test/lint/deploy commands | None | S |
| 9 | agents-md-support | Generate AGENTS.md alongside CLAUDE.md for Codex compatibility | Spec 1 | S |

**Dependency graph:**
```
Spec 8 (stack detection) ──┐
                           ├──→ Spec 1 (init CLI) ──→ Specs 4, 5, 6 (workflow skills)
Spec 2 (assess skill) ─────┤                     └──→ Spec 7 (upgrade CLI)
                           │                     └──→ Spec 9 (AGENTS.md)
Spec 3 (upgrade-apply) ←───┘
```

Specs 8 and 2 can start in parallel. Spec 1 depends on 8. Specs 4, 5, 6, 7, 9 depend on 1. Spec 3 depends on 2.

## Execution Strategy

- [x] Agent teams (parallel teammates per phase, sequential between phases)

Use Claude Code agent teams to parallelize within each phase. Each teammate owns one spec file and works independently. The lead agent coordinates phase transitions.

**Prompt to kick off execution:**
```
Read docs/briefs/2026-03-23-joysmith-cli-plugin.md for the full plan.

This repo needs to be scaffolded as a TypeScript npm package first (pnpm, vitest, tsup, commander).

Then implement all specs in 3 phases using agent teams:

Phase 1 — scaffold the repo, then assign teammates:
  - Teammate A: docs/specs/2026-03-23-stack-detection.md
  - Teammate B: docs/specs/2026-03-23-assess-skill.md

Phase 2 — after Phase 1 merges:
  - Teammate A: docs/specs/2026-03-23-init-cli.md
  - Teammate B: docs/specs/2026-03-23-upgrade-apply-skill.md

Phase 3 — after Phase 2 merges:
  - Teammate A: docs/specs/2026-03-23-workflow-skills.md
  - Teammate B: docs/specs/2026-03-23-upgrade-cli.md
  - Teammate C: docs/specs/2026-03-23-agents-md-support.md

Each teammate should read their spec fully before starting, implement it, write tests, and commit.
```

## Success Criteria

- [ ] `npx joysmith init` in a fresh Node.js project creates: CLAUDE.md with boundaries, docs/ structure (briefs/, specs/, discoveries/, contracts/, decisions/), .claude/skills/ with all workflow skills, and correct build/test/lint commands
- [ ] `npx joysmith init` in a fresh Python project creates the same structure with Python-appropriate commands
- [ ] `npx joysmith init` in a project with an existing CLAUDE.md improves it (adds boundaries, architecture section, workflow section) without destroying existing content
- [ ] Running `/joysmith` inside Claude Code on an un-harnessed project produces an assessment with level score, dimension scores, and actionable recommendations
- [ ] Running `/joysmith` on a fully harnessed project says "harness looks good" and offers to start work
- [ ] `/new-feature` → `/decompose` → `/session-end` workflow runs end-to-end producing a Feature Brief, N atomic specs, and a DISCOVERIES.md
- [ ] `npx joysmith upgrade` on a project initialized 1+ versions ago updates templates without overwriting user customizations
- [ ] All of the above works without `--dangerously-skip-permissions`

## External Scenarios

| Scenario | What It Tests | Pass Criteria |
|----------|--------------|---------------|
| Fresh Node.js project (create-next-app) | init scaffolds correctly for JS ecosystem | CLAUDE.md has `pnpm test`, `pnpm build`, correct dir structure |
| Fresh Python project (poetry new) | init scaffolds correctly for Python ecosystem | CLAUDE.md has `pytest`, `mypy`, correct dir structure |
| Fresh Rust project (cargo new) | init scaffolds correctly for Rust ecosystem | CLAUDE.md has `cargo test`, `cargo clippy`, correct dir structure |
| Existing project with minimal CLAUDE.md | init improves without destroying | Original content preserved, boundaries added, dirs created |
| Existing project with full Joysmith harness | `/joysmith` recognizes it's already set up | No redundant scaffolding, assessment shows Level 3.5+ |
| Messy real-world project (multiple configs, monorepo) | Stack detection handles complexity | Detects primary stack, doesn't crash on ambiguity |
| Upgrade after template evolution | `npx joysmith upgrade` merges changes | New templates added, modified templates offered as diff, user customizations preserved |

---

## Template Usage Notes

This brief was produced through the Joysmith interview process (3 rounds of questions). The decomposition identifies 9 atomic specs across 3 phases. Total estimated effort: 8-12 sessions.

The `npx joysmith init` approach means the npm package is a thin scaffolder — the real value is in the installed skills and templates that run natively in Claude Code. This keeps the tool simple, dependency-free, and aligned with the constraint that it must feel native to Claude Code/Codex.

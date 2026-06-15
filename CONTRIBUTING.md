# Contributing to Joycraft

Thanks for your interest in contributing! Joycraft is built with the same spec-driven workflow it teaches — and we'd love for contributors to experience that firsthand.

## Getting Started

```bash
# Clone the repo
git clone https://github.com/maksutovic/joycraft.git
cd joycraft

# Install dependencies
pnpm install

# Run the test suite
pnpm test --run

# Type check
pnpm typecheck

# Build
pnpm build

# Test locally (simulate npx joycraft init)
pnpm build && node dist/cli.js init /tmp/test-project
```

## Development Workflow

Joycraft follows its own methodology. We strongly encourage using the Joycraft skills during development:

1. **Brainstorm** — Use `/joycraft-interview` to think through your idea
2. **Spec it** — Use `/joycraft-new-feature` to produce a Feature Brief, then `/joycraft-decompose` for Atomic Specs
3. **Execute** — Implement one spec per session in a fresh context
4. **Wrap up** — Use `/joycraft-session-end` to capture discoveries and commit

You don't have to follow this process for small fixes, but for anything non-trivial it produces much better results than ad-hoc prompting.

## What to Contribute

### Good first issues

Look for issues labeled [`good first issue`](https://github.com/maksutovic/joycraft/labels/good%20first%20issue). These are scoped, well-defined, and a good way to learn the codebase.

### Areas we'd love help with

- **Stack detection** (`src/detect.ts`) — Adding support for new languages, frameworks, and package managers
- **Skills** (`src/skills/`) — Improving the prompts, adding new workflow skills (canonical single-source files; per-harness variants are generated)
- **Templates** — Better atomic spec templates, new context document templates
- **Documentation** — Guides, tutorials, examples of Joycraft in real projects
- **Testing** — More edge cases, integration tests, real-world fixture projects
- **Codex support** — Deeper AGENTS.md integration and Codex-specific workflows

### What we're NOT looking for right now

- Runtime dependencies (Joycraft should stay minimal — just `commander`)
- Major architectural changes without a spec and discussion first
- Changes to skill content without testing in a real Claude Code session

## Project Structure

```
src/
  cli.ts              # CLI entry point (commander)
  init.ts             # npx joycraft init
  init-autofix.ts     # npx joycraft init-autofix
  upgrade.ts          # npx joycraft upgrade
  detect.ts           # Stack detection (pure function)
  improve-claude-md.ts # CLAUDE.md section generation
  agents-md.ts        # AGENTS.md generation
  permissions.ts      # .claude/settings.json permission rules
  safeguard.ts        # PreToolUse deny-pattern hooks
  version.ts          # .claude/.joycraft/state.json version tracking
  bundled-files.ts    # All skills + templates as embedded strings (generated)
  skills/             # Canonical skill markdown files (source of truth)
  claude-skills/      # Per-harness variant for Claude Code (generated from src/skills/)
  codex-skills/       # Per-harness variant for Codex (generated from src/skills/)
  pi-skills/          # Per-harness variant for Pi (generated from src/skills/)
  templates/          # Template files (source of truth)

tests/                # Vitest tests — one file per module
```

### Key things to know

1. **`src/bundled-files.ts` and the three `src/{claude,codex,pi}-skills/` dirs are generated.** Don't edit them by hand. Edit `src/skills/` (canonical) and run `pnpm build` to regenerate everything. See "Regenerating bundled-files.ts" below.

2. **Skills must be self-contained.** A skill file in `.claude/skills/` can't import from other files. All context must be inline.

3. **Templates use literal placeholders.** `$JOYCRAFT_APP_ID` and `$SCENARIOS_REPO` are replaced at install time by `init-autofix`. `${{ ... }}` expressions are GitHub Actions syntax and stay as-is.

4. **CLAUDE.md merge is the hardest problem.** `improve-claude-md.ts` must append sections without destroying existing content. When in doubt, append rather than modify.

### Regenerating bundled-files.ts

After editing any file in `src/skills/` (canonical) or `src/templates/`, run:

```bash
pnpm build
```

This runs `scripts/generate-bundled-files.mjs`, which:

1. Reads each canonical skill in `src/skills/`.
2. Applies `applyTemplate(source, harness)` from `scripts/lib/skill-template.mjs` to produce per-harness variants in `src/claude-skills/`, `src/codex-skills/`, and `src/pi-skills/`.
3. Re-reads from disk and writes `src/bundled-files.ts`.

Commit the canonical file, all three regenerated per-harness files, and `src/bundled-files.ts` together — CI sync tests enforce this lockstep. See `docs/discoveries/2026-06-11-bundle-regen-per-commit.md` for the bundle-regen-per-commit discipline, and `docs/guides/agent-compatibility.md` for the canonical-format reference (variable lookup, conditional blocks, frontmatter stripping).

Then verify:

```bash
pnpm test --run && pnpm typecheck
```

## Pull Request Process

1. **Fork the repo** and create a branch from `main`
2. **Write tests first** — we follow TDD for all new functionality
3. **Run the full check:** `pnpm test --run && pnpm typecheck && pnpm build`
4. **Open a PR** — fill out the template, describe what and why
5. **One approval required** — main is branch-protected

### Commit style

```
verb: concise message
```

Examples: `feat: add Swift stack detection`, `fix: handle missing package.json gracefully`, `docs: add contributing guide`

### What makes a good PR

- Focused on one thing (matches one atomic spec if applicable)
- Tests included
- README updated if user-facing
- No unnecessary dependency additions
- Follows existing code patterns

## Questions?

Open a [discussion](https://github.com/maksutovic/joycraft/discussions) or file an issue. We're friendly.

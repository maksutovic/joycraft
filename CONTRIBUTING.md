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
pnpm test

# Type check
pnpm typecheck

# Build
pnpm build

# Test locally (simulate npx joycraft update)
pnpm build && node dist/cli.js init /tmp/test-project --harness codex --yes
```

## Development Workflow

Joycraft follows its own methodology. We strongly encourage using the Joycraft skills during development:

1. **Start** — Tell your agent what you want; the `joycraft-entry` skill routes it
2. **Spec it** — `joycraft-decompose` turns a brief into atomic specs in `docs/features/<slug>/specs/`
3. **Execute** — `joycraft-implement` builds the specs, one at a time
4. **Wrap up** — `joycraft-session-end` checks the work and closes the feature

You don't have to follow this process for small fixes, but for anything non-trivial it produces much better results than ad-hoc prompting.

## What to Contribute

### Good first issues

Look for issues labeled [`good first issue`](https://github.com/maksutovic/joycraft/labels/good%20first%20issue). These are scoped, well-defined, and a good way to learn the codebase.

### Areas we'd love help with

- **Skills and references** (`payload/`) — Improving the prompts, the runtime and the references that ship
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
  cli.ts              # CLI entry point (commander): init, update, rollback, doctor
  install-v1.ts       # install/update plan and apply, manifest, doctor
  payload.ts          # the payload, its PIN and the host mapping
  legacy-07.ts        # detect and migrate a 0.7 install
  legacy-guard.ts     # the old 0.7 shell guard: remove or keep
  rollback.ts         # undo a 0.7 → 1.x migration
  data/install-inventory.json  # hashes of every file a published 0.7 release wrote

payload/              # the skills, runtime and references that ship (source)
scripts/              # release, payload pin, docs-sync gate, ste-lint.py
tests/                # Vitest tests; tests/fixtures/v07 holds real 0.7 installs
```

### Key things to know

1. **`payload/` is the source of what users get.** Edit it there, then run `node scripts/pin-payload.mjs` to rewrite `payload/PIN`.

2. **User files are never replaced.** `init` and `update` never change `AGENTS.md`, `CLAUDE.md` or settings; an edited Joycraft file is backed up before it is replaced.

3. **The 0.7 migration depends on `src/data/install-inventory.json`.** It is built from the published npm tarballs by `scripts/build-install-inventory.mjs`; never edit it by hand.

## Pull Request Process

1. **Fork the repo** and create a branch from `main`
2. **Write tests first** — we follow TDD for all new functionality
3. **Run the full check:** `pnpm test && pnpm typecheck && pnpm build`
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

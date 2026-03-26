# Joycraft

**What:** A CLI + Claude Code plugin that scaffolds and upgrades AI development harnesses. `npx joycraft init` installs skills, templates, boundaries, and documentation structure into any project, taking it from Level 1 to Level 4 on Dan Shapiro's 5 Levels of Vibe Coding.

**Component:** npm package (CLI) + Claude Code skills | **Updated:** 2026-03-23

---

## Behavioral Boundaries

### ALWAYS
- Run `pnpm test --run && pnpm typecheck` before committing
- Commit style: `verb: concise message`
- Reference atomic specs when implementing features — each spec is in `docs/specs/`
- Test against multiple stack types (Node.js, Python, Rust, Go at minimum)
- Push to feature branches after each commit
- Open a PR when all specs in a feature are complete
- Use descriptive branch names: feature/spec-name

### ASK FIRST
- Adding dependencies — this is a CLI tool, keep it minimal
- Changing template content — templates are the core product, changes affect all users
- Changing skill content — skills are the user-facing interface
- Modifying the CLAUDE.md merge/improve logic — this touches user files
- Publishing to npm
- Merging PRs to main/master
- Any destructive git operation (force-push, reset --hard, branch deletion)

### NEVER
- Overwrite user files without explicit confirmation or `--force` flag
- Add runtime dependencies that aren't strictly necessary
- Reference absolute paths — all templates and skills must use project-relative paths
- Include methodology research, project assessments, or personal notes in the tool
- Push directly to main/master (always use feature branches + PR)
- Amend commits that have been pushed to remote

---

## Architecture

```
Joycraft/
├── src/                    # CLI + core logic (TypeScript)
│   ├── cli.ts              # Entry point — argument parsing (init, upgrade)
│   ├── init.ts             # Scaffold logic — dirs, files, CLAUDE.md
│   ├── upgrade.ts          # Upgrade logic — diff, prompt, apply
│   ├── detect.ts           # Stack detection from manifest files
│   ├── improve-claude-md.ts # Merge Joycraft sections into existing CLAUDE.md
│   ├── agents-md.ts        # Generate AGENTS.md for Codex
│   ├── version.ts          # Version tracking (.joycraft-version)
│   ├── skills/             # Installable skill files (copied to .claude/skills/)
│   │   ├── tune.md         # Main entry — assess + route
│   │   ├── tune-assess.md
│   │   ├── tune-upgrade.md
│   │   ├── new-feature.md
│   │   ├── decompose.md
│   │   └── session-end.md
│   └── templates/          # Bundled templates (copied to docs/templates/)
├── templates/              # Source-of-truth templates (development reference)
├── tests/
│   ├── detect.test.ts
│   ├── init.test.ts
│   ├── upgrade.test.ts
│   ├── agents-md.test.ts
│   └── fixtures/           # Minimal manifest files for each stack
├── docs/
│   ├── briefs/             # Feature briefs for Joycraft itself
│   └── specs/              # Atomic specs for Joycraft itself
├── package.json
├── tsconfig.json
├── CLAUDE.md               # You are here
└── README.md
```

### Key Data Flow

```
npx joycraft init
  → detectStack() reads manifest files → StackInfo
  → scaffold dirs (docs/briefs, docs/specs, docs/discoveries, etc.)
  → copy skills → .claude/skills/
  → copy templates → docs/templates/
  → generate/improve CLAUDE.md with StackInfo commands
  → generate AGENTS.md
  → print summary + next steps

/tune (inside Claude Code)
  → read CLAUDE.md, check dirs, check skills
  → score 7 dimensions
  → route: scaffold | assess + upgrade | ready
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/detect.ts` | Stack detection — pure function, no side effects |
| `src/init.ts` | Main scaffolding logic — the core of `npx joycraft init` |
| `src/improve-claude-md.ts` | Merge logic for existing CLAUDE.md files — most complex logic |
| `templates/` | Source-of-truth for all templates — changes here propagate to users via upgrade |
| `templates/claude-kit/skills/` | Source-of-truth for all skills |
| `docs/specs/` | Atomic specs for building Joycraft itself |
| `docs/briefs/2026-03-23-joysmith-cli-plugin.md` | Feature Brief — the full vision |

---

## Development Workflow

### Setup
```bash
pnpm install
```

### Build
```bash
pnpm build
```

### Test
```bash
pnpm test --run
```

### Type Check
```bash
pnpm typecheck
```

### Test Locally (as if npx)
```bash
pnpm build && node dist/cli.js init /tmp/test-project
```

### Feature Development Flow
```
Read the relevant atomic spec in docs/specs/
→ Implement → Test → Capture discoveries → Commit
```

---

## Common Gotchas

1. **Templates use project-relative paths.** Never reference `/Users/...` or Joycraft repo paths in templates or skills. They get copied into user projects where those paths don't exist.
2. **CLAUDE.md merge is the hardest problem.** Improving an existing CLAUDE.md without destroying content requires section-level parsing. When in doubt, append rather than modify.
3. **Skills must be self-contained.** A skill installed to `.claude/skills/` can't import from other files. All necessary context must be inline in the markdown.
4. **Test against real project structures.** The fixtures in `tests/fixtures/` should mirror real-world manifest files, not minimal stubs.

---

## Spec Status

| Spec | Phase | Status |
|------|-------|--------|
| stack-detection | 1 | Ready |
| assess-skill | 1 | Ready |
| init-cli | 2 | Ready |
| upgrade-apply-skill | 2 | Ready |
| workflow-skills | 3 | Ready |
| upgrade-cli | 3 | Ready |
| agents-md-support | 3 | Ready |

# Joycraft

**What:** A CLI + Claude Code plugin that scaffolds and upgrades AI development harnesses. `npx joycraft init` installs skills, templates, boundaries, and documentation structure into any project, taking it from Level 1 to Level 4 on Dan Shapiro's 5 Levels of Vibe Coding.

**Component:** npm package (CLI) + Claude Code skills | **Updated:** 2026-07-21

---

## Behavioral Boundaries

### ALWAYS
- Run `pnpm test && pnpm typecheck` before committing (`pnpm test` already runs once and exits — `--run` is not a valid pnpm flag here and fails)
- Run `pnpm sync-skills` after editing anything under `src/skills/` or `src/local-skills/`, and commit the regenerated + installed copies in the same commit — the installed trees are `.claude/skills`, `.agents/skills`, `.pi/skills`, `.github/skills`, and `.omp/skills`, and a stale one is what shipped twelve wrong copilot skills in 0.7.3
- Commit style: `verb: concise message`
- Reference atomic specs when implementing features — each spec is in `docs/features/<slug>/specs/`
- Test against multiple stack types (Node.js, Python, Rust, Go at minimum)
- Push to feature branches after each commit
- Open a PR when all specs in a feature are complete
- Run `/release-docs-sync` before `gh pr create` — a PR that touches `src/`, `templates/`, or `scripts/` must change CHANGELOG.md or carry a `Docs: none — <reason>` line in its body; a PreToolUse hook and the Docs Sync CI check both run `scripts/check-docs-sync.mjs` and block otherwise
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
- Push directly to main/master (always use feature branches + PR) <!-- origin: source AGENTS.md 2026-07-21, probation: claude-sonnet-5 -->
- Amend commits that have been pushed to remote
- Access, read, or reference the scenarios repo (`joycraft-scenarios`)
- Mention scenario test names or contents
- Modify the scenarios dispatch workflow to leak test information

---

## External Validation

This project uses holdout scenario tests in a separate private repo (`joycraft-scenarios`).

The scenarios repo is deliberately invisible to the coding agent. This is the holdout guarantee — like a validation set in machine learning. Do not attempt to circumvent this boundary.

---

## Architecture

<!-- joycraft:folder-map -->
| Folder | What lives here |
|--------|-----------------|
| `docs/` | Documentation |
| `keller-coders-meetups/` | Meetup notes (not part of the tool) |
| `scripts/` | generate-bundled-files.mjs (regen src/*-skills/), sync-skills.mjs (copy into installed trees), check-docs-sync.mjs (PR docs gate), ste-lint.py (vendored STE linter) |
| `src/` | CLI + core logic (TypeScript); entry cli.ts, scaffold init.ts, upgrade.ts, detect.ts, improve-claude-md.ts, agents-md.ts |
| `templates/` | Source-of-truth templates (development reference) |
| `tests/` | Test suite + fixtures/ (real-world manifest files per stack) |
| `docs/backlog/` | Deferred work, one file per item |
| `docs/bugfixes/` | Per-area bugfix specs |
| `docs/context/` | Knowledge layer — decision-log, shipped ledger, anchors, reference |
| `docs/discoveries/` | Session surprises worth remembering |
| `docs/features/` | Per-feature: brief.md, design.md, specs/ (+ .joycraft-spec-queue.json) |
| `docs/guides/` | How-to guides |
| `docs/max-discussion-transcripts/` | Discussion transcripts (gitignored content) |
| `docs/plans/` | Planning docs |
| `docs/reference/` | Cross-cutting reference (spec status lifecycle, knowledge lifecycle) |
| `docs/research/` | Research notes and findings |
| `docs/specs/` | Legacy flat specs (pre-feature-folder era) |
| `docs/templates/` | Bundled output and reference templates |
| `docs/vision/` | North-star vision docs (headless-joycraft) |
| `src/arcade/` | Experimental playground |
| `src/claude-skills/` | GENERATED from src/skills/ — never edit |
| `src/codex-skills/` | GENERATED — Codex variants |
| `src/copilot-skills/` | GENERATED — GitHub Copilot variants |
| `src/local-skills/` | Repo-local maintainer skills — NOT bundled, never ship to npm |
| `src/omp-skills/` | GENERATED — omp variants |
| `src/pi-skills/` | GENERATED — Pi variants |
| `src/skills/` | CANONICAL skill sources — edit here |
| `src/templates/` | Bundled templates (copied to docs/templates/) |

Past multi-team scale, replace this root map with nested per-directory instruction files (`joycraft-collaborative-setup`) — never a bigger tree.
<!-- /joycraft:folder-map -->

### Key Data Flow

```
npx joycraft init
  → detectStack() reads manifest files → StackInfo
  → scaffold dirs (docs/context, docs/features, docs/discoveries, etc.)
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
| `src/telemetry.ts` + `src/telemetry-store.ts` | Read-telemetry scanner (Claude/Pi/Codex transcripts) + gitignored store behind `joycraft telemetry` |
| `src/folder-map.ts` | Check-shaped folder map — sentinel block regenerated at init/upgrade, drift-diffed by tune |
| `src/init.ts` | Main scaffolding logic — the core of `npx joycraft init` |
| `src/improve-claude-md.ts` | Merge logic for existing CLAUDE.md files — most complex logic |
| `templates/` | Source-of-truth for all templates — changes here propagate to users via upgrade |
| `src/skills/` | Source-of-truth for all product skills — `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/copilot-skills/`, `src/omp-skills/` are generated from it (never edit those directly) |
| `src/local-skills/` | Repo-local maintainer skills (e.g. `release-docs-sync`). Transformed per-harness into the installed trees by `scripts/sync-skills.mjs`, but never bundled — nothing here ships to users |
| `docs/features/<slug>/specs/` | Atomic specs for building Joycraft itself (per-feature queues) |
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
Read the relevant atomic spec in docs/features/<slug>/specs/
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

---

## Execution Profile

<!-- joycraft:execution-profile -->
- claude: Swarms: decompose yes · implement yes · model opus 5 · effort medium
- codex: Swarms: decompose yes · implement yes · model 5.6 terra · effort medium
- pi: Swarms: decompose yes · implement yes · model kimi-k3 · effort max
<!-- /joycraft:execution-profile -->

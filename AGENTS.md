# Joycraft

**What:** The `joycraft` npm package. Its CLI installs and updates Joycraft, a skill bundle and small runtime for agent-led software work, in any project, for Claude Code, Codex, Pi, Oh My Pi, GitHub Copilot CLI and OpenCode. The skills and runtime it ships are vendored into `payload/` from joycraft-prototype.

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
- Show Max every document to read, review or answer (brief, plan, spec set, review, questions) as a rendered page, never only as Markdown in chat: the decision artifact (`node payload/.joycraft/runtime/artifacts/cli.mjs serve --brief <brief.md> --view <artifact.json>`) for a brief or questions, an HTML artifact for anything else. Open it for Max.

### ASK FIRST
- Adding dependencies — this is a CLI tool, keep it minimal
- Changing template content outside an approved spec — templates are the core product; a spec that names the change is the approval
- Changing skill content outside an approved spec — skills are the user-facing interface; a spec that names the change is the approval
- Modifying the CLAUDE.md merge/improve logic — this touches user files
- Publishing to npm
- Merging PRs to main/master
- Any destructive git operation (force-push, reset --hard, branch deletion)

### NEVER
- Overwrite user files without explicit confirmation or `--force` flag. One approved exception: an explicit `update` replaces an edited Joycraft-owned file (skill, template, hook, script) after saving the edited copy under `docs/.joycraft/local/replaced/`; user-owned files (`CLAUDE.md`, `AGENTS.md`, settings, `deny-patterns.txt`) are never replaced this way
- Add runtime dependencies that aren't strictly necessary
- Reference absolute paths — all templates and skills must use project-relative paths
- Include methodology research, project assessments, or personal notes in the tool
- Push directly to main/master (always use feature branches + PR) <!-- origin: source AGENTS.md 2026-07-21, probation: claude-fable-5-1 -->
- Amend commits that have been pushed to remote
- Access, read, or reference the scenarios repo (`joycraft-scenarios`)
- Mention scenario test names or contents
- Modify the scenarios dispatch workflow to leak test information

---

## Release behavior

Main merges automatically release to npm after required packaged checks. Do not
introduce a second release PR, manual promotion approval, or new credential gate
without Max’s explicit approval. See `docs/guides/releasing.md`.

## External Validation

This project uses holdout scenario tests in a separate private repo (`joycraft-scenarios`).

The scenarios repo is deliberately invisible to the coding agent. This is the holdout guarantee — like a validation set in machine learning. Do not attempt to circumvent this boundary.

---

## Commands

From `package.json` scripts; all four ran green on 2026-11-02.

```bash
pnpm install && pnpm build && pnpm typecheck && pnpm test
pnpm build && node dist/cli.js init /tmp/test-project --yes   # try the CLI as npx would
```

## Execution Profile

<!-- joycraft:execution-profile -->
- claude: Swarms: decompose yes · implement yes · model opus 5.5 · effort high
- codex: Swarms: decompose yes · implement yes · model 5.6 terra · effort medium
- pi: Swarms: decompose yes · implement yes · model kimi-k3 · effort max
<!-- /joycraft:execution-profile -->

## Context Map

Keep this file lean: link out, don't inline. Read a document when its row applies.

| Document | Read it when… |
|----------|---------------|
| `payload/.joycraft/references/artifacts.md` | Showing Max a brief, plan, review or questions — render the decision artifact |
| `docs/context/architecture.md` | Finding where code lives, the 1.x install flow, the legacy 0.7 updater, or the folder layout |
| `docs/context/decision-log.md` | Making or revisiting a product or release decision — check why it was decided first |
| `docs/context/shipped.md` | Checking what shipped in which release or PR |
| `docs/context/production-map.md` | Touching npm publishing, CI release workflows or anything users install |
| `docs/context/institutional-knowledge.md` | Looking for an unwritten convention or constraint |
| `docs/context/dangerous-assumptions.md` | Something the agent believes about this repo turned out false — check and add |
| `docs/context/anchors.md` | Scoring how sure you are of a claim in a brief, spec or review |
| `docs/templates/reference/model-profile-claude-fable-5-1.md` | Working with Claude Fable 5.1 — finishing whole tasks, scope, progress updates, prose |

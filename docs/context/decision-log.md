---
last_updated: 2026-06-01
last_updated_by: Maximilian Maksutovic
---

# Decision Log

> Why choices were made, not just what was chosen.

## Decisions

| Date | Decision | Why | Alternatives Rejected | Revisit When |
|------|----------|-----|----------------------|-------------|
| 2026-03-23 | Commander for CLI arg parsing | Minimal, stable, zero transitive deps — fits "keep it minimal" principle | yargs (heavier), meow (less maintained), raw process.argv (too manual) | If we need subcommand plugins or complex arg validation |
| 2026-03-23 | Copy skills as files, not symlinks | Skills must work after `npx joycraft init` without Joycraft installed | Symlinks (breaks without Joycraft), npm postinstall (fragile) | If skill updates become a major pain point (upgrade command mitigates this) |
| 2026-03-23 | Section-level CLAUDE.md merging over full replacement | Users customize their CLAUDE.md — overwriting destroys their work | Full replacement (loses user content), manual merge (users won't do it) | If merge logic becomes too complex to maintain reliably |
| 2026-03-24 | Namespace skills as `joycraft-*` | Avoids collisions with other Claude Code plugins (superpowers, vercel, etc.) | Bare names like `tune`, `decompose` (collided immediately) | Never — namespacing is the right pattern |
| 2026-03-25 | GitHub App token for autofix CI | Shows as distinct identity in PRs, cleaner than PAT | PAT (shows as repo owner, confusing), GITHUB_TOKEN (can't trigger workflows) | If GitHub changes App token permissions model |
| 2026-03-26 | Auto-publish on every merge to main | Eliminates manual version bumps and npm publish — every merge ships | Manual `npm publish` (easy to forget), separate release branch (overkill for solo/small team) | If we need release candidates or staging |
| 2026-03-26 | Fine-grained PAT via checkout `token` param for publish push | Bypasses branch protection for version bump commits; checkout action handles auth via HTTP headers | Embedding PAT in remote URL (breaks with fine-grained PATs), GitHub App (more setup for same result) | If GitHub deprecates PATs or adds native bypass for Actions |
| 2026-05-21 | Lean CLAUDE.md + `## Context Map` pointer table; long-form refs in `docs/context/reference/` | Keep the always-loaded harness file small; link out to on-demand reference docs instead of inlining. tune flags CLAUDE.md >~200 lines (advisory) | One mega CLAUDE.md (bloats every session), one mega reference template (harder to scaffold specifically) | If pointer indirection proves more friction than inlining for small projects |
| 2026-05-21 | `/joycraft-setup` is a thin alias routing to `/joycraft-tune`, not a rename | Newcomer-facing door ("set up / get started") without breaking existing users' `tune` muscle memory or doc/memory references | Renaming tune→setup (breaks references), setup reimplementing detect+route (duplicates tune, drifts) | Never — alias is additive |
| 2026-05-30 | Two-tier wrap-up: new lightweight `joycraft-spec-done` (per-spec: status bump + commit) + rescoped `joycraft-session-end` (once-per-feature: validation + push + PR) | Full session-end after every spec killed loop momentum; per-spec needs only a commit + status bump, the expensive cognition (validation, discovery consolidation, PR) belongs once per feature | A `--fast` flag on session-end (entangles the light path with heavy code, blurs the two tiers) | If a per-spec validation gate becomes necessary before `verify-in-loop` ships |
| 2026-05-30 | Per-spec **execution modes** (`batch`/`checkpoint`/`isolated`), hybrid-selected (project default + decompose recommendation, human-approved) | Specs aren't uniform — tiny ones want to batch, heavy ones need fresh context; one fixed wrap-up behavior is wrong. Human approves because risk isn't always visible from size | Auto-assign mode from size alone (a tiny spec in a risky feature may still need isolation — only a human knows) | If the size→mode heuristic proves reliable enough to drop the human gate |
| 2026-05-30 | Isolated-mode autonomous loop = single-shot `pi -p` process per spec; retired the in-process `joycraft_next_spec` Pi tool | The process boundary gives free, verified context isolation; the in-process TypeScript extension provably could NOT isolate context (context-isolation experiment) | Driving the loop from the in-process extension via `newSession`/`sendUserMessage` (tombstoned — leaks context) | If Pi adds a first-class in-process isolation primitive |
| 2026-05-30 | Unified spec status to `todo → in-review → done` across queue JSON + frontmatter | Two systems with different words (`active`/`complete` vs `shipped`/`backlog`) desynced on every change; researched canonical idiom (GitHub/Jira/Linear), not invented | Keeping two vocabularies (perpetual drift), a 4th `implemented`/`verified` state (no major tool tracks it; one more thing to drift) | Never — single vocabulary is the invariant |
| 2026-05-31 | Upgrade-state hidden at `.claude/.joycraft/state.json` (gitignored, 16-char hashes), migrated-on-upgrade — keep per-file hashes, only relocate | Client complained about a committed `.joycraft-version` at the repo root; npm itself hides hashed state at `node_modules/.package-lock.json`. The hashes are what make "auto-update untouched files silently, prompt only on customized" work **offline** | Version-string-only baseline (would need old npm tarballs at upgrade time — breaks offline); shadcn copy-once+diff (prompts on every changed file — kills turnkey updates) | If a Codex-only/Pi-only install mode ever skips creating `.claude/` (the state location assumes it's universal) |

## Principles

- Prefer zero/minimal dependencies — this is a CLI tool users run via npx
- Templates and skills are the product — treat changes to them like API changes
- Append over modify when touching user files — never destroy existing content
- Eat your own dogfood — Joycraft's own repo uses Joycraft's harness

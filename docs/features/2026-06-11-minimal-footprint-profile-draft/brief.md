# Minimal Footprint Profile — DRAFT Brief

> **Date:** 2026-06-11
> **Project:** joycraft
> **Status:** DRAFT — context capture from the 2026-06-11 DX session; finalize with Max before decomposing
> **Origin:** Max's client who is "anal about free-floating files in his repo"
> **Builds on:** gitignore profiles (shared/private), v0.6.10 + PR #49 hardening

---

## TL;DR

The `private` gitignore profile got the harness dirs (`.claude/`, `.agents/`, `.pi/`) out of the client's git history. A `minimal` profile finishes the job for everything else joycraft puts in a repo: the ~32-file `docs/templates/` copy, and possibly one of the two root markdown files. Goal: a repo where joycraft's *tracked* footprint is `AGENTS.md` (or CLAUDE.md) + the docs the team actually writes.

## Remaining footprint after `private` (evidence, 2026-06-11)

| Item | Status under `private` | Problem |
|---|---|---|
| `docs/templates/` (~32 files) | **tracked** | Pure copies of bundled package content — the biggest remaining "whose files are these?" offender |
| `CLAUDE.md` + `AGENTS.md` | tracked (both) | Two root files saying nearly the same thing |
| `docs/context/`, `docs/features/` | tracked | Team-authored content — correctly tracked, not in scope |
| `.claude/.joycraft/state.json` | covered by `.claude/` ignore | already solved |

## Proposed shape (strawman — validate at finalization)

- **`minimal` profile = `private` + `docs/templates/` gitignored.** Templates still exist locally (skills reference them by project-relative path — that contract holds since the files are on disk, just untracked). Upgrade keeps refreshing them.
  - Alternative considered: don't copy templates at all; skills fetch from the installed package (`npx joycraft template <name>`). Cleaner but changes the skill contract on every harness and breaks offline/no-npx flows — probably v2.
- **Root-file consolidation (separate decision, may be orthogonal to the profile):** Claude Code reads AGENTS.md natively (VERIFY current behavior before committing to this). If confirmed: an option to emit only AGENTS.md, with CLAUDE.md either absent or a 3-line pointer. Halves the root footprint.
- CLI: extend the existing profile mechanism (`--gitignore=minimal`) — the resolver, persistence (`state.json` `gitignoreProfile`), prompt, and `upgrade --gitignore` switching from PR #49 all generalize; `PRIVATE_PROFILE_IGNORES`-style constants keep messages drift-proof.
- Init summary + README table gain the third row; untrack hint extends to `git rm -r --cached docs/templates`.

## Open questions for finalization

1. Is `minimal` a third profile, or is "ignore docs/templates" a flag composable with shared/private? (Lean: third profile — the prompt stays a simple 3-way choice.)
2. Verify Claude Code's AGENTS.md support (and whether CLAUDE.md-absent degrades anything — e.g. /init nudges, context map references).
3. Does the client also object to *untracked* local files, or only tracked ones? (If untracked is fine — which `private` adoption suggests — `minimal` as designed is sufficient; if not, that's the plugin-distribution thread instead.)
4. The "teammates won't get skills" warning logic: under `minimal`, suppress like `private`.

## Out of scope

- Plugin distribution for Claude Code (removes installed files entirely; own thread)
- Changing where team-authored docs live (`docs/context/`, `docs/features/` stay tracked)
- Pi pipeline runtime relocation

---
last_updated: 2026-11-20
last_updated_by: Maximilian Maksutovic
---

# Dangerous Assumptions

> Things the AI agent might assume that are wrong in this project.

## Assumptions

| Agent Might Assume | But Actually | Impact If Wrong |
|-------------------|-------------|----------------|
| A PR that changes only `payload/` releases | Until 1.8.0, release preparation and the docs-sync gate ignored `payload/`; check `isProductPath()` in `scripts/release-preparation.mjs` before trusting it | A payload fix merges and never reaches npm |
| Main blocks a red PR | Branch protection on main requires no status checks; a red PR can merge, and a merge publishes. The suite runs again on main and in publish as the only guard | Removing a main or publish suite run lets a broken build ship |
| An example path in a docs page is harmless | `tests/public-docs.test.ts` resolves every Markdown link in `docs/guides` and `docs/reference`; an installed-skill path such as `../../../.joycraft/...` fails there | CI fails on a docs-only PR |
| A Claude Code hook gets the tool name as an argument | Claude Code passes no argument; a hook reads `tool_name` and `tool_input` from the stdin JSON and reports its reason on stderr | A hook that reads `$1` silently allows everything |
| A hook exit code of 1 asks the user | Exit 1 is a non-blocking warning; an ask is exit 0 plus a JSON `permissionDecision` | A recipe meant to pause silently continues |
| A spec's Affected-Files table is the full blast radius | It's a hand-written hint; for a path/constant rename, `grep -rln` is authoritative. A relocated path often has silent readers (existence-gates, `try/catch` reads) the table omits | Feature quietly dies (no crash, no failing test) for those readers |
| Test fixtures are stubs | Fixtures should mirror real-world manifest files (real package.json structures) | False confidence — tests pass but detection fails on real projects |
| CLAUDE.md and AGENTS.md carry equivalent instructions | They drift. Keep `CLAUDE.md` as `@AGENTS.md` plus Claude-only lines; `AGENTS.md` is the single source | Codex, Pi and the other hosts run without the real rules |
| A successful `npm publish` means `npm view joycraft@<version>` sees it seconds later | npm returns before the registry lists the version. The registry recorded 1.5.0 and 1.5.2 7 min 11 s after `+ joycraft@<version>` (packument `time` field); a cache-bypassing read sees nothing sooner | A short verification deadline fails a good release and holds back the GitHub release; `scripts/verify-publication.mjs` waits 20 minutes |
| A test that names a feature folder only cites it | Some tests read files in the feature folder, so archiving the folder breaks them; the archive preview's `namedFiles` lists them | A session-end archive turns the suite red after the move |
| `pnpm typecheck` checks the test files | `tsconfig.json` covers only `src/`; vitest does not type-check | Type errors in `tests/` pass the gate unseen |

# Joycraft

The `joycraft` npm package. Its CLI installs and updates Joycraft, a skill bundle and small runtime for agent-led software work, for Claude Code, Codex, Pi, Oh My Pi, GitHub Copilot CLI and OpenCode. What it installs lives in `payload/`, which is the source: edit it there and run `node scripts/pin-payload.mjs`. joycraft-prototype is retired; never route a change through it.

<!-- joycraft:managed -->
- First action in each session: run `node .joycraft/runtime/update-check.mjs check`. If it prints one line, end your next reply with it. If it prints JSON, follow `.joycraft/references/update.md`.
- Ask a person to answer or approve anything only through Joycraft's decision artifact (`node .joycraft/runtime/artifacts/cli.mjs`, see `.joycraft/references/artifacts.md#asking-questions`), in the project's question style. Every page that shows a person a document, a question or a decision comes from that engine: never write your own HTML page for one. Show every other document a person must read (a plan, spec set, report or review) as an engine page (`--doc`), never only as Markdown in chat, where the person works (see `.joycraft/references/artifacts.md#showing-a-page`), and say where it is.
- A Context Map row that matches your next step binds: read that page first, and again after a compaction or in a new agent. A record (a log or history) is an audit trail: search it to learn why or when; do not read it at the start.
- When a fact here disagrees with the code, trust the code and report it. A rule holds even when the code breaks it.
- Search the mapped pages first. A doc that no map row reaches is working material, not current truth.
- Work: first, before any question, page or edit, say `Path: small job` or `Path: feature`.
  - Small job: it fits one session (several goals can), every open choice has a safe default (`Assumed:` line, never ask), and has no auth, payment, deploy or data-migration change. When Git has no commit yet, first commit what is there as `chore: set up Joycraft`. Write `docs/features/<slug>/brief.md` (the features folder in `joycraft.yaml` when set): the user's request word for word, then a "Done when" list with one group for each goal. Each line is a state or input with its expected result and its check (`test: <file>` or `seen: <render>`). Write one line for each thing the user asked for, in their words, and one for a missing input. The first line gives the one answer that the screen or output shows, and that each repeated item in it shows, when its inputs disagree. Every other statement there is a reason for that answer. Each answer says which hours, days or items it covers, and the answers leave no gap. Test an outside source through the function that calls it, with the network call stubbed, for a good reply and a failed one. Build no page for this brief. Build, and check each line.
  - Look, before you close: give a fresh agent (Claude Code: agent type `joycraft-look`) only the user's words and renders of the default state and of a state where the inputs of the first line disagree. Save the renders in `.joycraft/local/looks/<slug>/`. A switch that fakes data says so on the screen. Give it no brief and no code. Ask: "Quote any two statements on this screen that disagree about the main answer, or reply OK. At most 8 lines." Two such quotes block the close: fix, then look again one time. With no separate agent, read the renders yourself and say the look was not independent.
  - Close: mark each line `test: <file>`, `seen: <render>` or `not checked: <why>`, and add a `Look:` line with the result. Update what the change makes stale, in this file and in the mapped page, with how to run and look at the result. Add a trap (it cost you a retry) to `docs/context/traps.md`, with a map row. Put a standing instruction from the user under `## Rules` in their words. Stage your work, then run `node .joycraft/runtime/close.mjs <slug> -m "<message>"`, which runs the `test:` files, archives the brief and commits. Final message, at most 120 words: how to run the result, each guess that changes the answer, then the line that the command printed.
  - Feature: all other work, or when the user asks for the full loop: use the `joycraft-entry` skill. A small job becomes a feature when a choice has no safe default, meets one of those changes, or fails the same check twice: keep the brief and add specs.
<!-- /joycraft:managed -->

## Rules

- While a spec is built, run only its own test files (the focused test). The gate in the Commands table runs once per spec, before it is accepted; `joycraft.yaml` records both. `pnpm test` runs once in an agent shell or CI; do not add `--run`.
- Commit style: `verb: concise message`.
- Work on a feature branch with a descriptive name (`feature/<spec-name>`). Never push to main; every change reaches main through a PR.
- Push after each accepted spec. Session end opens one PR when no spec of the queue can start.
- Implement from the atomic specs in `docs/features/<slug>/specs/`.
- Run `/release-docs-sync` before `gh pr create`: a PR that touches `src/`, `scripts/` or `payload/` must change `CHANGELOG.md` or carry a `Docs: none — <reason>` line in its body.
- A merge to main that changes a product path (`isProductPath` in `scripts/release-preparation.mjs`) publishes to npm and needs its release fields; a docs-only merge publishes nothing. Do not introduce a second release PR, manual promotion approval or new credential gate without the maintainer's explicit approval.
- Never overwrite user files without explicit confirmation or `--force`. One approved exception: an explicit `update` replaces an edited Joycraft-owned file (skill, template, hook, script) after saving the edited copy under `.joycraft-backups/`; user-owned files (`CLAUDE.md`, `AGENTS.md`, settings, `deny-patterns.txt`) are never replaced this way. The text between Joycraft's two markers in `AGENTS.md` is Joycraft's: an explicit `update` rewrites it, with the same backup.
- Never add a runtime dependency that is not strictly necessary.
- Never reference absolute paths: everything in `payload/` uses project-relative paths.
- Never put methodology research, project assessments or personal notes in the shipped tool.
- Never amend a commit that has been pushed.

## Commands

```bash
pnpm install && pnpm build && pnpm typecheck && pnpm test
pnpm build && node dist/cli.js init /tmp/test-project --yes   # try the CLI as npx would
```

| Check | Command | Source |
|---|---|---|
| Focused test | `pnpm test tests/<file>.test.ts` | vitest.config.ts |
| Project gate | `pnpm test && pnpm typecheck` | package.json |
| Full suite | CI: Test workflow on the PR (tarball gates, OS matrix, upgrade from the published release) | .github/workflows/test.yml |

## Execution Profile

<!-- joycraft:execution-profile -->
- claude: Swarms: decompose yes · implement yes · model opus 5.5 · effort high
- codex: Swarms: decompose yes · implement yes · model 5.6 terra · effort medium
- pi: Swarms: decompose yes · implement yes · model kimi-k3 · effort max
<!-- /joycraft:execution-profile -->

## Context Map

| Document | Read it when… |
|----------|---------------|
| `docs/context/architecture.md` | Finding where code lives, the install flow, the 0.7 migration, or the folder layout |
| `docs/context/production-map.md` | Touching npm publishing, CI workflows or anything users install |
| `docs/guides/releasing.md` | Changing release, version or publish behavior |
| `docs/context/institutional-knowledge.md` | Looking for a convention or constraint the code does not show |
| `docs/context/dangerous-assumptions.md` | Before trusting a belief about this repo; add a row when one turns out false |

**Records** (search them; do not read them at the start):

| Document | Search it when… |
|----------|-----------------|
| `docs/context/decision-log.md` | You need why or when something was decided |
| `docs/context/shipped.md` | You need what shipped in which release or PR |

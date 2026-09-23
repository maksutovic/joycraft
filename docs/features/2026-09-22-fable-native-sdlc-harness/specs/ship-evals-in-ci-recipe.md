---
status: done
owner: Maximilian Maksutovic
created: 2026-09-22
feature: 2026-09-22-fable-native-sdlc-harness
mode: checkpoint
---

# Ship Evals-in-CI Recipe — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-22-fable-native-sdlc-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-09-22
> **Estimated scope:** 1 session / 7 files / ~350 lines

---

## What

An inert evals scaffold added under `src/templates/evals/` so it ships to every
project's `docs/templates/evals/`, plus a one-line reminder in the bugfix skill
that every bugfix seeds an eval.

The scaffold is four files:

1. **`README.md`** — what a harness eval is, the recorded-task loop, how to copy
   `agent-evals.yml` into `.github/workflows/` **by hand**, and the rule that
   every bugfix seeds an eval.
2. **`example-task.json`** — the recorded-task JSON shape: an id, a prompt, the
   working-directory fixture, the assertions to run, and a pass criterion. One
   worked example, clearly marked as sample content to replace.
3. **`check.sh`** — the runner. Reads the task JSON files with `jq`, runs each
   prompt through `claude -p`, evaluates assertions, prints a pass rate, and
   exits non-zero when the pass rate falls under the task set's declared gate.
4. **`agent-evals.yml`** — the GitHub Actions workflow, triggered on a schedule
   and on pushes that touch harness files (`CLAUDE.md`, `AGENTS.md`,
   `.claude/**`, skill directories, hook directories), which runs `check.sh`.

The whole scaffold is inert: nothing in this spec writes to `.github/workflows/`
at install or update time. The user copies `agent-evals.yml` across by hand,
exactly as `docs/templates/workflows/` already works for a user who is not
running the separate `joycraft init-autofix` command.

### Verified shipping mechanics (2026-09-22)

`scripts/generate-bundled-files.mjs` reads `src/templates/` with a recursive
`readTreeDir` (excluding only `pi-extensions`, `pi-scripts`, `pi-agents`) into
the `TEMPLATES` record, and `src/bundle-inventory.ts:121` maps every `TEMPLATES`
key to `docs/templates/<key>` with `harness: 'shared'`, `kind: 'vendor'`. So a
new `src/templates/evals/` directory ships to `docs/templates/evals/` with zero
code change. That is how `docs/templates/workflows/` and
`docs/templates/scenarios/` reach a project today.

**The one hazard that makes the directory name load-bearing.**
`src/init-autofix.ts:66-86` iterates the `TEMPLATES` record and writes every key
prefixed `workflows/` into the target project's `.github/workflows/`. It also
writes every key prefixed `scenarios/` into `docs/templates/scenarios/`. That
code runs only under the separate opt-in `joycraft init-autofix` command, never
under `update` or `init` — but it means the eval workflow **must not** be placed
at `src/templates/workflows/agent-evals.yml`. Under `evals/` it matches neither
prefix and stays inert under every command. Do not rename the directory.

## Why

The playbook's loop closes with evals that run when the harness itself changes
and with every production incident becoming a permanent eval. Joycraft has the
check machinery and the bugfix skill but no regression testing for the harness:
a skill edit that breaks a workflow is caught only by a human noticing worse
output. A copy-in scaffold gives users the pattern without Joycraft taking on
the cost of running model calls in someone else's CI.

## Acceptance Criteria

- [ ] `src/templates/evals/` exists and contains exactly four files: `README.md`, `example-task.json`, `check.sh`, and `agent-evals.yml` [src: brief "Decomposition"]
- [ ] `example-task.json` is valid JSON and carries a recorded-task shape with at minimum an id, a prompt, a fixture or working-directory field, a list of assertions, and a pass criterion [src: brief "Decomposition"]
- [ ] `check.sh` is a POSIX shell script whose only external commands are shell builtins, `jq`, `claude`, and standard coreutils, and it adds no runtime dependency to `package.json` [src: brief "Hard Constraints"]
- [ ] `check.sh` prints a pass rate and exits non-zero when the observed pass rate is below the declared gate [src: brief "Decomposition"]
- [ ] `agent-evals.yml` declares a `schedule` trigger and a `push`/`pull_request` trigger whose `paths` filter names `CLAUDE.md`, `AGENTS.md`, `.claude/**`, the skill directories, and the hook directories [src: brief "Decomposition"]
- [ ] `agent-evals.yml` runs `check.sh` and nothing else that requires a Joycraft-specific secret [src: brief "Hard Constraints"]
- [ ] `src/templates/evals/README.md` states that the workflow is copied into `.github/workflows/` by hand and that no Joycraft command installs it [src: D11]
- [ ] `src/templates/evals/README.md` states the rule that every bugfix seeds an eval [src: brief "Decomposition"]
- [ ] `src/skills/joycraft-bugfix.md` gains exactly one added line, in the spec-writing phase, reminding the author to seed an eval from the reproduction case and pointing at `docs/templates/evals/README.md` by path [src: brief "Decomposition"]
- [ ] The bugfix reminder names the path, never restates the eval shape — the scaffold README is the one home for that fact [src: D1]
- [ ] `scripts/generate-bundled-files.mjs` and `pnpm sync-skills` are run, and the regenerated `src/bundled-files.ts`, the five generated `src/*-skills/joycraft-bugfix.md` variants, and the five installed skill trees are committed in the same commit as the `src/skills/joycraft-bugfix.md` edit [src: brief "Hard Constraints"]
- [ ] `getBundleInventory(['claude'])` yields vendor entries at `docs/templates/evals/README.md`, `docs/templates/evals/example-task.json`, `docs/templates/evals/check.sh`, and `docs/templates/evals/agent-evals.yml` [src: brief "Success Criteria"]
- [ ] Running the updater into a temp project writes the four files under `docs/templates/evals/` and creates no `.github/workflows/` directory [src: brief "Success Criteria"]
- [ ] No key in the `TEMPLATES` record introduced by this spec begins with `workflows/` or `scenarios/`, so `src/init-autofix.ts` never picks the scaffold up [src: brief "Hard Constraints"]
- [ ] Every path referenced inside the four files is project-relative — no `/Users/` path and no Joycraft repo path appears [src: brief "Hard Constraints"]
- [ ] The dogfood copies land in this repo at `docs/templates/evals/` in the same commit, produced by running the built updater on this repo (`pnpm build && node dist/cli.js update . --yes`), with the updated `docs/.joycraft/manifest.json` committed alongside [src: brief "Hard Constraints"]
- [ ] Build passes [src: brief "Test Strategy"]
- [ ] Tests pass [src: brief "Test Strategy"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Exactly four files exist | new `tests/evals-scaffold.test.ts`: `readdirSync(src/templates/evals)` sorted equals the expected four names | enumeration guard |
| Task JSON shape | same file: `JSON.parse(example-task.json)` succeeds and the object carries the required keys | unit |
| No runtime deps in check.sh | same file: `check.sh` body matched against an allowed-command allowlist; assert no `npm install`/`pip`/third-party invocation | unit |
| Workflow triggers | same file: `agent-evals.yml` text contains `schedule:` and a `paths:` block naming `CLAUDE.md`, `AGENTS.md`, and `.claude/**` | unit |
| README states hand-copy + bugfix rule | same file: README contains the hand-copy sentence and the every-bugfix-seeds-an-eval sentence | unit |
| Project-relative paths only | same file, mirroring `tests/reference-templates.test.ts` lines 59-67: none of the four files matches `/Users/` or `joycraft/src` | unit |
| Bugfix skill reminder present | same file: `src/skills/joycraft-bugfix.md` contains `docs/templates/evals/README.md`; and each of the five generated `src/*-skills/joycraft-bugfix.md` contains it too | unit |
| Prefix hazard avoided | same file: no key of the generated `TEMPLATES` record that contains `agent-evals` starts with `workflows/` or `scenarios/` | unit |
| Bundle entries exist as vendor | extend `tests/bundle-inventory.test.ts`: the four `docs/templates/evals/*` paths appear with `kind: 'vendor'` | unit |
| Nothing written to .github/workflows | extend `tests/init-selections.test.ts`: after `update(tmp, { nonInteractive: true })`, `existsSync(join(tmp, '.github/workflows'))` is false | integration |
| Generated variants and installed copies fresh | existing `tests/installed-skills-sync.test.ts` and `tests/generated-skills-fresh.test.ts` stay green | regression |
| Build passes | `pnpm build` | manual |
| Tests pass | `pnpm test && pnpm typecheck` | manual |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the enumeration + shape test (`pnpm test tests/evals-scaffold.test.ts`) — four small files, under 5 seconds.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: place the scaffold at `src/templates/evals/` — not `src/templates/workflows/` — because `src/init-autofix.ts:66-72` writes every `workflows/`-prefixed `TEMPLATES` key into `.github/workflows/` [src: brief "Hard Constraints"]
- MUST: ship inert template files only, copied in by hand; add no CLI command and no activation path [src: D11]
- MUST: keep `check.sh` to shell plus `claude -p` plus `jq` [src: brief "Hard Constraints"]
- MUST: regenerate bundled variants (`scripts/generate-bundled-files.mjs`) and run `pnpm sync-skills` in the same commit as the `src/skills/joycraft-bugfix.md` edit, committing the regenerated and installed copies together [src: brief "Hard Constraints"]
- MUST: land the installed copies under this repo's `docs/templates/evals/` in the same commit, by running the built updater on this repo [src: brief "Hard Constraints"]
- MUST: use project-relative paths in all four files [src: brief "Hard Constraints"]
- MUST: keep the bugfix skill edit to one line — the eval shape lives in the scaffold README, cited by path [src: D1]
- MUST NOT: write anything to `.github/workflows/` during install or update [src: brief "Hard Constraints"]
- MUST NOT: add any runtime dependency to `package.json` [src: brief "Hard Constraints"]
- MUST NOT: touch the holdout scenarios repo, its dispatch workflow (`src/templates/workflows/scenarios-dispatch.yml`, `scenarios-rerun.yml`), or `src/templates/scenarios/` — user-project harness evals are unrelated to the holdout guarantee, and the scaffold must not mention scenario test names or contents [src: brief "Hard Constraints"]
- MUST NOT: add a `joycraft init-evals` command or any other CLI surface [src: brief "Out of Scope"]
- MUST: pause for human approval before the first write under `src/templates/` and before the first write to `src/skills/joycraft-bugfix.md` — both are ASK FIRST boundaries [src: brief "Execution Strategy"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/templates/evals/README.md` | What a harness eval is, the recorded-task loop, hand-copy instructions for `agent-evals.yml`, and the every-bugfix-seeds-an-eval rule |
| Create | `src/templates/evals/example-task.json` | One worked recorded task: id, prompt, fixture, assertions, pass criterion |
| Create | `src/templates/evals/check.sh` | Runner: read tasks with `jq`, run each through `claude -p`, evaluate assertions, print pass rate, exit non-zero under the gate |
| Create | `src/templates/evals/agent-evals.yml` | Actions workflow on `schedule` plus a harness-file `paths` filter, running `check.sh` |
| Modify | `src/skills/joycraft-bugfix.md` | One added line in Phase 4 (spec writing, around line 107) pointing at `docs/templates/evals/README.md` |
| Modify | `src/claude-skills/joycraft-bugfix.md` | `@generated` — regenerated |
| Modify | `src/codex-skills/joycraft-bugfix.md` | `@generated` — regenerated |
| Modify | `src/pi-skills/joycraft-bugfix.md` | `@generated` — regenerated |
| Modify | `src/copilot-skills/joycraft-bugfix.md` | `@generated` — regenerated |
| Modify | `src/omp-skills/joycraft-bugfix.md` | `@generated` — regenerated |
| Modify | `src/bundled-files.ts` | `@generated` — four new `evals/*` keys plus the updated bugfix skill bodies |
| Modify | `.claude/skills/joycraft-bugfix/SKILL.md` | Installed copy — `pnpm sync-skills` |
| Modify | `.agents/skills/joycraft-bugfix/SKILL.md` | Installed copy — `pnpm sync-skills` |
| Modify | `.pi/skills/joycraft-bugfix/SKILL.md` | Installed copy — `pnpm sync-skills` |
| Modify | `.github/skills/joycraft-bugfix/SKILL.md` | Installed copy — `pnpm sync-skills` |
| Modify | `.omp/skills/joycraft-bugfix/SKILL.md` | Installed copy — `pnpm sync-skills` |
| Create | `docs/templates/evals/README.md` | Dogfood copy, written by the built updater on this repo |
| Create | `docs/templates/evals/example-task.json` | Dogfood copy |
| Create | `docs/templates/evals/check.sh` | Dogfood copy |
| Create | `docs/templates/evals/agent-evals.yml` | Dogfood copy |
| Modify | `docs/.joycraft/manifest.json` | Updated by the dogfood update run — four new file records |
| Create | `tests/evals-scaffold.test.ts` | Enumeration guard, JSON shape, trigger assertions, prefix-hazard check, bugfix reminder assertion |
| Modify | `tests/bundle-inventory.test.ts` | Four new vendor entries asserted |
| Modify | `tests/init-selections.test.ts` | Integration case: an update into a temp project writes the scaffold and creates no `.github/workflows/` |

## Approach

`src/init-autofix.ts` is left alone. It is the command that already writes
`workflows/`-prefixed template keys into `.github/workflows/`, and the safe way
past it is to stay outside the prefix it matches rather than to edit its
matching logic — an edit there would change behavior for the autofix scaffold
that ships today.

Content plus one skill line. No generator or inventory code changes: the
recursive `readTreeDir` picks up `src/templates/evals/` and
`src/bundle-inventory.ts:121` maps it. The only design decision that carries
risk is the directory name, and it is settled by the `workflows/` prefix hazard
in `src/init-autofix.ts` documented above — a test asserts the hazard stays
avoided so a later rename cannot silently start writing a model-calling
workflow into users' CI.

`check.sh` keeps its task set in the same directory as itself and discovers
`*.json` files beside it, so a user who copies the directory in and adds
`login-bug.json` needs no wiring. The pass gate is a field in each task file
rather than a global constant, so a user can ship a strict task and a flaky one
side by side.

The workflow's `paths` filter is the trigger the brief names and the reason the
scaffold exists: harness-file changes are what the evals regress against. It
also carries a `schedule` so drift from a model update surfaces without a
harness edit.

**Rejected alternative:** a `joycraft init-evals` command mirroring
`joycraft init-autofix`, which would write `agent-evals.yml` into
`.github/workflows/` directly. D11 settles this: inert files only. A command
that installs a workflow spending model budget in a user's CI is exactly the
install-time action the Hard Constraints forbid, and the copy-in step is the
user's consent.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `jq` absent in the CI runner | `check.sh` exits non-zero with a clear "jq required" message; a missing tool is a loud failure in CI, unlike the advisory hook recipes |
| Task directory contains no `*.json` files | `check.sh` reports zero tasks and exits 0 — an empty suite is not a failure |
| A task's assertions are malformed | That task counts as a failure with its id named, and the run continues through the rest |
| `claude -p` is unauthenticated in CI | `check.sh` surfaces the CLI's error and exits non-zero; the README tells the user which secret the workflow needs |
| A user copies `agent-evals.yml` into `.github/workflows/` unchanged | It runs on their schedule and their harness paths; nothing in it references Joycraft's own repo or the scenarios repo |
| Someone later adds a fifth scaffold file | `tests/evals-scaffold.test.ts` fails loudly, as `tests/reference-templates.test.ts` does for `context/reference/` |
| Someone moves the scaffold under `src/templates/workflows/` | The prefix-hazard assertion fails before `joycraft init-autofix` can start writing a model-calling workflow into `.github/workflows/` |
| The bugfix skill's Phase 4 wording drifts before this spec runs | Verify the Phase 4 spec-writing block still exists (it did at `src/skills/joycraft-bugfix.md:107` on 2026-09-22) before placing the line; place it in the block that survives, never in a block you did not open |

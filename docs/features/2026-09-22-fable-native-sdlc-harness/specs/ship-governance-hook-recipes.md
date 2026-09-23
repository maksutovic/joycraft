---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-22
feature: 2026-09-22-fable-native-sdlc-harness
mode: checkpoint
---

# Ship Governance Hook Recipes — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-22-fable-native-sdlc-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-09-22
> **Estimated scope:** 1 session / 6 files / ~300 lines

---

## What

Four documented, **unregistered** Claude Code hook recipes plus a README, added
as inert template content under `src/templates/hooks/` so they ship to every
project's `docs/templates/hooks/` on update. The four recipes are:

1. **plan-sync on completion** — a `Stop` (or `SubagentStop`) hook that, when a
   session ends, asks `claude -p` whether the plan/spec file the session was
   working from still matches what landed, and prints a reminder.
2. **protected-path guard** — a `PreToolUse` hook on `Edit|Write` that blocks a
   write whose target path matches a project-owned protected list.
3. **test-file lock during a bugfix** — a `PreToolUse` hook on `Edit|Write`
   that blocks edits to test files while a bugfix session is active, so the
   agent cannot make a red test green by editing the test.
4. **allow/ask/block exit-code gate shape** — a documented skeleton showing the
   three-outcome contract (exit 0 = allow, exit 1 = ask/warn on stderr,
   exit 2 = block) that the other three recipes and Joycraft's own generated
   `block-dangerous.sh` both follow.

Each recipe is a standalone shell script using only POSIX shell, `claude -p`,
and `jq`. The README explains the hook events, the exit-code contract, and how
to wire a chosen recipe into `.claude/settings.json` **by hand**.

Nothing in this spec registers any recipe. Joycraft's installer continues to
register exactly the two hooks it generates in code
(`.claude/hooks/joycraft/block-dangerous.sh` via a `PreToolUse` patch entry and
`.claude/hooks/joycraft-version-check.mjs` via a `SessionStart` patch entry, both
declared at `src/bundle-inventory.ts:130-134`). The recipes are copy-in material
that sits beside those, never inside them.

### Where the "Claude kit" actually is (verified 2026-09-22)

The brief's Raw Notes say "the recipe pattern exists once:
`templates/claude-kit/hooks-example.json` is valid and unregistered." That file
does exist at the **repo root** `templates/claude-kit/hooks-example.json`, and
it is a single `PostToolUse` echo-reminder JSON fragment. But the repo-root
`templates/` folder is stale reference material: `scripts/generate-bundled-files.mjs`
reads `src/templates/` only (`TEMPLATES_DIR = join(ROOT, 'src', 'templates')`,
line 50), and there is no `claude-kit` directory under `src/templates/`. So
`templates/claude-kit/hooks-example.json` ships to nobody.

The real bundle path is: a file at `src/templates/<rel>` is read by
`readTreeDir` into the `TEMPLATES` record in `src/bundled-files.ts`, and
`src/bundle-inventory.ts:121` maps every `TEMPLATES` entry to
`docs/templates/<rel>` with `harness: 'shared'`. Therefore this spec adds the
recipes under `src/templates/hooks/`, and they land at `docs/templates/hooks/`
in every installed project. This spec does **not** move, edit, or delete the
stale root `templates/claude-kit/` folder.

## Why

The AI-native SDLC playbook draws the line that skills are advisory and hooks
are deterministic — the same split Joycraft's harden skill already uses. Today
a Joycraft user gets exactly one deterministic control (the dangerous-command
deny list) and no worked examples of the governance hooks the playbook calls
for. Shipping four documented recipes gives users a deterministic-control
starting kit without Joycraft taking on the risk of registering hooks that
call `claude -p` on someone else's machine and budget.

## Acceptance Criteria

- [ ] `src/templates/hooks/` exists and contains exactly five files: `README.md`, `plan-sync-on-completion.sh`, `protected-path-guard.sh`, `test-file-lock.sh`, and `exit-code-gate.sh` [src: brief "Decomposition"]
- [ ] Each of the four `.sh` recipes is a self-contained POSIX shell script whose only external commands are shell builtins, `jq`, `claude`, and standard coreutils — no runtime dependency is added to `package.json` [src: brief "Hard Constraints"]
- [ ] The plan-sync recipe is a `Stop`-event hook that reads the hook JSON payload on stdin with `jq` and invokes `claude -p` to compare the session's plan or spec file against what changed [src: brief "Decomposition"]
- [ ] The protected-path guard is a `PreToolUse` hook matching `Edit|Write` that reads the target path from the tool-input JSON with `jq`, compares it against a project-owned list of protected path patterns, and exits 2 with an explanatory message on a match [src: brief "Decomposition"]
- [ ] The test-file lock is a `PreToolUse` hook matching `Edit|Write` that blocks writes to test files while a bugfix session is active, and documents in-file how the user signals "bugfix active" (an env var or a sentinel file) [src: brief "Decomposition"]
- [ ] The exit-code gate recipe documents and demonstrates the three-outcome contract: exit 0 allows, exit 1 surfaces a warning or ask on stderr, exit 2 blocks the tool call [src: brief "Decomposition"]
- [ ] `src/templates/hooks/README.md` names each recipe, the hook event it belongs on, and gives a copy-pasteable `.claude/settings.json` fragment for wiring it in by hand [src: brief "Decomposition"]
- [ ] The README states in its own words that Joycraft never registers these recipes and that wiring one in is a deliberate user action [src: D4]
- [ ] Every path referenced inside the recipes and the README is project-relative — no `/Users/` path and no Joycraft repo path appears in any of the five files [src: brief "Hard Constraints"]
- [ ] `getBundleInventory(['claude'])` yields entries at `docs/templates/hooks/README.md` and `docs/templates/hooks/plan-sync-on-completion.sh` (and the other three), each with `kind: 'vendor'` [src: brief "Success Criteria"]
- [ ] No entry whose path starts with `docs/templates/hooks/` appears in the inventory with `kind: 'config-patch'`, and the set of `config-patch` entries targeting `.claude/settings.json` is unchanged from before this spec — still exactly the six declared at `src/bundle-inventory.ts:133-138` [src: brief "Success Criteria"]
- [ ] Running the updater into a temp project with `claude` selected writes the five recipe files and leaves `.claude/settings.json` free of any reference to `docs/templates/hooks/` [src: brief "Success Criteria"]
- [ ] The dogfood copies land in this repo at `docs/templates/hooks/` in the same commit, produced by running the built updater on this repo (`pnpm build && node dist/cli.js update . --yes`), with the regenerated `src/bundled-files.ts` and the updated `docs/.joycraft/manifest.json` committed alongside [src: brief "Hard Constraints"]
- [ ] Build passes [src: brief "Test Strategy"]
- [ ] Tests pass [src: brief "Test Strategy"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Exactly five files exist | new `tests/hook-recipes.test.ts`: `readdirSync(src/templates/hooks)` sorted equals the expected five names | enumeration guard |
| No runtime deps | same file: each `.sh` body matched against an allowed-command allowlist regex; assert no `npm`/`npx`/`pip`/`node -e` invocation of a third-party package | unit |
| Exit-code contract documented | same file: `exit-code-gate.sh` and `README.md` each mention exit 0, exit 1, and exit 2 with their meanings | unit |
| Correct hook events named | same file: README names `Stop` for plan-sync and `PreToolUse` with an `Edit|Write` matcher for the guard and the lock | unit |
| Project-relative paths only | same file, mirroring `tests/reference-templates.test.ts` lines 59-67: none of the five files matches `/Users/` or `joycraft/src` | unit |
| Bundle entries exist as vendor | extend `tests/bundle-inventory.test.ts`: inventory for `['claude']` contains the five `docs/templates/hooks/*` paths, all `kind: 'vendor'` | unit |
| Installer registers nothing | extend `tests/bundle-inventory.test.ts`: the `config-patch` entries targeting `.claude/settings.json` are exactly the six pre-existing ones, and no `config-patch` path starts with `docs/templates/hooks/` | unit |
| Update writes files, settings untouched | extend `tests/init-selections.test.ts` (which already drives `update()` into a temp dir per harness selection): `update(tmp, { nonInteractive: true, harnesses: 'claude' })` → five recipe files exist and the written `.claude/settings.json` contains no `docs/templates/hooks` substring | integration |
| Build passes | `pnpm build` | manual |
| Tests pass | `pnpm test && pnpm typecheck` | manual |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the enumeration + path-shape test (`pnpm test tests/hook-recipes.test.ts`) — it reads five small files and runs well under 5 seconds.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: place the recipes under `src/templates/hooks/`, the directory `scripts/generate-bundled-files.mjs` actually reads (`TEMPLATES_DIR`, line 50), not the stale repo-root `templates/claude-kit/` [src: brief "Hard Constraints"]
- MUST: keep every recipe shell plus `claude -p` plus `jq` only [src: brief "Hard Constraints"]
- MUST: land the installed copies under this repo's `docs/templates/hooks/` in the same commit, by running the built updater on this repo — `pnpm build` alone regenerates `src/bundled-files.ts` but leaves `docs/templates/` and `docs/.joycraft/manifest.json` stale [src: brief "Hard Constraints"]
- MUST: use project-relative paths in every recipe and in the README [src: brief "Hard Constraints"]
- MUST: keep the recipes visibly separate from Joycraft's generated hooks — the README states that `.claude/hooks/joycraft/block-dangerous.sh` and `.claude/hooks/joycraft-version-check.mjs` are generated and managed, and that a recipe copied out of `docs/templates/hooks/` is the user's own file [src: D4]
- MUST NOT: add any runtime dependency to `package.json` [src: brief "Hard Constraints"]
- MUST NOT: register any recipe in `.claude/settings.json` at install, update, or any other time — no new `patch()` entry in `src/bundle-inventory.ts` [src: brief "Success Criteria"]
- MUST NOT: write to `.github/workflows/` [src: brief "Hard Constraints"]
- MUST NOT: modify `src/safeguard.ts` or `src/claude-session-start.ts` — the generated hooks and their registration are out of this spec's scope [src: brief "Success Criteria"]
- MUST NOT: reference the holdout scenarios repo or its dispatch workflow in any recipe or in the README [src: brief "Hard Constraints"]
- MUST: pause for human approval before the first write under `src/templates/` — template content is an ASK FIRST boundary [src: brief "Execution Strategy"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/templates/hooks/README.md` | Recipe index, hook events, exit-code contract, hand-wiring fragments for `.claude/settings.json`, and the "Joycraft never registers these" statement |
| Create | `src/templates/hooks/plan-sync-on-completion.sh` | `Stop` hook: read payload with `jq`, ask `claude -p` whether plan/spec still matches what landed, print reminder, exit 0 |
| Create | `src/templates/hooks/protected-path-guard.sh` | `PreToolUse` `Edit\|Write` hook: extract target path with `jq`, match against a protected-pattern list, exit 2 on a match |
| Create | `src/templates/hooks/test-file-lock.sh` | `PreToolUse` `Edit\|Write` hook: block test-file writes while the documented bugfix-active signal is set, exit 2 on a match |
| Create | `src/templates/hooks/exit-code-gate.sh` | Annotated skeleton demonstrating allow (0) / ask (1) / block (2) |
| Modify | `src/bundled-files.ts` | `@generated` — regenerated by `scripts/generate-bundled-files.mjs`; the five new `hooks/*` keys enter the `TEMPLATES` record automatically via `readTreeDir` |
| Create | `docs/templates/hooks/README.md` | Dogfood copy, written by the built updater on this repo |
| Create | `docs/templates/hooks/plan-sync-on-completion.sh` | Dogfood copy |
| Create | `docs/templates/hooks/protected-path-guard.sh` | Dogfood copy |
| Create | `docs/templates/hooks/test-file-lock.sh` | Dogfood copy |
| Create | `docs/templates/hooks/exit-code-gate.sh` | Dogfood copy |
| Modify | `docs/.joycraft/manifest.json` | Updated by the dogfood update run — five new file records |
| Create | `tests/hook-recipes.test.ts` | Enumeration guard, allowed-command check, exit-code-contract assertions, project-relative path check |
| Modify | `tests/bundle-inventory.test.ts` | Vendor entries present; settings `config-patch` set unchanged |
| Modify | `tests/init-selections.test.ts` | Integration case: a claude-selected update writes the five recipe files and registers none of them |

## Approach

This spec does not move, edit, or delete the stale repo-root
`templates/claude-kit/` folder. Nothing reads it, so it ships to nobody and it
misleads no installed project; cleaning it up is separate work with its own
blast radius, and folding it in here would put a deletion inside a spec whose
other changes are all additive.

Add a new top-level subdirectory under `src/templates/`. No generator or
inventory code changes are needed: `readTreeDir` in
`scripts/generate-bundled-files.mjs` walks `src/templates/` recursively (it
excludes only `pi-extensions`, `pi-scripts`, `pi-agents`), and
`src/bundle-inventory.ts:121` maps every `TEMPLATES` key to
`docs/templates/<key>` as a shared vendor entry. So the whole feature is
content plus tests plus the dogfood run.

The four recipes each open with a block comment giving the hook event, the
matcher, the exit-code meanings, and the exact `.claude/settings.json` fragment
that would wire it in — so a recipe is readable standalone when a user copies
one out without the README. Where a recipe needs project-specific data (the
protected-path list, the test-file glob, the bugfix-active signal) it reads it
from a clearly-marked variable at the top of the script rather than a config
file, keeping each recipe one file.

The plan-sync recipe calls `claude -p` with a bounded prompt and prints its
answer; it always exits 0. Advisory hooks that can block a session end on a
model call are a foot-gun, and the whole kit is opt-in already.

**Rejected alternative:** shipping the recipes as a single JSON fragment in the
shape of the existing `templates/claude-kit/hooks-example.json`. That file
demonstrates only an inline `echo` command, which cannot express the
protected-path or test-file-lock logic, and a single JSON blob gives the user
no way to copy in one recipe without the other three. Separate executable
scripts plus a wiring README is the shape that survives partial adoption.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `jq` is not installed on the user's machine | Each recipe checks for `jq` up front and exits 0 with a one-line stderr note; a missing tool never blocks the user's work |
| `claude` CLI is absent or `claude -p` fails in plan-sync | Recipe exits 0 after printing the failure; the advisory hook degrades to silence |
| Recipe files land without the executable bit through the updater's vendor copy | The README tells the user to `chmod +x` the copy they wire in; the shipped templates are read-only reference material, so the bit is not load-bearing |
| A user wires in the protected-path guard with an empty pattern list | The guard matches nothing and exits 0 — a no-op, never a blanket block |
| A user's `.claude/settings.json` already registers a same-named hook | Out of scope for the recipes; the README says to merge by hand and warns that two `PreToolUse` `Edit\|Write` hooks both run |
| The enumeration test runs after someone adds a sixth recipe file | The test fails loudly, exactly as `tests/reference-templates.test.ts` does for `context/reference/` — the list is updated deliberately |
| Windows line endings from the generator's `toNativeEOL` | Assertions in `tests/hook-recipes.test.ts` read the `src/templates/` source files directly, not the generated record, so CRLF conversion does not affect them |

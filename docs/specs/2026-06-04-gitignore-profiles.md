# Gitignore Profiles — shared vs private — Atomic Spec

> **Parent Brief:** _(none — small enhancement, client-driven)_
> **Status:** Done
> **Date:** 2026-06-04
> **Estimated scope:** 1 session / ~4-5 files / ~200 lines

---

## What

Let users choose how much of the Joycraft harness is tracked in git. Add a
**gitignore profile** with two presets:

- **`shared`** (default, current behavior): commit `.claude/skills/`, `.agents/`,
  `.pi/`, and `docs/` so teammates get the same workflow. Only the hidden
  upgrade-state (`.claude/.joycraft/state.json`) is gitignored.
- **`private`**: gitignore the entire `.claude/`, `.agents/`, and `.pi/` trees.
  Only `CLAUDE.md`, `AGENTS.md`, and `docs/` are tracked. This is the layout one
  client requires — they don't want auxiliary harness files in their repo.

The profile is chosen via an **interactive prompt** on `init` (when run in a
TTY), overridable by a **`--gitignore=<shared|private>` flag** for
non-interactive / CI use. The choice is **persisted** in `state.json` so
`upgrade` re-applies the same profile without re-prompting.

## Why

Joycraft currently always creates `.claude/`, `.agents/`, and `.pi/` at the
project root and intends them to be committed (`init.ts:359` tells users to
commit `.claude/skills/`; `init.ts:286-296` *warns* if `.claude/` is
gitignored). A real client wants the inverse: a clean repo where only
`CLAUDE.md`, `AGENTS.md`, and `docs/` are versioned and all harness machinery is
local-only / gitignored. There is no way to express that today.

## Behavior

### Profile resolution (precedence)
1. `--gitignore=<profile>` flag, if provided (validate; error on unknown value).
2. Persisted profile in `state.json` (`upgrade` and re-`init`).
3. Interactive prompt, if `process.stdin.isTTY` and no flag/persisted value.
4. Fallback default: `shared` (preserves current behavior in non-TTY with no
   flag and no persisted value — e.g. piped/scripted first run).

### `shared` profile (unchanged from today)
- `.gitignore` receives only `.claude/.joycraft/state.json` (existing behavior
  via `ensureGitignoreEntry`).
- The "`.claude/` is in your .gitignore — teammates won't get skills" warning
  (`init.ts:286-296`) stays active.

### `private` profile
- Append these entries to `.gitignore` (append-only, idempotent, reuse
  `ensureGitignoreEntry` per line so existing lines are never duplicated):
  ```
  .claude/
  .agents/
  .pi/
  ```
- Because `.claude/` is now intentionally ignored, **suppress** the
  "teammates won't get skills" warning — it is not a misconfiguration here.
- `state.json` is already inside `.claude/`, so no separate state entry is
  needed when `.claude/` is ignored (the per-line writer must not error or
  double-add).
- `CLAUDE.md`, `AGENTS.md`, `docs/` remain tracked (never added to
  `.gitignore`).

### Persistence
- Store the resolved profile in `state.json` under a new field, e.g.
  `gitignoreProfile: "shared" | "private"`. Extend `VersionInfo` /
  `writeVersion` / `readVersion` in `version.ts` so the field round-trips and is
  backward-compatible (absent field → treated as `shared`).
- `upgrade` reads the persisted profile and re-applies the gitignore entries
  (idempotent — no new lines if already present) without prompting.

### CLI
- `init` and `upgrade` gain `--gitignore <profile>` (commander option in
  `cli.ts`). Pass it through `InitOptions` / `UpgradeOptions`.
- Unknown value → friendly error: `Unknown gitignore profile 'x'. Use 'shared' or 'private'.`

## Acceptance Criteria

- [ ] `npx joycraft init --gitignore=private` writes `.claude/`, `.agents/`,
      `.pi/` to `.gitignore` and does NOT print the "teammates won't get skills" warning
- [ ] `npx joycraft init --gitignore=shared` (and the no-flag default) behaves
      exactly as today — only `state.json` is gitignored
- [ ] Interactive `init` in a TTY with no flag prompts `shared`/`private`;
      non-TTY with no flag/persisted value defaults to `shared`
- [ ] Resolved profile is persisted in `state.json`
- [ ] `npx joycraft upgrade` re-applies the persisted profile's gitignore
      entries idempotently, no prompt, no duplicate lines
- [ ] `--gitignore=bogus` exits with a clear error and does not scaffold a broken state
- [ ] `.gitignore` writes remain append-only and idempotent (re-running init/upgrade adds nothing new)
- [ ] `CLAUDE.md`, `AGENTS.md`, `docs/` are never added to `.gitignore` under any profile
- [ ] Existing `init.test.ts` / `upgrade.test.ts` still pass; new tests cover both profiles + persistence + idempotency
- [ ] `pnpm test --run && pnpm typecheck` pass

## Constraints

- MUST NOT change the default behavior for existing users (default = `shared`).
- MUST keep `.gitignore` edits append-only — never rewrite, reorder, or remove
  user lines (reuse `ensureGitignoreEntry`).
- MUST be backward-compatible with existing `state.json` files that lack the new field.
- MUST NOT add a runtime dependency (use commander's existing option parsing and
  Node's `readline`/`isTTY`, consistent with `upgrade.ts`'s `askUser`).
- `private` does not delete any already-tracked files — it only affects
  `.gitignore`. (Optionally note in the summary that already-committed harness
  files may need `git rm --cached`; do not run git on the user's behalf.)

## Files (anticipated)

| File | Change |
|------|--------|
| `src/cli.ts` | add `--gitignore <profile>` to `init` + `upgrade` |
| `src/init.ts` | resolve profile (flag/prompt/default), apply gitignore entries, gate the warning, persist |
| `src/upgrade.ts` | read persisted profile, re-apply entries idempotently |
| `src/version.ts` | extend `VersionInfo` + read/write to round-trip `gitignoreProfile` |
| `src/gitignore.ts` | (likely reused as-is; maybe a small `applyProfile` helper) |
| `tests/gitignore-profiles.test.ts` | new — both profiles, persistence, idempotency, default |

## Notes / Discoveries

- The three harness dirs (`.claude`, `.agents`, `.pi`) are always created
  regardless of detected agent (`init.ts:79-134`); this spec does NOT change
  *creation*, only *tracking*. Files still exist on disk and work locally under
  `private`.
- `state.json` lives at `.claude/.joycraft/state.json`, so under `private` it is
  covered by the `.claude/` ignore — the per-line writer must tolerate that
  overlap without error.

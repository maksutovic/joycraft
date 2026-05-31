---
status: todo
owner: Maximilian Maksutovic
created: 2026-05-31
feature: 2026-05-31-relocate-version-state
mode: checkpoint
---

# Relocate the Joycraft version-state out of the repo root — Atomic Spec

> **Parent research:** `docs/research/2026-05-30-upgrade-state-idioms.md` (the "why" — read first)
> **Status:** Ready
> **Date:** 2026-05-31
> **Estimated scope:** 1 session / version.ts + init.ts + upgrade.ts + ~6 test files + 1 migration

---

## What
Move Joycraft's upgrade-state file from the **repo root** (`.joycraft-version`) to a **hidden location inside the tool's own directory** (`.claude/.joycraft/state.json`), gitignore it, and shrink the per-file hashes. The state's *mechanism* is unchanged — it still stores per-file content hashes so `upgrade` can do its 3-way comparison (auto-update untouched files silently, prompt only on user-customized ones). Only its **placement, visibility, and size** change. `upgrade` migrates any legacy root file to the new location automatically, so existing projects self-heal.

## Why
The current file sits at the project root **and is committed**, which pollutes the user's repo and diffs — a real client complaint ("no npm package drops a file like this at the top level"). The fix is placement, not removal: **npm itself keeps hashed state at `node_modules/.package-lock.json`** — hidden, inside the tool's own gitignored dir, never at the root (research doc, verified). Keeping the hashes preserves turnkey updates (the thing users actually want — improved prompts arrive automatically; only the rare hand-edited file prompts). Dropping to a version-string-only baseline was rejected: the installed CLI bundles only the *current* version's content, so reconstructing the original would require fetching old npm tarballs at upgrade time — a network dependency on a command that must work offline.

## Acceptance Criteria
- [ ] `readVersion`/`writeVersion` read & write `.claude/.joycraft/state.json` (NOT root `.joycraft-version`); the directory is lazy-created on write
- [ ] No new file is written at the repo root by `init` or `upgrade` for version-state
- [ ] `init` appends the state path to the project's `.gitignore` (creating `.gitignore` if absent; idempotent — never duplicates the line; never clobbers existing entries)
- [ ] `upgrade` migrates a legacy root `.joycraft-version`: reads it, writes the new hidden state, deletes the root file, and ensures the gitignore entry — all before the managed-file diff runs
- [ ] Per-file hashes are stored truncated to 16 hex chars (still SHA-256-derived); the upgrade comparison truncates consistently on both sides so customization detection still works
- [ ] The 3-way upgrade behavior is preserved end-to-end: an untouched file auto-updates silently; a user-modified file is reported `customized` and prompts (the capability the state exists for)
- [ ] All existing tests that referenced the root path are updated to the new path; no test still asserts a root `.joycraft-version`
- [ ] Tests pass (`pnpm test --run`)
- [ ] Build passes (`pnpm build`) and typecheck passes (`pnpm typecheck`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Reads/writes new hidden path | `tests/version.test.ts`: `writeVersion(tmp, …)` then assert `existsSync(tmp/.claude/.joycraft/state.json)` is true AND `existsSync(tmp/.joycraft-version)` is false; `readVersion` round-trips it | unit |
| No root pollution after init | `tests/init.test.ts`: after `init(tmp)`, assert NO `tmp/.joycraft-version` exists and `tmp/.claude/.joycraft/state.json` does | integration |
| init gitignores the state | `tests/init.test.ts`: after `init`, read `tmp/.gitignore`; assert it contains the state path; run `init` twice (force) and assert the line appears once (idempotent) | integration |
| init creates .gitignore if absent | `tests/init.test.ts`: temp dir with no `.gitignore` → after `init`, `.gitignore` exists with the entry | integration |
| init preserves existing .gitignore | `tests/init.test.ts`: pre-seed `.gitignore` with `node_modules\n`; after `init`, assert `node_modules` still present AND state entry appended | integration |
| upgrade migrates legacy root file | `tests/upgrade.test.ts`: seed a tmp project with a legacy root `.joycraft-version` (old shape, full-length hashes) + installed files; run `upgrade`; assert root file is gone, hidden state exists, gitignore has the entry | integration |
| Truncated-hash round-trip | `tests/version.test.ts`: assert stored hash strings are length 16 | unit |
| 3-way behavior preserved | `tests/upgrade.test.ts`: (a) untouched file (on-disk hash == recorded) + new content → auto-`updated`, no prompt; (b) user-modified file (on-disk != recorded) → `customized`/prompt path. Reuse the existing upgrade harness | integration |
| Bundle/version sync still holds | `tests/wire-and-bundle.test.ts` + `tests/version-sync.test.ts`: update any assertions keyed on the old root path | unit |

**Execution order:**
1. Update/extend the tests above to the NEW path + truncated hashes — they MUST fail first (code still uses root path + 64-char hashes)
2. Confirm red
3. Implement `version.ts` path + truncation, `init.ts` gitignore writer, `upgrade.ts` migration, until green

**Smoke test:** `pnpm vitest run tests/version.test.ts tests/upgrade.test.ts`.

**Before implementing, verify your test harness:**
1. Tests operate on real temp dirs via `init()`/`upgrade()`/`writeVersion()` (no npm, no fixtures of the file itself)
2. The 3-way test must exercise the ACTUAL `upgrade()` comparison, not a reimplementation
3. Smoke test = the version + upgrade unit/integration files

## Constraints
- MUST: keep per-file hashes — they are what makes "auto-update untouched, prompt on customized" work **offline**; do NOT reduce to a version-string-only baseline (rejected — would need old npm tarballs at upgrade time)
- MUST: state lives at `.claude/.joycraft/state.json` — `.claude/` is created by `init` unconditionally for every harness (verified), so it is always present. Do NOT scatter copies into `.agents/`/`.pi/`; one shared state file under `.claude/` is the single source of truth
- MUST: `init`'s gitignore write is idempotent and non-destructive (append-only; create-if-absent; never rewrite or reorder existing lines) — mirrors the "append over modify when touching user files" principle
- MUST: `upgrade` migration runs BEFORE the managed-file diff loop (so the recorded-original is available for the 3-way comparison on the same run), and is a no-op when no legacy root file exists
- MUST NOT: change the upgrade decision logic itself (new/updated/customized branches) beyond reading the new path + truncating hashes on both sides
- MUST NOT: leave the legacy root `.joycraft-version` behind after an upgrade migrates it
- MUST NOT: break the "CLI out of date" guard or the forced docs-migration that already run in `upgrade`
- ASK FIRST (CLAUDE.md): this touches `init`/`upgrade` (user-file-adjacent) and the version mechanism — the parent research + this conversation are that authorization; no further ask needed for this decomposed spec
- NOTE: if joycraft ever adds a Codex-only / Pi-only install mode that does NOT create `.claude/`, the state location must be revisited (out of scope here — `.claude/` is universal today)

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/version.ts` | `VERSION_FILE` → `join('.claude', '.joycraft', 'state.json')`; `writeVersion` lazy-creates the dir; truncate hashes to 16 chars (or add a `truncateHash` helper); keep `hashContent` as-is |
| Modify | `src/init.ts` | After install, append the state path to `.gitignore` (create if absent, idempotent). The existing `.claude/` gitignore *warning* block stays |
| Modify | `src/upgrade.ts` | Add a `migrateLegacyVersionFile(targetDir)` step before the diff loop; truncate hashes consistently in the comparison + when writing the new state |
| Modify | `tests/version.test.ts` | New path + truncated-hash assertions |
| Modify | `tests/upgrade.test.ts` | Legacy-migration test + 3-way-preserved test on the new path |
| Modify | `tests/init.test.ts` | No-root-pollution + gitignore-writer tests |
| Modify | `tests/version-sync.test.ts`, `tests/wire-and-bundle.test.ts`, `tests/init-autofix.test.ts`, `tests/safeguard.test.ts` | Update any assertion keyed on the old root `.joycraft-version` path (re-grep at implement time; the grep is authoritative) |

*(Re-grep at implement time: `grep -rln "joycraft-version" src tests` — do not trust this table as exhaustive.)*

## Approach
1. **version.ts** — change the constant to the nested path and `mkdirSync(dirname(filePath), {recursive:true})` before writing. Add a small `truncateHash(h) => h.slice(0,16)` and apply it where hashes are stored. Decide once: store truncated everywhere, and truncate the freshly-computed hash the same way in `upgrade`'s comparison so both sides match.
2. **upgrade.ts** — `migrateLegacyVersionFile`: if `<root>/.joycraft-version` exists, parse it, `writeVersion` to the new location, `rmSync` the old file, and ensure the gitignore entry; run it right after the existing deprecated-skill cleanup / before `getManagedFiles()`. Because `writeVersion` now points at the new path, the rest of the flow is unchanged.
3. **init.ts** — factor a tiny `ensureGitignoreEntry(targetDir, line)` helper (append-only, create-if-absent, idempotent via a line-exact check) and call it with the state path. Reuse it in `upgrade`'s migration.
4. Update tests to the new path first (red), then implement.

**Default-decided:** hash truncation length = **16 hex chars** (64 bits). Collision risk across ~99 files is negligible and the file shrinks ~4×. (If you'd rather keep full 64-char hashes and ONLY relocate, that's a valid lighter variant — drop the truncation AC.)

**Rejected alternative:** Drop hashes entirely and reconstruct the baseline from a stored version string. Rejected — the installed CLI bundles only the current version's content, so the original would have to be re-downloaded from npm at upgrade time, adding a network dependency to an offline command. The hidden hash file is the offline-correct way to keep turnkey auto-update. (Pure shadcn "copy-once + diff-on-everything" was also rejected: it prompts on every changed file, defeating turnkey updates — see research doc.)

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| No legacy root file (fresh install) | `upgrade` migration is a silent no-op; `init` just writes the hidden state + gitignore entry |
| Legacy root file present on upgrade | Migrated to hidden location, root file deleted, gitignore entry ensured, 3-way comparison uses the migrated hashes on the same run |
| `.gitignore` absent | Created with the state entry (only) |
| `.gitignore` already has the entry | Left unchanged (idempotent — no duplicate line) |
| `.gitignore` exists without the entry | Entry appended; existing lines untouched and unreordered |
| User already committed the old root file before upgrading | Migration deletes it from disk; the deletion shows in `git status` for the user to commit (do not attempt to rewrite git history) |
| Project has no `.claude/` yet (raw `upgrade` on a never-inited dir) | Existing upgrade guard already handles "not initialized"; if it proceeds, `writeVersion` lazy-creates `.claude/.joycraft/` |
| Hash collision at 16 chars | Treated like any differing file (worst case: a false "customized" prompt) — acceptable; never silently wrong |

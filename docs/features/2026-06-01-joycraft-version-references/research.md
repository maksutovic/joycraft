---
status: active
owner: Maximilian Maksutovic
created: 2026-06-01
feature: joycraft-version-references-audit
---

# Codebase Research: `.joycraft-version` references

**Date:** 2026-06-01
**Question:** Find every remaining reference to the old/relocated version-state file `.joycraft-version` and categorize each as (a) intentional legacy-migration reference that must stay, or (b) stale reference to update.

Background: `.joycraft-version` (old repo-root state file) was relocated to the hidden, gitignored `.claude/.joycraft/state.json` (= `STATE_PATH` in `src/version.ts`). The literal old path is retained only as `LEGACY_VERSION_FILE` so `upgrade` can migrate old installs.

---

## Verdict by category

### (a) KEEP — intentional / correct as-is

| File | Hits | Why it stays |
|------|------|--------------|
| `src/version.ts` | L11 comment, L17 `LEGACY_VERSION_FILE` const | The migration constant + its docstring. Runtime read/write use `STATE_PATH`; this literal is only the migration anchor. |
| `src/upgrade.ts` | L142, L308 comments (+ `LEGACY_VERSION_FILE` uses) | `migrateLegacyVersionFile` reads the old root file, rewrites to hidden state, deletes the root file. Correct migration logic. |
| `.github/workflows/publish.yml` | L68 | Comment documenting the relocation (added in the publish fix, PR #46). Not a live reference. |
| `tests/init.test.ts` | L11 const, L95 | Negative assertion: after `init`, root file must NOT exist. Correct. |
| `tests/upgrade.test.ts` | L11 const, L340/L356/L361/L372/L606, titles | Migration-setup (seeds a legacy root file) + negative assertions. Correct. |
| `tests/version.test.ts` | L72 | Negative assertion: `writeVersion` must never write the root file. Correct. |
| All `docs/` "describing the move" prose | decision-log, discoveries, relocate-version-state spec, upgrade-state-idioms research | Historical records of the relocation. Editing would falsify the record. |
| All pre-relocation feature `docs/` (collaborative-mode, pi-support, codex-skills, bundled-files, autofix plan, init-autofix/codex specs) | many | Dated artifacts from before the move; accurate for their time. Not load-bearing. |

### (b) STALE — should be updated

| File | Hit | Problem | Fix |
|------|-----|---------|-----|
| `src/claude-skills/joycraft-implement-level5.md` | L15 | Tells the agent to "Look for `.joycraft-version`" as the init gate — file no longer exists there → check always fails | Point at `.claude/.joycraft/state.json` (or both, for back-compat) |
| `src/codex-skills/joycraft-implement-level5.md` | L14 | Same — "Search for `.joycraft-version`" | Same |
| `src/pi-skills/joycraft-implement-level5.md` | L14 | Same — "Search for `.joycraft-version`" | Same |
| `src/bundled-files.ts` | L11, L68, L90 | `@generated` copies of the three skills above | Regenerate via `node scripts/generate-bundled-files.mjs` after fixing the skills — never hand-edit |
| `CLAUDE.md` | L61 | Architecture comment labels `version.ts` as `(.joycraft-version)` — outdated name | Minor: update label to the new path |
| `CONTRIBUTING.md` | L73 | Same outdated label | Minor: update label |

---

## Test-title nit

`tests/upgrade.test.ts:294` — test title still says "in `.joycraft-version`" but the body correctly asserts against the hidden state via `readVersion`/`STATE_PATH`. Cosmetic only; the assertion is correct.

## Key facts

- **Only one runtime code site** uses the literal: `src/version.ts:17` (`LEGACY_VERSION_FILE`). Every other runtime use (`cli.ts`, `init-autofix.ts`, `upgrade.ts`) routes through that constant for migration/init-gating. `init.ts` writes/gitignores only `STATE_PATH`.
- The **functional stale references** that actually misbehave are the **three level5 skill docs** (and their 3 generated copies in `bundled-files.ts`): they instruct an agent to gate on a file that no longer exists, so the init check silently always fails.
- `src/bundled-files.ts` is `@generated` — its 3 hits update only when the source skills change and the generator is re-run.
- Already noted out-of-scope in `docs/discoveries/2026-05-31-version-state-path-consumers.md:20`: editing the skill bodies is "ASK FIRST" per CLAUDE.md.
